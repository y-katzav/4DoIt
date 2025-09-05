'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { type PlanType, type BillingInterval } from '@/lib/paypal';
import { ExternalLink } from 'lucide-react';

interface DirectPayPalCheckoutProps {
  plan: PlanType;
  billingInterval: BillingInterval;
  price: number;
  children?: React.ReactNode;
}

export function DirectPayPalCheckout({ 
  plan, 
  billingInterval, 
  price, 
  children 
}: DirectPayPalCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleDirectRedirect = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    
    try {
      const token = await user.getIdToken();
      
      console.log('Creating direct PayPal redirect...');
      
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
        console.log('Direct redirecting to PayPal...');
        // Direct redirect - no popup, no JavaScript SDK
        window.location.replace(data.approvalUrl);
      } else if (data.message) {
        router.push('/profile?payment=success');
      } else {
        throw new Error(data.error || 'Failed to create PayPal subscription');
      }
    } catch (error) {
      console.error('Direct checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Direct checkout failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleDirectRedirect} 
        disabled={loading}
        className="w-full"
        variant="default"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {loading ? 'Redirecting...' : children || `Pay $${price} - Direct PayPal`}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Direct redirect to PayPal (bypasses popup issues)
      </p>
    </div>
  );
}
