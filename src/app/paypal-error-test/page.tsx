import PayPalErrorTester from '@/components/paypal-error-tester';

export default function PayPalErrorTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PayPal Error Testing
          </h1>
          <p className="text-gray-600">
            Test different PayPal API error scenarios to ensure robust error handling
          </p>
        </div>
        
        <PayPalErrorTester />
      </div>
    </div>
  );
}
