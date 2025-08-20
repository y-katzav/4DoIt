'use client';

import { useState } from 'react';
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

/**
 * Creates default user data, a board, categories, and tasks for a new user.
 * Throws errors for invalid input or Firestore failures.
 * Returns the created board ID.
 */
const createDefaultData = async (user: User): Promise<string> => {
  if (!user.email || !user.uid) throw new Error('User email or UID missing.');

  // Validate board icon
  if (!boardIcons || !boardIcons.length) throw new Error('No board icons available');

  // Step 1: Create user document (ללא boardMemberships כי זה תת-אוסף)
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    createdAt: Timestamp.now(),
  });

  // Step 2: Prepare batch setup
  const batch = writeBatch(db);
  const boardRef = doc(collection(db, 'boards'));
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

  try {
    await batch.commit();
  } catch (err) {
    // You might want to log with more context, e.g., user UID
    console.error('Error committing batch for user:', user.uid, err);
    // Optionally: report to error tracking service
    throw err;
  }

  // Return board ID for caller use
  return boardRef.id;
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