import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
}
// Firebase Config
const firebaseConfig = {
  projectId: 'taskflow-cw8ac',
  appId: '1:122132247972:web:b80c1534f978b72998fd31',
  storageBucket: 'taskflow-cw8ac.firebasestorage.app',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'taskflow-cw8ac.firebaseapp.com',
  messagingSenderId: '122132247972',
};

// Initialize App (singleton pattern)
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Services
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);

// ➜ Connect to Emulators in development (local or Codespaces)
// ...existing code...

// פונקציה לחיבור לאמולטורים (לא אוטומטית)
export function connectToFirebaseEmulators() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Connecting to Firebase Emulators...');

    // --- Auth Emulator (full URL)
    const authOrigin = window.location.hostname.endsWith('.github.dev')
      ? `https://9100-${window.location.hostname.split('-').slice(1).join('-')}`
      : 'http://localhost:9100';
    connectAuthEmulator(auth, authOrigin);

    // --- Firestore Emulator (host + port)
    const fsHost = window.location.hostname.endsWith('.github.dev')
      ? window.location.hostname
      : 'localhost';
    connectFirestoreEmulator(db, fsHost, 8081);

    // --- Functions Emulator (host + port)
    const fnHost = fsHost;
    connectFunctionsEmulator(functions, fnHost, 5001);

    console.log('Successfully connected to Firebase Emulators.');
  }
}

// ...existing code...
export { firebaseApp, db, auth, storage, functions };