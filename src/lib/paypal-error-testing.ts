import { type PlanType, type BillingInterval } from '@/lib/paypal';

/**
 * PayPal Error Testing Utilities
 * 
 * This module provides utilities for testing PayPal API error conditions
 * in sandbox environment. Based on PayPal's error testing documentation.
 */

// Common PayPal error codes
export const PAYPAL_ERROR_CODES = {
  // Payment errors
  PAYMENT_DECLINED: 10539,
  INSUFFICIENT_FUNDS: 10417,
  CREDIT_CARD_DECLINED: 15005,
  CVV_MISMATCH: 15004,
  EXPIRED_CARD: 15009,
  
  // Amount-related errors
  AMOUNT_LIMIT_EXCEEDED: 10610,
  UNSUPPORTED_CURRENCY: 10755,
  AMOUNT_TOO_SMALL: 10402,
  
  // Account/Authorization errors
  BUYER_RESTRICTED: 10603,
  SELLER_RESTRICTED: 10748,
  AUTHORIZATION_EXPIRED: 10622,
  
  // Subscription errors
  SUBSCRIPTION_CANCELLED: 11084,
  SUBSCRIPTION_SUSPENDED: 21006,
  PLAN_NOT_FOUND: 40405,
  
  // General errors
  INTERNAL_ERROR: 10001,
  TRANSACTION_REFUSED: 10009,
  SERVICE_UNAVAILABLE: 10002,
} as const;

// CVV test codes for credit card validation
export const CVV_TEST_CODES = {
  MATCH: 115,           // CVV2 matches (no error)
  NO_MATCH: 116,        // CVV2 does not match
  NOT_PROCESSED: 120,   // Transaction not processed
  NOT_SUPPORTED: 123,   // Service not supported
  UNAVAILABLE: 125,     // Service unavailable
  NO_RESPONSE: 130,     // No response
} as const;

// AVS test codes for address verification
export const AVS_TEST_CODES = {
  ADDRESS_MATCH_NO_ZIP: 'AVS_A',
  NO_ADDRESS_MATCH: 'AVS_N',
  POSTAL_MATCH_NO_ADDRESS: 'AVS_P',
  SERVICE_UNAVAILABLE: 'AVS_U',
  EXACT_MATCH_9_DIGIT: 'AVS_X',
  EXACT_MATCH_5_DIGIT: 'AVS_Y',
  ZIP_MATCH_NO_ADDRESS: 'AVS_Z',
} as const;

export interface ErrorTestConfig {
  errorCode?: keyof typeof PAYPAL_ERROR_CODES;
  customErrorCode?: number;
  testType: 'amount' | 'field' | 'subscription' | 'cvv' | 'avs';
  description: string;
}

/**
 * Generate a test amount that triggers a specific PayPal error
 * For amount-related errors, use error code as decimal value (e.g., 107.55 for error 10755)
 */
export function generateTestAmount(errorCode: number): string {
  const errorStr = errorCode.toString();
  if (errorStr.length >= 3) {
    // Take last 3 digits and format as currency
    const lastThreeDigits = errorStr.slice(-3);
    const dollars = lastThreeDigits.slice(0, -2) || '0';
    const cents = lastThreeDigits.slice(-2);
    return `${dollars}.${cents}`;
  }
  return `${errorCode}.00`;
}

/**
 * Generate test subscription data with error triggers
 */
export function generateTestSubscriptionData(
  errorConfig: ErrorTestConfig,
  plan: PlanType,
  billingInterval: BillingInterval,
  userId: string
) {
  const baseData = {
    plan,
    billingInterval,
    userId,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
  };

  if (errorConfig.testType === 'amount' && errorConfig.errorCode) {
    const errorCode = PAYPAL_ERROR_CODES[errorConfig.errorCode];
    return {
      ...baseData,
      testAmount: generateTestAmount(errorCode),
      errorTrigger: errorCode,
      description: errorConfig.description,
    };
  }

  if (errorConfig.customErrorCode) {
    return {
      ...baseData,
      testAmount: generateTestAmount(errorConfig.customErrorCode),
      errorTrigger: errorConfig.customErrorCode,
      description: errorConfig.description,
    };
  }

  return baseData;
}

/**
 * Parse PayPal error response and extract meaningful information
 */
export interface PayPalErrorInfo {
  errorCode: string;
  shortMessage: string;
  longMessage: string;
  severity: string;
  correlationId?: string;
  debugId?: string;
}

export function parsePayPalError(error: any): PayPalErrorInfo[] {
  const errors: PayPalErrorInfo[] = [];

  // Handle different error response formats
  if (error.details) {
    // PayPal REST API error format
    error.details.forEach((detail: any) => {
      errors.push({
        errorCode: detail.issue || 'UNKNOWN',
        shortMessage: detail.field || 'Unknown field',
        longMessage: detail.description || 'Unknown error',
        severity: 'Error',
        debugId: error.debug_id,
      });
    });
  } else if (error.L_ERRORCODE0 !== undefined) {
    // Classic API NVP format
    let i = 0;
    while (error[`L_ERRORCODE${i}`] !== undefined) {
      errors.push({
        errorCode: error[`L_ERRORCODE${i}`],
        shortMessage: error[`L_SHORTMESSAGE${i}`] || 'Unknown error',
        longMessage: error[`L_LONGMESSAGE${i}`] || 'Unknown error description',
        severity: error[`L_SEVERITYCODE${i}`] || 'Error',
        correlationId: error.CORRELATIONID,
      });
      i++;
    }
  } else if (error.message) {
    // Generic error format
    errors.push({
      errorCode: error.code || 'GENERIC_ERROR',
      shortMessage: error.message,
      longMessage: error.description || error.message,
      severity: 'Error',
    });
  }

  return errors;
}

/**
 * Common error test scenarios for PayPal integration
 */
export const ERROR_TEST_SCENARIOS = [
  {
    name: 'Payment Declined',
    config: {
      errorCode: 'PAYMENT_DECLINED' as const,
      testType: 'field' as const,
      description: 'Test payment declined by bank',
    },
  },
  {
    name: 'Insufficient Funds',
    config: {
      errorCode: 'INSUFFICIENT_FUNDS' as const,
      testType: 'amount' as const,
      description: 'Test insufficient funds error',
    },
  },
  {
    name: 'Unsupported Currency',
    config: {
      errorCode: 'UNSUPPORTED_CURRENCY' as const,
      testType: 'amount' as const,
      description: 'Test unsupported currency error',
    },
  },
  {
    name: 'Amount Limit Exceeded',
    config: {
      errorCode: 'AMOUNT_LIMIT_EXCEEDED' as const,
      testType: 'amount' as const,
      description: 'Test amount exceeds allowed limit',
    },
  },
  {
    name: 'Buyer Account Restricted',
    config: {
      errorCode: 'BUYER_RESTRICTED' as const,
      testType: 'field' as const,
      description: 'Test buyer account restrictions',
    },
  },
  {
    name: 'CVV Mismatch',
    config: {
      errorCode: 'CVV_MISMATCH' as const,
      testType: 'cvv' as const,
      description: 'Test CVV code validation failure',
    },
  },
  {
    name: 'Service Unavailable',
    config: {
      errorCode: 'SERVICE_UNAVAILABLE' as const,
      testType: 'field' as const,
      description: 'Test PayPal service unavailable',
    },
  },
] as const;

/**
 * Get a specific error test scenario by name
 */
export function getErrorTestScenario(scenarioName: string) {
  return ERROR_TEST_SCENARIOS.find(scenario => scenario.name === scenarioName);
}

/**
 * Check if we're in test mode (sandbox environment)
 */
export function isTestMode(): boolean {
  return process.env.NODE_ENV !== 'production' && 
         (process.env.PAYPAL_CLIENT_ID?.includes('sandbox') || 
          !process.env.PAYPAL_CLIENT_ID?.startsWith('A'));
}

/**
 * Validate error test configuration
 */
export function validateErrorTestConfig(config: ErrorTestConfig): boolean {
  if (!config.testType || !config.description) {
    return false;
  }

  if (config.testType === 'amount' && !config.errorCode && !config.customErrorCode) {
    return false;
  }

  return true;
}
