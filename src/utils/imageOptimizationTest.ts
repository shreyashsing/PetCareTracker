/**
 * Test file for image optimization functions
 * This file exists to verify that the image optimization functions can be imported and used correctly
 */

import { 
  optimizeImage, 
  ImageQuality, 
  ImageSize, 
  createThumbnail 
} from './imageOptimization';

/**
 * Test function to verify image optimization works
 */
export async function testImageOptimization(imageUri: string) {
  try {
    console.log('Testing image optimization...');
    
    // Test basic image optimization
    const result = await optimizeImage({
      uri: imageUri,
      width: ImageSize.MEDIUM.width,
      height: ImageSize.MEDIUM.height,
      quality: ImageQuality.MEDIUM
    });
    
    console.log('Image optimization result:', result);
    
    // Test thumbnail creation
    const thumbnail = await createThumbnail(imageUri);
    console.log('Thumbnail result:', thumbnail);
    
    return {
      success: true,
      optimizedImage: result,
      thumbnail
    };
  } catch (error) {
    console.error('Image optimization test failed:', error);
    return {
      success: false,
      error
    };
  }
} 