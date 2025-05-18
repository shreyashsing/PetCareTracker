import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../services/supabase';
import { generateUUID } from './helpers';
import { verifyPetImagesBucket } from './setupStorage';
import NetInfo from '@react-native-community/netinfo';
import { SUPABASE_URL } from '@env';

// Global flag to track image picker state - helps prevent navigation issues
export let isImagePickerActive = false;

/**
 * Sets the image picker active state
 * @param active Whether the image picker is active
 */
export const setImagePickerActive = (active: boolean) => {
  console.log(`Setting image picker active state: ${active}`);
  isImagePickerActive = active;
};

/**
 * Sleep function for retry mechanism
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Type for upload errors
interface StorageError {
  message?: string;
  statusCode?: string | number;
  [key: string]: any;
}

/**
 * Checks if the device has internet connectivity
 * Returns true if connected, false otherwise
 */
const checkInternetConnectivity = async (): Promise<boolean> => {
  try {
    // First use NetInfo for a quick initial check
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
      console.log('NetInfo indicates no connection:', netInfoState);
      return false;
    }

    // Then do an actual fetch to verify connectivity to the internet
    console.log('Testing connection with fetch...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const testResponse = await fetch('https://www.google.com', {
        method: 'HEAD',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`Connectivity test result: ${testResponse.ok}`);
      return testResponse.ok;
    } catch (error) {
      console.log('Network connectivity test failed:', error);
      return false;
    }
  } catch (error) {
    console.log('Exception during connectivity check:', error);
    return false;
  }
};

/**
 * Extract the project ref from the Supabase URL
 */
const getProjectRefFromUrl = (url: string): string => {
  try {
    // Extract project reference from URL (e.g., https://yourproject.supabase.co)
    const matches = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return 'unknown-project';
  } catch (error) {
    console.error('Error extracting project ref:', error);
    return 'unknown-project';
  }
};

/**
 * Try to directly upload file from filesystem (Android-only alternative)
 */
const tryDirectFileUpload = async (uri: string, bucketName: string, filename: string): Promise<any> => {
  if (Platform.OS !== 'android') {
    return { error: { message: 'Direct file upload only supported on Android' } };
  }
  
  try {
    console.log('Attempting direct file upload method...');
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { error: { message: 'File does not exist' } };
    }
    
    console.log(`File exists at ${uri}, size: ${fileInfo.size} bytes`);
    
    // Create the blob from the file
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();
    console.log(`Created blob from file, size: ${blob.size} bytes`);
    
    // For Android, we'll try using a manual fetch API approach to get detailed error info
    console.log('Using manual fetch for better error details...');
    
    try {
      // Get the Supabase auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || '';
      
      // Extract the project reference from the URL 
      const projectRef = getProjectRefFromUrl(SUPABASE_URL);
      console.log(`Using project ref: ${projectRef}`);
      
      const uploadUrl = `https://${projectRef}.supabase.co/storage/v1/object/${bucketName}/${filename}`;
      
      console.log(`Uploading to: ${uploadUrl}`);
      
      // Perform the fetch with detailed logging
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true'
        },
        body: blob,
      });
      
      // Log detailed response information
      console.log(`Upload response status: ${uploadResponse.status}`);
      console.log(`Upload response status text: ${uploadResponse.statusText}`);
      
      // Get the response body for more details
      let responseBody = null;
      try {
        responseBody = await uploadResponse.text();
        console.log(`Response body: ${responseBody}`);
      } catch (e) {
        console.log('Could not read response body:', e);
      }
      
      if (!uploadResponse.ok) {
        return { 
          error: { 
            message: `Upload failed with status ${uploadResponse.status}`, 
            statusCode: uploadResponse.status,
            responseBody
          } 
        };
      }
      
      // Parse the successful response
      try {
        const jsonResponse = JSON.parse(responseBody || '{}');
        return { data: jsonResponse };
      } catch (e) {
        console.log('Failed to parse successful response:', e);
        return { data: { path: filename } };
      }
    } catch (fetchError) {
      console.log('Error setting up manual fetch:', fetchError);
      
      // Fall back to using the Supabase client methods
      console.log('Falling back to Supabase client methods...');
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          duplex: 'half',
        });
        
      if (error) {
        return { error };
      }
      return { data };
    }
  } catch (error) {
    console.log('Direct file upload failed:', error);
    return { error: { message: error instanceof Error ? error.message : 'Unknown error in direct upload' } };
  }
};

/**
 * Uploads an image to Supabase storage and returns the public URL
 * If Supabase upload fails, uses the local URI
 * @param uri Local URI of the image to upload
 * @returns Public URL of the uploaded image, or original URI if upload failed
 */
export const uploadImageToSupabase = async (uri: string): Promise<string> => {
  // Validate input
  if (!uri) {
    console.error('Invalid image URI provided to uploadImageToSupabase');
    return 'https://via.placeholder.com/150';
  }
  
  try {
    console.log(`------ IMAGE UPLOAD DEBUGGING INFO ------`);
    console.log(`Starting image upload process for URI: ${uri.substring(0, 50)}...`);
    
    // Check internet connectivity first
    console.log('Checking internet connectivity...');
    const isConnected = await checkInternetConnectivity();
    if (!isConnected) {
      console.log('No internet connection detected. Will use local image URI.');
      return uri;
    }
    
    // Verify the storage bucket exists and is properly configured
    console.log(`Step 1: Verifying storage bucket...`);
    await verifyPetImagesBucket();
    
    // Use the known bucket name
    const bucketName = 'pet-images';
    console.log(`Using bucket: ${bucketName}`);
    
    // Create a unique filename
    const filename = `${generateUUID()}.jpg`;
    console.log(`Step 2: Generated filename: ${filename}`);
    
    // Set up retry parameters
    const maxRetries = 3;
    let retryCount = 0;
    let uploadSuccess = false;
    let data = null;
    let lastError: StorageError | Error | null = null;
    
    // Try Android direct file upload method first if on Android
    if (Platform.OS === 'android') {
      console.log('Attempting direct file upload for Android...');
      const directResult = await tryDirectFileUpload(uri, bucketName, filename);
      
      if (!directResult.error) {
        console.log('Direct file upload succeeded!');
        data = directResult.data;
        uploadSuccess = true;
      } else {
        console.log('Direct upload failed, falling back to blob method:', directResult.error);
      }
    }
    
    // If direct upload didn't succeed, try blob method with retries
    if (!uploadSuccess) {
      // Convert image to blob using fetch API (works on all platforms)
      console.log(`Step 3: Converting image to blob...`);
      try {
        // Use a timeout for the fetch operation
        const controller = new AbortController();
        const fetchTimeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(uri, { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(fetchTimeoutId);
        
        if (!response.ok) {
          console.error(`Failed to fetch image: ${response.status}`);
          return uri;
        }
        
        const blob = await response.blob();
        console.log(`Image blob created, size: ${blob.size} bytes`);
        
        // For large images, consider reducing size
        if (blob.size > 5 * 1024 * 1024) { // 5MB limit
          console.log('Image is large (>5MB). This may cause upload issues on slow connections.');
        }
        
        // Upload the file to Supabase Storage with retry mechanism
        console.log(`Step 4: Uploading to Supabase Storage to bucket: ${bucketName}...`);
        
        while (retryCount < maxRetries && !uploadSuccess) {
          try {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
              // Wait longer before each retry (progressive backoff)
              const waitTime = 1000 * Math.pow(2, retryCount);
              console.log(`Waiting ${waitTime}ms before retry...`);
              await sleep(waitTime);
              
              // Check connectivity again before retry
              const stillConnected = await checkInternetConnectivity();
              if (!stillConnected) {
                console.log('Internet connection lost during upload attempts');
                break;
              }
            }
            
            // Set a reasonable timeout using Promise.race
            try {
              // Increase timeout for each retry
              const timeoutDuration = 30000 + (retryCount * 15000);
              
              // Create a fresh upload promise with specific options for better reliability
              const uploadPromise = supabase.storage
                .from(bucketName)
                .upload(filename, blob, {
                  contentType: 'image/jpeg',
                  upsert: true,
                  duplex: 'half', // Important for large uploads
                });
                
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Upload timeout after ${timeoutDuration/1000} seconds`)), timeoutDuration)
              );
              
              const result = await Promise.race([uploadPromise, timeoutPromise]);
                
              // @ts-ignore - TypeScript doesn't know the shape of the result
              if (result.error) {
                // @ts-ignore
                lastError = result.error;
                // @ts-ignore
                console.log(`Upload attempt ${retryCount + 1} failed: ${result.error.message}`);
                
                // If this is a permission error, it's unlikely that retrying will help
                // @ts-ignore
                if (result.error.message?.includes('permission') || 
                    // @ts-ignore
                    result.error.message?.includes('not authorized') ||
                    // @ts-ignore
                    result.error.message?.includes('row-level security')) {
                  console.log('Permission error detected - breaking retry loop');
                  break;
                }
              } else {
                // @ts-ignore
                data = result.data;
                uploadSuccess = true;
                console.log(`Upload successful on attempt ${retryCount + 1}`);
              }
            } catch (innerError) {
              throw innerError;
            }
          } catch (error) {
            lastError = error as Error;
            console.log(`Exception on upload attempt ${retryCount + 1}:`, error);
            
            // Special handling for network errors
            if (error instanceof Error && 
                (error.message.includes('Network request failed') || 
                 error.message.includes('Failed to fetch') ||
                 error.message.includes('timeout'))) {
              console.log('Network error detected - may be temporary connection issue');
            }
          }
          
          retryCount++;
        }
      } catch (uploadError) {
        console.error(`Error during image blob creation/upload: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        console.log('Returning local URI as fallback');
        return uri;
      }
    }
    
    if (!uploadSuccess) {
      console.log(`[ERROR TRACKING] REGULAR: All upload attempts failed after ${maxRetries} tries`);
      if (lastError) {
        const errorMessage = lastError instanceof Error ? lastError.message : 
                            (lastError.message || JSON.stringify(lastError));
        console.error(`Last error: ${errorMessage}`);
        console.log(`[ERROR TRACKING] CRITICAL: Last error: ${errorMessage}`);
        
        // Special handling for network errors
        if (typeof errorMessage === 'string' && 
            (errorMessage.includes('Network request failed') || 
             errorMessage.includes('timeout'))) {
          console.log(`
=======================================================================
NETWORK ERROR: Unable to upload image to Supabase:
1. Check your internet connection
2. Make sure the Supabase service is accessible
3. Try again when you have a stable connection
4. The app will use the local image for now
=======================================================================
          `);
        }
        
        // Check for permission errors in a type-safe way
        const errorStr = typeof errorMessage === 'string' ? errorMessage : '';
        
        if (errorStr && (
            errorStr.includes('permission') || 
            errorStr.includes('not authorized') ||
            errorStr.includes('row-level security')
          )) {
          console.log(`
=======================================================================
STORAGE PERMISSION ERROR: Please ensure that:
1. The 'pet-images' bucket exists in your Supabase project
2. The bucket has the necessary RLS policies applied (see README)
3. Your user has permission to upload to the bucket
=======================================================================
          `);
        }
      }
      
      // Return the original URI as fallback - it will still work for display
      return uri;
    }
    
    console.log(`Upload successful! Path: ${data?.path}`);
    
    // Get the public URL
    console.log(`Step 5: Getting public URL...`);
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error(`Failed to get public URL`);
      return uri;
    }
    
    console.log(`Success! Public URL: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Exception during image upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    // Return original URI as fallback
    return uri;
  }
};

/**
 * Convert a base64 string to an ArrayBuffer
 */
function convertBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Extracts the file path from a Supabase URL
 * @param url The Supabase URL to extract the file path from
 * @returns The file path or null if extraction failed
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  if (!url || !url.includes('supabase.co/storage/v1/object/public/')) {
    return null;
  }
  
  try {
    // Extract bucket name and file path from URL
    const bucketMatch = url.match(/\/public\/([^\/]+)\//);
    if (!bucketMatch || bucketMatch.length < 2) {
      return null;
    }
    
    const bucketName = bucketMatch[1];
    const urlParts = url.split(`/public/${bucketName}/`);
    
    if (urlParts.length < 2) {
      return null;
    }
    
    // Remove any query parameters
    return urlParts[1].split('?')[0];
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

/**
 * Deletes an image from Supabase storage by its URL
 * @param url The Supabase URL of the image to delete
 * @returns True if the deletion was successful, false otherwise
 */
export const deleteImageFromSupabase = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    // Extract the file path from the URL
    const filePath = extractFilePathFromUrl(url);
    
    if (!filePath) {
      console.log('Not a valid Supabase storage URL:', url);
      return false;
    }
    
    console.log('Deleting image from Supabase storage:', filePath);
    
    // Extract bucket name from URL
    const bucketMatch = url.match(/\/public\/([^\/]+)\//);
    const bucketName = bucketMatch && bucketMatch.length > 1 ? bucketMatch[1] : 'pet-images';
    
    // Delete the file from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return false;
    } else {
      console.log('Successfully deleted image');
      return true;
    }
  } catch (error) {
    console.error('Exception while deleting image:', error);
    return false;
  }
};

/**
 * Updates a pet image by deleting the old one (if exists) and uploading the new one
 * @param oldImageUrl The existing image URL to delete (if it's a Supabase URL)
 * @param newImageUri The new image URI to upload
 * @returns The URL of the uploaded image
 */
export const updatePetImage = async (oldImageUrl: string | undefined, newImageUri: string): Promise<string> => {
  try {
    // Delete old image if it exists and is a Supabase URL
    if (oldImageUrl) {
      await deleteImageFromSupabase(oldImageUrl);
    }
    
    // Upload new image
    console.log('Uploading new pet image to Supabase storage...');
    const uploadedImageUrl = await uploadImageToSupabase(newImageUri);
    
    console.log('Upload result:', uploadedImageUrl);
    return uploadedImageUrl;
  } catch (error) {
    console.error('Error updating pet image:', error);
    // Return the new image URI as fallback
    return newImageUri;
  }
}; 