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
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Switch, 
  FormRow 
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAppColors } from '../hooks/useAppColors';
import { Pet } from '../types/components';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { useAuth } from '../providers/AuthProvider';
import { generateUUID } from '../utils/helpers';

// Define a simple type for our App Navigator parameter list that only contains what we need
type AppRootStackParamList = {
  AddFirstPet: undefined;
  MainStack: undefined;
};

// Use the AppRootStackParamList for the component props
type AddFirstPetScreenProps = NativeStackScreenProps<AppRootStackParamList, 'AddFirstPet'>;

type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'small_mammal' | 'other';

interface FormState {
  name: string;
  type: PetType;
  breed: string;
  birthDate: Date | undefined;
  gender: 'male' | 'female' | 'unknown';
  weight: string;
  weightUnit: 'kg' | 'lb';
  color: string;
  image?: string;
}

const PetTypeIcons: Record<PetType, string> = {
  dog: 'paw',
  cat: 'paw',
  bird: 'egg',
  rabbit: 'paw',
  fish: 'water',
  reptile: 'leaf',
  small_mammal: 'paw',
  other: 'paw',
};

const AddFirstPet: React.FC<AddFirstPetScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useAppColors();
  const { setActivePetId } = useActivePet();
  const { user, completeOnboarding } = useAuth();
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
    color: '',
    image: undefined
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
    
    setErrors(newErrors);
    
    // Create a touched state for all fields
    const newTouched: Record<string, boolean> = {};
    Object.keys(formState).forEach(key => {
      newTouched[key] = true;
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
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };
  
  const handlePickImage = async () => {
    try {
      // Ask for permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload a profile picture.'
        );
        return;
      }
      
      setImageLoading(true);
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleChange('image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'There was an error selecting the image');
    } finally {
      setImageLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Create a new pet object
      const newPet: Pet = {
        id: generateUUID(),
        userId: user.id,
        name: formState.name,
        type: formState.type,
        breed: formState.breed,
        birthDate: formState.birthDate ? formState.birthDate : new Date(),
        gender: formState.gender,
        weight: parseFloat(formState.weight),
        weightUnit: formState.weightUnit,
        color: formState.color,
        image: formState.image || '',
        microchipped: false,
        neutered: false,
        medicalConditions: [],
        allergies: [],
        status: 'healthy'
      };
      
      // Save to database
      await unifiedDatabaseManager.pets.create(newPet);
      
      // Set as active pet
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, newPet.id);
      setActivePetId(newPet.id);
      
      // Mark user onboarding as complete
      await completeOnboarding();
      
      Alert.alert(
        'Success',
        'Pet added successfully! You can now start tracking your pet\'s care.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Instead of trying to navigate, we'll rely on the AppNavigator's
              // automatic re-rendering when returning to the app
              // This will trigger AppNavigator to detect that we now have pets
              
              // Nothing needs to be done here - the AppNavigator will automatically
              // detect that pets have been added the next time it checks
              // (which happens when components re-render after we dismiss this alert)
              
              // If the app's UI doesn't update automatically, restart the app
              console.log("Pet added successfully - returning to home");
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'There was an error adding your pet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '30', colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Your First Pet</Text>
          <Text style={[styles.subtitle, { color: colors.text + '99' }]}>
            Let's get started by adding information about your pet.
          </Text>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={[styles.imagePicker, { backgroundColor: colors.card }]}
            onPress={handlePickImage}
            disabled={imageLoading}
          >
            {imageLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : formState.image ? (
              <Image source={{ uri: formState.image }} style={styles.petImage} />
            ) : (
              <>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="paw" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.imagePickerText, { color: colors.text + '99' }]}>
                  Tap to add a photo
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <Form>
          <Input
            label="Pet Name"
            value={formState.name}
            onChangeText={(value) => handleChange('name', value)}
            placeholder="Enter your pet's name"
            error={touched.name ? errors.name : undefined}
          />
          
          <Select
            label="Type of Pet"
            options={petTypeOptions}
            selectedValue={formState.type}
            onValueChange={(value: string) => handleChange('type', value as PetType)}
          />
          
          <Input
            label="Breed"
            value={formState.breed}
            onChangeText={(value) => handleChange('breed', value)}
            placeholder="Enter breed"
            error={touched.breed ? errors.breed : undefined}
          />
          
          <DatePicker
            label="Birth Date (Approximate)"
            value={formState.birthDate || new Date()}
            onChange={(value) => handleChange('birthDate', value)}
            placeholder="Select birth date"
            maxDate={new Date()}
            allowMonthYearSelection={true}
            mode="date"
          />
          
          <Select
            label="Gender"
            options={genderOptions}
            selectedValue={formState.gender}
            onValueChange={(value: string) => handleChange('gender', value as 'male' | 'female' | 'unknown')}
          />
          
          <FormRow style={{ alignItems: 'center' }}>
            <View style={styles.weightContainer}>
              <View style={styles.weightInputContainer}>
                <Input
                  label="Weight"
                  value={formState.weight}
                  onChangeText={(value) => handleChange('weight', value)}
                  placeholder="0.0"
                  keyboardType="numeric"
                  containerStyle={styles.weightInput}
                  error={touched.weight ? errors.weight : undefined}
                />
              </View>
              <View style={styles.weightUnitContainer}>
                <Select
                  label="Unit"
                  options={weightUnitOptions}
                  selectedValue={formState.weightUnit}
                  onValueChange={(value: string) => handleChange('weightUnit', value as 'kg' | 'lb')}
                  containerStyle={styles.weightUnitSelect}
                />
              </View>
            </View>
          </FormRow>
          
          <Input
            label="Color/Markings"
            value={formState.color}
            onChangeText={(value) => handleChange('color', value)}
            placeholder="Enter color or distinctive markings"
          />
        </Form>
        
        <View style={styles.buttonContainer}>
          <Button
            title={isLoading ? "Adding Pet..." : "Add Pet"}
            onPress={handleSubmit}
            disabled={isLoading}
            isLoading={isLoading}
            size="large"
            variant="primary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imagePicker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  petImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconContainer: {
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 14,
  },
  weightContainer: {
    flexDirection: 'row',
  },
  weightInputContainer: {
    flex: 2,
    marginRight: 8,
  },
  weightInput: {
    margin: 0,
  },
  weightUnitContainer: {
    flex: 1,
  },
  weightUnitSelect: {
    margin: 0,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default AddFirstPet; 