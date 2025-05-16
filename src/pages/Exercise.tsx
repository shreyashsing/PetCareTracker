import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { useActivePet } from '../hooks/useActivePet';
import {unifiedDatabaseManager} from "../services/db";

type ExerciseScreenProps = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

const Exercise: React.FC<ExerciseScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  const { activePetId } = useActivePet();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pet, setPet] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!activePetId) {
        setIsLoading(false);
        return;
      }

      try {
        // Load pet data
        const petData = await unifiedDatabaseManager.pets.getById(activePetId);
        setPet(petData);

        // Placeholder for activity data - this would be replaced with real data
        // from your database in a production app
        const mockActivities = [
          {
            id: '1',
            type: 'Walk',
            duration: 30,
            distance: 1.5,
            date: new Date(),
            notes: 'Morning walk in the park'
          },
          {
            id: '2',
            type: 'Play',
            duration: 15,
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            notes: 'Played fetch in the backyard'
          },
          {
            id: '3',
            type: 'Training',
            duration: 20,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'Basic commands practice'
          }
        ];

        setActivities(mockActivities);
      } catch (error) {
        console.error('Error loading exercise data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activePetId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Exercise & Activities
        </Text>
        <View style={styles.rightPlaceholder} />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.summaryContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {pet?.name}'s Exercise Summary
            </Text>
            
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="walk-outline" size={24} color={colors.primary} />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {activities.reduce((total, act) => total + (act.distance || 0), 0).toFixed(1)} km
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.text + '99' }]}>
                    This Week
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="time-outline" size={24} color={colors.primary} />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {activities.reduce((total, act) => total + act.duration, 0)} min
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.text + '99' }]}>
                    Activity Time
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.activitiesContainer}>
            <View style={styles.activitiesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Activities
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddActivity')}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
            
            {activities.length > 0 ? (
              activities.map((activity) => (
                <TouchableOpacity 
                  key={activity.id}
                  style={[styles.activityCard, { backgroundColor: colors.card }]}
                >
                  <View style={[styles.activityIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons 
                      name={
                        activity.type === 'Walk' 
                          ? 'walk-outline' 
                          : activity.type === 'Play' 
                            ? 'game-controller-outline' 
                            : 'fitness-outline'
                      } 
                      size={24} 
                      color={colors.primary} 
                    />
                  </View>
                  
                  <View style={styles.activityDetails}>
                    <Text style={[styles.activityTitle, { color: colors.text }]}>
                      {activity.type}
                    </Text>
                    <Text style={[styles.activityDate, { color: colors.text + '80' }]}>
                      {activity.date.toLocaleDateString()}
                    </Text>
                    {activity.notes && (
                      <Text style={[styles.activityNotes, { color: colors.text + '99' }]}>
                        {activity.notes}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.activityStats}>
                    <Text style={[styles.activityDuration, { color: colors.text }]}>
                      {activity.duration} min
                    </Text>
                    {activity.distance && (
                      <Text style={[styles.activityDistance, { color: colors.text + '80' }]}>
                        {activity.distance} km
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card + '80' }]}>
                <Ionicons name="fitness-outline" size={48} color={colors.text + '40'} />
                <Text style={[styles.emptyStateText, { color: colors.text + '99' }]}>
                  No activities recorded yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.text + '80' }]}>
                  Start tracking your pet's exercise and activities
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rightPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  activitiesContainer: {
    flex: 1,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  activityCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityNotes: {
    fontSize: 14,
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityDistance: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Exercise; 