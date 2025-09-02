'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { type PlanType, type BillingInterval } from '@/lib/paypal';
import { 
  parsePayPalError, 
  isTestMode,
  type PayPalErrorInfo,
  type ErrorTestConfig 
} from '@/lib/paypal-error-testing';

interface PayPalCheckoutButtonWithErrorHandlingProps {
  plan: PlanType;
  billingInterval: BillingInterval;
  price: number;
  children?: React.ReactNode;
  // Error testing props
  enableErrorTesting?: boolean;
  errorTestConfig?: ErrorTestConfig;
  onError?: (error: PayPalErrorInfo[]) => void;
  onSuccess?: (subscriptionId: string) => void;
}

interface CheckoutState {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorDetails?: {
    message: string;
    errorCode?: string;
    paypalErrors?: PayPalErrorInfo[];
    debugId?: string;
    canRetry: boolean;
  };
  subscriptionId?: string;
}

export function PayPalCheckoutButtonWithErrorHandling({ 
  plan, 
  billingInterval, 
  price, 
  children,
  enableErrorTesting = false,
  errorTestConfig,
  onError,
  onSuccess
}: PayPalCheckoutButtonWithErrorHandlingProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ status: 'idle' });
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setCheckoutState({ status: 'loading' });
    
    try {
      const token = await user.getIdToken();
      
      console.log('Creating PayPal subscription with:', { 
        plan, 
        billingInterval,
        errorTestConfig: enableErrorTesting ? errorTestConfig : undefined
      });

      // Choose API endpoint based on error testing mode
      const endpoint = enableErrorTesting 
        ? '/api/create-paypal-subscription-with-error-handling'
        : '/api/create-paypal-subscription';
      
      const requestBody: any = {
        plan,
        billingInterval,
        returnUrl: `${window.location.origin}/profile?payment=success`,
        cancelUrl: `${window.location.origin}/profile?payment=cancelled`,
      };

      // Add error testing configuration if enabled
      if (enableErrorTesting && errorTestConfig) {
        requestBody.errorTestConfig = errorTestConfig;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Success case
        if (data.approvalUrl) {
          setCheckoutState({ 
            status: 'success',
            subscriptionId: data.subscriptionId 
          });
          
          onSuccess?.(data.subscriptionId);
          
          // Redirect to PayPal for subscription approval
          window.location.href = data.approvalUrl;
        } else if (data.message) {
          // Handle mock/free plan
          setCheckoutState({ status: 'success' });
          router.push('/profile?payment=success');
        } else {
          throw new Error('No approval URL received');
        }
      } else {
        // Error case - parse PayPal errors
        const paypalErrors = data.paypalErrors || parsePayPalError(data);
        
        const errorDetails = {
          message: data.message || data.error || 'Unknown error occurred',
          errorCode: data.errorCode,
          paypalErrors: paypalErrors,
          debugId: data.debugId,
          canRetry: isRetryableError(data.errorCode, paypalErrors),
        };

        setCheckoutState({ 
          status: 'error',
          errorDetails 
        });

        onError?.(paypalErrors);
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Network error occurred',
        errorCode: 'NETWORK_ERROR',
        canRetry: true,
      };

      setCheckoutState({ 
        status: 'error',
        errorDetails 
      });
    }
  };

  const retryCheckout = () => {
    setCheckoutState({ status: 'idle' });
  };

  const isRetryableError = (errorCode?: string, paypalErrors?: PayPalErrorInfo[]): boolean => {
    // Network errors and service unavailable errors can be retried
    const retryableErrorCodes = [
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE', 
      'INTERNAL_ERROR',
      'PAYPAL_AUTH_ERROR'
    ];

    if (errorCode && retryableErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check PayPal-specific retryable errors
    const retryablePayPalCodes = ['10002', '10001']; // Service unavailable, internal error
    return paypalErrors?.some(error => 
      retryablePayPalCodes.includes(error.errorCode)
    ) ?? false;
  };

  const getButtonText = () => {
    switch (checkoutState.status) {
      case 'loading':
        return 'Processing...';
      case 'success':
        return 'Redirecting to PayPal...';
      case 'error':
        return checkoutState.errorDetails?.canRetry ? 'Retry Payment' : 'Payment Failed';
      default:
        return children || `Pay $${price} with PayPal`;
    }
  };

  const getButtonIcon = () => {
    switch (checkoutState.status) {
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={checkoutState.status === 'error' && checkoutState.errorDetails?.canRetry ? retryCheckout : handleCheckout}
        disabled={checkoutState.status === 'loading' || checkoutState.status === 'success' || 
                 (checkoutState.status === 'error' && !checkoutState.errorDetails?.canRetry)}
        className="w-full"
        variant={checkoutState.status === 'error' ? 'destructive' : 'default'}
      >
        <span className="flex items-center gap-2">
          {getButtonIcon()}
          {getButtonText()}
        </span>
      </Button>

      {/* Error Display */}
      {checkoutState.status === 'error' && checkoutState.errorDetails && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Payment Error
            {checkoutState.errorDetails.errorCode && (
              <Badge variant="outline" className="text-xs">
                {checkoutState.errorDetails.errorCode}
              </Badge>
            )}
            {checkoutState.errorDetails.debugId && (
              <Badge variant="secondary" className="text-xs">
                Debug: {checkoutState.errorDetails.debugId}
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{checkoutState.errorDetails.message}</p>
              
              {checkoutState.errorDetails.paypalErrors && checkoutState.errorDetails.paypalErrors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-sm">PayPal Error Details:</p>
                  {checkoutState.errorDetails.paypalErrors.map((error, index) => (
                    <div key={index} className="text-xs mt-1 p-2 bg-red-50 rounded">
                      <p><strong>Code:</strong> {error.errorCode}</p>
                      <p><strong>Message:</strong> {error.longMessage}</p>
                      {error.correlationId && (
                        <p><strong>Correlation ID:</strong> {error.correlationId}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {checkoutState.errorDetails.canRetry && (
                <p className="text-sm mt-2">
                  This error may be temporary. You can try again by clicking the button above.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Mode Warning */}
      {enableErrorTesting && isTestMode() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Test Mode</AlertTitle>
          <AlertDescription>
            Error testing is enabled. This payment will trigger simulated errors for testing purposes.
            {errorTestConfig && (
              <div className="mt-2">
                <Badge variant="outline">{errorTestConfig.description}</Badge>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
