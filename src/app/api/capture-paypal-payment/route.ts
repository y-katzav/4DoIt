import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Check if we're in development mode with mock PayPal
    if (!process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID === 'your_paypal_client_id') {
      return NextResponse.json({ 
        message: 'Mock PayPal capture - PayPal not configured',
        status: 'COMPLETED'
      });
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

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

    // Capture the order
    const captureResponse = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
    });

    const captureData = await captureResponse.json();
    
    if (captureData.status === 'COMPLETED') {
      // Find user with this order ID
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userData = userDoc.data()!;
      const pendingPlan = userData.pendingPlan;
      const pendingBillingInterval = userData.pendingBillingInterval;
      
      if (!pendingPlan || !pendingBillingInterval) {
        return NextResponse.json({ error: 'No pending plan found' }, { status: 400 });
      }

      // Calculate subscription end date
      const now = new Date();
      const subscriptionEndDate = new Date(now);
      
      if (pendingBillingInterval === 'monthly') {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      } else if (pendingBillingInterval === 'annual') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      }

      // Update user subscription
      await userDoc.ref.update({
        plan: pendingPlan,
        billingInterval: pendingBillingInterval,
        subscriptionStartDate: now,
        subscriptionEndDate: subscriptionEndDate,
        subscriptionStatus: 'active',
        paymentStatus: 'completed',
        pendingPlan: null,
        pendingBillingInterval: null,
        pendingAmount: null,
        paypalOrderId: null,
        lastPaymentDate: now,
        updatedAt: now,
      });

      return NextResponse.json({ 
        status: captureData.status,
        plan: pendingPlan,
        billingInterval: pendingBillingInterval
      });
    } else {
      throw new Error(`Payment capture failed: ${captureData.status}`);
    }

  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
