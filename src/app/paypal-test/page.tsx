'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PayPalCheckoutButton } from '@/components/paypal-checkout-button';
import { Button } from '@/components/ui/button';

export default function PayPalTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>PayPal Subscription Test</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Pro Monthly Plan</h3>
                <p className="text-2xl font-bold">$8 <span className="text-sm font-normal">/month</span></p>
                <p className="text-muted-foreground">Test subscription with PayPal</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan ID:</span>
                  <span className="text-xs font-mono">P-7DS68022LD689611JNCYX72I</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Client ID:</span>
                  <span className="text-xs font-mono">...BCSh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status:</span>
                  <span className="text-xs text-orange-600">
                    {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.includes('your_paypal') 
                      ? 'Mock Mode' 
                      : 'Ready to Test'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="space-y-2">
            <PayPalCheckoutButton
              plan="pro"
              billingInterval="monthly"
              price={8}
            >
              Subscribe with PayPal
            </PayPalCheckoutButton>
            
            <p className="text-xs text-muted-foreground text-center">
              This will create a real PayPal subscription if Client Secret is configured
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
