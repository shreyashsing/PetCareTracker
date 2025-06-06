import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Switch, 
  FormRow,
  DatePicker
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAppColors } from '../hooks/useAppColors';
import { useFormStatePersistence } from '../hooks/useFormStatePersistence';
import { FormStateNotification } from '../components/FormStateNotification';
import { Pet } from '../types/components';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { generateUUID } from '../utils/helpers';
import { useAuth } from '../providers/AuthProvider';
import { uploadImageToSupabase, setImagePickerActive, deleteImageFromSupabase, updatePetImage } from '../utils/imageUpload';

const { width } = Dimensions.get('window');

// Use the correct type from NativeStackScreenProps
type AddPetScreenProps = NativeStackScreenProps<MainStackParamList, 'AddPet'>;

type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'small_mammal' | 'other';

interface FormState {
  name: string;
  type: PetType;
  breed: string;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'giant';
  birthDate: Date | undefined;
  gender: 'male' | 'female' | 'unknown';
  weight: string;
  weightUnit: 'kg' | 'lb';
  microchipped: boolean;
  microchipId: string;
  neutered: boolean;
  adoptionDate: Date | undefined;
  color: string;
  notes: string;
  image?: string;
  medicalConditions: string;
  allergies: string;
  veterinarian: {
    name: string;
    phone: string;
    clinic: string;
  };
  status: 'healthy' | 'recovering' | 'ill' | 'chronic' | 'unknown';
}

const PetTypeIcons: Record<PetType, any> = {
  dog: 'paw',
  cat: 'paw',
  bird: 'egg',
  rabbit: 'paw',
  fish: 'water',
  reptile: 'leaf',
  small_mammal: 'paw',
  other: 'paw',
};

const AddPet: React.FC<AddPetScreenProps> = ({ navigation }) => {
  const { colors, isDark  } = useAppColors();
  const { setActivePetId } = useActivePet();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  const [formState, setFormState] = useState<FormState>({
    name: '',
    type: 'dog',
    breed: '',
    size: 'medium',
    birthDate: undefined,
    gender: 'unknown',
    weight: '',
    weightUnit: 'kg',
    microchipped: false,
    microchipId: '',
    neutered: false,
    adoptionDate: undefined,
    color: '',
    notes: '',
    image: undefined,
    medicalConditions: '',
    allergies: '',
    veterinarian: {
      name: '',
      phone: '',
      clinic: ''
    },
    status: 'healthy'
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state persistence hook
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'AddPet',
    formState,
    setFormState,
    enabled: true,
    debounceMs: 2000
  });
  
  const petTypeOptions = [
    { label: 'Dog', value: 'dog' },
    { label: 'Cat', value: 'cat' },
    { label: 'Bird', value: 'bird' },
    { label: 'Rabbit', value: 'rabbit' },
    { label: 'Fish', value: 'fish' },
    { label: 'Reptile', value: 'reptile' },
    { label: 'Small Mammal', value: 'small_mammal' },
    { label: 'Other', value: 'other' },
  ];
  
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Unknown', value: 'unknown' },
  ];

  const sizeOptions = [
    { label: 'Tiny (Under 5 lbs)', value: 'tiny' },
    { label: 'Small (5-25 lbs)', value: 'small' },
    { label: 'Medium (25-60 lbs)', value: 'medium' },
    { label: 'Large (60-90 lbs)', value: 'large' },
    { label: 'Giant (Over 90 lbs)', value: 'giant' },
  ];

  const weightUnitOptions = [
    { label: 'kg', value: 'kg' },
    { label: 'lb', value: 'lb' },
  ];

  const statusOptions = [
    { label: 'Healthy', value: 'healthy' },
    { label: 'Recovering', value: 'recovering' },
    { label: 'Ill', value: 'ill' },
    { label: 'Chronic Condition', value: 'chronic' },
    { label: 'Unknown', value: 'unknown' },
  ];
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      newErrors.name = 'Pet name is required';
    }
    
    if (!formState.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }
    
    if (!formState.weight.trim()) {
      newErrors.weight = 'Weight is required';
    } else if (isNaN(parseFloat(formState.weight))) {
      newErrors.weight = 'Weight must be a number';
    }
    
    if (formState.microchipped && !formState.microchipId.trim()) {
      newErrors.microchipId = 'Microchip ID is required when microchipped is selected';
    }
    
    setErrors(newErrors);
    
    // Create a touched state for all fields
    const newTouched: Record<string, boolean> = {};
    Object.keys(formState).forEach(key => {
      if (typeof formState[key as keyof FormState] === 'object' && formState[key as keyof FormState] !== null) {
        Object.keys(formState[key as keyof FormState] as object).forEach(nestedKey => {
          newTouched[`${key}.${nestedKey}`] = true;
        });
      } else {
        newTouched[key] = true;
      }
    });
    setTouched(newTouched);
    
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (name: keyof FormState, value: any) => {
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
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
      setImagePickerActive(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      // Check if user canceled or result is invalid
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        console.log('Image selected and cropped successfully, updating form state');
        // Safely update the image state
        handleChange('image', result.assets[0].uri);
      } else {
        console.log('Image selection was canceled or returned invalid result');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImageLoading(false);
      setImagePickerActive(false);
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
      setImagePickerActive(true);
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      // Check if user canceled or result is invalid
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        console.log('Photo taken and cropped successfully, updating form state');
        // Safely update the image state
        handleChange('image', result.assets[0].uri);
      } else {
        console.log('Photo capture was canceled or returned invalid result');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setImageLoading(false);
      setImagePickerActive(false);
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
  
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    
    if (isLoading) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Clear saved form state on successful submission
      clearSavedState();

      // Ensure user is logged in
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Generate a unique ID for the pet
      const petId = generateUUID();
      console.log(`Creating pet with ID: ${petId}`);
      
      // If there's an image, upload it to Supabase storage
      let imageUrl = 'https://via.placeholder.com/150';
      
      if (formState.image) {
        try {
          // Just use uploadImageToSupabase for a new pet since there's no old image to delete
          imageUrl = await uploadImageToSupabase(formState.image);
          console.log('Final image URL being saved to pet record:', imageUrl);
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // Continue with the local URI if upload fails
          imageUrl = formState.image;
        }
      }
      
      // Create the pet object
      const newPet: Pet = {
        id: petId,
        userId: user.id,
        name: formState.name,
        type: formState.type,
        breed: formState.breed,
        size: formState.size,
        birthDate: formState.birthDate || new Date(),
        gender: formState.gender,
        weight: parseFloat(formState.weight) || 0, // Use || 0 to ensure it's a number
        weightUnit: formState.weightUnit,
        microchipped: formState.microchipped,
        microchipId: formState.microchipId,
        neutered: formState.neutered,
        adoptionDate: formState.adoptionDate || undefined,
        color: formState.color || '',
        image: imageUrl,
        medicalConditions: formState.medicalConditions.split(',').map(item => item.trim()).filter(Boolean),
        allergies: formState.allergies.split(',').map(item => item.trim()).filter(Boolean),
        veterinarian: {
          name: formState.veterinarian.name,
          phone: formState.veterinarian.phone,
          clinic: formState.veterinarian.clinic
        },
        status: 'healthy'
      };
      
      console.log('Creating pet with data:', JSON.stringify(newPet));
      
      try {
        // Save to database with error handling
        await unifiedDatabaseManager.pets.create(newPet);
        console.log(`Pet ${newPet.name} saved successfully`);
        
        // Set as active pet
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
        setActivePetId(petId);
        
        // Navigate back to the home screen and show success message
        Alert.alert(
          'Success',
          'Pet added successfully! You can now start tracking your pet\'s care.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Delay navigation slightly to ensure async storage is updated
                setTimeout(() => {
                  // Navigate back to home screen
                  navigation.navigate('Home');
                }, 100);
              }
            }
          ]
        );
      } catch (dbError) {
        console.error('Error adding pet to database:', dbError);
        
        // Check if pet was saved to local storage at least
        const savedPets = await unifiedDatabaseManager.pets.getAll();
        const petWasSaved = savedPets.some(p => p.id === petId);
        
        if (petWasSaved) {
          // Pet was saved locally but not to Supabase
          await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
          setActivePetId(petId);
          
          Alert.alert(
            'Partial Success',
            'Your pet was saved locally, but there was an issue syncing with the cloud. Your data will sync when connection is restored.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to home screen
                  setTimeout(() => {
                    navigation.navigate('Home');
                  }, 100);
                }
              }
            ]
          );
        } else {
          // Pet wasn't saved at all
          throw new Error('Failed to save pet locally');
        }
      }
    } catch (error) {
      console.error('Error submitting pet:', error);
      Alert.alert('Error', 'Failed to save pet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Form State Restoration Notification */}
      <FormStateNotification 
        visible={wasRestored}
        onDismiss={dismissRestoreNotification}
        formName="pet profile"
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="paw" size={32} color="white" />
            </View>
            <Text style={styles.headerTitle}>Add a New Pet</Text>
            <Text style={styles.headerSubtitle}>Fill in your pet's details and add a photo</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Photo Section */}
          <View style={[styles.photoSection, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.photoUploadContainer, { backgroundColor: colors.background }]}
              onPress={showImagePicker}
              disabled={imageLoading}
            >
              {formState.image ? (
                <Image source={{ uri: formState.image }} style={styles.petImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={[styles.photoIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.photoText, { color: colors.text }]}>Add Pet Photo</Text>
                  <Text style={[styles.photoSubtext, { color: colors.text + '80' }]}>Tap to upload</Text>
                </View>
              )}
              {imageLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Information Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
            </View>
            
            <Input
              label="Pet Name"
              placeholder="Enter pet name"
              value={formState.name}
              onChangeText={(value) => handleChange('name', value)}
              error={errors.name}
              touched={touched.name}
              containerStyle={styles.inputContainer}
            />
            
            <Select
              label="Pet Type"
              options={petTypeOptions}
              selectedValue={formState.type}
              onValueChange={(value) => handleChange('type', value)}
              error={errors.type}
              touched={touched.type}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Breed"
              placeholder="Enter breed"
              value={formState.breed}
              onChangeText={(value) => handleChange('breed', value)}
              error={errors.breed}
              touched={touched.breed}
              containerStyle={styles.inputContainer}
            />
            
            <Select
              label="Breed Size"
              options={sizeOptions}
              selectedValue={formState.size || 'medium'}
              onValueChange={(value) => handleChange('size', value)}
              error={errors.size}
              touched={touched.size}
              containerStyle={styles.inputContainer}
            />

            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Input
                  label="Color"
                  placeholder="Enter color"
                  value={formState.color}
                  onChangeText={(value) => handleChange('color', value)}
                  error={errors.color}
                  touched={touched.color}
                />
              </View>
              
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Select
                  label="Gender"
                  options={genderOptions}
                  selectedValue={formState.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                  error={errors.gender}
                  touched={touched.gender}
                />
              </View>
            </View>
          </View>

          {/* Dates Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FF6B6B20' }]}>
                <Ionicons name="calendar" size={20} color="#FF6B6B" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Important Dates</Text>
            </View>

            <DatePicker
              label="Birth Date"
              value={formState.birthDate || new Date()}
              onChange={(date) => handleChange('birthDate', date)}
              mode="date"
              error={errors.birthDate}
              containerStyle={styles.inputContainer}
            />
            
            <DatePicker
              label="Adoption Date"
              value={formState.adoptionDate || new Date()}
              onChange={(date) => handleChange('adoptionDate', date)}
              mode="date"
              error={errors.adoptionDate}
              containerStyle={styles.inputContainer}
            />
          </View>

          {/* Physical Information Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="fitness" size={20} color={colors.secondary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Physical Information</Text>
            </View>

            <FormRow>
              <View style={[styles.formRowItem, { flex: 2 }]}>
                <Input
                  label="Weight"
                  placeholder="Enter weight"
                  value={formState.weight}
                  onChangeText={(value) => handleChange('weight', value)}
                  error={errors.weight}
                  touched={touched.weight}
                  keyboardType="numeric"
                  containerStyle={styles.inputContainer}
                />
              </View>
              
              <View style={[styles.formRowItem, { flex: 1 }]}>
                <Select
                  label="Unit"
                  options={weightUnitOptions}
                  selectedValue={formState.weightUnit}
                  onValueChange={(value) => handleChange('weightUnit', value)}
                  error={errors.weightUnit}
                  touched={touched.weightUnit}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </FormRow>

            <Select
              label="Health Status"
              options={statusOptions}
              selectedValue={formState.status}
              onValueChange={(value) => handleChange('status', value)}
              error={errors.status}
              touched={touched.status}
              containerStyle={styles.inputContainer}
            />
          </View>

          {/* Medical Information Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#4ECDC420' }]}>
                <Ionicons name="medical" size={20} color="#4ECDC4" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical Information</Text>
            </View>

            <View style={[styles.switchCard, { backgroundColor: colors.background }]}>
              <View style={styles.switchContent}>
                <View style={styles.switchLabelContainer}>
                  <Ionicons name="radio-button-on" size={20} color={colors.primary} style={styles.switchIcon} />
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Microchipped</Text>
                </View>
                <Switch
                  value={formState.microchipped}
                  onValueChange={(value) => handleChange('microchipped', value)}
                />
              </View>
            </View>
            
            {formState.microchipped && (
              <Input
                label="Microchip ID"
                placeholder="Enter microchip ID"
                value={formState.microchipId}
                onChangeText={(value) => handleChange('microchipId', value)}
                error={errors.microchipId}
                touched={touched.microchipId}
                containerStyle={styles.inputContainer}
              />
            )}
            
            <View style={[styles.switchCard, { backgroundColor: colors.background }]}>
              <View style={styles.switchContent}>
                <View style={styles.switchLabelContainer}>
                  <Ionicons name="cut" size={20} color={colors.primary} style={styles.switchIcon} />
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Neutered/Spayed</Text>
                </View>
                <Switch
                  value={formState.neutered}
                  onValueChange={(value) => handleChange('neutered', value)}
                />
              </View>
            </View>

            <Input
              label="Medical Conditions"
              placeholder="Enter medical conditions (separated by commas)"
              value={formState.medicalConditions}
              onChangeText={(value) => handleChange('medicalConditions', value)}
              error={errors.medicalConditions}
              touched={touched.medicalConditions}
              multiline
              numberOfLines={2}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Allergies"
              placeholder="Enter allergies (separated by commas)"
              value={formState.allergies}
              onChangeText={(value) => handleChange('allergies', value)}
              error={errors.allergies}
              touched={touched.allergies}
              multiline
              numberOfLines={2}
              containerStyle={styles.inputContainer}
            />
          </View>
          
          {/* Veterinarian Information Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#9B59B620' }]}>
                <Ionicons name="people" size={20} color="#9B59B6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Veterinarian Information</Text>
            </View>
            
            <Input
              label="Veterinarian Name"
              placeholder="Enter vet's name"
              value={formState.veterinarian.name}
              onChangeText={(value) => handleChange('veterinarian', {...formState.veterinarian, name: value})}
              error={errors['veterinarian.name']}
              touched={touched['veterinarian.name']}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Clinic Name"
              placeholder="Enter clinic name"
              value={formState.veterinarian.clinic}
              onChangeText={(value) => handleChange('veterinarian', {...formState.veterinarian, clinic: value})}
              error={errors['veterinarian.clinic']}
              touched={touched['veterinarian.clinic']}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Phone Number"
              placeholder="Enter vet's phone number"
              value={formState.veterinarian.phone}
              onChangeText={(value) => handleChange('veterinarian', {...formState.veterinarian, phone: value})}
              error={errors['veterinarian.phone']}
              touched={touched['veterinarian.phone']}
              keyboardType="phone-pad"
              containerStyle={styles.inputContainer}
            />
          </View>
          
          {/* Additional Information Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#95A5A620' }]}>
                <Ionicons name="create" size={20} color="#95A5A6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>
            </View>
            
            <Input
              label="Notes"
              placeholder="Add any additional notes about your pet"
              value={formState.notes}
              onChangeText={(value) => handleChange('notes', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.textArea}
              containerStyle={styles.inputContainer}
            />
          </View>
          
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={20} color={colors.text} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={[styles.buttonText, { marginLeft: 8 }]}>Saving...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Save Pet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 20,
  },
  photoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoUploadContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    position: 'relative',
  },
  petImage: {
    width: 156,
    height: 156,
    borderRadius: 78,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  photoSubtext: {
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  formRowItem: {
    marginHorizontal: 4,
  },
  switchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AddPet;
