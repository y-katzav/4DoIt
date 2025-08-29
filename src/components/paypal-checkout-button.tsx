'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { type PlanType, type BillingInterval } from '@/lib/paypal';

interface PayPalCheckoutButtonProps {
  plan: PlanType;
  billingInterval: BillingInterval;
  price: number;
  children?: React.ReactNode;
}

export function PayPalCheckoutButton({ 
  plan, 
  billingInterval, 
  price, 
  children 
}: PayPalCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    
    try {
      const token = await user.getIdToken();
      
      const response = await fetch('/api/create-paypal-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan,
          billingInterval,
          returnUrl: `${window.location.origin}/profile?payment=success`,
          cancelUrl: `${window.location.origin}/profile?payment=cancelled`,
        }),
      });

      const data = await response.json();
      
      if (data.approvalUrl) {
        // Redirect to PayPal for payment
        window.location.href = data.approvalUrl;
      } else if (data.message) {
        // Handle mock/free plan
        console.log(data.message);
        router.push('/profile?payment=success');
      } else {
        throw new Error('Failed to create PayPal order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={loading}
      className="w-full"
    >
      {loading ? 'Processing...' : children || `Pay $${price} with PayPal`}
    </Button>
  );
}
