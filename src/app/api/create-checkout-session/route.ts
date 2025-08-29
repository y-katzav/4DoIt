import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS, type PlanType, type BillingInterval } from '@/lib/stripe';
import { auth, db } from '@/lib/firebase-admin';

interface CreateCheckoutRequest {
  plan: PlanType;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if we're in development mode with mock Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        sessionId: 'mock_session_id',
        url: 'https://checkout.stripe.com/mock',
        message: 'Mock checkout session - Stripe not configured'
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
    const body: CreateCheckoutRequest = await request.json();
    const { plan, billingInterval, successUrl, cancelUrl } = body;

    // Get price ID
    const priceId = PRICE_IDS[plan][billingInterval];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or billing interval' }, { status: 400 });
    }

    // Create or get Stripe customer
    let customerId = userData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.displayName || userData.email,
        metadata: {
          firebaseUid: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to user document
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUid: userId,
        plan,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          firebaseUid: userId,
          plan,
          billingInterval,
        },
        trial_period_days: plan === 'pro' ? 14 : plan === 'business' ? 30 : undefined,
      },
    });

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
