'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/auth-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { PayPalCheckoutButton } from '@/components/paypal-checkout-button';
import { 
  User, 
  Crown, 
  Calendar, 
  CheckCircle,
  ArrowUpCircle,
  BarChart3,
  Users,
  FolderOpen,
  CheckSquare,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { getAuth, signOut } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { SubscriptionStatus } from '@/components/subscription-status';

export default function ProfilePage() {
  const { user } = useAuth();
  const { subscription, loading, hasFeature, getLimits } = useSubscription();
  const searchParams = useSearchParams();
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  
  // Development helper - only show in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [migrationLoading, setMigrationLoading] = useState(false);
  
  const handleEnsureUserFields = async () => {
    if (!user) return;
    
    setMigrationLoading(true);
    try {
      const userToken = await user.getIdToken();
      const response = await fetch('/api/ensure-user-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });
      
      if (response.ok) {
        console.log('✅ User fields migration completed');
        // Force reload to see changes
        window.location.reload();
      } else {
        console.error('❌ Failed to migrate user fields');
      }
    } catch (error) {
      console.error('Error migrating user fields:', error);
    } finally {
      setMigrationLoading(false);
    }
  };

  // Handle PayPal return
  useEffect(() => {
    const handlePayPalReturn = async () => {
      const paymentStatus = searchParams.get('payment');
      const subscriptionId = searchParams.get('subscription_id'); // PayPal returns subscription ID
      const token = searchParams.get('token'); // Sometimes PayPal returns token
      
      if (paymentStatus === 'success' && (subscriptionId || token) && user) {
        // Prevent duplicate processing by checking if we've already processed this subscription
        const processedKey = `paypal_processed_${subscriptionId || token}`;
        if (sessionStorage.getItem(processedKey)) {
          console.log('Already processed this subscription, skipping...');
          window.history.replaceState({}, '', '/profile');
          return;
        }
        
        setPaymentProcessing(true);
        try {
          const userToken = await user.getIdToken();
          const response = await fetch('/api/capture-paypal-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`,
            },
            body: JSON.stringify({ subscriptionId: subscriptionId || token }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Subscription activated successfully:', data);
            // Mark as processed
            sessionStorage.setItem(processedKey, 'true');
            // Remove URL parameters
            window.history.replaceState({}, '', '/profile');
          } else {
            const errorData = await response.json();
            console.error('Failed to activate subscription:', errorData);
            
            // If it's already processed (400 with no pending plan), treat as success
            if (response.status === 400 && errorData.error === 'No pending plan found') {
              console.log('Subscription already processed, treating as success');
              sessionStorage.setItem(processedKey, 'true');
              window.history.replaceState({}, '', '/profile');
            }
          }
        } catch (error) {
          console.error('Error activating subscription:', error);
        } finally {
          setPaymentProcessing(false);
        }
      } else if (paymentStatus === 'cancelled') {
        console.log('Payment was cancelled');
        // Remove URL parameters
        window.history.replaceState({}, '', '/profile');
      }
    };

    handlePayPalReturn();
  }, [searchParams, user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading || paymentProcessing) {
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

  const limits = getLimits();

  return (
    <SidebarProvider>
      <SidebarRail />
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/')}>
                <FolderOpen />
                <span>Back to Boards</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          
          <SidebarGroup>
            <SidebarGroupLabel>Profile</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <User />
                  <span>Account Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Crown />
                  <span>Subscription</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SubscriptionStatus />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <Header
            onAddTaskClick={() => {}} // Not used in profile
            onSignOut={handleSignOut}
            onShareClick={() => {}} // Not used in profile
            onStatsClick={() => {}} // Not used in profile
            isBoardSelected={false}
            isReadOnly={true}
            invitations={[]}
            onInvitationAction={() => {}}
            tasks={[]}
            categories={[]}
            boardMembers={[]}
            boardName="Profile"
          />
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
            <div className="max-w-4xl mx-auto space-y-8 w-full">{/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and subscription
          </p>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                <p className="text-lg">{user?.displayName || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
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

            {subscription?.status === 'active' && subscription?.plan !== 'free' && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Next billing date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/billing">
                <Button variant="outline">
                  Manage Billing
                </Button>
              </Link>
              {subscription?.plan === 'free' && (
                <PayPalCheckoutButton 
                  plan="pro" 
                  billingInterval="monthly" 
                  price={8}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </PayPalCheckoutButton>
              )}
              {isDevelopment && (
                <Button 
                  variant="outline" 
                  onClick={handleEnsureUserFields}
                  disabled={migrationLoading}
                  className="ml-2"
                >
                  {migrationLoading ? 'Migrating...' : '🔧 Dev: Fix User Fields'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage & Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Tasks</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {limits.tasks === -1 ? 'Unlimited' : `0 / ${limits.tasks}`}
                </span>
              </div>
              {limits.tasks !== -1 && (
                <Progress value={0} className="h-2" />
              )}
            </div>

            {/* Boards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Boards</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {limits.boards === -1 ? 'Unlimited' : `0 / ${limits.boards}`}
                </span>
              </div>
              {limits.boards !== -1 && (
                <Progress value={0} className="h-2" />
              )}
            </div>

            {/* Collaborators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Collaborators per board</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {limits.collaborators === -1 ? 'Unlimited' : `Up to ${limits.collaborators}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('basic_tasks') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('basic_tasks') ? '' : 'text-muted-foreground'}>
                    Basic task management
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('team_collaboration') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('team_collaboration') ? '' : 'text-muted-foreground'}>
                    Team collaboration
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('ai_task_creation') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('ai_task_creation') ? '' : 'text-muted-foreground'}>
                    AI task creation
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('advanced_export') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('advanced_export') ? '' : 'text-muted-foreground'}>
                    Advanced export options
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('analytics') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('analytics') ? '' : 'text-muted-foreground'}>
                    Analytics & reporting
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('priority_support') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('priority_support') ? '' : 'text-muted-foreground'}>
                    Priority support
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('sso') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('sso') ? '' : 'text-muted-foreground'}>
                    Single Sign-On (SSO)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-5 w-5 ${hasFeature('custom_integrations') ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFeature('custom_integrations') ? '' : 'text-muted-foreground'}>
                    Custom integrations
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
