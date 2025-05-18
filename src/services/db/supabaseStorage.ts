import { supabase } from '../supabase';

/**
 * Utility to diagnose Supabase storage issues
 */
export const storageDebugService = {
  /**
   * Run a complete diagnostic on Supabase storage
   * Call this function to troubleshoot storage issues
   */
  async runDiagnostic(): Promise<{
    available: boolean;
    buckets: string[];
    permissions: {
      canList: boolean;
      canCreate: boolean;
      canUpload: boolean;
      canDownload: boolean;
    };
    error?: string;
  }> {
    console.log('======= SUPABASE STORAGE DIAGNOSTIC =======');
    
    const result = {
      available: false,
      buckets: [] as string[],
      permissions: {
        canList: false,
        canCreate: false,
        canUpload: false,
        canDownload: false
      },
      error: undefined as string | undefined
    };
    
    try {
      // 1. Check if we can list buckets
      console.log('Testing bucket listing...');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        result.error = `Cannot list buckets: ${listError.message}`;
        return result;
      }
      
      result.permissions.canList = true;
      
      // 2. Log available buckets
      if (buckets && buckets.length > 0) {
        const bucketNames = buckets.map(b => b.name);
        console.log('Available buckets:', bucketNames.join(', '));
        result.buckets = bucketNames;
      } else {
        console.log('No storage buckets available');
      }
      
      // 3. Try to create a test bucket
      console.log('Testing bucket creation...');
      const testBucketName = `test-bucket-${Date.now()}`;
      const { data: createData, error: createError } = await supabase.storage.createBucket(
        testBucketName,
        { public: true }
      );
      
      if (createError) {
        console.error('Error creating test bucket:', createError);
        // Not critical, continue testing
      } else {
        console.log(`Successfully created bucket: ${testBucketName}`);
        result.permissions.canCreate = true;
        
        // 4. Try to upload a file to the test bucket
        console.log('Testing file upload...');
        const testFile = new Blob(['test content'], { type: 'text/plain' });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(testBucketName)
          .upload('test.txt', testFile);
        
        if (uploadError) {
          console.error('Error uploading test file:', uploadError);
        } else {
          console.log('Successfully uploaded test file');
          result.permissions.canUpload = true;
          
          // 5. Try to download the file
          console.log('Testing file download...');
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from(testBucketName)
            .download('test.txt');
          
          if (downloadError) {
            console.error('Error downloading test file:', downloadError);
          } else {
            console.log('Successfully downloaded test file');
            result.permissions.canDownload = true;
          }
        }
        
        // 6. Try to delete the test bucket
        console.log('Cleaning up test bucket...');
        const { error: deleteError } = await supabase.storage.deleteBucket(testBucketName);
        if (deleteError) {
          console.error('Error deleting test bucket:', deleteError);
        } else {
          console.log(`Successfully deleted test bucket: ${testBucketName}`);
        }
      }
      
      // Determine overall availability
      result.available = result.permissions.canList && 
                         (result.buckets.length > 0 || result.permissions.canCreate);
      
      console.log('======= DIAGNOSTIC SUMMARY =======');
      console.log(`Storage Available: ${result.available}`);
      console.log(`Available Buckets: ${result.buckets.join(', ') || 'None'}`);
      console.log(`Permissions: ${JSON.stringify(result.permissions, null, 2)}`);
      
      return result;
    } catch (error) {
      console.error('Unexpected error during storage diagnostic:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  },
  
  /**
   * Create a pet-images bucket if it doesn't exist
   */
  async ensurePetImagesBucket(): Promise<string | null> {
    try {
      console.log('Ensuring pet-images bucket exists...');
      
      // First try to list buckets
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return null;
      }
      
      // Check if pet-images already exists
      if (buckets && buckets.some(b => b.name === 'pet-images')) {
        console.log('pet-images bucket already exists');
        return 'pet-images';
      }
      
      // Create pet-images bucket
      console.log('Creating pet-images bucket...');
      const { error: createError } = await supabase.storage.createBucket(
        'pet-images',
        { public: true }
      );
      
      if (createError) {
        console.error('Error creating pet-images bucket:', createError);
        
        // If we can't create it but have other buckets, use the first one
        if (buckets && buckets.length > 0) {
          console.log(`Using existing bucket: ${buckets[0].name}`);
          return buckets[0].name;
        }
        
        return null;
      }
      
      console.log('Successfully created pet-images bucket');
      return 'pet-images';
    } catch (error) {
      console.error('Error ensuring pet-images bucket:', error);
      return null;
    }
  }
}; 