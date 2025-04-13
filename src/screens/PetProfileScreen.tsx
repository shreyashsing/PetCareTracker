import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';

type PetProfileScreenProps = NativeStackScreenProps<MainStackParamList, 'PetProfile'>;

const PetProfileScreen: React.FC<PetProfileScreenProps> = ({ route, navigation }) => {
  const { petId } = route.params;
  const { colors } = useAppColors();

  // This would come from a real API/database in a full implementation
  const petData = {
    id: petId,
    name: petId === '1' ? 'Max' : 'Luna',
    species: petId === '1' ? 'Dog' : 'Cat',
    breed: petId === '1' ? 'Golden Retriever' : 'Siamese',
    age: petId === '1' ? '3 years' : '2 years',
    weight: petId === '1' ? '30 kg' : '4 kg',
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 10,
    },
    backButtonText: {
      fontSize: 16,
      color: '#ffffff',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    content: {
      padding: 20,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: colors.text,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text + 'CC',
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
      marginBottom: 10,
    },
    actionButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{petData.name}'s Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Species</Text>
            <Text style={styles.infoValue}>{petData.species}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Breed</Text>
            <Text style={styles.infoValue}>{petData.breed}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{petData.age}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>{petData.weight}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddHealthRecord', { petId })}
        >
          <Text style={styles.actionButtonText}>Add Health Record</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddMedication', { petId })}
        >
          <Text style={styles.actionButtonText}>Add Medication</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddTask', { petId })}
        >
          <Text style={styles.actionButtonText}>Add Task</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddMeal', { petId })}
        >
          <Text style={styles.actionButtonText}>Add Meal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('FullAnalytics', { petId })}
        >
          <Text style={styles.actionButtonText}>View Analytics</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default PetProfileScreen; 