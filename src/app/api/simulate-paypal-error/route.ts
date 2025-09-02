import { NextRequest, NextResponse } from 'next/server';
import { 
  PAYPAL_ERROR_CODES, 
  generateTestAmount,
  isTestMode 
} from '@/lib/paypal-error-testing';

interface SimulateErrorRequest {
  errorCode: number;
  webhookType: string;
  subscriptionId?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  // Only allow in test mode
  if (!isTestMode()) {
    return NextResponse.json(
      { error: 'Error simulation only available in test mode' },
      { status: 403 }
    );
  }

  try {
    const body: SimulateErrorRequest = await request.json();
    const { errorCode, webhookType, subscriptionId = 'test_sub_123', userId = 'test_user_123' } = body;

    // Generate a simulated webhook payload with error conditions
    const simulatedWebhook = generateSimulatedWebhook(
      webhookType,
      errorCode,
      subscriptionId,
      userId
    );

    // Send the simulated webhook to our webhook handler
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/paypal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simulatedWebhook),
    });

    const webhookResult = await webhookResponse.json();

    return NextResponse.json({
      message: 'Error simulation completed',
      errorCode,
      webhookType,
      simulatedWebhook,
      webhookResponse: {
        status: webhookResponse.status,
        result: webhookResult,
      },
      testMode: true,
    });

  } catch (error) {
    console.error('Error in simulation:', error);
    return NextResponse.json(
      { 
        error: 'Simulation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateSimulatedWebhook(
  webhookType: string, 
  errorCode: number, 
  subscriptionId: string, 
  userId: string
) {
  const baseWebhook = {
    id: `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    create_time: new Date().toISOString(),
    resource_type: 'subscription',
    event_type: webhookType,
    summary: `Simulated ${webhookType} with error ${errorCode}`,
    correlation_id: `CORR-${Date.now()}`,
  };

  switch (webhookType) {
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      return {
        ...baseWebhook,
        resource: {
          id: subscriptionId,
          billing_agreement_id: subscriptionId,
          custom_id: userId,
          status: 'SUSPENDED',
          failure_reason: getErrorMessage(errorCode),
          last_payment: {
            amount: {
              currency_code: 'USD',
              value: generateTestAmount(errorCode),
            },
            status: 'FAILED',
            status_details: {
              reason: getErrorReason(errorCode),
            },
          },
        },
      };

    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      return {
        ...baseWebhook,
        resource: {
          id: subscriptionId,
          custom_id: userId,
          status: 'SUSPENDED',
          status_update_time: new Date().toISOString(),
          status_change_note: `Suspended due to error ${errorCode}: ${getErrorMessage(errorCode)}`,
        },
      };

    case 'BILLING.SUBSCRIPTION.CANCELLED':
      return {
        ...baseWebhook,
        resource: {
          id: subscriptionId,
          custom_id: userId,
          status: 'CANCELLED',
          status_update_time: new Date().toISOString(),
          status_change_note: `Cancelled due to error ${errorCode}: ${getErrorMessage(errorCode)}`,
        },
      };

    case 'BILLING.SUBSCRIPTION.EXPIRED':
      return {
        ...baseWebhook,
        resource: {
          id: subscriptionId,
          custom_id: userId,
          status: 'EXPIRED',
          status_update_time: new Date().toISOString(),
        },
      };

    default:
      return {
        ...baseWebhook,
        resource: {
          id: subscriptionId,
          custom_id: userId,
          status: 'UNKNOWN',
          error_code: errorCode,
          error_message: getErrorMessage(errorCode),
        },
      };
  }
}

function getErrorMessage(errorCode: number): string {
  const errorMap: Record<number, string> = {
    [PAYPAL_ERROR_CODES.PAYMENT_DECLINED]: 'Payment was declined by the bank',
    [PAYPAL_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds in account',
    [PAYPAL_ERROR_CODES.CREDIT_CARD_DECLINED]: 'Credit card was declined',
    [PAYPAL_ERROR_CODES.CVV_MISMATCH]: 'CVV code does not match',
    [PAYPAL_ERROR_CODES.EXPIRED_CARD]: 'Credit card has expired',
    [PAYPAL_ERROR_CODES.AMOUNT_LIMIT_EXCEEDED]: 'Amount exceeds limit',
    [PAYPAL_ERROR_CODES.UNSUPPORTED_CURRENCY]: 'Currency not supported',
    [PAYPAL_ERROR_CODES.BUYER_RESTRICTED]: 'Buyer account is restricted',
    [PAYPAL_ERROR_CODES.SELLER_RESTRICTED]: 'Seller account is restricted',
    [PAYPAL_ERROR_CODES.SERVICE_UNAVAILABLE]: 'PayPal service temporarily unavailable',
  };

  return errorMap[errorCode] || `Unknown error (${errorCode})`;
}

function getErrorReason(errorCode: number): string {
  const reasonMap: Record<number, string> = {
    [PAYPAL_ERROR_CODES.PAYMENT_DECLINED]: 'DECLINED',
    [PAYPAL_ERROR_CODES.INSUFFICIENT_FUNDS]: 'INSUFFICIENT_FUNDS',
    [PAYPAL_ERROR_CODES.CREDIT_CARD_DECLINED]: 'DECLINED',
    [PAYPAL_ERROR_CODES.CVV_MISMATCH]: 'CVV_FAILURE',
    [PAYPAL_ERROR_CODES.EXPIRED_CARD]: 'EXPIRED_CARD',
    [PAYPAL_ERROR_CODES.AMOUNT_LIMIT_EXCEEDED]: 'LIMIT_EXCEEDED',
    [PAYPAL_ERROR_CODES.BUYER_RESTRICTED]: 'RESTRICTED_ACCOUNT',
    [PAYPAL_ERROR_CODES.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  };

  return reasonMap[errorCode] || 'UNKNOWN_ERROR';
}

// GET endpoint to list available error codes for testing
export async function GET() {
  if (!isTestMode()) {
    return NextResponse.json(
      { error: 'Error simulation only available in test mode' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Available error codes for simulation',
    errorCodes: PAYPAL_ERROR_CODES,
    supportedWebhookTypes: [
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      'BILLING.SUBSCRIPTION.SUSPENDED',
      'BILLING.SUBSCRIPTION.CANCELLED',
      'BILLING.SUBSCRIPTION.EXPIRED',
    ],
    usage: {
      endpoint: '/api/simulate-paypal-error',
      method: 'POST',
      body: {
        errorCode: 'number (required)',
        webhookType: 'string (required)',
        subscriptionId: 'string (optional)',
        userId: 'string (optional)',
      },
    },
    testMode: true,
  });
}
