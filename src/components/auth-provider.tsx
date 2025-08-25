'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseApp, connectToFirebaseEmulators } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(firebaseApp);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // התחבר ל-emulators בפיתוח
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 About to connect to Firebase Emulators...');
      try {
        connectToFirebaseEmulators();
        console.log('✅ Firebase Emulators connection initiated');
      } catch (error) {
        console.error('❌ Failed to connect to Firebase Emulators:', error);
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔐 Auth state changed. User:', firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';

      if (!user && !isAuthPage) {
        console.log('➡️ Redirecting to /login - no user detected');
        router.push('/login');
      }

      if (user && isAuthPage) {
        console.log('➡️ Redirecting to home - user already logged in');
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    // בדיקה ישירה של currentUser אם צריך
    console.log('📌 auth.currentUser:', auth.currentUser);
  }, [auth]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
