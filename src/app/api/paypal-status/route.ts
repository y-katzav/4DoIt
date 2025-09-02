import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const config = {
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID ? 
        `${process.env.PAYPAL_CLIENT_ID.substring(0, 10)}...` : 
        'Not configured',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET ? 'Configured' : 'Not configured',
      publicClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 
        `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.substring(0, 10)}...` : 
        'Not configured',
      webhookId: process.env.PAYPAL_WEBHOOK_ID || 'Not configured',
      isSandbox: process.env.PAYPAL_CLIENT_ID?.startsWith('A') ? 'Yes (starts with A)' : 'Possibly production',
      environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
    },
    plans: {
      proMonthly: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID || 'Not configured',
      proAnnual: process.env.PAYPAL_PRO_ANNUAL_PLAN_ID || 'Not configured',
      businessMonthly: process.env.PAYPAL_BUSINESS_MONTHLY_PLAN_ID || 'Not configured',
      businessAnnual: process.env.PAYPAL_BUSINESS_ANNUAL_PLAN_ID || 'Not configured',
      enterpriseMonthly: process.env.PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID || 'Not configured',
      enterpriseAnnual: process.env.PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID || 'Not configured',
    },
    urls: {
      apiBase: process.env.NODE_ENV === 'production' ? 
        'https://api.paypal.com' : 
        'https://api.sandbox.paypal.com',
      testEndpoints: [
        '/api/test-paypal-sandbox',
        '/api/create-paypal-subscription',
        '/api/webhooks/paypal'
      ]
    }
  };

  return NextResponse.json({
    status: 'PayPal Configuration Check',
    timestamp: new Date().toISOString(),
    config,
    ready: !!(
      process.env.PAYPAL_CLIENT_ID && 
      process.env.PAYPAL_CLIENT_SECRET && 
      process.env.PAYPAL_PRO_MONTHLY_PLAN_ID
    ),
    recommendations: [
      !process.env.PAYPAL_CLIENT_ID && 'Set PAYPAL_CLIENT_ID in .env.local',
      !process.env.PAYPAL_CLIENT_SECRET && 'Set PAYPAL_CLIENT_SECRET in .env.local',
      !process.env.PAYPAL_PRO_MONTHLY_PLAN_ID && 'Create subscription plans in PayPal dashboard',
      !process.env.PAYPAL_WEBHOOK_ID && 'Set up webhook endpoint in PayPal dashboard'
    ].filter(Boolean)
  });
}
