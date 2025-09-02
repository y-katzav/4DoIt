const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Firebase Admin credentials...');
console.log('Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
console.log('Private Key exists:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
console.log('Private Key starts with:', process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30) + '...');

try {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
  
  // Validate PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || 
      !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid private key format - must be PEM formatted');
  }

  console.log('✅ Private key format looks correct');
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });

  console.log('✅ Firebase Admin initialized successfully!');
  
  // Test Firestore connection
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}
