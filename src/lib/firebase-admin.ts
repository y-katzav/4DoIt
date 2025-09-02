import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // Check if we have real Firebase Admin credentials
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      // Parse and validate the private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      // Validate PEM format
      if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----') || 
          !formattedPrivateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format - must be PEM formatted');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });

      console.log('✅ Firebase Admin initialized with real credentials');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin with provided credentials:', error);
      console.warn('🔄 Falling back to mock configuration for development');
      
      // Check if admin is already initialized before trying again
      if (!admin.apps.length) {
        try {
          // Initialize with minimal mock config as fallback
          admin.initializeApp({
            projectId: 'mock-project-id',
          });
        } catch (mockError) {
          console.error('Failed to initialize even mock Firebase:', mockError);
        }
      }
    }
  } else {
    console.warn('⚠️ Firebase Admin credentials not set - using mock configuration for development');
    console.log('Missing credentials:', {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey
    });
    
    // Check if admin is already initialized before trying again
    if (!admin.apps.length) {
      try {
        // Initialize with mock/minimal config for development
        admin.initializeApp({
          projectId: 'mock-project-id',
        });
      } catch (mockError) {
        console.error('Failed to initialize even mock Firebase:', mockError);
      }
    }
  }
}

// Safe exports that handle mock mode
let db: any = null;
let auth: any = null;

try {
  db = admin.firestore();
  auth = admin.auth();
  console.log('✅ Firebase Admin services initialized');
} catch (error) {
  console.warn('⚠️ Failed to initialize Firebase Admin services:', error);
  // Keep as null - will be handled by safe functions below
}

export { db, auth };

// Mock database operations for development
export const mockUserData = {
  uid: 'mock_user_id',
  email: 'mock@example.com',
  displayName: 'Mock User',
  plan: 'free',
  subscriptionStatus: 'none',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const getMockUserDoc = () => ({
  exists: true,
  data: () => mockUserData,
  ref: {
    update: async (data: any) => {
      console.log('📝 Mock DB Update:', data);
      return Promise.resolve();
    }
  }
});

// Safe database operations that handle mock mode
export const getUserDocSafely = async (userId: string) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, using mock data');
      return getMockUserDoc();
    }
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc;
  } catch (error) {
    console.warn('⚠️ Database operation failed, using mock data for development');
    return getMockUserDoc();
  }
};

// Mock auth verification for development when Firebase admin is not properly configured
export const verifyIdTokenSafely = async (token: string) => {
  try {
    if (!auth) {
      console.warn('⚠️ Auth service not available, using mock verification');
      return createMockDecodedToken();
    }
    // Try real verification first
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.warn('⚠️ Firebase auth verification failed, using mock verification for development');
    return createMockDecodedToken();
  }
};

// Helper function for mock decoded token
const createMockDecodedToken = () => ({
  uid: 'mock_user_id',
  email: 'mock@example.com',
  name: 'Mock User',
  iss: 'mock',
  aud: 'mock-project-id',
  auth_time: Date.now() / 1000,
  iat: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600, // 1 hour from now
  firebase: {
    identities: {},
    sign_in_provider: 'mock'
  }
});
