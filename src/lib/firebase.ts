import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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

// Track if emulators are already connected
let emulatorsConnected = false;

// ➜ Connect to Emulators in development (local or Codespaces)
// ...existing code...

// פונקציה לחיבור לאמולטורים (לא אוטומטית)
export function connectToFirebaseEmulators() {
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  
  if (typeof window !== 'undefined' && useEmulators && !emulatorsConnected) {
    console.log('🔥 Connecting to Firebase Emulators...');

    try {
      // In GitHub Codespaces, use localhost instead of the complex hostname
      const isCodespaces = window.location.hostname.includes('.app.github.dev');
      
      // --- Auth Emulator (full URL)
      const authOrigin = isCodespaces 
        ? 'http://localhost:9100'
        : 'http://127.0.0.1:9100';
      console.log('🔐 Connecting Auth emulator at:', authOrigin);
      connectAuthEmulator(auth, authOrigin);

      // --- Firestore Emulator (host + port)
      const fsHost = isCodespaces ? 'localhost' : '127.0.0.1';
      console.log('📄 Connecting Firestore emulator at:', `${fsHost}:8081`);
      connectFirestoreEmulator(db, fsHost, 8081);

      // --- Functions Emulator (host + port)
      console.log('⚡ Connecting Functions emulator at:', `${fsHost}:5001`);
      connectFunctionsEmulator(functions, fsHost, 5001);

      // --- Storage Emulator (host + port)
      console.log('📁 Connecting Storage emulator at:', `${fsHost}:9199`);
      connectStorageEmulator(storage, fsHost, 9199);

      emulatorsConnected = true;
      console.log('✅ Successfully connected to Firebase Emulators.');
    } catch (error) {
      console.warn('⚠️ Failed to connect to some emulators:', error);
      emulatorsConnected = true; // Prevent retrying
    }
  } else if (!useEmulators) {
    console.log('🚀 Using Firebase production services');
  }
}

// ...existing code...
export { firebaseApp, db, auth, storage, functions };