import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import withMemoryLeakProtection, { WithMemoryLeakProtectionProps } from './withMemoryLeakProtection';
import OptimizedImage from './OptimizedImage';
import { useSafeAsync } from '../utils/memoryLeakDetection';
import { ImageSize, ImageQuality } from '../utils/imageOptimization';

interface PetProfileImageProps extends WithMemoryLeakProtectionProps {
  petId: string;
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  placeholder?: string;
}

/**
 * A pet profile image component that:
 * 1. Optimizes the image for the display size
 * 2. Implements memory leak protection
 * 3. Safely loads image data with proper error handling
 * 4. Provides loading and error states
 */
const PetProfileImage: React.FC<PetProfileImageProps> = ({ 
  petId, 
  imageUrl, 
  size = 'medium',
  onPress, 
  placeholder,
  isMounted 
}) => {
  // Get the appropriate image size based on the size prop
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: ImageSize.AVATAR.width, height: ImageSize.AVATAR.height };
      case 'large':
        return { width: ImageSize.MEDIUM.width, height: ImageSize.MEDIUM.height };
      case 'medium':
      default:
        return { width: ImageSize.SMALL.width, height: ImageSize.SMALL.height };
    }
  };

  // Get the appropriate quality based on size
  const getQuality = () => {
    switch (size) {
      case 'small':
        return ImageQuality.MEDIUM;
      case 'large':
        return ImageQuality.HIGH;
      case 'medium':
      default:
        return ImageQuality.MEDIUM;
    }
  };

  const { width, height } = getDimensions();
  const quality = getQuality();

  // Use the safe async hook to load pet data if needed
  const { data: petData, loading: loadingPet, error: petError } = useSafeAsync(
    async (signal) => {
      // If we already have an image URL, don't fetch pet data
      if (imageUrl) {
        return { imageUrl };
      }

      // Example API call - replace with your actual data fetching logic
      const response = await fetch(`/api/pets/${petId}`, { signal });
      
      if (!response.ok) {
        throw new Error('Failed to load pet data');
      }
      
      return await response.json();
    },
    [petId, imageUrl],
    { debugName: `PetProfileImage-${petId}` }
  );

  // Extract the image URL from either props or fetched data
  const imageSource = imageUrl || (petData?.imageUrl || null);
  
  // Generate placeholder text from name if available
  const getPlaceholderText = () => {
    if (placeholder) return placeholder.substring(0, 2).toUpperCase();
    if (petData?.name) return petData.name.substring(0, 2).toUpperCase();
    return 'PET';
  };

  // Wrapper to make the image pressable if onPress is provided
  const renderContent = () => (
    <View style={[styles.container, { width, height }]}>
      {imageSource ? (
        <OptimizedImage
          source={{ uri: imageSource }}
          width={width}
          height={height}
          quality={quality}
          style={styles.image}
        />
      ) : (
        <View style={[styles.placeholder, { width, height }]}>
          <Text style={styles.placeholderText}>{getPlaceholderText()}</Text>
        </View>
      )}
      
      {loadingPet && (
        <View style={[styles.overlay, { width, height }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {petError && (
        <View style={[styles.errorOverlay, { width, height }]}>
          <Text style={styles.errorText}>!</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : null}>
        {renderContent()}
      </Pressable>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999, // Make it perfectly round
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#757575',
    fontSize: 24,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
  },
  errorText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
});

// Export the component with memory leak protection applied
export default withMemoryLeakProtection(PetProfileImage, 'PetProfileImage'); 