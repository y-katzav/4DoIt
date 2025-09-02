import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { parsePayPalError } from '@/lib/paypal-error-testing';

interface WebhookResponse {
  received: boolean;
  processedEvents?: string[];
  errors?: any[];
  eventId?: string;
  correlationId?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventId: string | undefined;
  let eventType: string | undefined;
  
  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type for webhook:', contentType);
      return NextResponse.json(
        { 
          error: 'Invalid content type',
          expected: 'application/json',
          received: contentType 
        },
        { status: 400 }
      );
    }

    // Parse webhook body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Extract event metadata
    eventId = body.id;
    eventType = body.event_type;
    const correlationId = body.correlation_id;
    
    // Log the webhook for debugging (truncate large payloads)
    const logBody = JSON.stringify(body).length > 1000 
      ? { ...body, resource: '[TRUNCATED]' }
      : body;
    
    console.log('PayPal webhook received:', {
      eventId,
      eventType,
      correlationId,
      timestamp: new Date().toISOString(),
      body: logBody
    });

    // Validate required webhook fields
    if (!eventId || !eventType) {
      console.error('Missing required webhook fields:', { eventId, eventType });
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missing: [
            !eventId && 'id',
            !eventType && 'event_type'
          ].filter(Boolean)
        },
        { status: 400 }
      );
    }

    // Check for duplicate webhook (optional - implement based on your needs)
    // const isDuplicate = await checkDuplicateWebhook(eventId);
    // if (isDuplicate) {
    //   console.log('Duplicate webhook ignored:', eventId);
    //   return NextResponse.json({ received: true, duplicate: true });
    // }

    const processedEvents: string[] = [];
    const errors: any[] = [];

    // Handle different subscription event types
    try {
      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await handleSubscriptionCreated(body);
          processedEvents.push('CREATED');
          break;
          
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await handleSubscriptionActivated(body);
          processedEvents.push('ACTIVATED');
          break;
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED':
          await handlePaymentCompleted(body);
          processedEvents.push('PAYMENT_COMPLETED');
          break;
          
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await handleSubscriptionCancelled(body);
          processedEvents.push('CANCELLED');
          break;
          
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await handleSubscriptionSuspended(body);
          processedEvents.push('SUSPENDED');
          break;
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          await handlePaymentFailed(body);
          processedEvents.push('PAYMENT_FAILED');
          break;

        case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
          await handleSubscriptionReactivated(body);
          processedEvents.push('REACTIVATED');
          break;

        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await handleSubscriptionExpired(body);
          processedEvents.push('EXPIRED');
          break;
          
        default:
          console.log(`Unhandled PayPal webhook event: ${eventType}`);
          // Still return success for unhandled events to avoid retries
      }
    } catch (handlerError) {
      console.error(`Error handling ${eventType}:`, handlerError);
      errors.push({
        event: eventType,
        error: handlerError instanceof Error ? handlerError.message : 'Unknown error',
        details: handlerError
      });
      
      // For critical errors, we might want to return 500 to trigger PayPal retry
      // For now, we'll log and continue
    }

    const processingTime = Date.now() - startTime;
    console.log(`Webhook ${eventId} processed in ${processingTime}ms`, {
      eventType,
      processedEvents,
      errorCount: errors.length
    });

    const response: WebhookResponse = {
      received: true,
      processedEvents,
      eventId,
      correlationId,
      ...(errors.length > 0 && { errors })
    };

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Critical error processing PayPal webhook:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventId,
      eventType,
      processingTime,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Parse PayPal-specific errors if present
    const paypalErrors = parsePayPalError(error);
    
    return NextResponse.json({
      error: 'Webhook processing failed',
      eventId,
      eventType,
      message: error instanceof Error ? error.message : 'Unknown error',
      paypalErrors: paypalErrors.length > 0 ? paypalErrors : undefined,
      processingTime
    }, { status: 500 });
  }
}

async function handleSubscriptionCreated(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    const customId = webhookBody.resource?.custom_id;
    
    if (!subscriptionId) {
      console.error('Missing subscription ID in creation webhook');
      throw new Error('Subscription ID required for creation webhook');
    }

    console.log(`PayPal subscription created: ${subscriptionId} for user: ${customId}`);
    
    // Update user status to indicate subscription is created but not yet active
    if (customId) {
      const userDoc = await db.collection('users').doc(customId).get();
      if (userDoc.exists) {
        await userDoc.ref.update({
          paypalSubscriptionId: subscriptionId,
          subscriptionStatus: 'created',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        console.error(`User not found for custom ID: ${customId}`);
        throw new Error(`User not found: ${customId}`);
      }
    } else {
      console.warn('No custom_id provided in subscription creation webhook');
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error; // Re-throw to be caught by main handler
  }
}

async function handleSubscriptionActivated(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    const customId = webhookBody.resource?.custom_id;
    
    if (!subscriptionId) {
      console.error('Missing subscription ID in activation webhook');
      throw new Error('Subscription ID required for activation webhook');
    }

    console.log(`PayPal subscription activated: ${subscriptionId}`);
    
    // Find user by subscription ID or custom ID
    let userDoc;
    
    if (customId) {
      userDoc = await db.collection('users').doc(customId).get();
    } else {
      const usersSnapshot = await db.collection('users')
        .where('paypalSubscriptionId', '==', subscriptionId)
        .get();
      
      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0];
      }
    }
    
    if (!userDoc || !userDoc.exists) {
      console.error(`No user found for subscription: ${subscriptionId}`);
      throw new Error(`User not found for subscription: ${subscriptionId}`);
    }

    const userData = userDoc.data()!;
    const pendingPlan = userData.pendingPlan;
    const pendingBillingInterval = userData.pendingBillingInterval;
    
    if (!pendingPlan || !pendingBillingInterval) {
      console.error(`No pending plan found for user: ${userDoc.id}`);
      throw new Error(`Missing pending plan data for user: ${userDoc.id}`);
    }

    // Calculate subscription end date based on billing interval
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    
    if (pendingBillingInterval === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else if (pendingBillingInterval === 'annual') {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      console.error(`Invalid billing interval: ${pendingBillingInterval}`);
      throw new Error(`Invalid billing interval: ${pendingBillingInterval}`);
    }

    // Activate user subscription
    await userDoc.ref.update({
      plan: pendingPlan,
      billingInterval: pendingBillingInterval,
      subscriptionStartDate: now,
      subscriptionEndDate: subscriptionEndDate,
      subscriptionStatus: 'active',
      paymentStatus: 'completed',
      pendingPlan: null,
      pendingBillingInterval: null,
      lastPaymentDate: now,
      activatedAt: now,
      updatedAt: now,
    });

    console.log(`Activated ${pendingPlan} plan for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling subscription activated:', error);
    throw error;
  }
}

async function handlePaymentCompleted(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.billing_agreement_id || webhookBody.resource?.id;
    
    if (!subscriptionId) {
      console.log('No subscription ID found in payment webhook');
      return;
    }

    console.log(`PayPal recurring payment completed for subscription: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data()!;
    
    // Update last payment date and ensure subscription is active
    const now = new Date();
    const updates: any = {
      lastPaymentDate: now,
      subscriptionStatus: 'active',
      paymentStatus: 'completed',
      updatedAt: now,
    };

    // Extend subscription end date if this is a renewal
    if (userData.subscriptionEndDate) {
      const currentEndDate = userData.subscriptionEndDate.toDate();
      const newEndDate = new Date(currentEndDate);
      
      if (userData.billingInterval === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else if (userData.billingInterval === 'annual') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }
      
      updates.subscriptionEndDate = newEndDate;
    }

    await userDoc.ref.update(updates);
    console.log(`Updated payment for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling payment completed:', error);
  }
}

async function handleSubscriptionCancelled(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    
    if (!subscriptionId) return;

    console.log(`PayPal subscription cancelled: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    
    // Update subscription status to cancelled
    // Note: Keep access until current period ends
    await userDoc.ref.update({
      subscriptionStatus: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Cancelled subscription for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handleSubscriptionSuspended(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    
    if (!subscriptionId) return;

    console.log(`PayPal subscription suspended: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    
    // Update subscription status to suspended
    await userDoc.ref.update({
      subscriptionStatus: 'suspended',
      suspendedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Suspended subscription for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling subscription suspended:', error);
  }
}

async function handlePaymentFailed(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.billing_agreement_id;
    
    if (!subscriptionId) {
      console.log('No subscription ID found in payment failed webhook');
      return;
    }

    console.log(`PayPal payment failed for subscription: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    
    // Update payment status to failed
    await userDoc.ref.update({
      paymentStatus: 'failed',
      lastFailedPaymentDate: new Date(),
      failureReason: webhookBody.resource?.failure_reason || 'Payment failed',
      updatedAt: new Date(),
    });

    console.log(`Payment failed for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error; // Re-throw to be caught by main handler
  }
}

async function handleSubscriptionReactivated(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    
    if (!subscriptionId) {
      console.log('No subscription ID found in reactivation webhook');
      return;
    }

    console.log(`PayPal subscription reactivated: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    
    // Reactivate subscription
    await userDoc.ref.update({
      subscriptionStatus: 'active',
      paymentStatus: 'completed',
      reactivatedAt: new Date(),
      suspendedAt: null,
      updatedAt: new Date(),
    });

    console.log(`Reactivated subscription for user ${userDoc.id}`);
  } catch (error) {
    console.error('Error handling subscription reactivated:', error);
    throw error;
  }
}

async function handleSubscriptionExpired(webhookBody: any) {
  try {
    const subscriptionId = webhookBody.resource?.id;
    
    if (!subscriptionId) {
      console.log('No subscription ID found in expiration webhook');
      return;
    }

    console.log(`PayPal subscription expired: ${subscriptionId}`);
    
    // Find user by subscription ID
    const usersSnapshot = await db.collection('users')
      .where('paypalSubscriptionId', '==', subscriptionId)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found for subscription: ${subscriptionId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    
    // Mark subscription as expired and downgrade to free plan
    await userDoc.ref.update({
      subscriptionStatus: 'expired',
      plan: 'free', // Downgrade to free plan
      paymentStatus: 'expired',
      expiredAt: new Date(),
      subscriptionEndDate: new Date(), // Set to current date
      updatedAt: new Date(),
    });

    console.log(`Expired subscription for user ${userDoc.id}, downgraded to free plan`);
  } catch (error) {
    console.error('Error handling subscription expired:', error);
    throw error;
  }
}
