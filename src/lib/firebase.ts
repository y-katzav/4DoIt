import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase Config
const firebaseConfig = {
  projectId: "taskflow-cw8ac",
  appId: "1:122132247972:web:b80c1534f978b72998fd31",
  storageBucket: "taskflow-cw8ac.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "taskflow-cw8ac.firebaseapp.com",
  messagingSenderId: "122132247972"
};

// Initialize App (singleton pattern)
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Services
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);

// ➜ Connect to Emulators when running locally
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log("Connecting to Firebase Emulators...");

    // Correct Emulator Ports
    connectFirestoreEmulator(db, 'localhost', 8081);
    connectAuthEmulator(auth, 'http://localhost:9099'); // Corrected port
    connectFunctionsEmulator(functions, 'localhost', 5001);

    console.log("Successfully connected to Firebase Emulators.");
}

// Export instances
export { firebaseApp, db, auth, storage, functions };
