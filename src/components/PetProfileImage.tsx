import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import OptimizedImage from './OptimizedImage';
import { useSafeAsync } from '../utils/memoryLeakDetection';
import { unifiedDatabaseManager } from '../services/db';
import { supabase } from '../services/supabase';

// Define memory leak protection props interface
interface WithMemoryLeakProtectionProps {
  componentId?: string;
  debugName?: string;
}

interface PetProfileImageProps extends WithMemoryLeakProtectionProps {
  petId?: string;
  petData?: any;
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  width?: number;
  height?: number;
  quality?: number;
  onPress?: () => void;
  placeholder?: string;
  loadImageFromCache?: boolean;
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
  petData, 
  imageUrl, 
  size = 'medium',
  width = 120,
  height = 120, 
  quality = 0.7, // Medium quality
  onPress, 
  placeholder,
  loadImageFromCache = true
}) => {
  const [imageSource, setImageSource] = useState<string | null>(imageUrl || (petData?.image || null));
  const [loadingPet, setLoadingPet] = useState(false);
  const [petError, setPetError] = useState(false);
  
  // Get the appropriate image size based on the size prop
  const getDimensions = () => {
    switch (size) {
      case 'small': return { width: 60, height: 60 };
      case 'medium': return { width: 120, height: 120 };
      case 'large': return { width: 180, height: 180 };
      default: return { width, height };
    }
  };
  
  const { width: finalWidth, height: finalHeight } = getDimensions();
  
  // Load pet image either from passed data or by fetching with ID
  useEffect(() => {
    if (petData?.image) {
      console.log(`Using provided pet image: ${petData.image.substring(0, 50)}...`);
      setImageSource(petData.image);
      return;
    }
    
    if (petId) {
      loadPetImage(petId);
    }
  }, [petId, petData]);

  // Check if storage bucket exists and is accessible
  const checkBucketAccess = async () => {
    try {
      console.log('Checking storage bucket access...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError.message);
        return false;
      }
      
      if (!buckets || buckets.length === 0) {
        console.error('No storage buckets found');
        return false;
    }

      console.log(`Found ${buckets.length} storage buckets:`, buckets.map(b => b.name).join(', '));
      const petImagesBucket = buckets.find(b => b.name === 'pet-images');
      
      if (!petImagesBucket) {
        console.error('pet-images bucket not found in available buckets');
        return false;
      }
      
      console.log('pet-images bucket found:', petImagesBucket);
      return true;
    } catch (error) {
      console.error('Exception checking bucket access:', error);
      return false;
    }
  };
  
  const loadPetImage = async (id: string) => {
    setLoadingPet(true);
    setPetError(false);
    
    try {
      // First check if we can access the bucket
      await checkBucketAccess();
      
      const pet = await unifiedDatabaseManager.pets.getById(id);
      if (pet?.image) {
        // Check if the image is a URL or a local file URI
        const isRemoteUrl = pet.image.startsWith('http');
        
        if (isRemoteUrl) {
          // If it's a remote URL, try to verify the image works
          try {
            console.log(`Loading remote pet image: ${pet.image.substring(0, 50)}...`);
            setImageSource(pet.image);
          } catch (imageError) {
            console.error('Error loading remote image:', imageError);
            setPetError(true);
      }
        } else {
          // If it's a local file URI, just use it directly
          console.log(`Loading local pet image: ${pet.image.substring(0, 50)}...`);
          setImageSource(pet.image);
        }
      } else {
        console.log(`No image found for pet ID: ${id}`);
        setImageSource(null);
      }
    } catch (error) {
      console.error(`Error loading pet image for ID ${id}:`, error);
      setPetError(true);
    } finally {
      setLoadingPet(false);
    }
  };
  
  // Generate placeholder text from name if available
  const getPlaceholderText = () => {
    if (placeholder) return placeholder.substring(0, 2).toUpperCase();
    if (petData?.name) return petData.name.substring(0, 2).toUpperCase();
    return 'PET';
  };

  // Handle image loading error
  const handleImageError = (error: any) => {
    console.log(`Image failed to load: ${imageSource}`);
    console.log('Error details:', error);
    
    // If the image source is a Supabase URL but failed to load, 
    // it might be a storage bucket permission issue
    if (imageSource && imageSource.includes('supabase.co')) {
      console.log('Possible Supabase storage permission issue - check RLS policies');
      
      // Check bucket access on error
      checkBucketAccess().then(accessible => {
        console.log(`Bucket accessible: ${accessible}`);
      });
    }
    
    // Check if the local file exists
    if (imageSource && imageSource.startsWith('file://')) {
      console.log('Local file URI might be temporary or no longer exists');
    }
    
    setPetError(true);
  };

  // Wrapper to make the image pressable if onPress is provided
  const renderContent = () => (
    <View style={[styles.container, { width: finalWidth, height: finalHeight }]}>
      {imageSource ? (
        <OptimizedImage
          source={{ uri: imageSource }}
          width={finalWidth}
          height={finalHeight}
          quality={quality}
          style={styles.image}
          onError={handleImageError}
        />
      ) : (
        <View style={[styles.placeholder, { width: finalWidth, height: finalHeight }]}>
          <Text style={styles.placeholderText}>{getPlaceholderText()}</Text>
        </View>
      )}
      
      {loadingPet && (
        <View style={[styles.overlay, { width: finalWidth, height: finalHeight }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {petError && (
        <View style={[styles.errorOverlay, { width: finalWidth, height: finalHeight }]}>
          <Text style={styles.placeholderText}>{getPlaceholderText()}</Text>
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
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#e1e1e1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ee5253',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default PetProfileImage; 