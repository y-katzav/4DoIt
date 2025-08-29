'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { PayPalCheckoutButton } from '@/components/paypal-checkout-button';
import { 
  Check, 
  X, 
  Crown, 
  Users, 
  Zap, 
  Shield,
  Star,
  Sparkles,
  Building,
  Heart
} from 'lucide-react';
import type { PlanType, BillingInterval } from '@/lib/paypal';

interface Plan {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  price: {
    monthly: number;
    annual: number;
  };
  badge?: string;
  badgeColor?: string;
  popular?: boolean;
  features: {
    name: string;
    included: boolean | string | number;
    tooltip?: string;
  }[];
  cta: string;
  trial?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for personal use',
    icon: <Heart className="h-6 w-6" />,
    price: { monthly: 0, annual: 0 },
    badge: 'Always Free',
    badgeColor: 'bg-green-100 text-green-800',
    features: [
      { name: 'Project Boards', included: 2 },
      { name: 'Tasks per Board', included: 'Unlimited' },
      { name: 'Categories', included: '5 per board' },
      { name: 'Team Collaboration', included: false },
      { name: 'File Attachments', included: false },
      { name: 'Advanced Views', included: false },
      { name: 'AI Features', included: false },
      { name: 'Analytics', included: false },
      { name: 'Priority Support', included: false }
    ],
    cta: 'Get Started Free',
    trial: 'No trial needed'
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Best for small teams',
    icon: <Users className="h-6 w-6" />,
    price: { monthly: 8, annual: 80 },
    popular: true,
    features: [
      { name: 'Project Boards', included: 'Unlimited' },
      { name: 'Tasks per Board', included: 'Unlimited' },
      { name: 'Categories', included: 'Unlimited' },
      { name: 'Team Collaboration', included: 'Up to 5 members' },
      { name: 'File Attachments', included: '1GB storage' },
      { name: 'Advanced Views', included: true },
      { name: 'AI Features', included: '5 per month' },
      { name: 'Analytics', included: 'Basic' },
      { name: 'Priority Support', included: '48h response' }
    ],
    cta: 'Start Pro Trial',
    trial: '14-day free trial'
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Scale and automate',
    icon: <Zap className="h-6 w-6" />,
    price: { monthly: 20, annual: 200 },
    badge: 'Most Features',
    badgeColor: 'bg-blue-100 text-blue-800',
    features: [
      { name: 'Project Boards', included: 'Unlimited' },
      { name: 'Tasks per Board', included: 'Unlimited' },
      { name: 'Categories', included: 'Unlimited' },
      { name: 'Team Collaboration', included: 'Unlimited members' },
      { name: 'File Attachments', included: '1TB storage' },
      { name: 'Advanced Views', included: true },
      { name: 'AI Features', included: 'Unlimited' },
      { name: 'Analytics', included: 'Advanced' },
      { name: 'Priority Support', included: '24h response' }
    ],
    cta: 'Start Business Trial',
    trial: '30-day free trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    icon: <Building className="h-6 w-6" />,
    price: { monthly: 50, annual: 500 },
    badge: 'White-label',
    badgeColor: 'bg-purple-100 text-purple-800',
    features: [
      { name: 'Project Boards', included: 'Unlimited' },
      { name: 'Tasks per Board', included: 'Unlimited' },
      { name: 'Categories', included: 'Unlimited' },
      { name: 'Team Collaboration', included: 'Unlimited members' },
      { name: 'File Attachments', included: 'Unlimited storage' },
      { name: 'Advanced Views', included: true },
      { name: 'AI Features', included: 'Unlimited' },
      { name: 'Analytics', included: 'Enterprise' },
      { name: 'Priority Support', included: '24/7 phone' }
    ],
    cta: 'Contact Sales',
    trial: '30-day trial + POC'
  }
];

export function PricingTable() {
  const [isAnnual, setIsAnnual] = useState(false);

  const renderFeatureValue = (value: boolean | string | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X className="h-5 w-5 text-gray-400" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  const getPrice = (plan: Plan) => {
    const price = isAnnual ? plan.price.annual : plan.price.monthly;
    if (price === 0) return 'Free';
    
    const monthly = isAnnual ? price / 12 : price;
    return `$${monthly.toFixed(0)}`;
  };

  const getSavings = (plan: Plan) => {
    if (plan.price.annual === 0) return '';
    const monthlyCost = plan.price.monthly * 12;
    const savings = monthlyCost - plan.price.annual;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return `Save ${percentage}%`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Choose the plan that fits your needs. Upgrade or downgrade at any time.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm ${!isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`text-sm ${isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
            Annual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Save up to 17%
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-12">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              {plan.badge && (
                <Badge className={`w-fit mx-auto mb-2 ${plan.badgeColor}`}>
                  {plan.badge}
                </Badge>
              )}
              
              <div className="flex items-center justify-center mb-2">
                {plan.icon}
                <CardTitle className="ml-2 text-xl">{plan.name}</CardTitle>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>
              
              <div className="space-y-1">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">
                    {getPrice(plan)}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /month
                    </span>
                  )}
                </div>
                
                {isAnnual && plan.price.annual > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    {getSavings(plan)}
                  </div>
                )}
                
                {plan.trial && (
                  <div className="text-xs text-muted-foreground">
                    {plan.trial}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {plan.id === 'free' ? (
                <Button className="w-full mb-6" variant="outline">
                  {plan.cta}
                </Button>
              ) : plan.id === 'enterprise' ? (
                <Button className="w-full mb-6" variant="outline">
                  {plan.cta}
                </Button>
              ) : (
                <PayPalCheckoutButton
                  plan={plan.id as PlanType}
                  billingInterval={isAnnual ? 'annual' : 'monthly'}
                  price={plan.price[isAnnual ? 'annual' : 'monthly']}
                >
                  {plan.cta}
                </PayPalCheckoutButton>
              )}
              
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{feature.name}</span>
                    {renderFeatureValue(feature.included)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Detailed Feature Comparison
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Features</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center p-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      {plan.icon}
                      {plan.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans[0].features.map((feature, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">{feature.name}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="p-4 text-center">
                      {renderFeatureValue(plan.features[index].included)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Frequently Asked Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <div>
            <h3 className="font-semibold mb-2">Can I change plans later?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. 
              Changes take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards, PayPal, and bank transfers 
              for annual plans.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is there a setup fee?</h3>
            <p className="text-sm text-muted-foreground">
              No setup fees, ever. You only pay for your subscription.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time. 
              No questions asked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
