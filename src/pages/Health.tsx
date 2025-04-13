import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Animated
} from 'react-native';
import { useActivePet } from '../hooks/useActivePet';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Pet, HealthRecord as DbHealthRecord, Medication as DbMedication, WeightRecord } from '../types/components';
import { Button } from '../forms';
import { TopNavBar, HealthRecordDetails, MedicationDetails } from '../components';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { STORAGE_KEYS, databaseManager } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { formatDate } from '../utils/helpers';
import { useFocusEffect } from '@react-navigation/native';
// Add import for Footer
import Footer from '../components/layout/Footer';

const { width } = Dimensions.get('window');

type HealthScreenProps = NativeStackScreenProps<RootStackParamList, 'Health'>;

interface HealthRecord {
  id: string;
  date: string;
  type: string;
  displayType: string;
  notes: string;
  provider: string;
  icon?: string;
}

interface Medication {
  id: string;
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  nextDue: string;
  color?: string;
}

interface HealthMetric {
  id: string;
  name: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon: string;
}

interface HealthAnalytic {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  data: number[];
  color: string;
  labels?: string[];
  details?: string[];
}

const Health: React.FC<HealthScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'medications'>('overview');
  const { colors } = useAppColors();
  
  // State for storing the real data
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthAnalytics, setHealthAnalytics] = useState<HealthAnalytic[]>([]);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordType, setRecordType] = useState<string>('All');
  const [healthSummary, setHealthSummary] = useState({
    status: 'Good',
    lastCheckup: 'No record',
    nextVaccination: 'No record'
  });
  
  // New state for health record details modal
  const [selectedRecord, setSelectedRecord] = useState<DbHealthRecord | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  
  // New state for medication details modal
  const [selectedMedication, setSelectedMedication] = useState<DbMedication | null>(null);
  const [medicationDetailsVisible, setMedicationDetailsVisible] = useState(false);

  // Calculate health status and statistics
  const calculateHealthMetrics = (
    pet: Pet, 
    records: DbHealthRecord[], 
    medications: DbMedication[],
    weights: WeightRecord[]
  ) => {
    // Calculate vaccination status
    const vaccinations = records.filter(r => r.type === 'vaccination');
    let vaccinationStatus = 'Unknown';
    let vaccinationTrend: 'up' | 'down' | 'stable' = 'stable';
    
    if (vaccinations.length > 0) {
      // Sort vaccinations by date (newest first)
      vaccinations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Check if there's a recent vaccination (within the last year)
      const latestVaccination = vaccinations[0];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (new Date(latestVaccination.date) > oneYearAgo) {
        vaccinationStatus = 'Up to date';
        vaccinationTrend = 'stable';
      } else {
        vaccinationStatus = 'Due soon';
        vaccinationTrend = 'down';
      }
    }
    
    // Calculate weight trend
    let weightTrend: 'up' | 'down' | 'stable' = 'stable';
    let weightChange = 0;
    
    if (weights.length >= 2) {
      // Sort weights by date (newest first)
      weights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const currentWeight = weights[0].weight;
      const previousWeight = weights[1].weight;
      
      weightChange = currentWeight - previousWeight;
      
      if (Math.abs(weightChange) < 0.1) {
        weightTrend = 'stable';
      } else if (weightChange > 0) {
        weightTrend = 'up';
      } else {
        weightTrend = 'down';
      }
    }
    
    // Calculate medication adherence
    let medicationAdherence = 100;
    let medicationTrend: 'up' | 'down' | 'stable' = 'stable';
    
    if (medications.length > 0) {
      let totalDoses = 0;
      let administeredDoses = 0;
      
      medications.forEach(med => {
        if (med.history && med.history.length > 0) {
          totalDoses += med.history.length;
          administeredDoses += med.history.filter(h => h.administered).length;
        }
      });
      
      if (totalDoses > 0) {
        medicationAdherence = Math.round((administeredDoses / totalDoses) * 100);
        
        // Determine trend (simplified - in reality would need historical data)
        medicationTrend = medicationAdherence >= 90 ? 'up' : 
                         medicationAdherence >= 70 ? 'stable' : 'down';
      }
    }
    
    // Calculate overall health status
    let healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Needs attention' = 'Good';
    
    // Based on pet.status and other factors
    if (pet.status === 'healthy' && vaccinationStatus === 'Up to date' && medicationAdherence > 90) {
      healthStatus = 'Excellent';
    } else if (pet.status === 'ill' || pet.status === 'recovering' || medicationAdherence < 70) {
      healthStatus = 'Needs attention';
    } else if (pet.status === 'chronic' || vaccinationStatus === 'Due soon') {
      healthStatus = 'Fair';
    }
    
    // Find last checkup date
    let lastCheckup = 'No record';
    const checkups = records.filter(r => r.type === 'checkup');
    
    if (checkups.length > 0) {
      checkups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      lastCheckup = formatDate(checkups[0].date);
    }
    
    // Find next vaccination date
    let nextVaccination = 'No record';
    
    if (vaccinations.length > 0) {
      // Simplified - in a real app, would calculate based on vaccination schedule
      const lastVacDate = new Date(vaccinations[0].date);
      const nextVacDate = new Date(lastVacDate);
      nextVacDate.setFullYear(nextVacDate.getFullYear() + 1);
      
      if (nextVacDate > new Date()) {
        nextVaccination = formatDate(nextVacDate);
      } else {
        nextVaccination = 'Overdue';
      }
    }
    
    return {
      healthStatus,
      lastCheckup,
      nextVaccination,
      vaccinationStatus,
      vaccinationTrend,
      weightTrend,
      weightChange,
      medicationAdherence,
      medicationTrend
    };
  };

  // Function to convert health records to weight records for analytics
  const extractWeightRecords = (records: DbHealthRecord[], pet: Pet): WeightRecord[] => {
    const weightRecords: WeightRecord[] = [];
    
    // Get all checkup records that might contain weight information
    const checkups = records.filter(r => r.type === 'checkup');
    
    // Extract weight from checkups if available in lab results
    checkups.forEach(checkup => {
      if (checkup.labResults) {
        const weightResult = checkup.labResults.find(
          lab => lab.name.toLowerCase().includes('weight')
        );
        
        if (weightResult) {
          try {
            const weight = parseFloat(weightResult.value);
            const unit = weightResult.unit.toLowerCase() === 'kg' ? 'kg' : 'lb';
            
            weightRecords.push({
              id: `weight-${checkup.id}`,
              petId: pet.id,
              date: new Date(checkup.date),
              weight,
              unit,
              notes: `From checkup: ${checkup.title}`
            });
          } catch (e) {
            console.error('Error parsing weight value:', e);
          }
        }
      }
    });
    
    // Add current weight from pet profile if we have no records
    if (weightRecords.length === 0) {
      weightRecords.push({
        id: `current-weight-${pet.id}`,
        petId: pet.id,
        date: new Date(),
        weight: pet.weight,
        unit: pet.weightUnit,
        notes: 'Current weight from profile'
      });
    }
    
    // Sort by date (oldest first for chart rendering)
    weightRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return weightRecords;
  };

  // Add a function to load data (reusing the code from the useEffect)
  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // Get active pet ID from AsyncStorage
      const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
      console.log('Loading health data for pet ID:', storedActivePetId);
      
      if (storedActivePetId) {
        // Get active pet info
        const pet = await databaseManager.pets.getById(storedActivePetId);
        if (pet) {
          setActivePet(pet);
          
          // Load health records
          const records = await databaseManager.healthRecords.getByPetId(storedActivePetId);
          console.log('Health Records raw data:', JSON.stringify(records, null, 2));
          
          if (records && records.length > 0) {
            // Sort records by date (newest first)
            records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Log the types of all records to help diagnose filtering issues
            console.log('DETAILED RECORD DATA:', records.map(r => ({ 
              id: r.id, 
              type: r.type,
              exactType: JSON.stringify(r.type), // Shows exact string representation
              typeConstructor: r.type?.constructor?.name, // Shows if it's a String object vs primitive
              title: r.title,
              date: r.date 
            })));
            
            // Transform records to match the UI component's format
            const formattedRecords = records.map((record): HealthRecord => {
              // Ensure record.type is lowercase for consistent comparisons
              const recordType = record.type.toLowerCase();
              
              console.log(`Formatting record: ID ${record.id}, Type: ${record.type} -> ${recordType}`);
              
              // Assign an icon based on the record type
              let icon = '🩺';
              if (recordType === 'vaccination') icon = '💉';
              else if (recordType === 'surgery') icon = '🔪';
              else if (recordType === 'dental') icon = '🦷';
              else if (recordType === 'emergency') icon = '🚑';
              
              // Store the type in lowercase for consistent filtering
              return {
                id: record.id,
                date: formatDate(record.date),
                type: recordType,
                displayType: record.type.charAt(0).toUpperCase() + record.type.slice(1),
                notes: record.description || '',
                provider: record.provider?.name || 'Unknown',
                icon
              };
            });
            
            console.log('Formatted health records:', formattedRecords?.length || 0);
            setHealthRecords(formattedRecords);
            
            // Extract weight records from health records
            const extractedWeightRecords = extractWeightRecords(records, pet);
            setWeightRecords(extractedWeightRecords);
          } else {
            // Reset records to empty array if no records found
            console.log('No health records found');
            setHealthRecords([]);
            
            // Create a placeholder weight record if none exists
            const currentWeight: WeightRecord = {
              id: `current-weight-${pet.id}`,
              petId: pet.id,
              date: new Date(),
              weight: pet.weight,
              unit: pet.weightUnit,
              notes: 'Current weight from profile'
            };
            
            setWeightRecords([currentWeight]);
          }
          
          // Load medications
          const meds = await databaseManager.medications.getByPetId(storedActivePetId);
          if (meds.length > 0) {
            // Sort medications by next due date
            meds.sort((a, b) => {
              // Get next due date for each medication
              const getNextDueDate = (med: DbMedication) => {
                if (med.duration.endDate) {
                  return new Date(med.duration.endDate);
                }
                if (med.history && med.history.length > 0) {
                  const lastDate = new Date(med.history[0].date);
                  if (med.frequency.period === 'day') {
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    return nextDate;
                  } else if (med.frequency.period === 'week') {
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(nextDate.getDate() + 7);
                    return nextDate;
                  } else if (med.frequency.period === 'month') {
                    const nextDate = new Date(lastDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    return nextDate;
                  }
                }
                return new Date(med.duration.startDate);
              };
              
              return getNextDueDate(a).getTime() - getNextDueDate(b).getTime();
            });
            
            // Transform medications to match the UI component's format
            const formattedMeds = meds.map((med, index): Medication => {
              // Assign a color based on the index
              const colors = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
              const color = colors[index % colors.length];
              
              // Get current date and time for comparison
              const now = new Date();
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Start of today
              
              // Extract medication info
              const frequency = med.frequency;
              const dosage = med.dosage;
              
              // Convert frequency to hours
              let intervalHours = 24; // Default daily
              if (frequency.period === 'day') {
                intervalHours = 24 / frequency.times;
              } else if (frequency.period === 'week') {
                intervalHours = (7 * 24) / frequency.times;
              } else if (frequency.period === 'month') {
                intervalHours = (30 * 24) / frequency.times;
              }
              
              // Get specific times if available, or use default
              const specificTimes = frequency.specificTimes || ['09:00'];
              
              // Find last dose date from history
              let lastDoseTime = null;
              if (med.history && med.history.length > 0) {
                // Sort history by date (newest first)
                const sortedHistory = [...med.history].sort((a, b) => {
                  return new Date(b.date).getTime() - new Date(a.date).getTime();
                });
                
                // Find the most recent administered dose
                const lastDose = sortedHistory.find(h => h.administered);
                if (lastDose) {
                  lastDoseTime = new Date(lastDose.date);
                }
              }
              
              // Calculate next due time
              let nextDueDate;
              
              if (lastDoseTime) {
                // Calculate next dose based on last dose + interval
                nextDueDate = new Date(lastDoseTime.getTime() + intervalHours * 60 * 60 * 1000);
                
                // If next due is in the past, recalculate from current time
                if (nextDueDate < now) {
                  nextDueDate = calculateNextScheduledTime(specificTimes, now);
                }
              } else {
                // If no history, use start date or today
                if (med.duration && med.duration.startDate) {
                  const startDate = new Date(med.duration.startDate);
                  if (startDate > now) {
                    // If start date is in the future, use that
                    nextDueDate = startDate;
                  } else {
                    // Otherwise calculate from now
                    nextDueDate = calculateNextScheduledTime(specificTimes, now);
                  }
                } else {
                  // No start date, calculate from now
                  nextDueDate = calculateNextScheduledTime(specificTimes, now);
                }
              }
              
              // Format the next due date for display
              let nextDue;
              if (nextDueDate.toDateString() === today.toDateString()) {
                // If due today, show "Today" with the time
                const hours = nextDueDate.getHours().toString().padStart(2, '0');
                const minutes = nextDueDate.getMinutes().toString().padStart(2, '0');
                nextDue = `Today, ${hours}:${minutes}`;
              } else {
                nextDue = formatDate(nextDueDate);
              }
              
              return {
                id: med.id,
                name: med.name,
                type: med.type || 'pill',
                dosage: `${med.dosage.amount} ${med.dosage.unit}`,
                frequency: `${med.frequency.times}x ${med.frequency.period}`,
                nextDue,
                color
              };
            });
            
            setMedications(formattedMeds);
          } else {
            // Reset medications to empty array if none found
            setMedications([]);
          }
          
          // Calculate health metrics and analytics based on real data
          const metrics = calculateHealthMetrics(pet, records, meds, weightRecords);
          
          // Update health metrics
          const updatedHealthMetrics: HealthMetric[] = [
            {
              id: '1',
              name: 'Weight',
              value: pet.weight.toString(),
              unit: pet.weightUnit,
              trend: metrics.weightTrend,
              icon: 'scale-outline'
            },
            {
              id: '2',
              name: 'Vaccination Status',
              value: metrics.vaccinationStatus,
              unit: '',
              trend: metrics.vaccinationTrend,
              icon: 'shield-checkmark-outline'
            }
          ];
          setHealthMetrics(updatedHealthMetrics);
          
          // Generate weight trend data for analytics
          let weightData: number[] = [];
          let weightLabels: string[] = [];
          
          if (weightRecords.length > 0) {
            // Take the last 6 weight records (or all if fewer than 6)
            const recentWeights = weightRecords.slice(-6);
            weightData = recentWeights.map(w => w.weight);
            weightLabels = recentWeights.map(w => {
              const date = new Date(w.date);
              return date.toLocaleString('default', { month: 'short' });
            });
          } else {
            // Fallback to mock data
            weightData = [pet.weight - 0.5, pet.weight - 0.3, pet.weight - 0.2, pet.weight - 0.1, pet.weight];
            weightLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
          }
          
          // Format weight change for display
          const weightChangeDisplay = metrics.weightChange !== 0 
            ? `${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange.toFixed(1)} ${pet.weightUnit}`
            : 'Stable';
            
          // Update health analytics
          const updatedAnalytics: HealthAnalytic[] = [
            {
              id: '1',
              title: 'Weight Trend',
              value: `${pet.weight} ${pet.weightUnit}`,
              change: weightChangeDisplay,
              trend: metrics.weightTrend,
              data: weightData,
              color: '#4F46E5',
              labels: weightLabels
            },
            {
              id: '2',
              title: 'Medication Adherence',
              value: `${metrics.medicationAdherence}%`,
              change: metrics.medicationAdherence >= 90 ? 'Excellent' : 
                     metrics.medicationAdherence >= 70 ? 'Good' : 'Needs improvement',
              trend: metrics.medicationTrend,
              data: meds.length > 0 ? [
                Math.max(60, metrics.medicationAdherence - 20),
                Math.max(65, metrics.medicationAdherence - 15),
                Math.max(70, metrics.medicationAdherence - 10),
                Math.max(75, metrics.medicationAdherence - 5),
                metrics.medicationAdherence
              ] : [80, 85, 88, 90, 92],
              color: '#10B981'
            },
            {
              id: '3',
              title: 'Overall Health',
              value: metrics.healthStatus,
              change: pet.status.charAt(0).toUpperCase() + pet.status.slice(1),
              trend: metrics.healthStatus === 'Excellent' ? 'up' : 
                    metrics.healthStatus === 'Needs attention' ? 'down' : 'stable',
              data: [75, 80, 82, 78, 80], // Activity data is not yet tracked in our DB
              color: '#F59E0B'
            }
          ];
          setHealthAnalytics(updatedAnalytics);
          
          // Update health summary
          const healthSummary = {
            status: metrics.healthStatus,
            lastCheckup: metrics.lastCheckup,
            nextVaccination: metrics.nextVaccination
          };
          setHealthSummary(healthSummary);
          
          console.log('Health data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use useFocusEffect to reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('→→→ Health screen focused - reloading data');
      
      // Reload all health records to verify what's in the database
      async function verifyRecords() {
        try {
          const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
          console.log('→→→ Currently active pet ID:', storedActivePetId);
          
          // Get ALL records from the database regardless of pet ID
          const allRecords = await databaseManager.healthRecords.getAll();
          console.log('→→→ ALL health records in database:', allRecords.length);
          
          // Log ALL vaccination records in the database regardless of pet ID
          const allVaccinations = allRecords.filter(r => 
            r.type === 'vaccination' || 
            (typeof r.type === 'string' && r.type.toLowerCase().includes('vacc'))
          );
          
          console.log('→→→ ALL vaccination records in DB:', allVaccinations.length);
          if (allVaccinations.length > 0) {
            console.log('→→→ ALL vaccination details:', JSON.stringify(allVaccinations.map(v => ({
              id: v.id,
              petId: v.petId,
              type: v.type,
              title: v.title
            })), null, 2));
          }
          
          if (storedActivePetId) {
            console.log('→→→ Getting records for active pet:', storedActivePetId);
            const petRecords = await databaseManager.healthRecords.getByPetId(storedActivePetId);
            console.log('→→→ Filtered pet health records:', petRecords.length);
            
            // Log vaccination records specifically for this pet
            const vaccinations = petRecords.filter(r => r.type === 'vaccination');
            console.log('→→→ Vaccination records for active pet:', vaccinations.length);
            if (vaccinations.length > 0) {
              console.log('→→→ Vaccination details:', JSON.stringify(vaccinations.map(v => ({
                id: v.id,
                type: v.type,
                title: v.title
              })), null, 2));
            }
          }
        } catch (error) {
          console.error('Error verifying records:', error);
        }
      }
      
      verifyRecords();
      loadHealthData();
      
      return () => {
        // Clean up if needed
      };
    }, [activePetId])
  );

  // Filter health records based on selected type
  const filteredHealthRecords = healthRecords.filter(record => {
    if (recordType === 'All') {
      console.log(`Including record ${record.id} (${record.type}) because filter is 'All'`);
      return true;
    }
    
    // Make more robust comparisons using String methods
    const recordTypeStr = String(record.type).toLowerCase().trim();
    const filterTypeStr = String(recordType).toLowerCase().trim();
    
    console.log(`Comparing record ${record.id} - recordType: "${recordTypeStr}" with filter: "${filterTypeStr}"`);
    
    // Extra debugging for vaccination records
    if (recordTypeStr === 'vaccination' || filterTypeStr === 'vaccination') {
      console.log(`VACCINATION DEBUG - Record ID: ${record.id}`);
      console.log(`VACCINATION DEBUG - Record type: "${recordTypeStr}"`);
      console.log(`VACCINATION DEBUG - Filter type: "${filterTypeStr}"`);
      console.log(`VACCINATION DEBUG - Match?: ${recordTypeStr === filterTypeStr}`);
      console.log(`VACCINATION DEBUG - Includes?: ${recordTypeStr.includes(filterTypeStr)}`);
    }
    
    // More flexible matching to handle potential type issues
    const exactMatch = recordTypeStr === filterTypeStr;
    const includesMatch = recordTypeStr.includes(filterTypeStr) || filterTypeStr.includes(recordTypeStr);
    
    // For vaccination specifically, also check for partial matches
    if (filterTypeStr === 'vaccination') {
      return exactMatch || recordTypeStr.includes('vacc');
    }
    
    return exactMatch || includesMatch;
  });

  // Use activePet instead of dummyPet
  const pet = activePet || {
    id: '1',
    name: 'Loading...',
    type: 'dog',
    breed: '',
    birthDate: new Date(),
    gender: 'male',
    weight: 0,
    weightUnit: 'kg',
    microchipped: false,
    neutered: false,
    color: '',
    medicalConditions: [],
    allergies: [],
    status: 'healthy'
  };

  const [activeTooltip, setActiveTooltip] = useState<{
    analyticId: string;
    index: number;
    position: { x: number; y: number };
  } | null>(null);

  const renderChart = (analytic: HealthAnalytic) => {
    const maxValue = Math.max(...analytic.data);
    const minValue = Math.min(...analytic.data);
    const range = maxValue - minValue;
    
    return (
      <View style={styles.chartContainer}>
        {analytic.data.map((value, index) => {
          const height = range > 0 
            ? ((value - minValue) / range) * 60 
            : 30;
          
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.chartBarContainer}
              onPress={() => {
                // Calculate position for tooltip
                const x = (index / analytic.data.length) * (width - 40);
                const y = 60 - height;
                
                setActiveTooltip({
                  analyticId: analytic.id,
                  index,
                  position: { x, y }
                });
                
                // Auto-hide tooltip after 2 seconds
                setTimeout(() => {
                  setActiveTooltip(null);
                }, 2000);
              }}
            >
              <View 
                style={[
                  styles.chartBar, 
                  { 
                    height, 
                    backgroundColor: analytic.color,
                    opacity: 0.7 + (index / analytic.data.length) * 0.3
                  }
                ]} 
              />
              {analytic.labels && (
                <Text style={styles.chartLabel}>{analytic.labels[index]}</Text>
              )}
            </TouchableOpacity>
          );
        })}
        
        {activeTooltip && activeTooltip.analyticId === analytic.id && (
          <View 
            style={[
              styles.tooltip,
              { 
                left: activeTooltip.position.x,
                top: activeTooltip.position.y - 40,
                backgroundColor: colors.card,
                borderColor: analytic.color
              }
            ]}
          >
            <Text style={[styles.tooltipValue, { color: analytic.color }]}>
              {analytic.data[activeTooltip.index]}{analytic.title.includes('Weight') ? ' kg' : analytic.title.includes('Adherence') ? '%' : ''}
            </Text>
            <View style={[styles.tooltipArrow, { borderTopColor: colors.card }]} />
          </View>
        )}
      </View>
    );
  };

  const handleViewRecordDetails = async (recordId: string) => {
    try {
      // Get the full record from the database
      const record = await databaseManager.healthRecords.getById(recordId);
      if (record) {
        console.log('Viewing record details:', record.id, record.type);
        setSelectedRecord(record);
        setDetailsVisible(true);
      } else {
        console.error('Record not found:', recordId);
      }
    } catch (error) {
      console.error('Error fetching record details:', error);
    }
  };
  
  const handleEditRecord = (record: DbHealthRecord) => {
    // Navigate to the AddHealthRecord screen with the record to edit
    setDetailsVisible(false);
    console.log('Editing record:', record.id, record.type);
    navigation.navigate({
      name: 'AddHealthRecord',
      params: { 
        petId: activePetId || '',
        recordToEdit: record 
      }
    });
  };
  
  const handleRecordDeleted = () => {
    // Refresh the records list
    loadHealthData();
  };
  
  const handleViewMedicationDetails = async (medicationId: string) => {
    try {
      // Get the full medication from the database
      const medication = await databaseManager.medications.getById(medicationId);
      if (medication) {
        console.log('Viewing medication details:', medication.id, medication.name);
        setSelectedMedication(medication);
        setMedicationDetailsVisible(true);
      } else {
        console.error('Medication not found:', medicationId);
      }
    } catch (error) {
      console.error('Error fetching medication details:', error);
    }
  };
  
  const handleEditMedication = (medication: DbMedication) => {
    // Navigate to the AddMedication screen with the medication to edit
    setMedicationDetailsVisible(false);
    console.log('Editing medication:', medication.id, medication.name);
    navigation.navigate({
      name: 'AddMedication',
      params: { 
        petId: activePetId || '',
        medicationToEdit: medication 
      }
    });
  };
  
  const handleMedicationDeleted = () => {
    // Refresh the medications list
    loadHealthData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <View style={styles.healthMetricsContainer}>
              {healthMetrics.map(metric => (
                <View key={metric.id} style={[styles.metricCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.metricIconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={metric.icon as any} size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.metricName, { color: colors.text + '80' }]}>{metric.name}</Text>
                  <View style={styles.metricValueContainer}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
                    {metric.unit ? <Text style={[styles.metricUnit, { color: colors.text + '80' }]}>{metric.unit}</Text> : null}
                  </View>
                  <View style={styles.trendContainer}>
                    <Ionicons 
                      name={
                        metric.trend === 'up' ? 'arrow-up' : 
                        metric.trend === 'down' ? 'arrow-down' : 'remove'
                      } 
                      size={16} 
                      color={
                        metric.trend === 'up' ? colors.success : 
                        metric.trend === 'down' ? colors.error : colors.text + '80'
                      } 
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.healthAnalyticsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Analytics</Text>
              <View style={[styles.analyticsCard, { backgroundColor: colors.card }]}>
                {healthAnalytics.map(analytic => (
                  <View key={analytic.id} style={styles.analyticItem}>
                    <View style={styles.analyticHeader}>
                      <Text style={[styles.analyticTitle, { color: colors.text }]}>{analytic.title}</Text>
                      <View style={styles.analyticValueContainer}>
                        <Text style={[styles.analyticValue, { color: colors.text }]}>{analytic.value}</Text>
                        <View style={[
                          styles.analyticChangeContainer, 
                          { 
                            backgroundColor: 
                              analytic.trend === 'up' ? colors.success + '20' : 
                              analytic.trend === 'down' ? colors.error + '20' : 
                              colors.text + '20'
                          }
                        ]}>
                          <Ionicons 
                            name={
                              analytic.trend === 'up' ? 'arrow-up' : 
                              analytic.trend === 'down' ? 'arrow-down' : 'remove'
                            } 
                            size={12} 
                            color={
                              analytic.trend === 'up' ? colors.success : 
                              analytic.trend === 'down' ? colors.error : 
                              colors.text + '80'
                            } 
                          />
                          <Text style={[
                            styles.analyticChange, 
                            { 
                              color: 
                                analytic.trend === 'up' ? colors.success : 
                                analytic.trend === 'down' ? colors.error : 
                                colors.text + '80'
                            }
                          ]}>
                            {analytic.change}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {renderChart(analytic)}
                    <Text style={[styles.chartHint, { color: colors.text + '60' }]}>
                      Tap on bars to see detailed information
                    </Text>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={[styles.fullAnalyticsButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => navigation.navigate({
                    name: 'FullAnalytics',
                    params: { petId: activePetId || undefined }
                  })}
                >
                  <Text style={[styles.fullAnalyticsButtonText, { color: colors.primary }]}>
                    View Full Analytics
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.healthSummaryContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Summary</Text>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Overall Health</Text>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>{healthSummary.status}</Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Last Check-up</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{healthSummary.lastCheckup}</Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="medical-outline" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Next Vaccination</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{healthSummary.nextVaccination}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.upcomingContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Health Events</Text>
              <View style={[styles.upcomingCard, { backgroundColor: colors.card }]}>
                <View style={styles.upcomingItem}>
                  <View style={[styles.upcomingIconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="medkit-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={[styles.upcomingTitle, { color: colors.text }]}>Heartworm Prevention</Text>
                    <Text style={[styles.upcomingDate, { color: colors.text + '80' }]}>Due: May 1, 2024</Text>
                  </View>
                  <TouchableOpacity style={[styles.upcomingButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.upcomingButtonText}>Complete</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.upcomingItem}>
                  <View style={[styles.upcomingIconContainer, { backgroundColor: colors.warning + '15' }]}>
                    <Ionicons name="fitness-outline" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={[styles.upcomingTitle, { color: colors.text }]}>Annual Check-up</Text>
                    <Text style={[styles.upcomingDate, { color: colors.text + '80' }]}>Due: September 15, 2024</Text>
                  </View>
                  <TouchableOpacity style={[styles.upcomingButton, { backgroundColor: colors.warning }]}>
                    <Text style={styles.upcomingButtonText}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        );
      case 'records':
        return (
          <>
            <View style={styles.recordsHeader}>
              <View style={styles.recordsHeaderContent}>
                <Text style={[styles.recordsTitle, { color: colors.text }]}>Health Records</Text>
                <Text style={[styles.recordsSubtitle, { color: colors.text + '80' }]}>
                  Total: {healthRecords.length} records
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addRecordButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (activePetId) {
                    navigation.navigate({
                      name: 'AddHealthRecord',
                      params: { petId: activePetId }
                    });
                  } else {
                    alert('Please select a pet first');
                  }
                }}
              >
                <Ionicons name="add" size={22} color="white" />
                <Text style={styles.addRecordButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recordTypesContainer}>
              <LinearGradient
                colors={[colors.background, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recordTypesGradientLeft}
              />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.recordTypesScrollView}
                contentContainerStyle={styles.recordTypesContent}
              >
                {['All', 'vaccination', 'checkup', 'surgery', 'dental', 'other'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.recordTypeChip,
                      { 
                        backgroundColor: type === recordType ? colors.primary : colors.card,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => {
                      console.log(`RECORD TYPE SELECTION - Setting filter to: "${type}"`);
                      setRecordType(type);
                    }}
                  >
                    <Text 
                      style={[
                        styles.recordTypeChipText, 
                        { color: type === recordType ? 'white' : colors.text }
                      ]}
                    >
                      {type === 'All' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <LinearGradient
                colors={['transparent', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recordTypesGradientRight}
              />
            </View>

            <View style={styles.recordsContainer}>
              {filteredHealthRecords.length > 0 ? filteredHealthRecords.map(record => (
                <TouchableOpacity 
                  key={record.id} 
                  style={[styles.recordCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.recordCardContent}>
                    <View style={[
                      styles.recordIconContainer, 
                      { 
                        backgroundColor: 
                          record.type.toLowerCase() === 'vaccination' ? '#4F46E5' + '15' :
                          record.type.toLowerCase() === 'checkup' ? '#10B981' + '15' :
                          record.type.toLowerCase() === 'surgery' ? '#EF4444' + '15' :
                          record.type.toLowerCase() === 'dental' ? '#6366F1' + '15' :
                          colors.primary + '15'
                      }
                    ]}>
                      <Text style={styles.recordIcon}>{record.icon}</Text>
                    </View>
                    
                    <View style={styles.recordContent}>
                      <View style={styles.recordHeader}>
                        <View style={styles.recordTypeContainer}>
                          <Text style={[styles.recordType, { color: colors.text }]}>
                            {record.displayType}
                          </Text>
                          <View style={[
                            styles.recordTypeIndicator, 
                            { 
                              backgroundColor: 
                                record.type.toLowerCase() === 'vaccination' ? '#4F46E5' :
                                record.type.toLowerCase() === 'checkup' ? '#10B981' :
                                record.type.toLowerCase() === 'surgery' ? '#EF4444' :
                                record.type.toLowerCase() === 'dental' ? '#6366F1' :
                                colors.primary
                            }
                          ]} />
                        </View>
                        <Text style={[styles.recordDate, { color: colors.text + '80' }]}>
                          {record.date}
                        </Text>
                      </View>
                      <Text style={[styles.recordNotes, { color: colors.text + '90' }]}>
                        {record.notes}
                      </Text>
                      <View style={styles.recordFooter}>
                        <View style={styles.recordProviderContainer}>
                          <Ionicons name="person-outline" size={12} color={colors.text + '70'} />
                          <Text style={[styles.recordProvider, { color: colors.text + '70' }]}>
                            {record.provider}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.recordDetailsButton}
                          onPress={() => handleViewRecordDetails(record.id)}
                        >
                          <Text style={[styles.recordDetailsText, { color: colors.primary }]}>
                            Details
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={styles.noRecordsContainer}>
                  <View style={[styles.noRecordsCard, { backgroundColor: colors.card + '80' }]}>
                    <Ionicons name="clipboard-outline" size={48} color={colors.text + '40'} />
                    <Text style={[styles.noRecordsText, { color: colors.text + '80' }]}>
                      {recordType === 'All' ? 'No health records yet' : `No ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} records yet`}
                    </Text>
                    <Text style={[styles.noRecordsSubtext, { color: colors.text + '60' }]}>
                      {recordType === 'All' 
                        ? 'Add your pet\'s first health record to start tracking'
                        : `Add your pet's first ${recordType} record to start tracking`}
                    </Text>
                    <TouchableOpacity 
                      style={[styles.noRecordsButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        if (activePetId) {
                          navigation.navigate({
                            name: 'AddHealthRecord',
                            params: { petId: activePetId }
                          });
                        } else {
                          alert('Please select a pet first');
                        }
                      }}
                    >
                      <Text style={styles.noRecordsButtonText}>Add Health Record</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        );
      case 'medications':
        return (
          <View style={styles.medicationsContainer}>
            <View style={styles.medicationsHeader}>
              <View style={styles.medicationsHeaderContent}>
                <Text style={[styles.medicationsTitle, { color: colors.text }]}>Medications</Text>
                <Text style={[styles.medicationsSubtitle, { color: colors.text + '80' }]}>
                  Total: {medications.length} medications
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addMedicationButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (activePetId) {
                    navigation.navigate({
                      name: 'AddMedication',
                      params: { petId: activePetId }
                    });
                  } else {
                    alert('Please select a pet first');
                  }
                }}
              >
                <Ionicons name="add" size={22} color="white" />
                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.medicationTypesContainer}>
              <LinearGradient
                colors={[colors.background, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.medicationTypesGradientLeft}
              />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.medicationTypesScrollView}
                contentContainerStyle={styles.medicationTypesContent}
              >
                {['All', 'Active', 'Completed', 'Scheduled'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.medicationTypeChip,
                      { 
                        backgroundColor: type === 'All' ? colors.primary : colors.card,
                        borderColor: colors.border
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.medicationTypeChipText, 
                        { color: type === 'All' ? 'white' : colors.text }
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <LinearGradient
                colors={['transparent', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.medicationTypesGradientRight}
              />
            </View>

            <View style={styles.medicationsList}>
              {medications.map(medication => (
                <TouchableOpacity 
                  key={medication.id} 
                  style={[styles.medicationCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.medicationCardContent}>
                    <View style={[
                      styles.medicationIconContainer, 
                      { backgroundColor: medication.color + '15' }
                    ]}>
                      <Ionicons 
                        name="medical" 
                        size={24} 
                        color={medication.color} 
                      />
                    </View>
                    
                    <View style={styles.medicationContent}>
                      <View style={styles.medicationHeader}>
                        <Text style={[styles.medicationName, { color: colors.text }]}>
                          {medication.name}
                        </Text>
                        <View style={[
                          styles.medicationStatus,
                          { backgroundColor: medication.color + '15' }
                        ]}>
                          <Text style={[styles.medicationStatusText, { color: medication.color }]}>
                            Active
                          </Text>
                        </View>
                      </View>

                      <View style={styles.medicationType}>
                        <Ionicons name={
                          medication.type === 'pill' ? 'medical-outline' :
                          medication.type === 'liquid' ? 'water-outline' :
                          medication.type === 'injection' ? 'fitness-outline' :
                          medication.type === 'topical' ? 'bandage-outline' :
                          medication.type === 'chewable' ? 'nutrition-outline' :
                          'medical-outline'
                        } size={14} color={colors.text + '70'} />
                        <Text style={[styles.medicationTypeText, { color: colors.text + '70' }]}>
                          {medication.type.charAt(0).toUpperCase() + medication.type.slice(1)}
                        </Text>
                      </View>

                      <View style={styles.medicationDetails}>
                        <View style={styles.medicationDetail}>
                          <Text style={[styles.medicationDetailLabel, { color: colors.text + '70' }]}>
                            Dosage
                          </Text>
                          <Text style={[styles.medicationDetailValue, { color: colors.text }]}>
                            {medication.dosage}
                          </Text>
                        </View>
                        <View style={styles.medicationDetail}>
                          <Text style={[styles.medicationDetailLabel, { color: colors.text + '70' }]}>
                            Frequency
                          </Text>
                          <Text style={[styles.medicationDetailValue, { color: colors.text }]}>
                            {medication.frequency}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.medicationFooter}>
                        <View style={styles.medicationNextDue}>
                          <Ionicons name="time-outline" size={14} color={colors.text + '70'} />
                          <Text style={[styles.medicationNextDueText, { color: colors.text + '70' }]}>
                            Next dose: {medication.nextDue}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.medicationDetailsButton} onPress={() => handleViewMedicationDetails(medication.id)}>
                          <Text style={[styles.medicationDetailsButtonText, { color: colors.primary }]}>
                            Details
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Helper function to calculate the next scheduled time based on specific times
  function calculateNextScheduledTime(specificTimes: string[], fromDate: Date): Date {
    // Convert specific times to Date objects for today
    const today = new Date(fromDate);
    today.setHours(0, 0, 0, 0);
    
    const timeSlots = specificTimes.map(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(today);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }).sort((a, b) => a.getTime() - b.getTime());
    
    // Find the next time slot after fromDate
    for (const timeSlot of timeSlots) {
      if (timeSlot > fromDate) {
        return timeSlot;
      }
    }
    
    // If all time slots for today are in the past, take the first slot for tomorrow
    if (timeSlots.length > 0) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextSlot = new Date(tomorrow);
      const firstSlot = timeSlots[0];
      nextSlot.setHours(firstSlot.getHours(), firstSlot.getMinutes(), 0, 0);
      return nextSlot;
    }
    
    // Default to 9am tomorrow if no time slots
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar title={`${pet.name}'s Health`} />
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <View style={styles.petInfoContainer}>
              <Image 
                source={{ uri: pet.image }} 
                style={styles.petImage} 
                resizeMode="cover"
              />
              <View style={styles.petInfo}>
                <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
                <Text style={[styles.petType, { color: colors.text + '80' }]}>{pet.type}</Text>
                <View style={[styles.healthStatusContainer, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.healthStatus, { color: colors.success }]}>
                    {pet.status.charAt(0).toUpperCase() + pet.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name="stats-chart-outline" 
              size={20} 
              color={activeTab === 'overview' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'overview' && { color: colors.primary }]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'records' && styles.activeTab]} 
            onPress={() => setActiveTab('records')}
          >
            <Ionicons 
              name="document-text-outline" 
              size={20} 
              color={activeTab === 'records' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'records' && { color: colors.primary }]}>
              Records
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'medications' && styles.activeTab]} 
            onPress={() => setActiveTab('medications')}
          >
            <Ionicons 
              name="medical-outline" 
              size={20} 
              color={activeTab === 'medications' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'medications' && { color: colors.primary }]}>
              Medications
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Add the HealthRecordDetails component */}
      <HealthRecordDetails 
        record={selectedRecord}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        onEdit={handleEditRecord}
        onDelete={() => {}} // This is handled internally in the component
        onRefresh={handleRecordDeleted}
      />
      
      {/* Add the MedicationDetails component */}
      <MedicationDetails 
        medication={selectedMedication}
        visible={medicationDetailsVisible}
        onClose={() => setMedicationDetailsVisible(false)}
        onEdit={handleEditMedication}
        onDelete={() => {}} // This is handled internally in the component
        onRefresh={handleMedicationDeleted}
      />
      
      {/* Add Footer component */}
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    marginTop: 10,
  },
  petInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  petType: {
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
  tabs: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  content: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  healthMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: width / 2 - 28,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    marginBottom: 4,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricUnit: {
    fontSize: 14,
    marginLeft: 4,
  },
  trendContainer: {
    marginTop: 8,
  },
  healthAnalyticsContainer: {
    marginBottom: 24,
  },
  analyticsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  analyticItem: {
    marginBottom: 20,
  },
  analyticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  analyticValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  analyticChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  analyticChange: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    position: 'relative',
  },
  chartBarContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#64748B',
  },
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    alignItems: 'center',
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  chartHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  healthSummaryContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  upcomingContainer: {
    marginBottom: 24,
  },
  upcomingCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  upcomingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 14,
  },
  upcomingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upcomingButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  recordsHeaderContent: {
    flex: 1,
  },
  recordsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  recordsSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addRecordButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  recordTypesContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  recordTypesScrollView: {
    paddingHorizontal: 16,
  },
  recordTypesContent: {
    paddingRight: 16,
  },
  recordTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  recordTypeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordsContainer: {
    paddingHorizontal: 16,
  },
  recordCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  recordCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  recordIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recordIcon: {
    fontSize: 24,
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordType: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  recordTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordProviderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordProvider: {
    fontSize: 12,
    marginLeft: 4,
  },
  recordDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  noRecordsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  noRecordsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  noRecordsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noRecordsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  noRecordsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noRecordsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  medicationsContainer: {
    flex: 1,
  },
  medicationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  medicationsHeaderContent: {
    flex: 1,
  },
  medicationsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  medicationsSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addMedicationButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  medicationTypesContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  medicationTypesScrollView: {
    paddingHorizontal: 16,
  },
  medicationTypesContent: {
    paddingRight: 16,
  },
  medicationTypesGradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
  medicationTypesGradientRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
  medicationTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  medicationTypeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  medicationsList: {
    paddingHorizontal: 16,
  },
  medicationCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  medicationCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  medicationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationContent: {
    flex: 1,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  medicationType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationTypeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  medicationStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicationStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  medicationDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  medicationDetail: {
    marginRight: 24,
  },
  medicationDetailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  medicationDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  medicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationNextDue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationNextDueText: {
    fontSize: 12,
    marginLeft: 4,
  },
  medicationDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationDetailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  fullAnalyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  fullAnalyticsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  recordTypesGradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
  recordTypesGradientRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
});

export default Health; 