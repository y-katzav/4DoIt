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
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { 
  ERROR_TEST_SCENARIOS, 
  PAYPAL_ERROR_CODES,
  type ErrorTestConfig
} from '@/lib/paypal-error-testing';
import { type PlanType, type BillingInterval } from '@/lib/paypal';

interface SandboxTestResult {
  success: boolean;
  errorCode?: string;
  message: string;
  subscriptionId?: string;
  approvalUrl?: string;
  paypalErrors?: any[];
  debugId?: string;
  details?: any;
  testInfo?: any;
}

export default function PayPalSandboxTester() {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [customErrorCode, setCustomErrorCode] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [testResults, setTestResults] = useState<SandboxTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const executeTest = async (errorConfig?: ErrorTestConfig, customCode?: number) => {
    setIsLoading(true);
    setCurrentTest(errorConfig?.description || `Testing custom error code ${customCode}` || 'Basic PayPal sandbox test');

    try {
      const testData = {
        plan: selectedPlan,
        billingInterval: selectedInterval,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        ...(errorConfig && { errorTestConfig: errorConfig }),
        ...(customCode && { testErrorCode: customCode }),
      };

      console.log('🧪 Starting sandbox test with:', testData);

      const response = await fetch('/api/test-paypal-sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      const testResult: SandboxTestResult = {
        success: response.ok,
        errorCode: result.errorCode || result.error,
        message: result.message || result.error || 'Test completed',
        subscriptionId: result.subscriptionId,
        approvalUrl: result.approvalUrl,
        paypalErrors: result.paypalErrors,
        debugId: result.debugId,
        details: result.details,
        testInfo: result.testInfo,
      };

      setTestResults(prev => [testResult, ...prev]);

    } catch (error) {
      const testResult: SandboxTestResult = {
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

  const runBasicTest = () => executeTest();
  
  const runPredefinedTest = async () => {
    const scenario = ERROR_TEST_SCENARIOS.find(s => s.name === selectedScenario);
    if (!scenario) return;
    await executeTest(scenario.config);
  };

  const runCustomErrorTest = async () => {
    const errorCode = parseInt(customErrorCode);
    if (isNaN(errorCode)) return;
    await executeTest(undefined, errorCode);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const openApprovalUrl = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏖️ PayPal Sandbox Tester
          </CardTitle>
          <CardDescription>
            Test PayPal API directly with your sandbox credentials. No Firebase required.
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

          {/* Basic Test */}
          <div className="flex gap-2">
            <Button 
              onClick={runBasicTest} 
              disabled={isLoading}
              className="flex-1"
            >
              Test Basic PayPal Integration
            </Button>
          </div>

          {/* Predefined Error Tests */}
          <div>
            <Label htmlFor="scenario">Error Scenarios</Label>
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
                Test Error
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
                Test Code
              </Button>
            </div>
          </div>

          {/* Error Code Reference */}
          <div>
            <Label>Common Error Codes</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Object.entries(PAYPAL_ERROR_CODES).slice(0, 9).map(([key, code]) => (
                <Badge 
                  key={key} 
                  variant="outline" 
                  className="cursor-pointer text-xs justify-center"
                  onClick={() => setCustomErrorCode(code.toString())}
                >
                  {code}: {key.replace(/_/g, ' ').slice(0, 15)}...
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Test Status */}
      {isLoading && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Running Test</AlertTitle>
          <AlertDescription>{currentTest}</AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sandbox Test Results</CardTitle>
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'Success' : 'Error'}
                        </Badge>
                        {result.errorCode && (
                          <Badge variant="outline">{result.errorCode}</Badge>
                        )}
                        {result.debugId && (
                          <Badge variant="secondary">Debug: {result.debugId}</Badge>
                        )}
                        {result.subscriptionId && (
                          <Badge variant="outline">ID: {result.subscriptionId}</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2">{result.message}</p>
                      
                      {result.approvalUrl && (
                        <div className="mb-2">
                          <Button 
                            onClick={() => openApprovalUrl(result.approvalUrl!)}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open PayPal Approval
                          </Button>
                        </div>
                      )}

                      {result.testInfo && (
                        <div className="bg-blue-50 rounded p-3 mt-2">
                          <p className="font-medium text-sm mb-2">Test Info:</p>
                          <div className="text-xs space-y-1">
                            <p><strong>Test Mode:</strong> {result.testInfo.isTestMode ? 'Yes' : 'No'}</p>
                            <p><strong>Sandbox:</strong> {result.testInfo.sandboxMode ? 'Yes' : 'No'}</p>
                            {result.testInfo.appliedErrorTest && (
                              <p><strong>Error Test:</strong> {JSON.stringify(result.testInfo.appliedErrorTest)}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {result.paypalErrors && result.paypalErrors.length > 0 && (
                        <div className="bg-red-50 rounded p-3 mt-2">
                          <p className="font-medium text-sm mb-2">PayPal Errors:</p>
                          {result.paypalErrors.map((error, errorIndex) => (
                            <div key={errorIndex} className="text-xs space-y-1">
                              <p><strong>Code:</strong> {error.errorCode || error.issue}</p>
                              <p><strong>Message:</strong> {error.longMessage || error.description}</p>
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

      {/* Sandbox Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sandbox Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Current Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Environment: {process.env.NODE_ENV}</div>
                <div>PayPal Mode: Sandbox</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Test Tips</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Use sandbox PayPal accounts for testing</li>
                <li>Error codes trigger specific test scenarios</li>
                <li>Approval URLs will redirect to PayPal sandbox</li>
                <li>All transactions are fake in sandbox mode</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
