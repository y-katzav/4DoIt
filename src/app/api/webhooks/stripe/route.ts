import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth, db } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const firebaseUid = subscription.metadata.firebaseUid;
  const plan = subscription.metadata.plan;
  
  if (!firebaseUid) {
    console.error('No Firebase UID found in subscription metadata');
    return;
  }

  const subscriptionData = {
    plan: plan || 'pro',
    status: subscription.status,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
  };

  // Update user subscription status
  await db.collection('users').doc(firebaseUid).update({
    subscription: subscriptionData,
    updatedAt: new Date(),
  });

  console.log(`Updated subscription for user ${firebaseUid}:`, subscriptionData);
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const firebaseUid = subscription.metadata.firebaseUid;
  
  if (!firebaseUid) {
    console.error('No Firebase UID found in subscription metadata');
    return;
  }

  // Downgrade to free plan
  await db.collection('users').doc(firebaseUid).update({
    'subscription.plan': 'free',
    'subscription.status': 'canceled',
    'subscription.canceledAt': new Date(),
    updatedAt: new Date(),
  });

  console.log(`Canceled subscription for user ${firebaseUid}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const firebaseUid = subscription.metadata.firebaseUid;
  
  if (!firebaseUid) return;

  // Update payment history
  await db.collection('users').doc(firebaseUid).collection('payments').add({
    invoiceId: invoice.id,
    amount: (invoice as any).amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    paidAt: new Date((invoice as any).status_transitions.paid_at! * 1000),
    createdAt: new Date(),
  });

  console.log(`Payment succeeded for user ${firebaseUid}: ${(invoice as any).amount_paid}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const firebaseUid = subscription.metadata.firebaseUid;
  
  if (!firebaseUid) return;

  // Update user status to indicate payment failure
  await db.collection('users').doc(firebaseUid).update({
    'subscription.status': 'past_due',
    'subscription.lastPaymentFailed': new Date(),
    updatedAt: new Date(),
  });

  // Record failed payment
  await db.collection('users').doc(firebaseUid).collection('payments').add({
    invoiceId: invoice.id,
    amount: (invoice as any).amount_due,
    currency: invoice.currency,
    status: 'failed',
    failedAt: new Date(),
    createdAt: new Date(),
  });

  console.log(`Payment failed for user ${firebaseUid}: ${(invoice as any).amount_due}`);
}
