import { NextRequest, NextResponse } from 'next/server';
import { PAYPAL_PLAN_IDS, type PlanType, type BillingInterval } from '@/lib/paypal';
import { verifyIdTokenSafely, db } from '@/lib/firebase-admin';
import { 
  parsePayPalError, 
  isTestMode, 
  type ErrorTestConfig,
  generateTestAmount,
  PAYPAL_ERROR_CODES
} from '@/lib/paypal-error-testing';

interface CreateSubscriptionRequest {
  plan: PlanType;
  billingInterval: BillingInterval;
  returnUrl: string;
  cancelUrl: string;
  // Error testing fields
  errorTestConfig?: ErrorTestConfig;
  testErrorCode?: number;
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
      return NextResponse.json({ 
        error: 'Unauthorized',
        errorCode: 'AUTH_REQUIRED',
        message: 'Authentication token required'
      }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    let userId;

    try {
      decodedToken = await verifyIdTokenSafely(token);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('Firebase auth error:', authError);
      return NextResponse.json({ 
        error: 'Invalid authentication token',
        errorCode: 'AUTH_INVALID',
        message: 'The provided authentication token is invalid or expired'
      }, { status: 401 });
    }

    // Get user data
    let userDoc;
    let userData;

    try {
      userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ 
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
          message: 'User account not found in database'
        }, { status: 404 });
      }
      userData = userDoc.data()!;
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        errorCode: 'DB_ERROR',
        message: 'Failed to retrieve user data'
      }, { status: 500 });
    }

    const body: CreateSubscriptionRequest = await request.json();
    const { 
      plan, 
      billingInterval, 
      returnUrl, 
      cancelUrl, 
      errorTestConfig, 
      testErrorCode 
    } = body;

    // Validate required fields
    if (!plan || !billingInterval || !returnUrl || !cancelUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        errorCode: 'VALIDATION_ERROR',
        message: 'plan, billingInterval, returnUrl, and cancelUrl are required',
        missingFields: [
          !plan && 'plan',
          !billingInterval && 'billingInterval', 
          !returnUrl && 'returnUrl',
          !cancelUrl && 'cancelUrl'
        ].filter(Boolean)
      }, { status: 400 });
    }

    // Get plan ID for subscription
    const planId = PAYPAL_PLAN_IDS[plan][billingInterval];
    if (!planId || planId.includes('mock')) {
      return NextResponse.json({ 
        error: 'Plan not configured',
        errorCode: 'PLAN_NOT_CONFIGURED',
        message: 'Please set up PayPal subscription plans first.',
        planId: planId,
        availablePlans: Object.keys(PAYPAL_PLAN_IDS)
      }, { status: 400 });
    }

    // Get PayPal access token
    // Determine PayPal API base URL based on environment
    const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === 'live' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';

    let authData;
    try {
      const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      authData = await authResponse.json();
      
      if (!authResponse.ok || !authData.access_token) {
        throw new Error(`PayPal auth failed: ${authData.error_description || 'Unknown error'}`);
      }
    } catch (authError) {
      console.error('PayPal authentication error:', authError);
      return NextResponse.json({ 
        error: 'PayPal authentication failed',
        errorCode: 'PAYPAL_AUTH_ERROR',
        message: 'Failed to authenticate with PayPal API',
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Prepare subscription data
    let subscriptionData: any = {
      plan_id: planId,
      subscriber: {
        name: {
          given_name: userData.displayName?.split(' ')[0] || 'User',
          surname: userData.displayName?.split(' ').slice(1).join(' ') || 'Name',
        },
        email_address: userData.email,
      },
      application_context: {
        brand_name: '4DoIt Task Management',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
      custom_id: userId, // Store Firebase UID for webhooks
    };

    // Apply error testing modifications if in test mode
    if (isTestMode() && (errorTestConfig || testErrorCode)) {
      console.log('Applying error test configuration:', { errorTestConfig, testErrorCode });
      
      if (testErrorCode) {
        // Apply custom error code
        subscriptionData = applyErrorTestToSubscription(subscriptionData, testErrorCode);
      } else if (errorTestConfig) {
        // Apply predefined error test
        const errorCode = errorTestConfig.errorCode ? PAYPAL_ERROR_CODES[errorTestConfig.errorCode] : errorTestConfig.customErrorCode;
        if (errorCode) {
          subscriptionData = applyErrorTestToSubscription(subscriptionData, errorCode);
        }
      }
    }

    // Create PayPal subscription
    let subscriptionResult;
    try {
      const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.access_token}`,
          'Accept': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(subscriptionData),
      });

      subscriptionResult = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        // Handle PayPal API errors
        const paypalErrors = parsePayPalError(subscriptionResult);
        console.error('PayPal API error:', subscriptionResult);
        
        return NextResponse.json({ 
          error: 'PayPal subscription creation failed',
          errorCode: 'PAYPAL_API_ERROR',
          message: paypalErrors.length > 0 ? paypalErrors[0].longMessage : 'Unknown PayPal error',
          paypalErrors: paypalErrors,
          debugId: subscriptionResult.debug_id,
          details: subscriptionResult
        }, { status: subscriptionResponse.status });
      }

    } catch (networkError) {
      console.error('Network error calling PayPal:', networkError);
      return NextResponse.json({ 
        error: 'Network error',
        errorCode: 'NETWORK_ERROR',
        message: 'Failed to connect to PayPal API',
        details: networkError instanceof Error ? networkError.message : 'Unknown network error'
      }, { status: 500 });
    }
    
    if (subscriptionResult.id) {
      try {
        // Save subscription info to user document
        await db.collection('users').doc(userId).update({
          paypalSubscriptionId: subscriptionResult.id,
          pendingPlan: plan,
          pendingBillingInterval: billingInterval,
          subscriptionStatus: 'approval_pending',
          updatedAt: new Date(),
          // Store test configuration for debugging
          ...(isTestMode() && (errorTestConfig || testErrorCode) && {
            lastErrorTest: {
              config: errorTestConfig,
              testErrorCode,
              timestamp: new Date(),
            }
          })
        });

        // Find approval URL
        const approvalUrl = subscriptionResult.links?.find(
          (link: any) => link.rel === 'approve'
        )?.href;

        if (!approvalUrl) {
          console.error('No approval URL found in PayPal response:', subscriptionResult);
          return NextResponse.json({ 
            error: 'Missing approval URL',
            errorCode: 'APPROVAL_URL_MISSING',
            message: 'PayPal did not provide an approval URL',
            subscriptionId: subscriptionResult.id,
            subscriptionStatus: subscriptionResult.status
          }, { status: 500 });
        }

        return NextResponse.json({ 
          subscriptionId: subscriptionResult.id,
          approvalUrl: approvalUrl,
          status: subscriptionResult.status,
          // Include test info in development
          ...(isTestMode() && {
            testMode: true,
            appliedErrorTest: errorTestConfig || testErrorCode,
          })
        });

      } catch (dbUpdateError) {
        console.error('Failed to update user subscription data:', dbUpdateError);
        // Subscription was created but we couldn't save to DB
        return NextResponse.json({ 
          warning: 'Subscription created but database update failed',
          subscriptionId: subscriptionResult.id,
          approvalUrl: subscriptionResult.links?.find((link: any) => link.rel === 'approve')?.href,
          status: subscriptionResult.status,
          errorCode: 'DB_UPDATE_ERROR',
          message: 'PayPal subscription created successfully but failed to update user database'
        }, { status: 200 });
      }
    } else {
      console.error('PayPal subscription creation failed:', subscriptionResult);
      const paypalErrors = parsePayPalError(subscriptionResult);
      
      return NextResponse.json({ 
        error: 'Failed to create PayPal subscription',
        errorCode: 'SUBSCRIPTION_CREATION_FAILED',
        message: 'PayPal did not return a subscription ID',
        paypalErrors: paypalErrors,
        debugId: subscriptionResult.debug_id,
        details: subscriptionResult
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error creating PayPal subscription:', error);
    return NextResponse.json({
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while creating the subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Apply error test configuration to subscription data
 * This function modifies the subscription request to trigger specific PayPal errors in sandbox
 */
function applyErrorTestToSubscription(subscriptionData: any, errorCode: number): any {
  const modifiedData = { ...subscriptionData };
  
  // Apply error triggers based on PayPal documentation
  switch (errorCode) {
    case PAYPAL_ERROR_CODES.UNSUPPORTED_CURRENCY:
      // Trigger 10755 - unsupported currency by modifying plan data
      console.log('Applying unsupported currency test (10755)');
      // In real scenario, this would involve creating a plan with unsupported currency
      // For testing, we'll add a test field that sandbox recognizes
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    case PAYPAL_ERROR_CODES.PAYMENT_DECLINED:
      // Trigger 10539 - payment declined
      console.log('Applying payment declined test (10539)');
      modifiedData.subscriber.test_trigger = '10539';
      break;
      
    case PAYPAL_ERROR_CODES.BUYER_RESTRICTED:
      // Trigger 10603 - buyer restricted
      console.log('Applying buyer restricted test (10603)');
      modifiedData.subscriber.test_trigger = '10603';
      break;
      
    case PAYPAL_ERROR_CODES.AMOUNT_LIMIT_EXCEEDED:
      // Trigger 10610 - amount limit exceeded
      console.log('Applying amount limit exceeded test (10610)');
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    case PAYPAL_ERROR_CODES.INSUFFICIENT_FUNDS:
      // Trigger 10417 - insufficient funds
      console.log('Applying insufficient funds test (10417)');
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    default:
      // Generic error trigger
      console.log(`Applying generic error test (${errorCode})`);
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
  }
  
  return modifiedData;
}
