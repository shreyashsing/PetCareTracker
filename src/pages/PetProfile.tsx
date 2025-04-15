import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { TopNavBar } from '../components';
import { databaseManager } from '../services/db';
import { formatDate, calculateAge } from '../utils/helpers';
import { Pet } from '../types/components';
import { LinearGradient } from 'expo-linear-gradient';

type PetProfileProps = NativeStackScreenProps<RootStackParamList, 'PetProfile'>;

const PetProfile: React.FC<PetProfileProps> = ({ route, navigation }) => {
  const { petId } = route.params;
  const { colors } = useAppColors();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPetData = async () => {
      try {
        setLoading(true);
        const petData = await databaseManager.pets.getById(petId);
        if (petData) {
          setPet(petData);
        }
      } catch (error) {
        console.error('Error loading pet data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPetData();
  }, [petId]);
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopNavBar title="Pet Profile" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>Loading pet information...</Text>
        </View>
      </View>
    );
  }
  
  if (!pet) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopNavBar title="Pet Profile" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Pet not found</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { marginTop: 20, backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.actionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const petAge = pet.birthDate ? calculateAge(pet.birthDate) : 'Unknown';
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar 
        title={`${pet.name}'s Profile`} 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.scrollView}>
        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.petProfileHeader}>
            <Image 
              source={{ uri: pet.image }} 
              style={styles.petImage} 
              resizeMode="cover"
            />
            <View style={styles.petInfo}>
              <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
              <Text style={[styles.petBreed, { color: colors.text + '80' }]}>
                {pet.type} • {pet.breed}
              </Text>
              <View style={[styles.healthStatusContainer, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.healthStatus, { color: colors.success }]}>{pet.status}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Birth Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {pet.birthDate ? formatDate(pet.birthDate) : 'Not Set'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Age</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{petAge}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="scale-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Weight</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {pet.weight} {pet.weightUnit}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="male-female-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Gender</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="color-palette-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Color</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{pet.color || 'Not Set'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="cut-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Neutered</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{pet.neutered ? 'Yes' : 'No'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <View style={styles.actionButtonsGrid}>
            <TouchableOpacity
              style={[styles.gridActionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddHealthRecord', { petId: pet.id })}
            >
              <Ionicons name="medkit-outline" size={24} color={colors.primary} />
              <Text style={[styles.gridActionText, { color: colors.text }]}>Health Record</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.gridActionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddMedication', { petId: pet.id })}
            >
              <Ionicons name="medical-outline" size={24} color={colors.primary} />
              <Text style={[styles.gridActionText, { color: colors.text }]}>Medication</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.gridActionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddTask', { petId: pet.id })}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={[styles.gridActionText, { color: colors.text }]}>Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.gridActionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddMeal', { petId: pet.id })}
            >
              <Ionicons name="restaurant-outline" size={24} color={colors.primary} />
              <Text style={[styles.gridActionText, { color: colors.text }]}>Meal</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('FullAnalytics', { petId: pet.id })}
          >
            <Ionicons name="stats-chart-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>View Health Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  petProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  petInfo: {
    marginLeft: 16,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  petBreed: {
    fontSize: 16,
    marginTop: 2,
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    width: '48%',
  },
  infoIcon: {
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridActionButton: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  gridActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default PetProfile; 