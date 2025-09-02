'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bug, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { 
  ERROR_TEST_SCENARIOS, 
  PAYPAL_ERROR_CODES,
  CVV_TEST_CODES,
  AVS_TEST_CODES,
  generateTestAmount,
  parsePayPalError,
  isTestMode,
  type ErrorTestConfig,
  type PayPalErrorInfo
} from '@/lib/paypal-error-testing';
import { type PlanType, type BillingInterval } from '@/lib/paypal';

interface ErrorTestResult {
  success: boolean;
  errorCode?: string;
  message: string;
  paypalErrors?: PayPalErrorInfo[];
  debugId?: string;
  details?: any;
}

export default function PayPalErrorTester() {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [customErrorCode, setCustomErrorCode] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [testResults, setTestResults] = useState<ErrorTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  if (!isTestMode()) {
    return (
      <Alert className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Production Mode</AlertTitle>
        <AlertDescription>
          Error testing is only available in sandbox/development mode. 
          Make sure you're using sandbox PayPal credentials.
        </AlertDescription>
      </Alert>
    );
  }

  const executeErrorTest = async (errorConfig: ErrorTestConfig, customCode?: number) => {
    setIsLoading(true);
    setCurrentTest(errorConfig.description);

    try {
      const testData = {
        plan: selectedPlan,
        billingInterval: selectedInterval,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        errorTestConfig: errorConfig,
        testErrorCode: customCode,
      };

      // Use the enhanced API endpoint
      const response = await fetch('/api/create-paypal-subscription-with-error-handling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      const testResult: ErrorTestResult = {
        success: response.ok,
        errorCode: result.errorCode,
        message: result.message || result.error || 'Unknown response',
        paypalErrors: result.paypalErrors,
        debugId: result.debugId,
        details: result,
      };

      setTestResults(prev => [testResult, ...prev]);

    } catch (error) {
      const testResult: ErrorTestResult = {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
      };
      
      setTestResults(prev => [testResult, ...prev]);
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const runWebhookErrorTest = async (errorCode: number, webhookType: string) => {
    setIsLoading(true);
    setCurrentTest(`Testing webhook error ${errorCode} for ${webhookType}`);

    try {
      const response = await fetch('/api/simulate-paypal-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorCode,
          webhookType,
          subscriptionId: 'test_sub_' + Date.now(),
          userId: 'test_user_' + Date.now(),
        }),
      });

      const result = await response.json();
      
      const testResult: ErrorTestResult = {
        success: response.ok,
        errorCode: result.errorCode || errorCode.toString(),
        message: result.message || `Webhook simulation completed`,
        details: result,
      };

      setTestResults(prev => [testResult, ...prev]);

    } catch (error) {
      const testResult: ErrorTestResult = {
        success: false,
        errorCode: 'WEBHOOK_ERROR',
        message: error instanceof Error ? error.message : 'Webhook simulation failed',
      };
      
      setTestResults(prev => [testResult, ...prev]);
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const runPredefinedTest = async () => {
    const scenario = ERROR_TEST_SCENARIOS.find(s => s.name === selectedScenario);
    if (!scenario) return;

    await executeErrorTest(scenario.config);
  };

  const runCustomErrorTest = async () => {
    const errorCode = parseInt(customErrorCode);
    if (isNaN(errorCode)) return;

    const config: ErrorTestConfig = {
      customErrorCode: errorCode,
      testType: 'amount',
      description: `Custom error test: ${errorCode}`,
    };

    await executeErrorTest(config, errorCode);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Mock function - replace with your actual auth token retrieval
  const getAuthToken = async (): Promise<string> => {
    // For development/testing, we'll use a mock token
    // In a real app, get this from your auth context/provider
    try {
      // Try to get real auth token if available
      const { user } = useAuth();
      if (user) {
        return await user.getIdToken();
      }
    } catch (error) {
      console.warn('Failed to get real auth token, using mock for testing');
    }
    
    // Return mock token for testing
    return 'mock_auth_token_for_testing';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            PayPal Error Testing Dashboard
          </CardTitle>
          <CardDescription>
            Test different PayPal API error scenarios in sandbox environment.
            This helps ensure your application handles payment errors gracefully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan">Test Plan</Label>
              <Select value={selectedPlan} onValueChange={(value: PlanType) => setSelectedPlan(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro Plan</SelectItem>
                  <SelectItem value="business">Business Plan</SelectItem>
                  <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="interval">Billing Interval</Label>
              <Select value={selectedInterval} onValueChange={(value: BillingInterval) => setSelectedInterval(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Predefined Error Tests */}
          <div>
            <Label htmlFor="scenario">Predefined Error Scenarios</Label>
            <div className="flex gap-2 mt-2">
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select error scenario" />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_TEST_SCENARIOS.map((scenario) => (
                    <SelectItem key={scenario.name} value={scenario.name}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={runPredefinedTest} 
                disabled={!selectedScenario || isLoading}
              >
                Test Scenario
              </Button>
            </div>
          </div>

          {/* Custom Error Code Test */}
          <div>
            <Label htmlFor="customError">Custom Error Code</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Enter PayPal error code (e.g., 10755)"
                value={customErrorCode}
                onChange={(e) => setCustomErrorCode(e.target.value)}
                type="number"
              />
              <Button 
                onClick={runCustomErrorTest} 
                disabled={!customErrorCode || isLoading}
                variant="outline"
              >
                Test Custom Code
              </Button>
            </div>
          </div>

          {/* Error Code Reference */}
          <div>
            <Label>Common Error Codes Reference</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Object.entries(PAYPAL_ERROR_CODES).map(([key, code]) => (
                <Badge 
                  key={key} 
                  variant="outline" 
                  className="cursor-pointer text-xs"
                  onClick={() => setCustomErrorCode(code.toString())}
                >
                  {code}: {key.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Webhook Error Testing */}
          <div>
            <Label>Webhook Error Testing</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <Button 
                onClick={() => runWebhookErrorTest(PAYPAL_ERROR_CODES.PAYMENT_DECLINED, 'BILLING.SUBSCRIPTION.PAYMENT.FAILED')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Test Payment Failed Webhook
              </Button>
              <Button 
                onClick={() => runWebhookErrorTest(PAYPAL_ERROR_CODES.INSUFFICIENT_FUNDS, 'BILLING.SUBSCRIPTION.SUSPENDED')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Test Suspension Webhook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Test Status */}
      {isLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4 animate-spin" />
          <AlertTitle>Running Test</AlertTitle>
          <AlertDescription>{currentTest}</AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Test Results</CardTitle>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'Success' : 'Error'}
                        </Badge>
                        {result.errorCode && (
                          <Badge variant="outline">{result.errorCode}</Badge>
                        )}
                        {result.debugId && (
                          <Badge variant="secondary">Debug: {result.debugId}</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2">{result.message}</p>
                      
                      {result.paypalErrors && result.paypalErrors.length > 0 && (
                        <div className="bg-gray-50 rounded p-3 mt-2">
                          <p className="font-medium text-sm mb-2">PayPal Errors:</p>
                          {result.paypalErrors.map((error, errorIndex) => (
                            <div key={errorIndex} className="text-xs space-y-1">
                              <p><strong>Code:</strong> {error.errorCode}</p>
                              <p><strong>Message:</strong> {error.longMessage}</p>
                              {error.correlationId && (
                                <p><strong>Correlation ID:</strong> {error.correlationId}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer">Full Response</summary>
                          <Textarea
                            value={JSON.stringify(result.details, null, 2)}
                            readOnly
                            className="mt-2 text-xs font-mono"
                            rows={6}
                          />
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Testing Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Error Testing Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Amount-Related Errors</h4>
              <p>For errors related to transaction amounts, specify the error code as a numeric value with two decimal places. 
                 For example, 107.55 triggers error code 10755 (unsupported currency).</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Field-Related Errors</h4>
              <p>For errors not related to amounts, specify the full error code in the appropriate field. 
                 For example, 10603 triggers "buyer account restricted" error.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">CVV Testing</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(CVV_TEST_CODES).map(([key, code]) => (
                  <div key={key}>
                    <Badge variant="outline" className="mr-2">{code}</Badge>
                    {key.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Important Notes</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Error testing only works in PayPal sandbox environment</li>
                <li>Some errors may require specific account settings to trigger</li>
                <li>Multiple error responses may be returned for certain error codes</li>
                <li>Always test both positive and negative scenarios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
