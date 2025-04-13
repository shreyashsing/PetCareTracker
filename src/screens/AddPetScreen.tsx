import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';

type AddPetScreenProps = NativeStackScreenProps<MainStackParamList, 'AddPet'>;

const AddPetScreen: React.FC<AddPetScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPet = () => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate('Home');
    }, 1000);
  };

  const petTypes = [
    { value: 'dog', label: 'Dog', icon: '🐶' },
    { value: 'cat', label: 'Cat', icon: '🐱' },
    { value: 'bird', label: 'Bird', icon: '🦜' },
    { value: 'rabbit', label: 'Rabbit', icon: '🐰' },
    { value: 'fish', label: 'Fish', icon: '🐠' },
    { value: 'reptile', label: 'Reptile', icon: '🦎' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a New Pet</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]}>
            <Ionicons name="paw-outline" size={50} color={colors.primary} />
            <TouchableOpacity style={[styles.addPhotoButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Input
          label="Pet Name"
          value={petName}
          onChangeText={setPetName}
          placeholder="e.g. Max, Luna"
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Type of Pet</Text>
        <View style={styles.petTypesContainer}>
          {petTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.petTypeButton,
                petType === type.value && [
                  styles.petTypeButtonSelected,
                  { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ],
                { borderColor: colors.border }
              ]}
              onPress={() => setPetType(type.value)}
            >
              <Text style={styles.petTypeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.petTypeLabel,
                  petType === type.value && { color: colors.primary, fontWeight: 'bold' },
                  { color: colors.text }
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Breed"
          value={petBreed}
          onChangeText={setPetBreed}
          placeholder="e.g. Golden Retriever, Siamese"
        />

        <Input
          label="Age"
          value={petAge}
          onChangeText={setPetAge}
          placeholder="e.g. 2 years, 6 months"
        />

        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.primary },
            isSubmitting && { opacity: 0.7 }
          ]}
          onPress={handleAddPet}
          disabled={isSubmitting}
        >
          <Text style={styles.addButtonText}>
            {isSubmitting ? 'Adding Pet...' : 'Add Pet'}
          </Text>
          {isSubmitting && (
            <View style={styles.loader}>
              <Ionicons name="sync" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  petTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  petTypeButton: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    margin: '1%',
    alignItems: 'center',
  },
  petTypeButtonSelected: {
    borderWidth: 1.5,
  },
  petTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  petTypeLabel: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginLeft: 10,
  },
});

export default AddPetScreen; 