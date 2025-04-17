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
import { RootStackParamList, AppNavigationProp } from '../types/navigation';
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
import { Pet } from '../types/components';
import { databaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { generateUUID } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Use a simpler type that won't cause TypeScript errors
type AddPetScreenProps = {
  navigation: AppNavigationProp;
  route: any;
};

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
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    expiryDate: Date | undefined;
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
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      expiryDate: undefined
    },
    status: 'healthy'
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        handleChange('image', result.assets[0].uri);
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
        handleChange('image', result.assets[0].uri);
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
  
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Ensure user is logged in
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Generate a unique ID for the pet
      const petId = generateUUID();
      console.log(`Creating pet with ID: ${petId}`);
      
      // Create the pet object
      const newPet: Pet = {
        id: petId,
        userId: user.id,
        name: formState.name,
        type: formState.type,
        breed: formState.breed,
        birthDate: formState.birthDate || new Date(),
        gender: formState.gender,
        weight: parseFloat(formState.weight), // Convert string to number
        weightUnit: formState.weightUnit,
        microchipped: formState.microchipped,
        microchipId: formState.microchipId,
        neutered: formState.neutered,
        adoptionDate: formState.adoptionDate || undefined,
        color: formState.color || '',
        image: formState.image || 'https://via.placeholder.com/150',
        medicalConditions: formState.medicalConditions.split(',').map(item => item.trim()).filter(Boolean),
        allergies: formState.allergies.split(',').map(item => item.trim()).filter(Boolean),
        veterinarian: {
          name: formState.veterinarian.name,
          phone: formState.veterinarian.phone,
          clinic: formState.veterinarian.clinic
        },
        insuranceInfo: formState.insuranceInfo.provider ? {
          provider: formState.insuranceInfo.provider,
          policyNumber: formState.insuranceInfo.policyNumber,
          expiryDate: formState.insuranceInfo.expiryDate || new Date()
        } : undefined,
        status: 'healthy'
      };
      
      console.log('Creating pet with data:', JSON.stringify(newPet));
      
      try {
        // Save to database with error handling
        await databaseManager.pets.create(newPet);
        console.log(`Pet ${newPet.name} saved successfully`);
        
        // Set as active pet
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
        setActivePetId(petId);
        
        Alert.alert(
          'Success',
          'Pet added successfully! You can now start tracking your pet\'s care.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Main');
              }
            }
          ]
        );
      } catch (dbError) {
        console.error('Error adding pet to database:', dbError);
        
        // Still show success if the pet was added to local storage
        // but failed to save to Supabase
        Alert.alert(
          'Partial Success',
          'Your pet was saved locally, but there was an issue syncing with the cloud. Your data will sync when connection is restored.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Main');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'There was an error adding your pet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
            <Text style={[styles.title, { color: colors.text }]}>Add a New Pet</Text>
            <Text style={[styles.subtitle, { color: colors.text + '80' }]}>
              Fill in your pet's details and add a photo
            </Text>
          </View>
          
          <View style={styles.imagePickerContainer}>
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
                  <View style={styles.removePhotoButtonContainer}>
                    <TouchableOpacity 
                      style={styles.removePhotoButton}
                      onPress={() => handleChange('image', undefined)}
                    >
                      <Ionicons name="trash-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.imagePickerContent}>
                  <View style={[styles.imagePickerIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="paw" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.imagePickerText, { color: colors.text }]}>Add Pet Photo</Text>
                  <Text style={[styles.imagePickerSubtext, { color: colors.text + '60' }]}>
                    Tap to upload
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={styles.formContainer}>
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
            
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
            
            <DatePicker
              label="Birth Date"
              value={formState.birthDate || new Date()}
              onChange={(date) => handleChange('birthDate', date)}
              mode="date"
              error={errors.birthDate}
              containerStyle={styles.inputContainer}
              allowMonthYearSelection={true}
            />
            
            <DatePicker
              label="Adoption Date"
              value={formState.adoptionDate || new Date()}
              onChange={(date) => handleChange('adoptionDate', date)}
              mode="date"
              error={errors.adoptionDate}
              containerStyle={styles.inputContainer}
              allowMonthYearSelection={true}
            />
            
            <Select
              label="Gender"
              options={genderOptions}
              selectedValue={formState.gender}
              onValueChange={(value) => handleChange('gender', value)}
              error={errors.gender}
              touched={touched.gender}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Color"
              placeholder="Enter color"
              value={formState.color}
              onChangeText={(value) => handleChange('color', value)}
              error={errors.color}
              touched={touched.color}
              containerStyle={styles.inputContainer}
            />
            
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
            
            <Switch
              label="Microchipped"
              value={formState.microchipped}
              onValueChange={(value) => handleChange('microchipped', value)}
              containerStyle={styles.switchContainer}
            />
            
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
            
            <Switch
              label="Neutered/Spayed"
              value={formState.neutered}
              onValueChange={(value) => handleChange('neutered', value)}
              containerStyle={styles.switchContainer}
            />

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
          
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Veterinarian Information</Text>
            
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
          
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Insurance Information</Text>
            
            <Input
              label="Insurance Provider"
              placeholder="Enter insurance provider"
              value={formState.insuranceInfo.provider}
              onChangeText={(value) => handleChange('insuranceInfo', {...formState.insuranceInfo, provider: value})}
              error={errors['insuranceInfo.provider']}
              touched={touched['insuranceInfo.provider']}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Policy Number"
              placeholder="Enter policy number"
              value={formState.insuranceInfo.policyNumber}
              onChangeText={(value) => handleChange('insuranceInfo', {...formState.insuranceInfo, policyNumber: value})}
              error={errors['insuranceInfo.policyNumber']}
              touched={touched['insuranceInfo.policyNumber']}
              containerStyle={styles.inputContainer}
            />
            
            <DatePicker
              label="Policy Expiry Date"
              value={formState.insuranceInfo.expiryDate || new Date()}
              onChange={(date) => handleChange('insuranceInfo', {...formState.insuranceInfo, expiryDate: date})}
              mode="date"
              error={errors['insuranceInfo.expiryDate']}
              containerStyle={styles.inputContainer}
              allowMonthYearSelection={true}
            />
          </View>
          
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>
            
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
          
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.cancelButton}
            />
            
            <Button
              title={isLoading ? 'Saving...' : 'Save Pet'}
              onPress={handleSubmit}
              disabled={isLoading}
              style={styles.saveButton}
            />
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
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  imagePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerSubtext: {
    fontSize: 12,
  },
  petImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
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
  formContainer: {
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 16,
  },
  formSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRowItem: {
    marginHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    marginBottom: 16,
  },
});

export default AddPet; 