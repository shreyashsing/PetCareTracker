import React, { useState, useEffect } from 'react';
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
import {unifiedDatabaseManager} from "../services/db";
import { useAuth } from '../providers/AuthProvider';
import { usePetStore } from '../store/PetStore';
import { setImagePickerActive, updatePetImage } from '../utils/imageUpload';
import { useActivePet } from '../hooks/useActivePet';
import { useToast } from '../hooks/use-toast';

const { width } = Dimensions.get('window');

// Type for the screen props
type EditPetScreenProps = NativeStackScreenProps<MainStackParamList, 'EditPet'>;

type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'small_mammal' | 'other';

interface FormState {
  name: string;
  type: PetType;
  breed: string;
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



const EditPet: React.FC<EditPetScreenProps> = ({ route, navigation }) => {
  const { colors } = useAppColors();
  const { user } = useAuth();
  const { updatePet: updatePetInStore } = usePetStore();
  const { activePetId } = useActivePet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingPet, setLoadingPet] = useState(true);
  const [petId, setPetId] = useState<string | null>(null);
  
  const [formState, setFormState] = useState<FormState>({
    name: '',
    type: 'dog',
    breed: '',
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
  
  // Form state persistence hook (disabled for edit mode since we're editing existing data)
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'EditPet',
    formState,
    setFormState,
    enabled: !loadingPet, // Only enable after we've loaded the pet data
    debounceMs: 2000
  });
  
  // Options for dropdown selects
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
  
  // Load pet data when component mounts
  useEffect(() => {
    const fetchPet = async () => {
      try {
        // First try to get pet ID from route params
        let idToFetch = route.params?.petId;
        
        // If not available, fall back to active pet ID
        if (!idToFetch && activePetId) {
          console.log(`[EditPet] No pet ID in route params, using active pet ID: ${activePetId}`);
          idToFetch = activePetId;
        }
        
        if (idToFetch) {
          setPetId(idToFetch);
          const pet = await unifiedDatabaseManager.pets.getById(idToFetch);
          
          if (pet) {
            // Convert pet data to form state
            setFormState({
              name: pet.name,
              type: pet.type,
              breed: pet.breed,
              birthDate: pet.birthDate ? new Date(pet.birthDate) : undefined,
              gender: pet.gender,
              weight: pet.weight?.toString() || '',
              weightUnit: pet.weightUnit || 'kg',
              microchipped: pet.microchipped || false,
              microchipId: pet.microchipId || '',
              neutered: pet.neutered || false,
              adoptionDate: pet.adoptionDate ? new Date(pet.adoptionDate) : undefined,
              color: pet.color || '',
              notes: pet.notes || '',
              image: pet.image,
              medicalConditions: pet.medicalConditions ? pet.medicalConditions.join(', ') : '',
              allergies: pet.allergies ? pet.allergies.join(', ') : '',
              veterinarian: {
                name: pet.veterinarian?.name || '',
                phone: pet.veterinarian?.phone || '',
                clinic: pet.veterinarian?.clinic || '',
              },
              status: pet.status || 'healthy'
            });
          } else {
            toast({
              title: 'Error',
              description: 'Pet not found',
              type: 'error'
            });
            navigation.goBack();
          }
        } else {
          toast({
            title: 'Error',
            description: 'No pet ID found',
            type: 'error'
          });
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching pet:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pet information',
          type: 'error'
        });
        navigation.goBack();
      } finally {
        setLoadingPet(false);
      }
    };
    
    fetchPet();
  }, [route.params, activePetId, navigation, toast]);
  
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
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Ensure user is logged in and we have a pet ID
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      if (!petId) {
        throw new Error("No pet ID provided");
      }
      
      // Get the current pet to ensure we don't overwrite fields we don't change
      const currentPet = await unifiedDatabaseManager.pets.getById(petId);
      
      if (!currentPet) {
        throw new Error("Pet not found");
      }
      
      // If there's a new image, upload it to Supabase storage
      let imageUrl = currentPet.image;
      
      if (formState.image && formState.image !== currentPet.image) {
        try {
          imageUrl = await updatePetImage(currentPet.image, formState.image);
          console.log('Final image URL being saved to pet record:', imageUrl);
        } catch (imageError) {
          console.error('Error updating image:', imageError);
          // Continue with the local URI if upload fails
          imageUrl = formState.image;
        }
      }
      
      // Update the pet object with new values from the form
      const updatedPet: Pet = {
        ...currentPet,
        name: formState.name,
        type: formState.type,
        breed: formState.breed,
        birthDate: formState.birthDate || new Date(),
        gender: formState.gender,
        weight: parseFloat(formState.weight) || 0,
        weightUnit: formState.weightUnit,
        microchipped: formState.microchipped,
        microchipId: formState.microchipId,
        neutered: formState.neutered,
        adoptionDate: formState.adoptionDate,
        color: formState.color || '',
        notes: formState.notes || '',
        image: imageUrl,
        medicalConditions: formState.medicalConditions.split(',').map(item => item.trim()).filter(Boolean),
        allergies: formState.allergies.split(',').map(item => item.trim()).filter(Boolean),
        veterinarian: {
          name: formState.veterinarian.name,
          phone: formState.veterinarian.phone,
          clinic: formState.veterinarian.clinic
        },
        status: formState.status
      };
      
      console.log('Updating pet with data:', JSON.stringify(updatedPet));
      
      // Update the pet in the database
      const result = await unifiedDatabaseManager.pets.update(petId, updatedPet);
      
      if (!result) {
        throw new Error("Pet not found");
      }
      
      // Update the pet store to propagate changes to other pages
      updatePetInStore(result);
      
      console.log(`Pet ${updatedPet.name} updated successfully`);
      
      // Clear any saved form state since update was successful
      clearSavedState();
      
      // Show toast notification and navigate to Home screen
      toast({
        title: 'Success',
        description: `${updatedPet.name} updated successfully!`,
        type: 'success'
      });
      
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error updating pet:', error);
      toast({
        title: 'Error',
        description: 'There was a problem updating your pet. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoBack = () => {
    navigation.navigate('Home');
  };
  
  if (loadingPet) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading pet information...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <LinearGradient
          colors={[colors.primary + '30', colors.background]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Edit Pet</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <Text style={[styles.subtitle, { color: colors.text + '80' }]}>
            Update your pet's information below
          </Text>
          
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={[styles.imagePickerButton, { backgroundColor: colors.card }]} 
              onPress={showImagePicker}
              disabled={imageLoading}
            >
              {imageLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : formState.image ? (
                <>
                  <Image 
                    source={{ uri: formState.image }} 
                    style={styles.petImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.editPhotoButtonContainer}>
                    <TouchableOpacity 
                      style={styles.editPhotoButton}
                      onPress={showImagePicker}
                    >
                      <Ionicons name="camera" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.imagePickerContent}>
                  <View style={[styles.imagePickerIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.imagePickerText, { color: colors.text }]}>Update Pet Photo</Text>
                  <Text style={[styles.imagePickerSubtext, { color: colors.text + '60' }]}>
                    Tap to upload
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={styles.formContainer}>
          {/* Form State Notification */}
          <FormStateNotification
            visible={wasRestored}
            onDismiss={dismissRestoreNotification}
            formName="pet profile"
          />
          
          <Form>
            {/* Basic Information Section */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="paw" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
              </View>
            
            <FormRow>
              <Input
                label="Pet Name"
                value={formState.name}
                onChangeText={(value) => handleChange('name', value)}
                placeholder="Enter pet name"
                error={touched.name && errors.name ? errors.name : undefined}
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <Select
                label="Pet Type"
                options={petTypeOptions}
                selectedValue={formState.type}
                onValueChange={(value: string) => handleChange('type', value)}
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <Input
                label="Breed"
                value={formState.breed}
                onChangeText={(value) => handleChange('breed', value)}
                placeholder="Enter breed"
                error={touched.breed && errors.breed ? errors.breed : undefined}
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <View style={styles.halfInput}>
                <DatePicker
                  label="Birth Date"
                  value={formState.birthDate || new Date()}
                  onChange={(value) => handleChange('birthDate', value)}
                />
              </View>
              <View style={styles.halfInput}>
                <Select
                  label="Gender"
                  options={genderOptions}
                  selectedValue={formState.gender}
                  onValueChange={(value: string) => handleChange('gender', value)}
                />
              </View>
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <View style={styles.weightContainer}>
                <View style={styles.weightInput}>
                  <Input
                    label="Weight"
                    value={formState.weight}
                    onChangeText={(value) => handleChange('weight', value)}
                    placeholder="Enter weight"
                    keyboardType="decimal-pad"
                    error={touched.weight && errors.weight ? errors.weight : undefined}
                  />
                </View>
                <View style={styles.weightUnitSelector}>
                  <Select
                    label="Unit"
                    options={weightUnitOptions}
                    selectedValue={formState.weightUnit}
                    onValueChange={(value: string) => handleChange('weightUnit', value)}
                  />
                </View>
              </View>
            </FormRow>
            
              <FormRow style={styles.rowSpacing}>
                <Input
                  label="Color"
                  value={formState.color}
                  onChangeText={(value) => handleChange('color', value)}
                  placeholder="Enter color/markings"
                />
              </FormRow>
            </View>
            
            {/* Health Information Section */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                  <Ionicons name="medical" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Information</Text>
              </View>
            
            <FormRow style={styles.rowSpacing}>
              <Switch
                label="Microchipped"
                value={formState.microchipped}
                onValueChange={(value) => handleChange('microchipped', value)}
              />
            </FormRow>
            
            {formState.microchipped && (
              <FormRow style={styles.rowSpacing}>
                <Input
                  label="Microchip ID"
                  value={formState.microchipId}
                  onChangeText={(value) => handleChange('microchipId', value)}
                  placeholder="Enter microchip ID"
                  error={touched.microchipId && errors.microchipId ? errors.microchipId : undefined}
                />
              </FormRow>
            )}
            
            <FormRow style={styles.rowSpacing}>
              <Switch
                label="Neutered/Spayed"
                value={formState.neutered}
                onValueChange={(value) => handleChange('neutered', value)}
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <Select
                label="Health Status"
                options={statusOptions}
                selectedValue={formState.status}
                onValueChange={(value: string) => handleChange('status', value)}
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <Input
                label="Medical Conditions"
                value={formState.medicalConditions}
                onChangeText={(value) => handleChange('medicalConditions', value)}
                placeholder="Enter medical conditions (comma separated)"
                multiline
              />
            </FormRow>
            
              <FormRow style={styles.rowSpacing}>
                <Input
                  label="Allergies"
                  value={formState.allergies}
                  onChangeText={(value) => handleChange('allergies', value)}
                  placeholder="Enter allergies (comma separated)"
                  multiline
                />
              </FormRow>
            </View>
            
            {/* Additional Information Section */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>
              </View>
            
            <FormRow style={styles.rowSpacing}>
              <View style={styles.datePickerContainer}>
                <DatePicker
                  label="Adoption Date"
                  value={formState.adoptionDate || new Date()}
                  onChange={(value) => handleChange('adoptionDate', value)}
                />
              </View>
            </FormRow>
            
              <FormRow style={styles.rowSpacing}>
                <Input
                  label="Notes"
                  value={formState.notes || ''}
                  onChangeText={(value) => handleChange('notes', value)}
                  placeholder="Enter any additional notes about your pet"
                  multiline
                  numberOfLines={4}
                />
              </FormRow>
            </View>
            
            {/* Veterinarian Information Section */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#2196F3' + '15' }]}>
                  <Ionicons name="medical-outline" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Veterinarian Information</Text>
              </View>
            
            <FormRow style={styles.rowSpacing}>
              <Input
                label="Veterinarian Name"
                value={formState.veterinarian.name}
                onChangeText={(value) => 
                  setFormState(prev => ({
                    ...prev, 
                    veterinarian: {
                      ...prev.veterinarian,
                      name: value
                    }
                  }))
                }
                placeholder="Enter veterinarian name"
              />
            </FormRow>
            
            <FormRow style={styles.rowSpacing}>
              <Input
                label="Clinic"
                value={formState.veterinarian.clinic}
                onChangeText={(value) => 
                  setFormState(prev => ({
                    ...prev, 
                    veterinarian: {
                      ...prev.veterinarian,
                      clinic: value
                    }
                  }))
                }
                placeholder="Enter clinic name"
              />
            </FormRow>
            
              <FormRow style={styles.rowSpacing}>
                <Input
                  label="Phone"
                  value={formState.veterinarian.phone}
                  onChangeText={(value) => 
                    setFormState(prev => ({
                      ...prev, 
                      veterinarian: {
                        ...prev.veterinarian,
                        phone: value
                      }
                    }))
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </FormRow>
            </View>
            
            <View style={styles.submitButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.primary },
                  isLoading && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="white" style={styles.submitButtonLoader} />
                    <Text style={styles.submitButtonText}>Updating...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Update Pet</Text>
                )}
              </TouchableOpacity>
            </View>
          </Form>
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
    paddingBottom: 60,
  },
  headerGradient: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePickerButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  petImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  editPhotoButtonContainer: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    marginLeft: -22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editPhotoButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imagePickerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  imagePickerSubtext: {
    fontSize: 14,
  },
  formContainer: {
    padding: 20,
    paddingTop: 24,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  rowSpacing: {
    marginBottom: 16,
  },
  datePickerContainer: {
    flex: 1,
    minHeight: 60,
    maxHeight: 80,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  weightInput: {
    flex: 2,
    marginRight: 8,
  },
  weightUnitSelector: {
    flex: 1,
  },
  submitButtonContainer: {
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 0,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonLoader: {
    marginRight: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default EditPet; 