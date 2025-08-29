# Stripe Configuration for 4DoIt

## Environment Variables Needed

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs from Stripe Dashboard
STRIPE_PRO_MONTHLY_PRICE_ID=price_pro_monthly_id
STRIPE_PRO_ANNUAL_PRICE_ID=price_pro_annual_id
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_business_monthly_id
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_business_annual_id
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_enterprise_monthly_id
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_enterprise_annual_id
```

## Stripe Products Setup

1. Create products in Stripe Dashboard:
   - **4DoIt Pro**: $8/month, $80/year
   - **4DoIt Business**: $20/month, $200/year  
   - **4DoIt Enterprise**: $50/month, $500/year

2. Copy the price IDs to environment variables

3. Set up webhooks endpoint: `https://yourdomain.com/api/webhooks/stripe`

## Required Webhooks Events

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
