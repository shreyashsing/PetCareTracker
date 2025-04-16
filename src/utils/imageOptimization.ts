import { Image, ImageSourcePropType, Platform } from 'react-native';
import { manipulateAsync, SaveFormat, ImageManipulationResult } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { SvgProps } from 'react-native-svg';

/**
 * Quality settings for different image types
 */
export const ImageQuality = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  THUMBNAIL: 0.3
};

/**
 * Size settings for different use cases
 */
export const ImageSize = {
  FULL: { width: 0, height: 0 }, // Original size
  LARGE: { width: 1200, height: 1200 },
  MEDIUM: { width: 800, height: 800 },
  SMALL: { width: 400, height: 400 },
  THUMBNAIL: { width: 200, height: 200 },
  AVATAR: { width: 120, height: 120 },
  ICON: { width: 60, height: 60 }
};

/**
 * Image format options
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Options for image optimization
 */
export interface OptimizeImageOptions {
  uri: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  maintainAspectRatio?: boolean;
  cacheKey?: string;
}

/**
 * Result of an image optimization operation
 */
export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  size?: number;
  format: ImageFormat;
  cached: boolean;
}

// Cache of optimized images
const imageCache: Record<string, OptimizedImageResult> = {};

/**
 * Get the image format from a URI
 */
const getImageFormat = (uri: string): ImageFormat => {
  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith('.png')) return 'png';
  if (lowerUri.endsWith('.webp')) return 'webp';
  return 'jpeg'; // Default to jpeg
};

/**
 * Convert image format to SaveFormat
 */
const getSaveFormat = (format: ImageFormat): SaveFormat => {
  switch (format) {
    case 'png': return SaveFormat.PNG;
    case 'webp': 
      // WebP is not supported on all platforms
      return Platform.OS === 'ios' && parseInt(Platform.Version, 10) < 14 
        ? SaveFormat.JPEG 
        : SaveFormat.WEBP;
    case 'jpeg':
    default:
      return SaveFormat.JPEG;
  }
};

/**
 * Generate a cache key for an image
 */
const generateCacheKey = (options: OptimizeImageOptions): string => {
  if (options.cacheKey) return options.cacheKey;
  
  const { uri, width, height, quality, format } = options;
  return `${uri}_${width || 'orig'}_${height || 'orig'}_${quality || 'default'}_${format || 'default'}`;
};

/**
 * Get image dimensions from a URI
 */
const getImageDimensions = async (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};

/**
 * Calculate dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  maintainAspectRatio = true
): { width: number; height: number } => {
  if (!targetWidth && !targetHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  if (!maintainAspectRatio) {
    return { 
      width: targetWidth || originalWidth, 
      height: targetHeight || originalHeight 
    };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (targetWidth && targetHeight) {
    // Both dimensions specified - maintain aspect ratio within bounds
    const newWidth = Math.min(targetWidth, targetHeight * aspectRatio);
    const newHeight = Math.min(targetHeight, targetWidth / aspectRatio);
    return { width: Math.round(newWidth), height: Math.round(newHeight) };
  } else if (targetWidth) {
    // Only width specified - calculate height based on aspect ratio
    return { 
      width: Math.round(targetWidth), 
      height: Math.round(targetWidth / aspectRatio) 
    };
  } else if (targetHeight) {
    // Only height specified - calculate width based on aspect ratio
    return { 
      width: Math.round(targetHeight * aspectRatio), 
      height: Math.round(targetHeight) 
    };
  }

  // Fallback - shouldn't reach here due to the first check
  return { width: originalWidth, height: originalHeight };
};

/**
 * Get the file size of an image
 */
const getFileSize = async (uri: string): Promise<number | undefined> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists ? fileInfo.size : undefined;
  } catch (error) {
    console.warn('Could not get file size:', error);
    return undefined;
  }
};

/**
 * Optimize an image for display
 * 
 * @param options Options for optimization
 * @returns Optimized image result
 */
export const optimizeImage = async (
  options: OptimizeImageOptions
): Promise<OptimizedImageResult> => {
  const cacheKey = generateCacheKey(options);

  // Check if image is already cached
  if (imageCache[cacheKey]) {
    return { ...imageCache[cacheKey], cached: true };
  }

  try {
    // Get original dimensions if not resizing
    const originalDimensions = await getImageDimensions(options.uri);
    
    // Calculate target dimensions
    const dimensions = calculateDimensions(
      originalDimensions.width,
      originalDimensions.height,
      options.width,
      options.height,
      options.maintainAspectRatio !== false
    );

    // Determine format
    const format = options.format || getImageFormat(options.uri);
    const saveFormat = getSaveFormat(format);
    
    // Skip optimization if dimensions are the same and quality is high
    if (
      dimensions.width === originalDimensions.width &&
      dimensions.height === originalDimensions.height &&
      (!options.quality || options.quality >= 0.95) &&
      !options.format
    ) {
      const size = await getFileSize(options.uri);
      const result: OptimizedImageResult = {
        uri: options.uri,
        width: dimensions.width,
        height: dimensions.height,
        size,
        format,
        cached: false
      };
      
      // Cache the result
      imageCache[cacheKey] = result;
      return result;
    }

    // Perform the optimization
    const manipulationOptions: any[] = [];
    
    // Resize if dimensions changed
    if (
      dimensions.width !== originalDimensions.width ||
      dimensions.height !== originalDimensions.height
    ) {
      manipulationOptions.push({
        resize: {
          width: dimensions.width,
          height: dimensions.height
        }
      });
    }

    // Apply optimization
    const manipulateResult: ImageManipulationResult = await manipulateAsync(
      options.uri,
      manipulationOptions,
      {
        compress: options.quality || ImageQuality.MEDIUM,
        format: saveFormat
      }
    );

    // Get size of optimized image
    const size = await getFileSize(manipulateResult.uri);

    // Create result
    const result: OptimizedImageResult = {
      uri: manipulateResult.uri,
      width: manipulateResult.width,
      height: manipulateResult.height,
      size,
      format,
      cached: false
    };

    // Cache the result
    imageCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error('Image optimization failed:', error);
    
    // Return original image on error
    return {
      uri: options.uri,
      width: options.width || 0,
      height: options.height || 0,
      format: options.format || getImageFormat(options.uri),
      cached: false
    };
  }
};

/**
 * Clear the image optimization cache
 */
export const clearImageCache = (): void => {
  Object.keys(imageCache).forEach(key => {
    delete imageCache[key];
  });
};

/**
 * Create a thumbnail from an image
 */
export const createThumbnail = async (
  uri: string, 
  size = ImageSize.THUMBNAIL.width
): Promise<OptimizedImageResult> => {
  return optimizeImage({
    uri,
    width: size,
    height: size,
    quality: ImageQuality.THUMBNAIL,
    maintainAspectRatio: true
  });
};

/**
 * Preload an image into memory
 */
export const preloadImage = async (source: ImageSourcePropType): Promise<void> => {
  if (!source) return;
  
  // Handle both object and string sources
  const uri = typeof source === 'string' ? source : (source as any).uri;
  
  if (!uri) return;
  
  try {
    await Image.prefetch(uri);
  } catch (error) {
    console.warn('Image preloading failed:', error);
  }
};

/**
 * React component props for the optimized image component
 */
export interface OptimizedImageProps {
  source: ImageSourcePropType;
  width?: number;
  height?: number;
  quality?: number;
  style?: any;
  SvgComponent?: React.ComponentType<SvgProps>;
  [key: string]: any;
}

/**
 * Map of asset module IDs to URLs to prevent unnecessary optimizations
 */
export const assetMap = new Map<number, string>();

/**
 * Optimizes assets loaded via require() to prevent unnecessary optimizations
 * @param assetId The asset module ID (e.g., require('./image.png'))
 * @returns The URL of the asset
 */
export const optimizeAsset = (assetId: number): string => {
  if (assetMap.has(assetId)) {
    return assetMap.get(assetId)!;
  }
  
  const source = Image.resolveAssetSource(assetId);
  assetMap.set(assetId, source.uri);
  return source.uri;
}; 