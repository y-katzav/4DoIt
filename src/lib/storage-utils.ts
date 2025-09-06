import { getStorage, ref, deleteObject } from 'firebase/storage';
import { firebaseApp } from './firebase';

/**
 * Safely deletes a file from Firebase Storage, handling the case where the file doesn't exist
 * @param fileUrl - The URL or storage path of the file to delete
 * @returns Promise<boolean> - true if deleted successfully or file didn't exist, false if there was an error
 */
export async function safeDeleteFile(fileUrl: string): Promise<boolean> {
  if (!fileUrl) {
    return true; // Nothing to delete
  }

  try {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    console.log('File deleted successfully:', fileUrl);
    return true;
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found') {
      console.log('File already doesn\'t exist, treating as successful deletion:', fileUrl);
      return true; // File doesn't exist, which is fine
    }
    
    console.error('Error deleting file:', fileUrl, error);
    return false; // Actual error occurred
  }
}

/**
 * Safely deletes a file and throws only on actual errors (not when file doesn't exist)
 * @param fileUrl - The URL or storage path of the file to delete
 */
export async function safeDeleteFileStrict(fileUrl: string): Promise<void> {
  if (!fileUrl) {
    return;
  }

  try {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found') {
      // File doesn't exist, which is fine - don't throw
      return;
    }
    
    // Re-throw actual errors
    throw error;
  }
}
