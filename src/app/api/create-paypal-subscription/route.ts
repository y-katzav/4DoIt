import { NextRequest, NextResponse } from 'next/server';
import { PLAN_PRICES, type PlanType, type BillingInterval } from '@/lib/paypal';
import { auth, db } from '@/lib/firebase-admin';

interface CreateSubscriptionRequest {
  plan: PlanType;
  billingInterval: BillingInterval;
  returnUrl: string;
  cancelUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if we're in development mode with mock PayPal
    if (!process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID === 'your_paypal_client_id') {
      return NextResponse.json({ 
        orderId: 'mock_order_id',
        approvalUrl: 'https://paypal.com/mock-approval',
        message: 'Mock PayPal order - PayPal not configured'
      });
    }

    // Check if Firebase Admin is properly configured
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured',
        message: 'Mock mode - Firebase Admin credentials not set'
      }, { status: 500 });
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const body: CreateSubscriptionRequest = await request.json();
    const { plan, billingInterval, returnUrl, cancelUrl } = body;

    // Get plan price
    const amount = PLAN_PRICES[plan][billingInterval];
    if (!amount) {
      return NextResponse.json({ error: 'Invalid plan or billing interval' }, { status: 400 });
    }

    // For now, we'll create a simple PayPal order using the REST API
    // This is a simplified implementation - in production you'd want to use proper PayPal subscriptions
    const paypalOrderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
          description: `4DoIt ${plan} Plan - ${billingInterval} billing`,
          custom_id: userId,
        },
      ],
      application_context: {
        brand_name: '4DoIt Task Management',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    // Get access token
    const authResponse = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authResponse.json();
    if (!authData.access_token) {
      throw new Error('Failed to get PayPal access token');
    }

    // Create order
    const orderResponse = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(paypalOrderData),
    });

    const orderData = await orderResponse.json();
    
    if (orderData.id) {
      // Save order info to user document
      await db.collection('users').doc(userId).update({
        paypalOrderId: orderData.id,
        pendingPlan: plan,
        pendingBillingInterval: billingInterval,
        pendingAmount: amount,
        updatedAt: new Date(),
      });

      // Find approval URL
      const approvalUrl = orderData.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return NextResponse.json({ 
        orderId: orderData.id,
        approvalUrl: approvalUrl,
        status: orderData.status
      });
    } else {
      throw new Error('Failed to create PayPal order');
    }

  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
