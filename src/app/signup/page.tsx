'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { firebaseApp, db } from '@/lib/firebase';
import { writeBatch, doc, collection, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { boardIcons } from '@/lib/constants';

const createDefaultData = async (user: User) => {
  if (!user.email) return;

  const batch = writeBatch(db);

  // User document
  const userRef = doc(db, 'users', user.uid);
  batch.set(userRef, {
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    createdAt: Timestamp.now(),
  });
  
  // Create default board
  const boardRef = doc(collection(db, 'boards'));
  batch.set(boardRef, {
    name: 'My Tasks',
    icon: boardIcons[0],
    createdAt: Timestamp.now(),
    ownerId: user.uid,
  });

  // Default Categories
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

  const getCategoryId = (name: string) => categoryRefs.find(c => c.name === name)?.id || '';

  // Default Tasks
  const tasks = [
    { description: 'Prepare presentation for Monday meeting', priority: 'high' as const, dueDate: new Date(new Date().setDate(new Date().getDate() + (8 - new Date().getDay()) % 7)), categoryName: 'Work' },
    { description: 'Follow up with the design team', priority: 'medium' as const, dueDate: null, categoryName: 'Work' },
    { description: 'Book a dentist appointment', priority: 'medium' as const, dueDate: null, categoryName: 'Personal' },
    { description: 'Go for a run', priority: 'low' as const, dueDate: null, categoryName: 'Personal' },
    { description: 'Milk', priority: 'low' as const, dueDate: null, categoryName: 'Shopping List' },
    { description: 'Bread', priority: 'low' as const, dueDate: null, categoryName: 'Shopping List' },
    { description: 'Eggs', priority: 'low' as const, dueDate: null, categoryName: 'Shopping List' },
  ];
  
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

  await batch.commit();
};


export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(firebaseApp);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createDefaultData(userCredential.user);

      toast({
        title: 'Account Created',
        description: 'You have been successfully signed up. Please log in.',
      });
      router.push('/login');
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
