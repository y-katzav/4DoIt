import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Subscription {
  id: string;
  plan: 'free' | 'pro' | 'business' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  billingInterval: 'monthly' | 'annual';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  customerId: string;
  createdAt: number;
  updatedAt: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.subscription) {
            setSubscription(data.subscription);
          } else {
            // Default free plan
            setSubscription({
              id: 'free',
              plan: 'free',
              status: 'active',
              billingInterval: 'monthly',
              currentPeriodStart: Date.now(),
              currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
              cancelAtPeriodEnd: false,
              customerId: '',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subscription:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const cancelSubscription = async () => {
    if (!user || !subscription) return;

    try {
      setLoading(true);
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          subscriptionId: subscription.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // The subscription will be updated via the webhook
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (plan: string, billingInterval: 'monthly' | 'annual') => {
    if (!user || !subscription) return;

    try {
      setLoading(true);
      const response = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          subscriptionId: subscription.id,
          newPlan: plan,
          billingInterval
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      // The subscription will be updated via the webhook
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (feature: string): boolean => {
    if (!subscription) return false;

    const features = {
      free: [
        'basic_tasks',
        'personal_boards',
        'basic_export'
      ],
      pro: [
        'basic_tasks',
        'personal_boards',
        'basic_export',
        'unlimited_tasks',
        'team_collaboration',
        'advanced_export',
        'custom_categories',
        'ai_task_creation'
      ],
      business: [
        'basic_tasks',
        'personal_boards',
        'basic_export',
        'unlimited_tasks',
        'team_collaboration',
        'advanced_export',
        'custom_categories',
        'ai_task_creation',
        'unlimited_boards',
        'advanced_permissions',
        'priority_support',
        'analytics'
      ],
      enterprise: [
        'basic_tasks',
        'personal_boards',
        'basic_export',
        'unlimited_tasks',
        'team_collaboration',
        'advanced_export',
        'custom_categories',
        'ai_task_creation',
        'unlimited_boards',
        'advanced_permissions',
        'priority_support',
        'analytics',
        'sso',
        'custom_integrations',
        'dedicated_support'
      ]
    };

    return features[subscription.plan]?.includes(feature) || false;
  };

  const getLimits = () => {
    if (!subscription) return { tasks: 10, boards: 1, collaborators: 0 };

    const limits = {
      free: { tasks: 10, boards: 1, collaborators: 0 },
      pro: { tasks: -1, boards: 5, collaborators: 5 },
      business: { tasks: -1, boards: -1, collaborators: 20 },
      enterprise: { tasks: -1, boards: -1, collaborators: -1 }
    };

    return limits[subscription.plan] || limits.free;
  };

  return {
    subscription,
    loading,
    error,
    cancelSubscription,
    updateSubscription,
    hasFeature,
    getLimits
  };
}
