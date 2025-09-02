# PayPal Error Testing Guide

This guide explains how to test PayPal API error conditions in your 4DoIt application to ensure robust error handling.

## Overview

Error testing is essential for building reliable payment systems. This implementation provides comprehensive tools for testing various PayPal error scenarios in sandbox environment.

## Features

### 1. Error Testing Utilities (`src/lib/paypal-error-testing.ts`)

- **Error Code Constants**: All PayPal error codes for easy reference
- **Test Amount Generation**: Automatic generation of test amounts that trigger specific errors
- **Error Parsing**: Standardized parsing of PayPal error responses
- **Test Scenarios**: Predefined error scenarios for common use cases

### 2. Enhanced API Endpoint (`src/app/api/create-paypal-subscription-with-error-handling/route.ts`)

- **Comprehensive Error Handling**: Detailed error responses with proper HTTP status codes
- **Error Testing Support**: Ability to trigger specific errors in sandbox mode
- **PayPal Error Parsing**: Automatic parsing and formatting of PayPal API errors
- **Validation**: Input validation with helpful error messages

### 3. Webhook Error Handling (`src/app/api/webhooks/paypal/route.ts`)

- **Enhanced Logging**: Detailed logging of webhook events and errors
- **Error Recovery**: Graceful handling of webhook processing errors
- **Event Validation**: Validation of webhook payload structure
- **Performance Monitoring**: Processing time tracking

### 4. Error Testing Dashboard (`src/app/paypal-error-test/page.tsx`)

- **Interactive Testing**: Web-based interface for testing different error scenarios
- **Real-time Results**: Immediate feedback on error test results
- **Error Code Reference**: Quick access to all PayPal error codes
- **Webhook Simulation**: Ability to simulate webhook errors

### 5. Enhanced Checkout Button (`src/components/paypal-checkout-button-with-error-handling.tsx`)

- **Visual Error Feedback**: Clear error display with retry options
- **Error Classification**: Automatic determination of retryable vs. permanent errors
- **Test Mode Support**: Built-in support for error testing scenarios

## Testing Error Scenarios

### 1. Amount-Related Errors

These errors are triggered by specifying the error code as a decimal amount:

```javascript
// Trigger error 10755 (unsupported currency)
const testAmount = "107.55";

// Trigger error 10610 (amount limit exceeded)
const testAmount = "106.10";
```

### 2. Field-Related Errors

These errors are triggered by setting specific field values:

```javascript
// Trigger error 10539 (payment declined)
// Set in subscriber.test_trigger field

// Trigger error 10603 (buyer restricted)
// Set in authorization ID or similar field
```

### 3. CVV Testing

Test credit card validation errors:

- **115**: CVV2 matches (no error)
- **116**: CVV2 does not match
- **120**: Transaction not processed
- **123**: Service not supported
- **125**: Service unavailable
- **130**: No response

### 4. Address Verification (AVS) Testing

Test address verification errors:

- **AVS_A**: Address matches, no zip
- **AVS_N**: No address match
- **AVS_P**: Postal code matches, no address
- **AVS_U**: Service unavailable
- **AVS_X**: Exact match (9-digit zip)
- **AVS_Y**: Exact match (5-digit zip)
- **AVS_Z**: Zip matches, no address

## Usage Examples

### 1. Testing in Development

```typescript
// Navigate to error testing page
window.location.href = '/paypal-error-test';

// Or use the enhanced checkout button with error testing
<PayPalCheckoutButtonWithErrorHandling
  plan="pro"
  billingInterval="monthly"
  price={29.99}
  enableErrorTesting={true}
  errorTestConfig={{
    errorCode: 'PAYMENT_DECLINED',
    testType: 'field',
    description: 'Test payment declined scenario'
  }}
  onError={(errors) => console.log('Payment errors:', errors)}
  onSuccess={(subscriptionId) => console.log('Success:', subscriptionId)}
/>
```

### 2. API Error Testing

```typescript
// Test specific error code
const response = await fetch('/api/create-paypal-subscription-with-error-handling', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    plan: 'pro',
    billingInterval: 'monthly',
    returnUrl: '/success',
    cancelUrl: '/cancel',
    testErrorCode: 10755, // Unsupported currency
  }),
});
```

### 3. Webhook Error Simulation

```typescript
// Simulate webhook error
const response = await fetch('/api/simulate-paypal-error', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    errorCode: 10539,
    webhookType: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    subscriptionId: 'test_sub_123',
    userId: 'test_user_123',
  }),
});
```

## Error Handling Best Practices

### 1. User-Friendly Error Messages

Always provide clear, actionable error messages to users:

```typescript
const getErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case '10755':
      return 'This currency is not supported. Please contact support.';
    case '10539':
      return 'Payment was declined. Please try a different payment method.';
    case '10417':
      return 'Insufficient funds. Please check your account balance.';
    default:
      return 'Payment failed. Please try again or contact support.';
  }
};
```

### 2. Retry Logic

Implement appropriate retry logic for transient errors:

```typescript
const isRetryableError = (errorCode: string) => {
  const retryableErrors = ['10001', '10002']; // Internal error, service unavailable
  return retryableErrors.includes(errorCode);
};
```

### 3. Error Logging

Log errors for debugging and monitoring:

```typescript
console.error('PayPal error:', {
  errorCode: error.errorCode,
  message: error.longMessage,
  correlationId: error.correlationId,
  debugId: error.debugId,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
});
```

## Testing Checklist

### Payment Flow Testing

- [ ] Test successful payment creation
- [ ] Test payment declined scenarios
- [ ] Test insufficient funds
- [ ] Test invalid payment methods
- [ ] Test currency/amount errors
- [ ] Test network failures
- [ ] Test timeout scenarios

### Webhook Testing

- [ ] Test subscription activation
- [ ] Test payment completion
- [ ] Test payment failures
- [ ] Test subscription cancellation
- [ ] Test subscription suspension
- [ ] Test subscription expiration
- [ ] Test webhook validation errors

### Error Handling Testing

- [ ] Test error message display
- [ ] Test retry functionality
- [ ] Test permanent vs. temporary error handling
- [ ] Test error logging
- [ ] Test fallback mechanisms

## Environment Configuration

### Sandbox Setup

Ensure your `.env.local` file has sandbox credentials:

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
NODE_ENV=development
```

### Test Mode Detection

The system automatically detects test mode based on:

1. `NODE_ENV !== 'production'`
2. Sandbox PayPal credentials
3. Client ID format (sandbox IDs typically don't start with 'A')

## Troubleshooting

### Common Issues

1. **Error testing not working**: Ensure you're in sandbox mode with test credentials
2. **Webhooks not received**: Check webhook URL configuration in PayPal developer console
3. **Authentication errors**: Verify Firebase admin credentials are configured
4. **Network errors**: Check API endpoint URLs and CORS configuration

### Debug Information

Each API response includes debug information:

```typescript
{
  "error": "PayPal subscription creation failed",
  "errorCode": "PAYPAL_API_ERROR",
  "paypalErrors": [...],
  "debugId": "12345",
  "correlationId": "abcdef",
  "details": {...}
}
```

Use this information to trace issues in PayPal's developer tools.

## Resources

- [PayPal Error Testing Documentation](https://developer.paypal.com/api/rest/sandbox/error-testing/)
- [PayPal Webhooks Documentation](https://developer.paypal.com/api/webhooks/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
