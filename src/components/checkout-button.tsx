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
    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);

    try {
      // Get user token
      const token = await user.getIdToken();

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan,
          billingInterval,
          successUrl: `${window.location.origin}/dashboard?success=true&plan=${plan}`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      // Handle mock response
      if (data.message) {
        alert(`Demo mode: ${data.message}`);
        return;
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

// Hook for subscription management
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // This would fetch user subscription data from Firestore
  // Implementation depends on your Firebase setup

  const cancelSubscription = async () => {
    if (!user || !subscription?.stripeSubscriptionId) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
        }),
      });

      if (response.ok) {
        // Refresh subscription data
        // setSubscription updated data
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
    }
  };

  const updateSubscription = async (newPlan: PlanType, newBillingInterval: BillingInterval) => {
    if (!user || !subscription?.stripeSubscriptionId) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
          newPlan,
          newBillingInterval,
        }),
      });

      if (response.ok) {
        // Refresh subscription data
      }
    } catch (error) {
      console.error('Update subscription error:', error);
    }
  };

  return {
    subscription,
    loading,
    cancelSubscription,
    updateSubscription,
  };
}
