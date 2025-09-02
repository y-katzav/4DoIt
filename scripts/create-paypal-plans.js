#!/usr/bin/env node

/**
 * PayPal Plans Creator for Sandbox
 * 
 * This script creates all required PayPal subscription plans via API
 * since PayPal sandbox doesn't allow creating plans through UI.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

const PAYPAL_BASE_URL = PAYPAL_ENVIRONMENT === 'live' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

// Plan definitions
const PLANS_CONFIG = {
  pro: {
    name: '4DoIt Pro Plan',
    description: 'Professional task management with advanced features',
    monthly: { amount: '9.99', interval: 'MONTH' },
    annual: { amount: '99.99', interval: 'YEAR' }
  },
  business: {
    name: '4DoIt Business Plan', 
    description: 'Business-grade task management for teams',
    monthly: { amount: '19.99', interval: 'MONTH' },
    annual: { amount: '199.99', interval: 'YEAR' }
  },
  enterprise: {
    name: '4DoIt Enterprise Plan',
    description: 'Enterprise task management with unlimited features',
    monthly: { amount: '49.99', interval: 'MONTH' },
    annual: { amount: '499.99', interval: 'YEAR' }
  }
};

class PayPalPlanCreator {
  constructor() {
    this.accessToken = null;
    this.createdPlans = {};
  }

  async getAccessToken() {
    console.log('🔐 Getting PayPal access token...');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    console.log('✅ Access token obtained');
  }

  async createProduct(planKey, planConfig) {
    console.log(`📦 Creating product for ${planKey}...`);

    const productData = {
      name: planConfig.name,
      description: planConfig.description,
      type: 'SERVICE',
      category: 'SOFTWARE'
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create product ${planKey}: ${response.status} ${error}`);
    }

    const product = await response.json();
    console.log(`✅ Product created: ${product.id}`);
    return product.id;
  }

  async createPlan(planKey, interval, productId, planConfig) {
    const intervalConfig = planConfig[interval];
    const planName = `${planConfig.name} - ${interval === 'monthly' ? 'Monthly' : 'Annual'}`;
    
    console.log(`📋 Creating ${interval} plan for ${planKey}...`);

    const planData = {
      product_id: productId,
      name: planName,
      description: `${planConfig.description} - billed ${interval === 'monthly' ? 'monthly' : 'annually'}`,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: intervalConfig.interval,
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: intervalConfig.amount,
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0',
        inclusive: false
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create plan ${planKey} ${interval}: ${response.status} ${error}`);
    }

    const plan = await response.json();
    console.log(`✅ Plan created: ${plan.id}`);
    return plan.id;
  }

  async createAllPlans() {
    console.log('🚀 Starting PayPal plans creation...');
    console.log(`Environment: ${PAYPAL_ENVIRONMENT}`);
    console.log(`API Base URL: ${PAYPAL_BASE_URL}`);
    console.log('');

    // Validate credentials
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('Missing PayPal credentials! Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local');
    }

    await this.getAccessToken();
    console.log('');

    // Create products and plans
    for (const [planKey, planConfig] of Object.entries(PLANS_CONFIG)) {
      try {
        console.log(`🔄 Processing ${planKey} plan...`);
        
        // Create product first
        const productId = await this.createProduct(planKey, planConfig);
        
        // Create monthly plan
        const monthlyPlanId = await this.createPlan(planKey, 'monthly', productId, planConfig);
        
        // Create annual plan  
        const annualPlanId = await this.createPlan(planKey, 'annual', productId, planConfig);
        
        // Store results
        this.createdPlans[planKey] = {
          productId,
          monthly: monthlyPlanId,
          annual: annualPlanId
        };
        
        console.log(`✅ ${planKey} plan completed`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Failed to create ${planKey} plan:`, error.message);
        throw error;
      }
    }
  }

  generateEnvUpdates() {
    console.log('📝 Generating environment variable updates...');
    console.log('');
    console.log('Copy these lines to your .env.local file:');
    console.log('='.repeat(50));
    
    for (const [planKey, plans] of Object.entries(this.createdPlans)) {
      const upperPlanKey = planKey.toUpperCase();
      console.log(`PAYPAL_${upperPlanKey}_MONTHLY_PLAN_ID=${plans.monthly}`);
      console.log(`PAYPAL_${upperPlanKey}_ANNUAL_PLAN_ID=${plans.annual}`);
    }
    
    console.log('='.repeat(50));
    console.log('');
  }

  async updateEnvFile() {
    const envPath = path.join(__dirname, '../.env.local');
    
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      for (const [planKey, plans] of Object.entries(this.createdPlans)) {
        const upperPlanKey = planKey.toUpperCase();
        
        // Replace monthly plan ID
        const monthlyRegex = new RegExp(`PAYPAL_${upperPlanKey}_MONTHLY_PLAN_ID=.*`, 'g');
        const monthlyReplacement = `PAYPAL_${upperPlanKey}_MONTHLY_PLAN_ID=${plans.monthly}`;
        
        if (envContent.match(monthlyRegex)) {
          envContent = envContent.replace(monthlyRegex, monthlyReplacement);
        } else {
          envContent += `\n${monthlyReplacement}`;
        }
        
        // Replace annual plan ID
        const annualRegex = new RegExp(`PAYPAL_${upperPlanKey}_ANNUAL_PLAN_ID=.*`, 'g');
        const annualReplacement = `PAYPAL_${upperPlanKey}_ANNUAL_PLAN_ID=${plans.annual}`;
        
        if (envContent.match(annualRegex)) {
          envContent = envContent.replace(annualRegex, annualReplacement);
        } else {
          envContent += `\n${annualReplacement}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env.local file updated successfully!');
      
    } catch (error) {
      console.error('❌ Failed to update .env.local file:', error.message);
      console.log('Please manually copy the environment variables above.');
    }
  }
}

// Main execution
async function main() {
  const creator = new PayPalPlanCreator();
  
  try {
    await creator.createAllPlans();
    creator.generateEnvUpdates();
    await creator.updateEnvFile();
    
    console.log('🎉 All PayPal plans created successfully!');
    console.log('💡 You can now test PayPal subscriptions with these plan IDs.');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PayPalPlanCreator, PLANS_CONFIG };
