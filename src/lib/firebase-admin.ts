import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // Check if we have real Firebase Admin credentials
  if (process.env.FIREBASE_ADMIN_PROJECT_ID && 
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
      process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    console.warn('Firebase Admin credentials not set - using mock configuration for development');
    // Initialize with mock/minimal config for development
    admin.initializeApp({
      projectId: 'mock-project-id',
    });
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
