import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { storageDebugService } from '../../services/db/supabaseStorage';
import { uploadImageToSupabase } from '../../utils/imageUpload';
import { supabase } from '../../services/supabase';
import { useAppColors } from '../../hooks/useAppColors';

interface DiagnosticSection {
  title: string;
  status: 'pending' | 'success' | 'error' | 'running';
  details: string;
}

const StorageDiagnostic: React.FC = () => {
  const { colors } = useAppColors();
  const [sections, setSections] = useState<DiagnosticSection[]>([
    { title: 'Storage Configuration', status: 'pending', details: 'Not checked yet' },
    { title: 'Bucket Creation', status: 'pending', details: 'Not checked yet' },
    { title: 'Image Upload', status: 'pending', details: 'Not checked yet' },
    { title: 'Image Retrieval', status: 'pending', details: 'Not checked yet' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  
  const updateSection = (index: number, status: DiagnosticSection['status'], details: string) => {
    setSections(prev => {
      const newSections = [...prev];
      newSections[index] = {
        ...newSections[index],
        status,
        details
      };
      return newSections;
    });
  };
  
  const runDiagnostic = async () => {
    if (isRunning) return;
    
    // Reset all sections
    setSections(prev => prev.map(section => ({
      ...section,
      status: 'pending',
      details: 'Not checked yet'
    })));
    
    setIsRunning(true);
    setUploadedImageUrl(null);
    
    try {
      // Section 1: Check general storage configuration
      updateSection(0, 'running', 'Checking storage configuration...');
      
      const diagnostic = await storageDebugService.runDiagnostic();
      
      if (diagnostic.available) {
        updateSection(0, 'success', 
          `Supabase storage is available.\nBuckets: ${diagnostic.buckets.join(', ') || 'None'}\n` +
          `Permissions: ${JSON.stringify(diagnostic.permissions, null, 2)}`
        );
      } else {
        updateSection(0, 'error', 
          `Supabase storage is NOT available.\nError: ${diagnostic.error || 'Unknown issue'}\n` +
          `Permissions: ${JSON.stringify(diagnostic.permissions, null, 2)}`
        );
        return; // Don't continue if storage is not available
      }
      
      // Section 2: Create or ensure pet-images bucket
      updateSection(1, 'running', 'Checking pet-images bucket...');
      
      const bucketName = await storageDebugService.ensurePetImagesBucket();
      
      if (bucketName) {
        updateSection(1, 'success', `Successfully ensured bucket exists: ${bucketName}`);
      } else {
        updateSection(1, 'error', 'Failed to ensure pet-images bucket exists');
        return;
      }
      
      // Section 3: Upload a test image
      updateSection(2, 'running', 'Waiting for test image...');
      
      // Skip automatic upload for now (will be manual)
      if (!testImage) {
        updateSection(2, 'pending', 'Please select a test image using the "Pick Test Image" button');
      } else {
        updateSection(2, 'running', 'Uploading test image...');
        
        try {
          const imageUrl = await uploadImageToSupabase(testImage);
          
          if (imageUrl) {
            setUploadedImageUrl(imageUrl);
            updateSection(2, 'success', `Successfully uploaded image to: ${imageUrl}`);
            
            // Section 4: Test retrieving the image
            updateSection(3, 'running', 'Testing image retrieval...');
            
            // Extract the path from the URL
            const urlParts = imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            
            const { data, error } = await supabase.storage
              .from(bucketName)
              .download(filename);
            
            if (error) {
              updateSection(3, 'error', `Failed to retrieve image: ${error.message}`);
            } else {
              updateSection(3, 'success', 'Successfully retrieved image from storage');
            }
          } else {
            updateSection(2, 'error', 'Failed to upload image');
            updateSection(3, 'pending', 'Image retrieval skipped due to upload failure');
          }
        } catch (error) {
          updateSection(2, 'error', `Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          updateSection(3, 'pending', 'Image retrieval skipped due to upload failure');
        }
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      Alert.alert('Diagnostic Error', 'An unexpected error occurred during diagnostic');
    } finally {
      setIsRunning(false);
    }
  };
  
  const pickTestImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload a test image.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setTestImage(result.assets[0].uri);
        updateSection(2, 'pending', 'Test image selected, please run the diagnostic to upload');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const renderStatus = (status: DiagnosticSection['status']) => {
    switch (status) {
      case 'running':
        return <ActivityIndicator size="small" color={colors.primary} />;
      case 'success':
        return <Text style={[styles.statusIndicator, { color: 'green' }]}>✓</Text>;
      case 'error':
        return <Text style={[styles.statusIndicator, { color: 'red' }]}>✗</Text>;
      default:
        return <Text style={[styles.statusIndicator, { color: 'gray' }]}>-</Text>;
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Supabase Storage Diagnostic</Text>
      
      <ScrollView style={styles.scrollView}>
        {sections.map((section, index) => (
          <View 
            key={section.title} 
            style={[styles.section, { backgroundColor: colors.card }]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              {renderStatus(section.status)}
            </View>
            <Text style={[styles.sectionDetails, { color: colors.text + 'CC' }]}>
              {section.details}
            </Text>
          </View>
        ))}
        
        {testImage && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Image</Text>
            <View style={styles.imageContainer}>
              <View style={styles.imageThumbnail}>
                <Text style={styles.imageLabel}>Local Image:</Text>
                <View style={styles.thumbnailContainer}>
                  {testImage ? (
                    <Image 
                      source={{ uri: testImage }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: colors.text }}>No image selected</Text>
                  )}
                </View>
              </View>
              
              {uploadedImageUrl && (
                <View style={styles.imageThumbnail}>
                  <Text style={styles.imageLabel}>Uploaded Image:</Text>
                  <View style={styles.thumbnailContainer}>
                    <Image 
                      source={{ uri: uploadedImageUrl }} 
                      style={styles.thumbnail}
                      resizeMode="cover"
                      onError={() => {
                        Alert.alert(
                          'Image Error', 
                          'Failed to load the uploaded image. This indicates the URL is incorrect or the image is not publicly accessible.'
                        );
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button, 
            { backgroundColor: colors.primary },
            isRunning && styles.disabledButton
          ]}
          onPress={pickTestImage}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Pick Test Image</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button, 
            { backgroundColor: colors.primary },
            isRunning && styles.disabledButton
          ]}
          onPress={runDiagnostic}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionDetails: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  imageThumbnail: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  imageLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
});

export default StorageDiagnostic; 