import { 
  Client, 
  Environment,
  OrdersController,
  PaymentsController 
} from '@paypal/paypal-server-sdk';

// PayPal configuration
const environment = process.env.NODE_ENV === 'production' 
  ? Environment.Production 
  : Environment.Sandbox;

if (!process.env.PAYPAL_CLIENT_ID) {
  console.warn('PAYPAL_CLIENT_ID is not set - using mock values for development');
}

if (!process.env.PAYPAL_CLIENT_SECRET) {
  console.warn('PAYPAL_CLIENT_SECRET is not set - using mock values for development');
}

// PayPal client configuration
export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || 'mock_client_id',
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || 'mock_client_secret',
  },
  environment,
});

// PayPal plan IDs for subscriptions
export const PAYPAL_PLAN_IDS = {
  pro: {
    monthly: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID || 'P-mock-pro-monthly',
    annual: process.env.PAYPAL_PRO_ANNUAL_PLAN_ID || 'P-mock-pro-annual',
  },
  business: {
    monthly: process.env.PAYPAL_BUSINESS_MONTHLY_PLAN_ID || 'P-mock-business-monthly',
    annual: process.env.PAYPAL_BUSINESS_ANNUAL_PLAN_ID || 'P-mock-business-annual',
  },
  enterprise: {
    monthly: process.env.PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID || 'P-mock-enterprise-monthly',
    annual: process.env.PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID || 'P-mock-enterprise-annual',
  },
} as const;

export type PlanType = keyof typeof PAYPAL_PLAN_IDS;
export type BillingInterval = 'monthly' | 'annual';

// PayPal client ID for frontend
export const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'mock_client_id';

// Price mapping for display
export const PLAN_PRICES = {
  pro: {
    monthly: 8,
    annual: 80, // $6.67/month when paid annually
  },
  business: {
    monthly: 20,
    annual: 200, // $16.67/month when paid annually
  },
  enterprise: {
    monthly: 50,
    annual: 500, // $41.67/month when paid annually
  },
} as const;
