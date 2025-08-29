import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS, type PlanType, type BillingInterval } from '@/lib/stripe';
import { auth, db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { subscriptionId, newPlan, newBillingInterval } = await request.json();

    if (!subscriptionId || !newPlan || !newBillingInterval) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get new price ID
    const newPriceId = PRICE_IDS[newPlan as PlanType][newBillingInterval as BillingInterval];
    if (!newPriceId) {
      return NextResponse.json({ error: 'Invalid plan or billing interval' }, { status: 400 });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      metadata: {
        ...subscription.metadata,
        plan: newPlan,
        billingInterval: newBillingInterval,
      },
      proration_behavior: 'create_prorations',
    });

    // Update user plan in Firestore
    await db.collection('users').doc(userId).update({
      'subscription.plan': newPlan,
      'subscription.billingInterval': newBillingInterval,
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true,
      subscription: updatedSubscription 
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
