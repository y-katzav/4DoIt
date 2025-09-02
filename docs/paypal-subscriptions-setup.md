# PayPal Subscriptions Setup Guide

## 🎯 **What You Need to Set Up**

You need to configure **TWO** PayPal tools:

### 1. **PayPal Developer App** (for API access)
### 2. **PayPal Subscription Plans** (for recurring billing)

---

## 🔧 **Step 1: Create PayPal Developer App**

### Go to PayPal Developer Dashboard
1. Visit: https://developer.paypal.com/
2. **Login** with your PayPal Business account
3. **Create App**:
   - Click "Create App"
   - App Name: `4DoIt Task Management`
   - Choose **Sandbox** for testing
   - Features: Check ✅ **Subscriptions**

### Get API Credentials
After creating the app, you'll get:
- **Client ID**: `AeHGxxxxxxxxxxxxxxxxxxxxxxxx`
- **Client Secret**: `ELxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔄 **Step 2: Create Subscription Plans**

### Access PayPal Subscriptions
1. **PayPal Business Dashboard**: https://www.paypal.com/business
2. **Login** to your PayPal Business account
3. **Navigate to**: `Products & Services` → `Subscriptions`
4. Click **"Create Subscription Button"** or **"Create Plan"**

### Create These 6 Plans:

#### **Pro Plans**
1. **Pro Monthly**
   - Name: `4DoIt Pro Monthly`
   - Price: `$8.00 USD`
   - Billing Cycle: `Monthly`
   - Description: `Pro plan with 5 boards and 100 tasks per board`

2. **Pro Annual**
   - Name: `4DoIt Pro Annual`
   - Price: `$80.00 USD`
   - Billing Cycle: `Yearly`
   - Description: `Pro plan with 5 boards and 100 tasks per board (Annual)`

#### **Business Plans**
3. **Business Monthly**
   - Name: `4DoIt Business Monthly`
   - Price: `$20.00 USD`
   - Billing Cycle: `Monthly`
   - Description: `Business plan with 20 boards and 500 tasks per board`

4. **Business Annual**
   - Name: `4DoIt Business Annual`
   - Price: `$200.00 USD`
   - Billing Cycle: `Yearly`
   - Description: `Business plan with 20 boards and 500 tasks per board (Annual)`

#### **Enterprise Plans**
5. **Enterprise Monthly**
   - Name: `4DoIt Enterprise Monthly`
   - Price: `$50.00 USD`
   - Billing Cycle: `Monthly`
   - Description: `Enterprise plan with unlimited boards and tasks`

6. **Enterprise Annual**
   - Name: `4DoIt Enterprise Annual`
   - Price: `$500.00 USD`
   - Billing Cycle: `Yearly`
   - Description: `Enterprise plan with unlimited boards and tasks (Annual)`

### Get Plan IDs
After creating each plan, PayPal will give you **Plan IDs** like:
- `P-5ML4271244454362WXNWU5NQ`
- `P-6ML4271244454362WXNWU6NR`

**Copy these Plan IDs** - you'll need them for the `.env.local` file!

---

## ⚙️ **Step 3: Update .env.local**

Replace the placeholder values in your `.env.local` file:

```bash
# PayPal API Credentials (from Developer App)
PAYPAL_CLIENT_ID=AeHGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AeHGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PayPal Plan IDs (from Subscription Plans)
PAYPAL_PRO_MONTHLY_PLAN_ID=P-5ML4271244454362WXNWU5NQ
PAYPAL_PRO_ANNUAL_PLAN_ID=P-6ML4271244454362WXNWU6NR
PAYPAL_BUSINESS_MONTHLY_PLAN_ID=P-7ML4271244454362WXNWU7NS
PAYPAL_BUSINESS_ANNUAL_PLAN_ID=P-8ML4271244454362WXNWU8NT
PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID=P-9ML4271244454362WXNWU9NU
PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID=P-1ML4271244454362WXNWU1NV
```

---

## 🔗 **Step 4: Set Up Webhooks (Optional)**

### Create Webhook Endpoint
1. In **PayPal Developer Dashboard**
2. Go to your app → **Webhooks**
3. **Add Webhook**:
   - URL: `https://yourdomain.com/api/webhooks/paypal`
   - Events to subscribe to:
     - ✅ `BILLING.SUBSCRIPTION.CREATED`
     - ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
     - ✅ `BILLING.SUBSCRIPTION.PAYMENT.COMPLETED`
     - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
     - ✅ `BILLING.SUBSCRIPTION.SUSPENDED`
     - ✅ `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

### Add Webhook ID to .env.local
```bash
PAYPAL_WEBHOOK_ID=WH-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🧪 **Step 5: Testing**

### Sandbox Testing
1. Use **Sandbox credentials** in `.env.local`
2. Test with PayPal test accounts
3. Verify subscription creation and payments

### Production
1. Create **Live App** in PayPal Developer
2. Create **Live Subscription Plans**
3. Update `.env.local` with **Live credentials**

---

## ✅ **What This Gives You**

### **Automatic Recurring Billing**
- ✅ Customers subscribe once
- ✅ PayPal charges them automatically monthly/yearly
- ✅ No manual renewals needed

### **Subscription Management**
- ✅ Customers can cancel anytime
- ✅ Automatic retry for failed payments
- ✅ Email notifications from PayPal

### **Business Benefits**
- ✅ Predictable recurring revenue
- ✅ Lower churn than manual payments
- ✅ Better customer experience
- ✅ Automatic dunning management

---

## 🎯 **Current Status**

Your app is now configured for **PayPal Subscriptions**! 

### What Works Now:
- ✅ Subscription creation
- ✅ PayPal approval flow
- ✅ Automatic plan activation
- ✅ Webhook processing
- ✅ Subscription management

### Next: Add Your Real Credentials
Replace the placeholder values in `.env.local` with your actual:
1. PayPal Client ID & Secret (from Developer App)
2. PayPal Plan IDs (from Subscription Plans)

Then your users in Israel (and globally) can subscribe with automatic recurring billing! 🇮🇱
