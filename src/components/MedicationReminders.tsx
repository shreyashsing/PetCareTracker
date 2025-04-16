import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databaseManager } from '../services/db';
import { Medication } from '../types/components';
import { useAppColors } from '../hooks/useAppColors';
import { formatDistanceToNow, addHours, isSameDay } from 'date-fns';
import { notificationService } from '../services/notifications';

interface MedicationRemindersProps {
  petId?: string;
  onMedicationPress?: (medicationId: string) => void;
}

interface MedicationDose {
  id: string;
  medicationId: string;
  medicationName: string;
  dosageAmount: number;
  dosageUnit: string;
  scheduledTime: Date;
  petName: string;
  petId: string;
}

const MedicationReminders: React.FC<MedicationRemindersProps> = ({ petId, onMedicationPress }) => {
  const { colors } = useAppColors();
  const [loading, setLoading] = useState(true);
  const [upcomingDoses, setUpcomingDoses] = useState<MedicationDose[]>([]);
  
  useEffect(() => {
    loadMedicationSchedule();
  }, [petId]);
  
  const loadMedicationSchedule = async () => {
    try {
      setLoading(true);
      
      // Get all active medications or filter by pet ID if provided
      const medications = petId 
        ? await databaseManager.medications.getByPetId(petId)
        : await databaseManager.medications.getAll();
      
      // Filter to only active medications with reminders enabled
      const activeMedications = medications.filter(
        med => med.status === 'active' && med.reminderSettings.enabled
      );
      
      // Get pet names for medications
      const petIds = new Set(activeMedications.map(med => med.petId));
      const pets = await Promise.all(
        Array.from(petIds).map(id => databaseManager.pets.getById(id))
      );
      
      const petMap = new Map(
        pets.filter(pet => pet !== null).map(pet => [pet!.id, pet!.name])
      );
      
      // Calculate upcoming doses for the next 24 hours
      const now = new Date();
      const doses: MedicationDose[] = [];
      
      for (const medication of activeMedications) {
        const petName = petMap.get(medication.petId) || 'Your pet';
        
        // Skip medications that haven't started yet
        const startDate = new Date(medication.duration.startDate);
        if (startDate > now) continue;
        
        // Skip medications that have ended
        if (!medication.duration.indefinite && medication.duration.endDate && new Date(medication.duration.endDate) < now) {
          continue;
        }
        
        // Calculate doses per day
        let dosesPerDay = 0;
        switch (medication.frequency.period) {
          case 'day':
            dosesPerDay = medication.frequency.times;
            break;
          case 'week':
            dosesPerDay = medication.frequency.times / 7;
            break;
          case 'month':
            dosesPerDay = medication.frequency.times / 30;
            break;
        }
        
        // Process specific times if available
        if (medication.frequency.specificTimes && medication.frequency.specificTimes.length > 0) {
          for (const timeString of medication.frequency.specificTimes) {
            const [hours, minutes] = timeString.split(':').map(Number);
            
            // Create both today and tomorrow's dose times
            for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
              const doseDate = new Date(now);
              doseDate.setDate(doseDate.getDate() + dayOffset);
              doseDate.setHours(hours, minutes, 0, 0);
              
              // Only include if it's in the future and within next 24 hours
              if (doseDate > now && doseDate < addHours(now, 24)) {
                doses.push({
                  id: `${medication.id}-${doseDate.getTime()}`,
                  medicationId: medication.id,
                  medicationName: medication.name,
                  dosageAmount: medication.dosage.amount,
                  dosageUnit: medication.dosage.unit,
                  scheduledTime: doseDate,
                  petName,
                  petId: medication.petId
                });
              }
            }
          }
        } else if (dosesPerDay > 0) {
          // Calculate evenly distributed doses
          const wakeHour = 8; // 8:00 AM
          const sleepHour = 22; // 10:00 PM
          const availableHours = sleepHour - wakeHour;
          
          // Round up to ensure we always have at least one dose per day if frequency > 0
          const numDoses = Math.max(1, Math.ceil(dosesPerDay));
          const interval = availableHours / numDoses;
          
          // Generate times for today and tomorrow
          for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
            // Skip the second day for non-daily medications if it's not the right day
            if (dayOffset > 0) {
              if (medication.frequency.period === 'week') {
                // For weekly, check if tomorrow is the same day of week as the start date
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const startDate = new Date(medication.duration.startDate);
                if (tomorrow.getDay() !== startDate.getDay()) continue;
              } else if (medication.frequency.period === 'month') {
                // For monthly, check if tomorrow is the same day of month as the start date
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const startDate = new Date(medication.duration.startDate);
                if (tomorrow.getDate() !== startDate.getDate()) continue;
              }
            }
            
            for (let i = 0; i < numDoses; i++) {
              const hour = wakeHour + Math.floor(interval * i);
              const minute = Math.round((interval * i - Math.floor(interval * i)) * 60);
              
              const doseDate = new Date(now);
              doseDate.setDate(doseDate.getDate() + dayOffset);
              doseDate.setHours(hour, minute, 0, 0);
              
              // Only include if it's in the future and within next 24 hours
              if (doseDate > now && doseDate < addHours(now, 24)) {
                doses.push({
                  id: `${medication.id}-${doseDate.getTime()}`,
                  medicationId: medication.id,
                  medicationName: medication.name,
                  dosageAmount: medication.dosage.amount,
                  dosageUnit: medication.dosage.unit,
                  scheduledTime: doseDate,
                  petName,
                  petId: medication.petId
                });
              }
            }
          }
        }
      }
      
      // Sort by scheduled time
      doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      
      setUpcomingDoses(doses);
    } catch (error) {
      console.error('Error loading medication schedule:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatScheduledTime = (date: Date) => {
    const now = new Date();
    
    // If it's today, just show the time
    if (isSameDay(date, now)) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show "Tomorrow at time"
    return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const handleRescheduleNotifications = async (medicationId: string) => {
    try {
      const medication = await databaseManager.medications.getById(medicationId);
      if (medication) {
        await notificationService.cancelMedicationNotifications(medicationId);
        await notificationService.scheduleMedicationNotifications(medication);
        
        // Refresh the medication schedule
        loadMedicationSchedule();
      }
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Medication Reminders</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }
  
  if (upcomingDoses.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Medication Reminders</Text>
        <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
          No upcoming medication doses in the next 24 hours
        </Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Upcoming Medications</Text>
      
      <FlatList
        data={upcomingDoses}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.doseItem}
            onPress={() => onMedicationPress && onMedicationPress(item.medicationId)}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="medkit-outline" size={24} color={colors.primary} />
            </View>
            
            <View style={styles.doseContent}>
              <Text style={[styles.doseName, { color: colors.text }]}>
                {item.medicationName}
              </Text>
              
              <Text style={[styles.doseDetails, { color: colors.text + '80' }]}>
                {item.dosageAmount} {item.dosageUnit} for {item.petName}
              </Text>
              
              <Text style={[styles.doseTime, { color: colors.primary }]}>
                {formatScheduledTime(item.scheduledTime)}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.rescheduleButton, { backgroundColor: colors.primary + '10' }]}
              onPress={() => handleRescheduleNotifications(item.medicationId)}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  doseItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doseContent: {
    flex: 1,
  },
  doseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  doseDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  doseTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  rescheduleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MedicationReminders; 