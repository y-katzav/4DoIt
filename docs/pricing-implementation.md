# 4DoIt - Pricing Implementation Plan

## 🔧 Technical Implementation Overview

### Phase 1: Subscription Infrastructure (Weeks 1-2)

#### 1.1 Database Schema Updates
```typescript
// Add to user document
interface User {
  // ... existing fields
  subscription: {
    plan: 'free' | 'pro' | 'business' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    trialEnd?: Timestamp;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    boardCount: number;
    storageUsed: number; // in bytes
    teamMembersCount: number;
    aiGenerationsUsed: number;
    lastResetDate: Timestamp;
  };
  limits: {
    maxBoards: number;
    maxStorage: number;
    maxTeamMembers: number;
    aiGenerationsPerMonth: number;
    features: string[];
  };
}
```

#### 1.2 Plan Configuration
```typescript
// src/lib/plans.ts
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      maxBoards: 2,
      maxStorage: 0, // No file uploads
      maxTeamMembers: 1,
      aiGenerationsPerMonth: 0,
      features: [
        'basic_tasks',
        'basic_categories',
        'basic_views',
        'csv_export'
      ]
    }
  },
  pro: {
    name: 'Pro',
    price: 8,
    limits: {
      maxBoards: -1, // Unlimited
      maxStorage: 1024 * 1024 * 1024, // 1GB
      maxTeamMembers: 5,
      aiGenerationsPerMonth: 5,
      features: [
        'basic_tasks',
        'team_collaboration',
        'file_attachments',
        'advanced_views',
        'excel_export',
        'board_sharing'
      ]
    }
  },
  business: {
    name: 'Business',
    price: 20,
    limits: {
      maxBoards: -1,
      maxStorage: 1024 * 1024 * 1024 * 1024, // 1TB
      maxTeamMembers: -1, // Unlimited
      aiGenerationsPerMonth: -1, // Unlimited
      features: [
        'all_pro_features',
        'advanced_analytics',
        'unlimited_ai',
        'custom_categories',
        'automation_rules'
      ]
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 50,
    limits: {
      maxBoards: -1,
      maxStorage: -1, // Unlimited
      maxTeamMembers: -1,
      aiGenerationsPerMonth: -1,
      features: [
        'all_business_features',
        'white_label',
        'sso_integration',
        'audit_logs',
        'custom_integrations'
      ]
    }
  }
} as const;
```

### Phase 2: Feature Gating System (Weeks 3-4)

#### 2.1 Permission Hook
```typescript
// src/hooks/use-subscription.ts
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasFeature = (feature: string): boolean => {
    if (!subscription) return false;
    return subscription.limits.features.includes(feature);
  };

  const isWithinLimit = (type: 'boards' | 'storage' | 'teamMembers' | 'aiGenerations', current: number): boolean => {
    if (!subscription) return false;
    const limit = subscription.limits[`max${type.charAt(0).toUpperCase()}${type.slice(1)}`];
    return limit === -1 || current < limit;
  };

  const canUpgrade = (): string | null => {
    if (subscription?.plan === 'enterprise') return null;
    
    const nextPlan = {
      free: 'pro',
      pro: 'business',
      business: 'enterprise'
    }[subscription?.plan];
    
    return nextPlan || null;
  };

  return {
    subscription,
    hasFeature,
    isWithinLimit,
    canUpgrade,
    loading
  };
}
```

#### 2.2 Feature Gate Component
```typescript
// src/components/feature-gate.tsx
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasFeature, canUpgrade } = useSubscription();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (showUpgradePrompt && canUpgrade()) {
    return (
      <div className="relative">
        {fallback}
        <UpgradePrompt feature={feature} targetPlan={canUpgrade()} />
      </div>
    );
  }

  return fallback ? <>{fallback}</> : null;
}
```

### Phase 3: Usage Tracking (Weeks 5-6)

#### 3.1 Usage Tracking Service
```typescript
// src/services/usage-tracker.ts
class UsageTracker {
  async trackBoardCreation(userId: string): Promise<boolean> {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!this.canCreateBoard(userData)) {
      throw new Error('Board limit reached');
    }
    
    await db.collection('users').doc(userId).update({
      'usage.boardCount': admin.firestore.FieldValue.increment(1)
    });
    
    return true;
  }

  async trackFileUpload(userId: string, fileSize: number): Promise<boolean> {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!this.canUploadFile(userData, fileSize)) {
      throw new Error('Storage limit exceeded');
    }
    
    await db.collection('users').doc(userId).update({
      'usage.storageUsed': admin.firestore.FieldValue.increment(fileSize)
    });
    
    return true;
  }

  async trackAIGeneration(userId: string): Promise<boolean> {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!this.canUseAI(userData)) {
      throw new Error('AI generation limit reached');
    }
    
    await db.collection('users').doc(userId).update({
      'usage.aiGenerationsUsed': admin.firestore.FieldValue.increment(1)
    });
    
    return true;
  }

  private canCreateBoard(userData: any): boolean {
    const plan = PLANS[userData.subscription.plan];
    const maxBoards = plan.limits.maxBoards;
    return maxBoards === -1 || userData.usage.boardCount < maxBoards;
  }

  private canUploadFile(userData: any, fileSize: number): boolean {
    const plan = PLANS[userData.subscription.plan];
    const maxStorage = plan.limits.maxStorage;
    return maxStorage === -1 || (userData.usage.storageUsed + fileSize) <= maxStorage;
  }

  private canUseAI(userData: any): boolean {
    const plan = PLANS[userData.subscription.plan];
    const maxAI = plan.limits.aiGenerationsPerMonth;
    return maxAI === -1 || userData.usage.aiGenerationsUsed < maxAI;
  }
}
```

### Phase 4: Payment Integration (Weeks 7-8)

#### 4.1 Stripe Integration
```typescript
// src/services/stripe-service.ts
class StripeService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        source: '4DoIt'
      }
    });
    return customer.id;
  }

  async createSubscription(customerId: string, priceId: string, trialDays?: number) {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      metadata: {
        source: '4DoIt'
      }
    });
    return subscription;
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session;
  }
}
```

#### 4.2 Subscription Management Functions
```typescript
// functions/src/subscription.ts
export const createSubscription = onCall(async (request) => {
  const { plan, isAnnual } = request.data;
  
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const stripeService = new StripeService();
  
  // Create or get Stripe customer
  let customerId = userData.subscription?.stripeCustomerId;
  if (!customerId) {
    customerId = await stripeService.createCustomer(
      userData.email, 
      userData.displayName
    );
  }

  // Get price ID based on plan and billing cycle
  const priceId = getPriceId(plan, isAnnual);
  
  // Create checkout session
  const checkoutSession = await stripeService.createCheckoutSession(
    customerId,
    priceId,
    `${process.env.APP_URL}/dashboard?success=true`,
    `${process.env.APP_URL}/pricing?canceled=true`
  );

  return { checkoutUrl: checkoutSession.url };
});
```

### Phase 5: UI Components (Weeks 9-10)

#### 5.1 Pricing Page Component
```typescript
// src/components/pricing-page.tsx
export function PricingPage() {
  const { subscription } = useSubscription();
  
  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground">Choose the plan that fits your needs</p>
      </div>
      
      <div className="grid md:grid-cols-4 gap-8">
        {Object.entries(PLANS).map(([planId, plan]) => (
          <PricingCard 
            key={planId}
            plan={planId}
            planData={plan}
            currentPlan={subscription?.plan}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 5.2 Usage Dashboard Component
```typescript
// src/components/usage-dashboard.tsx
export function UsageDashboard() {
  const { subscription } = useSubscription();
  const [usage, setUsage] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage & Limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageBar 
          label="Boards"
          used={usage?.boardCount || 0}
          limit={subscription?.limits.maxBoards}
        />
        <UsageBar 
          label="Storage"
          used={usage?.storageUsed || 0}
          limit={subscription?.limits.maxStorage}
          formatter={formatBytes}
        />
        <UsageBar 
          label="Team Members"
          used={usage?.teamMembersCount || 0}
          limit={subscription?.limits.maxTeamMembers}
        />
        <UsageBar 
          label="AI Generations"
          used={usage?.aiGenerationsUsed || 0}
          limit={subscription?.limits.aiGenerationsPerMonth}
        />
      </CardContent>
    </Card>
  );
}
```

### Phase 6: Testing & Launch (Weeks 11-12)

#### 6.1 Testing Strategy
- **Unit Tests**: Feature gating logic, usage tracking
- **Integration Tests**: Stripe webhooks, subscription flows
- **E2E Tests**: Complete upgrade/downgrade flows
- **Load Testing**: Payment processing under load

#### 6.2 Launch Checklist
- [ ] Stripe account configured
- [ ] Webhooks tested and working
- [ ] Feature gates implemented on all premium features
- [ ] Usage tracking active
- [ ] Billing management UI complete
- [ ] Customer support processes defined
- [ ] Documentation updated
- [ ] Monitoring and alerts configured

---

## 🔄 Post-Launch Iterations

### Month 1-2: Monitor & Optimize
- Track conversion rates
- Monitor churn rates
- Gather user feedback
- A/B test pricing page

### Month 3-4: Feature Refinement
- Add requested features
- Optimize upgrade prompts
- Improve onboarding flow
- Enhance analytics

### Month 5-6: Scale Preparation
- Enterprise sales process
- Advanced security features
- Custom integration framework
- White-label implementation

---

This implementation plan provides a systematic approach to rolling out the subscription model while maintaining service quality and user experience.
