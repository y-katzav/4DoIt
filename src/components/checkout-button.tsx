'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { LoaderIcon, CreditCard } from 'lucide-react';
import type { PlanType, BillingInterval } from '@/lib/stripe';

interface CheckoutButtonProps {
  plan: PlanType;
  billingInterval: BillingInterval;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function CheckoutButton({ 
  plan, 
  billingInterval, 
  children, 
  disabled = false,
  className = '' 
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleCheckout = async () => {
    // Show deprecation warning and redirect to PayPal
    alert('⚠️ DEPRECATED: This button uses Stripe which has been replaced with PayPal. Please use PayPal checkout buttons instead. Test at: /paypal-test');
    window.location.href = '/paypal-test';
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      className={`w-full ${className}`}
    >
      {isLoading ? (
        <>
          <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children || (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Subscribe
          </>
        )
      )}
    </Button>
  );
}

// Hook for subscription management (DEPRECATED - Use PayPal subscription management)
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // This hook is deprecated - PayPal subscription management should be used instead
  console.warn('⚠️ DEPRECATED: useSubscription hook uses Stripe. Use PayPal subscription management instead.');

  const cancelSubscription = async () => {
    alert('⚠️ DEPRECATED: This function uses Stripe. Please use PayPal subscription management instead.');
    return;
  };

  const updateSubscription = async (newPlan: PlanType, newBillingInterval: BillingInterval) => {
    alert('⚠️ DEPRECATED: This function uses Stripe. Please use PayPal subscription management instead.');
    return;
  };

  return {
    subscription,
    loading,
    cancelSubscription,
    updateSubscription,
  };
}
