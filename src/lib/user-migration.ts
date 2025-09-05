import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Ensures a user document has all the required subscription fields
 * This is important for development and migration of existing users
 */
export async function ensureUserSubscriptionFields(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn(`User document ${userId} does not exist`);
      return;
    }
    
    const userData = userDoc.data();
    const requiredFields = {
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
    };
    
    // Check which fields are missing
    const missingFields: Record<string, any> = {};
    let needsUpdate = false;
    
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
      if (!(field in userData)) {
        missingFields[field] = defaultValue;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`🔄 Adding missing subscription fields for user ${userId}:`, Object.keys(missingFields));
      
      await updateDoc(userRef, {
        ...missingFields,
        updatedAt: Timestamp.now(),
      });
      
      console.log(`✅ Successfully updated user ${userId} with missing fields`);
    } else {
      console.log(`✅ User ${userId} already has all required subscription fields`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring subscription fields for user ${userId}:`, error);
  }
}

/**
 * Server-side version using Firebase Admin SDK
 * Use this in API routes
 */
export async function ensureUserSubscriptionFieldsAdmin(userId: string, db: any): Promise<void> {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.warn(`User document ${userId} does not exist`);
      return;
    }
    
    const userData = userDoc.data();
    const requiredFields = {
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
    };
    
    // Check which fields are missing
    const missingFields: Record<string, any> = {};
    let needsUpdate = false;
    
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
      if (!(field in userData)) {
        missingFields[field] = defaultValue;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`🔄 Adding missing subscription fields for user ${userId}:`, Object.keys(missingFields));
      
      await userRef.update({
        ...missingFields,
        updatedAt: new Date(),
      });
      
      console.log(`✅ Successfully updated user ${userId} with missing fields`);
    } else {
      console.log(`✅ User ${userId} already has all required subscription fields`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring subscription fields for user ${userId}:`, error);
  }
}
