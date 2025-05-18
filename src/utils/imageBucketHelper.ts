import { supabase } from '../services/supabase';
import { verifyPetImagesBucket } from './setupStorage';

/**
 * Ensures the pet images bucket exists and is properly configured
 * Returns true if successful, false on error
 */
export const ensurePetImagesBucketExists = async (): Promise<boolean> => {
  try {
    console.log('App: Initializing storage bucket for pet images...');
    
    const bucketReady = await verifyPetImagesBucket();
    
    if (bucketReady) {
      console.log('App: Pet images bucket ready to use');
      return true;
    } else {
      console.warn('App: Pet images bucket could not be initialized. Image uploads may fail.');
      return false;
    }
  } catch (error) {
    console.error('App: Error initializing pet images bucket:', error);
    
    // Continue without failing the app - the user can still use local images
    return false;
  }
};

/**
 * Checks if a bucket exists in Supabase
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`Error checking if bucket ${bucketName} exists:`, error.message);
      return false;
    }
    
    return !!buckets?.some(bucket => bucket.name === bucketName);
  } catch (error) {
    console.error(`Exception checking if bucket ${bucketName} exists:`, error);
    return false;
  }
};

/**
 * Gets the URL for a pet image in Supabase storage
 * @param filename The filename of the image
 * @param bucket The storage bucket name (default: 'pet-images')
 * @returns The public URL of the image
 */
export function getPetImageUrl(filename: string, bucket: string = 'pet-images'): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
} 