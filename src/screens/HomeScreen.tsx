import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppColors } from '../hooks/useAppColors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import TopNavBar from '../components/TopNavBar';

type HomeScreenProps = NativeStackScreenProps<MainStackParamList, 'Home'>;

// Placeholder pet data
const PETS = [
  { id: '1', name: 'Max', species: 'Dog', breed: 'Golden Retriever', image: null },
  { id: '2', name: 'Luna', species: 'Cat', breed: 'Siamese', image: null },
];

// Placeholder upcoming tasks
const UPCOMING_TASKS = [
  { id: '1', title: "Max's Vaccination", time: 'Today, 2:00 PM', type: 'vaccination' },
  { id: '2', title: "Luna's Meal", time: 'Today, 6:00 PM', type: 'meal' },
  { id: '3', title: "Max's Walk", time: 'Tomorrow, 9:00 AM', type: 'walk' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useAppColors();

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return 'medkit-outline';
      case 'meal': return 'restaurant-outline';
      case 'walk': return 'footsteps-outline';
      default: return 'calendar-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar title="Home" showBackButton={false} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Welcome, {user?.displayName || 'Pet Owner'}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.text + 'CC' }]}>
            Here's what's happening today
          </Text>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Pets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddPet')}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>+ Add Pet</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={PETS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.petCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('PetProfile', { petId: item.id })}
              >
                <View style={styles.petImagePlaceholder}>
                  <Ionicons 
                    name={item.species.toLowerCase() === 'cat' ? 'logo-octocat' : 'paw-outline'} 
                    size={28} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.petName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.petBreed, { color: colors.text + 'AA' }]}>
                  {item.species} • {item.breed}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddTask', {})}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>+ Add Task</Text>
            </TouchableOpacity>
          </View>
          
          {UPCOMING_TASKS.map((task) => (
            <View 
              key={task.id} 
              style={[styles.taskItem, { backgroundColor: colors.card }]}
            >
              <View style={[styles.taskIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={getTaskIcon(task.type)} size={20} color={colors.primary} />
              </View>
              <View style={styles.taskDetails}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskTime, { color: colors.text + 'CC' }]}>{task.time}</Text>
              </View>
              <TouchableOpacity style={styles.taskActionButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.text + '99'} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddHealthRecord', { petId: PETS[0].id })}
            >
              <Ionicons name="medkit-outline" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Health Record</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddMeal', { petId: PETS[0].id })}
            >
              <Ionicons name="restaurant-outline" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Meal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('AddMedication', { petId: PETS[0].id })}
            >
              <Ionicons name="flash-outline" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Medication</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Settings</Text>
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
    padding: 16,
  },
  welcomeSection: {
    marginTop: 10,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
  },
  petCard: {
    width: 120,
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  petImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 12,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 14,
  },
  taskActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen; 