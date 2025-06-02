import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { useActivePet } from '../hooks/useActivePet';
import { Button, DatePicker } from '../forms';
import { generateUUID } from '../utils/helpers';
import { unifiedDatabaseManager } from '../services/db';

type AddActivityScreenProps = NativeStackScreenProps<MainStackParamList, 'AddActivity'>;

const AddActivity: React.FC<AddActivityScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  const { activePetId } = useActivePet();
  const [isLoading, setIsLoading] = useState(false);
  
  const [activityType, setActivityType] = useState('Walk');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  
  const activityTypes = [
    'Walk',
    'Play',
    'Training',
    'Grooming',
    'Vet Visit',
    'Other'
  ];
  
  const handleSave = async () => {
    if (!activePetId) {
      Alert.alert('Error', 'No active pet selected');
      return;
    }
    
    if (!activityType) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }
    
    if (!duration || isNaN(Number(duration))) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Map activity type to ActivitySession type
      const activityTypeMap = {
        'Walk': 'walk',
        'Play': 'play', 
        'Training': 'training',
        'Grooming': 'other',
        'Vet Visit': 'other',
        'Other': 'other'
      };
      
      const mappedType = activityTypeMap[activityType as keyof typeof activityTypeMap] || 'other';
      
      // Create ActivitySession object
      const newActivitySession = {
        id: generateUUID(),
        petId: activePetId,
        date: date,
        startTime: new Date(date.getTime()), // Use the selected date as start time
        endTime: new Date(date.getTime() + (Number(duration) * 60000)), // Add duration in milliseconds
        type: mappedType as 'walk' | 'run' | 'play' | 'swim' | 'training' | 'other',
        duration: Number(duration),
        distance: distance ? Number(distance) : undefined,
        distanceUnit: 'km' as 'km' | 'mi',
        intensity: 'moderate' as 'low' | 'moderate' | 'high', // Default to moderate
        location: {
          name: 'Home' // Default location
        },
        mood: 'happy' as 'energetic' | 'happy' | 'tired' | 'reluctant', // Default mood
        notes: notes || undefined
      };
      
      console.log('Saving activity session:', newActivitySession);
      
      // Save to database using the unified database manager
      await unifiedDatabaseManager.activitySessions.create(newActivitySession);
      
      Alert.alert(
        'Success',
        'Activity saved successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Add Activity
          </Text>
          <View style={styles.rightPlaceholder} />
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Type</Text>
            <View style={styles.activityTypesContainer}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.activityTypeButton,
                    { 
                      backgroundColor: type === activityType ? colors.primary : colors.card,
                      borderColor: type === activityType ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setActivityType(type)}
                >
                  <Text 
                    style={[
                      styles.activityTypeText, 
                      { color: type === activityType ? 'white' : colors.text }
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Details</Text>
            
            <DatePicker
              label="Date"
              value={date}
              onChange={(selectedDate) => setDate(selectedDate)}
              mode="date"
              containerStyle={styles.datePickerContainer}
            />
            
            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Duration (minutes)</Text>
                <View style={[styles.textInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="Duration"
                    placeholderTextColor={colors.text + '60'}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Distance (km)</Text>
                <View style={[styles.textInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="navigate-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={distance}
                    onChangeText={setDistance}
                    placeholder="Optional"
                    placeholderTextColor={colors.text + '60'}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about the activity"
                placeholderTextColor={colors.text + '60'}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <Button
            title={isLoading ? "Saving..." : "Save Activity"}
            onPress={handleSave}
            disabled={isLoading}
            style={{ backgroundColor: colors.primary }}
          />
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  activityTypeButton: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
  },
  activityTypeText: {
    fontWeight: '500',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  notesContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  notesInput: {
    height: 100,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
});

export default AddActivity; 