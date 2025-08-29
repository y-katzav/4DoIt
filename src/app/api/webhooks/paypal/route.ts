import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the webhook for debugging
    console.log('PayPal webhook received:', body);

    // Handle different event types
    switch (body.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Order was approved, capture it
        await handleOrderApproved(body);
        break;
        
      case 'PAYMENT.CAPTURE.COMPLETED':
        // Payment was completed
        await handlePaymentCompleted(body);
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        // Payment was denied
        await handlePaymentDenied(body);
        break;
        
      default:
        console.log(`Unhandled PayPal webhook event: ${body.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderApproved(webhookBody: any) {
  try {
    const orderId = webhookBody.resource?.id;
    if (!orderId) return;

    console.log(`PayPal order approved: ${orderId}`);
    
    // Find user by order ID
    const usersSnapshot = await db.collection('users')
      .where('paypalOrderId', '==', orderId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for PayPal order: ${orderId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    // Update user status to indicate payment is processing
    await userDoc.ref.update({
      paymentStatus: 'processing',
      updatedAt: new Date(),
    });

    console.log(`Updated user ${userDoc.id} payment status to processing`);
  } catch (error) {
    console.error('Error handling order approved:', error);
  }
}

async function handlePaymentCompleted(webhookBody: any) {
  try {
    const customId = webhookBody.resource?.custom_id;
    const orderId = webhookBody.resource?.supplementary_data?.related_ids?.order_id;
    
    if (!customId && !orderId) {
      console.log('No custom_id or order_id found in payment webhook');
      return;
    }

    console.log(`PayPal payment completed for user: ${customId} order: ${orderId}`);
    
    let userDoc;
    
    if (customId) {
      // Find user by custom ID (user ID)
      userDoc = await db.collection('users').doc(customId).get();
    } else if (orderId) {
      // Find user by order ID
      const usersSnapshot = await db.collection('users')
        .where('paypalOrderId', '==', orderId)
        .get();
      
      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0];
      }
    }
    
    if (!userDoc || !userDoc.exists) {
      console.log(`No user found for PayPal payment: ${customId || orderId}`);
      return;
    }

    const userData = userDoc.data()!;
    const pendingPlan = userData.pendingPlan;
    const pendingBillingInterval = userData.pendingBillingInterval;
    
    if (!pendingPlan || !pendingBillingInterval) {
      console.log(`No pending plan found for user: ${userDoc.id}`);
      return;
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
      updatedAt: now,
    });

    console.log(`Activated ${pendingPlan} plan for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling payment completed:', error);
  }
}

async function handlePaymentDenied(webhookBody: any) {
  try {
    const customId = webhookBody.resource?.custom_id;
    const orderId = webhookBody.resource?.supplementary_data?.related_ids?.order_id;
    
    if (!customId && !orderId) {
      console.log('No custom_id or order_id found in payment denied webhook');
      return;
    }

    console.log(`PayPal payment denied for user: ${customId} order: ${orderId}`);
    
    let userDoc;
    
    if (customId) {
      userDoc = await db.collection('users').doc(customId).get();
    } else if (orderId) {
      const usersSnapshot = await db.collection('users')
        .where('paypalOrderId', '==', orderId)
        .get();
      
      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0];
      }
    }
    
    if (!userDoc || !userDoc.exists) {
      console.log(`No user found for denied PayPal payment: ${customId || orderId}`);
      return;
    }

    // Update user to indicate payment failed
    await userDoc.ref.update({
      paymentStatus: 'failed',
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingAmount: null,
      paypalOrderId: null,
      updatedAt: new Date(),
    });

    console.log(`Payment failed for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling payment denied:', error);
  }
}
