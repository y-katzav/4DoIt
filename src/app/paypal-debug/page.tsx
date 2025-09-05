'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PayPalCheckoutButton } from '@/components/paypal-checkout-button';
import { DirectPayPalCheckout } from '@/components/direct-paypal-checkout';

export default function PayPalDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkBrowserSettings = () => {
    const info = {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      popupBlocked: false,
      adBlocker: false,
      paypalRumBlocked: false,
      thirdPartyCookies: 'unknown',
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      webGL: false,
      timestamp: new Date().toISOString()
    };

    // Test PayPal RUM blocking
    try {
      fetch('https://www.paypalobjects.com/cdn-cgi/rum?test=1', { mode: 'no-cors' })
        .then(() => {
          info.paypalRumBlocked = false;
        })
        .catch(() => {
          info.paypalRumBlocked = true;
        });
    } catch (e) {
      info.paypalRumBlocked = true;
    }

    // Test popup blocker
    try {
      const testWindow = window.open('', 'test', 'width=1,height=1');
      if (testWindow) {
        testWindow.close();
        info.popupBlocked = false;
      } else {
        info.popupBlocked = true;
      }
    } catch (e) {
      info.popupBlocked = true;
    }

    // Simple ad blocker detection
    const ad = document.createElement('div');
    ad.innerHTML = '&nbsp;';
    ad.className = 'adsbox';
    document.body.appendChild(ad);
    setTimeout(() => {
      info.adBlocker = ad.offsetHeight === 0;
      document.body.removeChild(ad);
      setDebugInfo(info);
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">PayPal Debug & Test</h1>
      
      <div className="grid gap-6">
        {/* Browser Debug */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Browser Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkBrowserSettings} className="mb-4">
              Check Browser Settings
            </Button>
            
            {debugInfo && (
              <div className="bg-gray-100 p-4 rounded text-sm font-mono">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PayPal Test Options */}
        <Card>
          <CardHeader>
            <CardTitle>💳 PayPal Test Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Original PayPal Button (with popup)</h4>
              <PayPalCheckoutButton 
                plan="pro" 
                billingInterval="monthly" 
                price={8}
              >
                Test Original PayPal ($8)
              </PayPalCheckoutButton>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Direct PayPal Redirect (no popup)</h4>
              <DirectPayPalCheckout 
                plan="pro" 
                billingInterval="monthly" 
                price={8}
              >
                Test Direct PayPal ($8)
              </DirectPayPalCheckout>
            </div>
          </CardContent>
        </Card>

        {/* Console Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">1. Open Browser Developer Tools</h4>
                <p className="text-muted-foreground">Press F12 or Right-click → Inspect</p>
              </div>
              
              <div>
                <h4 className="font-medium">2. Go to Console tab</h4>
                <p className="text-muted-foreground">Look for red error messages</p>
              </div>
              
              <div>
                <h4 className="font-medium">3. Test PayPal buttons above</h4>
                <p className="text-muted-foreground">Try both options and check console for errors</p>
              </div>
              
              <div>
                <h4 className="font-medium">4. Common Issues & Solutions</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Pop-up blocked: Allow pop-ups for this site</li>
                  <li>Ad blocker: Disable ad blockers</li>
                  <li>Privacy extensions: Try incognito mode</li>
                  <li>Third-party cookies: Enable in browser settings</li>
                  <li>JavaScript disabled: Enable JavaScript</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
