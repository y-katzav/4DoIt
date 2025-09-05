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
        console.log('PayPal approval URL received:', data.approvalUrl);
        
        // בדוק שזו URL תקינה
        try {
          new URL(data.approvalUrl);
        } catch (e) {
          console.error('Invalid PayPal URL:', data.approvalUrl);
          throw new Error('Invalid PayPal approval URL received');
        }
        
        // נסה לפתוח בחלון חדש תחילה (safer approach)
        const paypalWindow = window.open(
          data.approvalUrl,
          'paypal_subscription',
          'width=800,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes'
        );
        
        if (paypalWindow) {
          console.log('PayPal window opened successfully');
          
          // מאזין לסגירת החלון
          const checkClosed = setInterval(() => {
            if (paypalWindow.closed) {
              clearInterval(checkClosed);
              console.log('PayPal window closed, refreshing page...');
              // רענן את הדף כדי לבדוק סטטוס
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }, 1000);
        } else {
          // אם החלון נחסם, נסה redirect
          console.log('Popup blocked, trying redirect...');
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
      
      // טיפול מיוחד בשגיאות PayPal
      if (errorMessage.includes('message channel') || errorMessage.includes('listener')) {
        alert(`
🚨 PayPal Communication Error:
${errorMessage}

💡 Try these solutions:
1. Disable browser extensions (especially ad blockers)
2. Allow pop-ups for this site
3. Clear browser cache and cookies
4. Try in incognito/private mode
5. Make sure JavaScript is enabled

🔧 Technical: This is usually caused by browser security features blocking PayPal's communication.
        `);
      } else {
        alert(`❌ Checkout failed: ${errorMessage}`);
      }
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
