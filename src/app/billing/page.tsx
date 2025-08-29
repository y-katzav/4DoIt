'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { CheckoutButton } from '@/components/checkout-button';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  X,
  ArrowUpCircle
} from 'lucide-react';
import type { PlanType, BillingInterval } from '@/lib/stripe';

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, loading, cancelSubscription } = useSubscription();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getPlanDisplayName = (plan: string) => {
    const names = {
      free: 'Free',
      pro: 'Pro',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return names[plan as keyof typeof names] || plan;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelSubscription = async () => {
    await cancelSubscription();
    setShowCancelConfirm(false);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {getPlanDisplayName(subscription?.plan || 'free')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {subscription?.billingInterval === 'annual' ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
              <Badge className={getStatusColor(subscription?.status || 'free')}>
                {subscription?.status || 'Free'}
              </Badge>
            </div>

            {subscription?.status === 'active' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Next billing date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Subscription will cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-yellow-600">
                    You'll continue to have access until then.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {subscription?.plan === 'free' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5" />
                Upgrade Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Unlock more features and collaborate with your team.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Pro</h4>
                  <p className="text-2xl font-bold mb-2">$8<span className="text-sm font-normal">/mo</span></p>
                  <CheckoutButton plan="pro" billingInterval="monthly">
                    Upgrade to Pro
                  </CheckoutButton>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Business</h4>
                  <p className="text-2xl font-bold mb-2">$20<span className="text-sm font-normal">/mo</span></p>
                  <CheckoutButton plan="business" billingInterval="monthly">
                    Upgrade to Business
                  </CheckoutButton>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Enterprise</h4>
                  <p className="text-2xl font-bold mb-2">$50<span className="text-sm font-normal">/mo</span></p>
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Actions */}
        {subscription?.status === 'active' && !subscription?.cancelAtPeriodEnd && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Cancel Subscription</h4>
                  <p className="text-sm text-muted-foreground">
                    Cancel your subscription. You'll continue to have access until the end of your current billing period.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel Plan
                </Button>
              </div>

              {showCancelConfirm && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h5 className="font-medium text-red-800">Confirm Cancellation</h5>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    Are you sure you want to cancel your subscription? You'll lose access to premium features 
                    at the end of your current billing period.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={handleCancelSubscription}
                    >
                      Yes, Cancel Subscription
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Keep Subscription
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* This would be populated from actual payment history */}
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Pro Plan - Monthly</p>
                  <p className="text-sm text-muted-foreground">Dec 1, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$8.00</p>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
              </div>
              
              <div className="text-center py-8 text-muted-foreground">
                <p>No billing history available yet.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
