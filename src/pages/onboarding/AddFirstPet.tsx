import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Button } from '../../components/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { useActivePet } from '../../hooks/useActivePet';
import { useToast } from '../../hooks/use-toast';
import * as ImagePicker from 'expo-image-picker';
import { databaseManager, STORAGE_KEYS } from '../../services/db';
import { AsyncStorageService } from '../../services/db/asyncStorage';
import { Pet } from '../../types/components';
import { generateUUID } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

type AddFirstPetNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define the Pet Type to match the main app's type
type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'small_mammal' | 'other';

export const AddFirstPet: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<AddFirstPetNavigationProp>();
  const { setActivePetId } = useActivePet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // State for basic pet info
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetType>('dog');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petGender, setPetGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [petSize, setPetSize] = useState<'small' | 'medium' | 'large' | null>(null);
  const [petAllergies, setPetAllergies] = useState('');
  const [petImage, setPetImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Advanced fields with defaults
  const [microchipped, setMicrochipped] = useState(false);
  const [microchipId, setMicrochipId] = useState('');
  const [neutered, setNeutered] = useState(false);
  const [petColor, setPetColor] = useState('');
  const [petMedicalConditions, setPetMedicalConditions] = useState('');
  
  const validateFields = (): boolean => {
    if (!petName.trim()) {
      toast({ title: 'Error', description: 'Pet name is required', variant: 'destructive' });
      return false;
    }
    
    if (!petBreed.trim()) {
      toast({ title: 'Error', description: 'Breed is required', variant: 'destructive' });
      return false;
    }
    
    if (!petWeight.trim()) {
      toast({ title: 'Error', description: 'Weight is required', variant: 'destructive' });
      return false;
    } else if (isNaN(parseFloat(petWeight))) {
      toast({ title: 'Error', description: 'Weight must be a number', variant: 'destructive' });
      return false;
    }
    
    if (microchipped && !microchipId.trim()) {
      toast({ title: 'Error', description: 'Microchip ID is required when microchipped is selected', variant: 'destructive' });
      return false;
    }
    
    return true;
  };
  
  const handleAddPet = async () => {
    if (!validateFields()) return;
    
    setIsLoading(true);
    
    try {
      // Create pet with the same structure as AddPet.tsx
      const petId = generateUUID();
      console.log(`Creating pet with ID: ${petId}`);
      
      // Calculate birth date from age (approximate)
      let birthDate = new Date();
      if (petAge && !isNaN(parseInt(petAge))) {
        birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - parseInt(petAge));
      }
      
      // Create the pet object
      const newPet: Pet = {
        id: petId,
        userId: user?.id || 'user123',
        name: petName,
        type: petType,
        breed: petBreed,
        birthDate: birthDate,
        gender: petGender,
        weight: parseFloat(petWeight) || 0,
        weightUnit: 'kg', // Default to kg
        microchipped: microchipped,
        microchipId: microchipped ? microchipId : undefined,
        neutered: neutered,
        adoptionDate: undefined, // Not collecting this in the first pet flow
        color: petColor || '',
        image: petImage || 'https://via.placeholder.com/150',
        medicalConditions: petMedicalConditions.split(',').map(item => item.trim()).filter(Boolean),
        allergies: petAllergies.split(',').map(item => item.trim()).filter(Boolean),
        veterinarian: {
          name: '',
          phone: '',
          clinic: ''
        },
         // Not collecting this in the first pet flow
        status: 'healthy' // Default to healthy
      };
      
      try {
        // Save the pet to the database using the same database service
        console.log(`Saving pet ${newPet.name} to database`);
        await databaseManager.pets.create(newPet);
        
        // Set this pet as the active pet
        console.log(`Setting pet ${petId} as active`);
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
        setActivePetId(petId);
        
        // Navigate to the main app and show welcome message
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainStack' }],
        });
        
        toast({
          title: "Pet Added Successfully",
          description: `Welcome to Pet Care Tracker! You can now start tracking ${petName}'s care.`,
          variant: "default"
        });
      } catch (dbError) {
        console.error('Error saving pet to database:', dbError);
        
        // Continue with local storage version if Supabase fails
        console.log(`Setting pet ${petId} as active (local only)`);
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
        setActivePetId(petId);
        
        // Navigate to main app with warning
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainStack' }],
        });
        
        toast({
          title: "Pet Added With Warning",
          description: "Your pet was saved locally but there was an issue syncing to the cloud. Your data will sync when connection is restored.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in add pet flow:', error);
      setIsLoading(false);
      toast({
        title: "Error Adding Pet",
        description: "There was a problem adding your pet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera roll permissions to upload a pet image.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    }
    return true;
  };
  
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      setImageLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setPetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImageLoading(false);
    }
  };
  
  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera permissions to take a photo.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    try {
      setImageLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setPetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setImageLoading(false);
    }
  };
  
  const showImagePicker = () => {
    Alert.alert(
      'Upload Photo',
      'Choose a photo from your gallery or take a new one',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };
  
  const renderPetTypeOptions = () => {
    const options: { label: string; value: PetType; icon: string }[] = [
      { label: 'Dog', value: 'dog', icon: 'pets' },
      { label: 'Cat', value: 'cat', icon: 'pets' },
      { label: 'Bird', value: 'bird', icon: 'egg' },
      { label: 'Rabbit', value: 'rabbit', icon: 'pets' },
      { label: 'Fish', value: 'fish', icon: 'waves' },
      { label: 'Reptile', value: 'reptile', icon: 'pest-control' },
      { label: 'Small Mammal', value: 'small_mammal', icon: 'pets' },
      { label: 'Other', value: 'other', icon: 'pets' },
    ];
    
    return (
      <View style={styles.petTypeOptionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.petTypeOption,
              petType === option.value && styles.petTypeOptionSelected
            ]}
            onPress={() => setPetType(option.value)}
          >
            <MaterialIcons
              name={option.icon as keyof typeof MaterialIcons.glyphMap}
              size={24}
              color={petType === option.value ? '#fff' : '#4CAF50'}
            />
            <Text
              style={[
                styles.petTypeOptionText,
                petType === option.value && styles.petTypeOptionTextSelected
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialIcons name="pets" size={40} color="#4CAF50" />
          <Text style={styles.title}>Add Your First Pet</Text>
          <Text style={styles.subtitle}>Tell us about your furry friend</Text>
        </View>
        
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity 
            style={styles.imagePickerButton} 
            onPress={showImagePicker}
            disabled={imageLoading}
          >
            {imageLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : petImage ? (
              <>
                <Image 
                  source={{ uri: petImage }} 
                  style={styles.petImage} 
                  resizeMode="cover"
                />
                <View style={styles.removePhotoButtonContainer}>
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => setPetImage(null)}
                  >
                    <MaterialIcons name="delete" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.imagePickerContent}>
                <View style={styles.imagePickerIconContainer}>
                  <MaterialIcons name="photo-camera" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.imagePickerText}>Add Pet Photo</Text>
                <Text style={styles.imagePickerSubtext}>
                  Tap to upload
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pet Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your pet's name"
              value={petName}
              onChangeText={setPetName}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pet Type</Text>
            {renderPetTypeOptions()}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Breed</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your pet's breed"
              value={petBreed}
              onChangeText={setPetBreed}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={petAge}
                onChangeText={setPetAge}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Weight"
                value={petWeight}
                onChangeText={setPetWeight}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petGender === 'male' && styles.optionButtonSelected
                ]}
                onPress={() => setPetGender('male')}
              >
                <MaterialIcons
                  name="male"
                  size={24}
                  color={petGender === 'male' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petGender === 'male' && styles.optionTextSelected
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petGender === 'female' && styles.optionButtonSelected
                ]}
                onPress={() => setPetGender('female')}
              >
                <MaterialIcons
                  name="female"
                  size={24}
                  color={petGender === 'female' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petGender === 'female' && styles.optionTextSelected
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petGender === 'unknown' && styles.optionButtonSelected
                ]}
                onPress={() => setPetGender('unknown')}
              >
                <MaterialIcons
                  name="help"
                  size={24}
                  color={petGender === 'unknown' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petGender === 'unknown' && styles.optionTextSelected
                  ]}
                >
                  Unknown
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Size</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petSize === 'small' && styles.optionButtonSelected
                ]}
                onPress={() => setPetSize('small')}
              >
                <MaterialIcons
                  name="pets"
                  size={24}
                  color={petSize === 'small' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petSize === 'small' && styles.optionTextSelected
                  ]}
                >
                  Small
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petSize === 'medium' && styles.optionButtonSelected
                ]}
                onPress={() => setPetSize('medium')}
              >
                <MaterialIcons
                  name="pets"
                  size={24}
                  color={petSize === 'medium' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petSize === 'medium' && styles.optionTextSelected
                  ]}
                >
                  Medium
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  petSize === 'large' && styles.optionButtonSelected
                ]}
                onPress={() => setPetSize('large')}
              >
                <MaterialIcons
                  name="pets"
                  size={24}
                  color={petSize === 'large' ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.optionText,
                    petSize === 'large' && styles.optionTextSelected
                  ]}
                >
                  Large
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your pet's color"
              value={petColor}
              onChangeText={setPetColor}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.label}>Is your pet microchipped?</Text>
            <TouchableOpacity 
              style={[styles.switchButton, microchipped && styles.switchButtonActive]}
              onPress={() => setMicrochipped(!microchipped)}
            >
              <View style={[styles.switchThumb, microchipped && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          
          {microchipped && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Microchip ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter microchip ID"
                value={microchipId}
                onChangeText={setMicrochipId}
                placeholderTextColor="#999"
              />
            </View>
          )}
          
          <View style={styles.switchRow}>
            <Text style={styles.label}>Is your pet neutered/spayed?</Text>
            <TouchableOpacity 
              style={[styles.switchButton, neutered && styles.switchButtonActive]}
              onPress={() => setNeutered(!neutered)}
            >
              <View style={[styles.switchThumb, neutered && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical Conditions (if any)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any medical conditions (separated by commas)"
              value={petMedicalConditions}
              onChangeText={setPetMedicalConditions}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies (if any)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any food or environmental allergies (separated by commas)"
              value={petAllergies}
              onChangeText={setPetAllergies}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button
          title={isLoading ? "Saving..." : "Add Pet & Continue"}
          onPress={handleAddPet}
          style={styles.button}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  optionButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  optionTextSelected: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    width: '100%',
  },
  imagePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  imagePickerButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF5020',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: '#666',
  },
  petImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  removePhotoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 70,
  },
  petTypeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  petTypeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  petTypeOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  petTypeOptionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  petTypeOptionTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchButton: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    padding: 2,
  },
  switchButtonActive: {
    backgroundColor: '#4CAF50',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
}); 