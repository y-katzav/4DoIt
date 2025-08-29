'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/use-subscription';
import { CheckoutButton } from '@/components/checkout-button';
import { Crown, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionStatus() {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return (
      <Card className="mx-2 mb-2">
        <CardContent className="p-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
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

  const isPremium = subscription?.plan !== 'free';

  return (
    <Card className="mx-2 mb-2">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={`h-4 w-4 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />
            <span className="font-medium text-sm">
              {getPlanDisplayName(subscription?.plan || 'free')}
            </span>
          </div>
          <Badge className={`text-xs ${getStatusColor(subscription?.status || 'free')}`}>
            {subscription?.status || 'Free'}
          </Badge>
        </div>

        {subscription?.plan === 'free' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Upgrade for unlimited tasks and premium features
            </p>
            <CheckoutButton plan="pro" billingInterval="monthly" className="w-full h-8 text-xs">
              <ArrowUpCircle className="mr-1 h-3 w-3" />
              Upgrade
            </CheckoutButton>
          </div>
        ) : (
          <div className="space-y-2">
            {subscription?.cancelAtPeriodEnd ? (
              <p className="text-xs text-yellow-600">
                Expires {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Renews {new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}
              </p>
            )}
            <Link href="/billing">
              <Button variant="outline" className="w-full h-8 text-xs">
                Manage
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
