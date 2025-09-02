import { NextRequest, NextResponse } from 'next/server';
import { PAYPAL_PLAN_IDS, type PlanType, type BillingInterval } from '@/lib/paypal';
import { 
  parsePayPalError, 
  isTestMode, 
  type ErrorTestConfig,
  generateTestAmount,
  PAYPAL_ERROR_CODES
} from '@/lib/paypal-error-testing';

interface TestPayPalRequest {
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
    console.log('🧪 Starting PayPal Sandbox Test...');

    // Check if we're in development mode with PayPal
    if (!process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID === 'your_paypal_client_id') {
      return NextResponse.json({ 
        error: 'PayPal not configured',
        message: 'Please configure PayPal sandbox credentials in .env.local',
        setup: {
          required: [
            'PAYPAL_CLIENT_ID',
            'PAYPAL_CLIENT_SECRET', 
            'NEXT_PUBLIC_PAYPAL_CLIENT_ID'
          ]
        }
      }, { status: 400 });
    }

    const body: TestPayPalRequest = await request.json();
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
        message: 'plan, billingInterval, returnUrl, and cancelUrl are required'
      }, { status: 400 });
    }

    // Get plan ID for subscription
    const planId = PAYPAL_PLAN_IDS[plan][billingInterval];
    if (!planId || planId.includes('mock')) {
      return NextResponse.json({ 
        error: 'Plan not configured',
        message: 'Please set up PayPal subscription plans first.',
        planId: planId,
        note: 'This is expected in development - testing error handling'
      }, { status: 400 });
    }

    console.log('📋 Test Configuration:', {
      plan,
      billingInterval,
      planId,
      errorTestConfig,
      testErrorCode,
      isTestMode: isTestMode()
    });

    // Get PayPal access token
    // Use sandbox environment explicitly for testing
    const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === 'live' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';

    let authData;
    try {
      const authUrl = `${paypalBaseUrl}/v1/oauth2/token`;
      console.log('🔐 Getting PayPal access token from:', authUrl);

      const authResponse = await fetch(authUrl, {
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
        console.error('❌ PayPal auth failed:', authData);
        return NextResponse.json({ 
          error: 'PayPal authentication failed',
          message: authData.error_description || 'Failed to get access token',
          details: authData
        }, { status: 401 });
      }

      console.log('✅ PayPal access token obtained successfully');

    } catch (authError) {
      console.error('❌ PayPal authentication error:', authError);
      return NextResponse.json({ 
        error: 'PayPal authentication failed',
        message: 'Network error during authentication',
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Prepare subscription data
    let subscriptionData: any = {
      plan_id: planId,
      subscriber: {
        name: {
          given_name: 'Test',
          surname: 'User',
        },
        email_address: 'test@example.com',
      },
      application_context: {
        brand_name: '4DoIt Task Management - Sandbox Test',
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
      custom_id: 'test_user_' + Date.now(), // Test user ID
    };

    // Apply error testing modifications if in test mode
    if (isTestMode() && (errorTestConfig || testErrorCode)) {
      console.log('🧪 Applying error test configuration:', { errorTestConfig, testErrorCode });
      
      if (testErrorCode) {
        subscriptionData = applyErrorTestToSubscription(subscriptionData, testErrorCode);
      } else if (errorTestConfig) {
        const errorCode = errorTestConfig.errorCode ? PAYPAL_ERROR_CODES[errorTestConfig.errorCode] : errorTestConfig.customErrorCode;
        if (errorCode) {
          subscriptionData = applyErrorTestToSubscription(subscriptionData, errorCode);
        }
      }
    }

    console.log('📦 Creating subscription with data:', {
      plan_id: subscriptionData.plan_id,
      subscriber: subscriptionData.subscriber,
      test_triggers: {
        test_error_trigger: subscriptionData.test_error_trigger,
        test_trigger: subscriptionData.subscriber?.test_trigger
      }
    });

    // Create PayPal subscription
    let subscriptionResult;
    try {
      const subscriptionUrl = `${paypalBaseUrl}/v1/billing/subscriptions`;
      
      const subscriptionResponse = await fetch(subscriptionUrl, {
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
      
      console.log('📨 PayPal API Response:', {
        status: subscriptionResponse.status,
        ok: subscriptionResponse.ok,
        hasId: !!subscriptionResult.id,
        hasErrors: !!subscriptionResult.details,
        debugId: subscriptionResult.debug_id
      });
      
      if (!subscriptionResponse.ok) {
        // Handle PayPal API errors
        const paypalErrors = parsePayPalError(subscriptionResult);
        console.log('⚠️ PayPal API returned error (this may be expected for error testing):', paypalErrors);
        
        return NextResponse.json({ 
          error: 'PayPal subscription creation failed',
          message: paypalErrors.length > 0 ? paypalErrors[0].longMessage : 'Unknown PayPal error',
          paypalErrors: paypalErrors,
          debugId: subscriptionResult.debug_id,
          details: subscriptionResult,
          testInfo: {
            isErrorTest: !!(errorTestConfig || testErrorCode),
            appliedErrorCode: testErrorCode || (errorTestConfig?.errorCode ? PAYPAL_ERROR_CODES[errorTestConfig.errorCode] : errorTestConfig?.customErrorCode)
          }
        }, { status: subscriptionResponse.status });
      }

    } catch (networkError) {
      console.error('❌ Network error calling PayPal:', networkError);
      return NextResponse.json({ 
        error: 'Network error',
        message: 'Failed to connect to PayPal API',
        details: networkError instanceof Error ? networkError.message : 'Unknown network error'
      }, { status: 500 });
    }
    
    if (subscriptionResult.id) {
      // Find approval URL
      const approvalUrl = subscriptionResult.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      if (!approvalUrl) {
        console.error('❌ No approval URL found in PayPal response');
        return NextResponse.json({ 
          error: 'Missing approval URL',
          message: 'PayPal did not provide an approval URL',
          subscriptionId: subscriptionResult.id,
          subscriptionStatus: subscriptionResult.status,
          details: subscriptionResult
        }, { status: 500 });
      }

      console.log('✅ PayPal subscription created successfully:', {
        subscriptionId: subscriptionResult.id,
        status: subscriptionResult.status,
        hasApprovalUrl: !!approvalUrl
      });

      return NextResponse.json({ 
        success: true,
        subscriptionId: subscriptionResult.id,
        approvalUrl: approvalUrl,
        status: subscriptionResult.status,
        testInfo: {
          isTestMode: isTestMode(),
          appliedErrorTest: errorTestConfig || testErrorCode,
          sandboxMode: process.env.NODE_ENV !== 'production'
        },
        details: subscriptionResult
      });

    } else {
      console.error('❌ PayPal subscription creation failed - no ID returned');
      const paypalErrors = parsePayPalError(subscriptionResult);
      
      return NextResponse.json({ 
        error: 'Failed to create PayPal subscription',
        message: 'PayPal did not return a subscription ID',
        paypalErrors: paypalErrors,
        debugId: subscriptionResult.debug_id,
        details: subscriptionResult
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unexpected error in PayPal sandbox test:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during sandbox testing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Apply error test configuration to subscription data for sandbox testing
 */
function applyErrorTestToSubscription(subscriptionData: any, errorCode: number): any {
  const modifiedData = { ...subscriptionData };
  
  console.log(`🧪 Applying error test for code ${errorCode}`);
  
  // Apply error triggers based on PayPal documentation
  switch (errorCode) {
    case PAYPAL_ERROR_CODES.UNSUPPORTED_CURRENCY:
      console.log('→ Testing unsupported currency (10755)');
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    case PAYPAL_ERROR_CODES.PAYMENT_DECLINED:
      console.log('→ Testing payment declined (10539)');
      modifiedData.subscriber.test_trigger = '10539';
      break;
      
    case PAYPAL_ERROR_CODES.BUYER_RESTRICTED:
      console.log('→ Testing buyer restricted (10603)');
      modifiedData.subscriber.test_trigger = '10603';
      break;
      
    case PAYPAL_ERROR_CODES.AMOUNT_LIMIT_EXCEEDED:
      console.log('→ Testing amount limit exceeded (10610)');
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    case PAYPAL_ERROR_CODES.INSUFFICIENT_FUNDS:
      console.log('→ Testing insufficient funds (10417)');
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
      
    default:
      console.log(`→ Testing generic error (${errorCode})`);
      modifiedData.test_error_trigger = generateTestAmount(errorCode);
      break;
  }
  
  return modifiedData;
}
