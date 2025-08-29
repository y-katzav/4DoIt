import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - using mock values for development');
}

// Use mock key if real key is not set
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51234567890abcdef';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_mock_pro_monthly',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_mock_pro_annual',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_mock_business_monthly',
    annual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || 'price_mock_business_annual',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_mock_enterprise_monthly',
    annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || 'price_mock_enterprise_annual',
  },
} as const;

export type PlanType = keyof typeof PRICE_IDS;
export type BillingInterval = 'monthly' | 'annual';
