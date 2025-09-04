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
      
      console.log('Creating PayPal subscription with:', { plan, billingInterval });
      
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

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.approvalUrl) {
        // Check if we're in Codespaces or have CSP issues
        const isCodespaces = window.location.hostname.includes('github.dev');
        
        if (isCodespaces) {
          // Open in new window for Codespaces
          const paypalWindow = window.open(
            data.approvalUrl,
            'paypal_checkout',
            'width=800,height=600,scrollbars=yes,resizable=yes'
          );
          
          if (!paypalWindow) {
            // Fallback to direct redirect if popup blocked
            window.location.href = data.approvalUrl;
          }
        } else {
          // Normal redirect for local/production
          window.location.href = data.approvalUrl;
        }
      } else if (data.message) {
        // Handle mock/free plan
        console.log(data.message);
        router.push('/profile?payment=success');
      } else {
        console.error('No approval URL received:', data);
        throw new Error(data.error || 'Failed to create PayPal subscription');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start checkout process: ${errorMessage}`);
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
