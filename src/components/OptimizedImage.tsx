import React, { useState, useEffect } from 'react';
import { Image, ImageProps, StyleSheet, View, ActivityIndicator } from 'react-native';
import { 
  OptimizedImageProps, 
  optimizeImage, 
  ImageQuality, 
  optimizeAsset 
} from '../utils/imageOptimization';

/**
 * OptimizedImage component that automatically optimizes images based on their display size
 * 
 * Features:
 * - Automatic image quality and size optimization
 * - Size-based caching
 * - Support for placeholder and error states
 * - Support for SVG components
 */
const OptimizedImage: React.FC<OptimizedImageProps & ImageProps> = ({
  source,
  width,
  height,
  quality = ImageQuality.MEDIUM,
  style,
  SvgComponent,
  resizeMode = 'cover',
  onLoadStart,
  onLoadEnd,
  onError,
  ...rest
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    const processImage = async () => {
      try {
        // Handle source types
        if (!source) {
          throw new Error('No image source provided');
        }

        // For SVG components, we don't need to optimize
        if (SvgComponent) {
          setImageUri(null);
          setLoading(false);
          return;
        }

        let uri: string;

        // Handle numeric sources (require('./image.png'))
        if (typeof source === 'number') {
          uri = optimizeAsset(source);
          if (isMounted) {
            setImageUri(uri);
            setLoading(false);
          }
          return;
        }

        // Handle object sources ({ uri: 'https://...' })
        if (typeof source === 'object' && (source as any).uri) {
          uri = (source as any).uri;
        } 
        // Handle string sources
        else if (typeof source === 'string') {
          uri = source;
        } 
        else {
          throw new Error('Invalid image source');
        }

        // Optimize the image
        if (uri) {
          onLoadStart?.();
          const result = await optimizeImage({
            uri,
            width,
            height,
            quality,
            maintainAspectRatio: true
          });

          if (isMounted) {
            setImageUri(result.uri);
            setLoading(false);
            onLoadEnd?.();
          }
        }
      } catch (err) {
        console.error('Image optimization error:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
          
          // If there's an original source, use it
          if (typeof source === 'object' && (source as any).uri) {
            setImageUri((source as any).uri);
          } else if (typeof source === 'string') {
            setImageUri(source);
          }
          
          onError?.(err as any);
          onLoadEnd?.();
        }
      }
    };

    processImage();

    return () => {
      isMounted = false;
    };
  }, [source, width, height, quality]);

  // Render SVG if provided
  if (SvgComponent) {
    return (
      <SvgComponent 
        width={width} 
        height={height}
        style={style}
        {...rest}
      />
    );
  }

  // Render placeholder while loading
  if (loading) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }

  // Render error state
  if (error && !imageUri) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={styles.errorContainer} />
      </View>
    );
  }

  // Render optimized image
  return (
    <Image
      source={{ uri: imageUri! }}
      style={[{ width, height }, style]}
      resizeMode={resizeMode}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
});

export default OptimizedImage; 