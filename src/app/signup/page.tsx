'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { firebaseApp, db } from '@/lib/firebase';
import { writeBatch, doc, collection, Timestamp, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { boardIcons } from '@/lib/constants';
import { useAuth } from '@/components/auth-provider';

/*
// Legacy client-side createDefaultData function - now replaced with server-side API
// Keeping for reference in case we need to revert
const createDefaultData = async (user: User): Promise<string> => {
  if (!user.email || !user.uid) throw new Error('User email or UID missing.');

  console.log('🔄 Creating default data for user:', user.uid);
  console.log('🔄 User email:', user.email);

  // Validate board icon
  if (!boardIcons || !boardIcons.length) throw new Error('No board icons available');

  try {
    // Step 1: Create user document with default subscription fields
    console.log('📝 Creating user document...');
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: Timestamp.now(),
      // Subscription fields - initialized as free user
      plan: 'free',
      billingInterval: null,
      subscriptionStatus: 'free',
      paymentStatus: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      paypalSubscriptionId: null,
      pendingPlan: null,
      pendingBillingInterval: null,
      lastPaymentDate: null,
      updatedAt: Timestamp.now(),
    });
    console.log('✅ User document created');

    // Step 2: Prepare batch setup
    console.log('📋 Preparing batch operations...');
    const batch = writeBatch(db);
    const boardRef = doc(collection(db, 'boards'));
    
    console.log('🏗️ Creating board with ID:', boardRef.id);
    console.log('👤 Board owner:', user.uid);
    
    batch.set(boardRef, {
      name: 'My Tasks',
      icon: boardIcons[0],
      createdAt: Timestamp.now(),
      ownerId: user.uid,
      members: { [user.uid]: 'owner' },
      sharedWith: {}, // יוצר שדה sharedWith ריק
    });

    // Step 2.5: Add board membership to user's subcollection
    const membershipRef = doc(db, 'users', user.uid, 'boardMemberships', boardRef.id);
    batch.set(membershipRef, {
      boardId: boardRef.id,
      boardName: 'My Tasks',
      role: 'owner',
      joinedAt: Timestamp.now(),
    });
    console.log('🤝 Board membership prepared');

  // Categories
  const categories = [
    { name: 'Work', color: 'bg-sky-500' },
    { name: 'Personal', color: 'bg-emerald-500' },
    { name: 'Shopping List', color: 'bg-amber-500' },
  ];
  const categoryRefs: { id: string; name: string }[] = [];

  categories.forEach(category => {
    const newCatRef = doc(collection(db, `boards/${boardRef.id}/categories`));
    batch.set(newCatRef, { ...category, createdAt: Timestamp.now() });
    categoryRefs.push({ id: newCatRef.id, name: category.name });
  });

  // Tasks
  type Task = {
    description: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: Date | null;
    categoryName: string;
  };
  const tasks: Task[] = [
    { description: 'Prepare presentation for Monday meeting', priority: 'high', dueDate: new Date(new Date().setDate(new Date().getDate() + (8 - new Date().getDay()) % 7),), categoryName: 'Work' },
    { description: 'Follow up with the design team', priority: 'medium', dueDate: null, categoryName: 'Work' },
    { description: 'Book a dentist appointment', priority: 'medium', dueDate: null, categoryName: 'Personal' },
    { description: 'Go for a run', priority: 'low', dueDate: null, categoryName: 'Personal' },
    { description: 'Milk', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
    { description: 'Bread', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
    { description: 'Eggs', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
  ];

  // Validate all category names in tasks
  const validCategoryNames = new Set(categories.map(c => c.name));
  tasks.forEach(task => {
    if (!validCategoryNames.has(task.categoryName)) {
      throw new Error(`Invalid category name in task: ${task.categoryName}`);
    }
  });

  const getCategoryId = (name: string) => {
    const found = categoryRefs.find(c => c.name === name);
    if (!found) throw new Error(`Category ${name} not found`);
    return found.id;
  };

  tasks.forEach(task => {
    const taskRef = doc(collection(db, `boards/${boardRef.id}/tasks`));
    batch.set(taskRef, {
      description: task.description,
      priority: task.priority,
      categoryId: getCategoryId(task.categoryName),
      boardId: boardRef.id,
      completed: false,
      createdAt: Timestamp.now(),
      dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
      fileName: '',
      fileUrl: '',
    });
  });

  console.log('🚀 Executing batch commit...');
  try {
    await batch.commit();
    console.log('✅ Batch committed successfully!');
  } catch (err) {
    console.error('❌ Error committing batch for user:', user.uid);
    console.error('❌ Error details:', err);
    console.error('❌ User object:', { uid: user.uid, email: user.email });
    // Optionally: report to error tracking service
    throw err;
  }

  console.log('🎉 Default data creation completed for user:', user.uid);
  // Return board ID for caller use
  return boardRef.id;
} catch (error} catch (error) {
  console.error('💥 Critical error in createDefaultData:', error);
  throw error;
}
};
*/

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingData, setIsCreatingData] = useState(false);
  const [setupProgress, setSetupProgress] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(firebaseApp);
  const { setSignupFlow } = useAuth();

  // Cleanup signup flow state on component unmount
  useEffect(() => {
    return () => {
      setSignupFlow(false);
    };
  }, [setSignupFlow]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Start signup flow - this prevents AuthProvider redirects
      setSignupFlow(true);
      
      setSetupProgress('Creating your account...');
      
      // Step 1: Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Step 2: Get token while user is still authenticated
      const userToken = await userCredential.user.getIdToken();
      
      // Step 3: Switch to setup UI (keep user signed in)
      setIsLoading(false);
      setIsCreatingData(true);
      
      // Step 5: Create default data via API
      setSetupProgress('Setting up your workspace...');
      console.log('🔄 Creating default data via API for user:', userCredential.user.uid);
      
      const response = await fetch('/api/create-default-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create default data: ${errorData.error}`);
      }
      
      const result = await response.json();
      console.log('✅ Default data created successfully:', result);
      
      // Step 6: Show progress updates
      setSetupProgress('Creating your first board...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSetupProgress('Adding sample tasks...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSetupProgress('Finalizing setup...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Setup complete for user:', userCredential.user.uid);
      
      // Step 7: Complete setup and redirect to home (user is already signed in)
      setIsCreatingData(false);
      setSignupFlow(false); // End signup flow
      toast({
        title: 'Welcome to 4DoIt! 🎉',
        description: 'Your account is ready! Welcome to your personalized dashboard.',
      });
      
      // Navigate directly to home - user is already authenticated
      router.push('/');
      
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error('❌ Signup error:', error);
      
      setIsCreatingData(false);
      setSignupFlow(false); // End signup flow on error
      
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show setup screen while creating default data
  if (isCreatingData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className='flex justify-center mb-4'>
              <Logo />
            </div>
            <CardTitle className="text-2xl font-bold">Setting Up Your Account</CardTitle>
            <CardDescription>We're preparing your personalized workspace...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-base font-medium text-center">
                {setupProgress}
              </p>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all duration-700 animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                ✨ Creating your first board with sample tasks
              </p>
              <p className="text-xs text-muted-foreground">
                This usually takes less than 10 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className='flex justify-center mb-4'>
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your email and password to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}