import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { TopNavBar, HealthRecordDetails, MedicationDetails } from '../components';
import WeightTrendCard from '../components/WeightTrendCard';
import { LinearGradient } from 'expo-linear-gradient';
import Footer from '../components/layout/Footer';
import { format } from 'date-fns';
import { STORAGE_KEYS,unifiedDatabaseManager} from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { formatDate } from '../utils/helpers';
import { useFocusEffect } from '@react-navigation/native';
// Add import for MedicationReminders component
import MedicationReminders from '../components/MedicationReminders';
import { syncHealthRecordsForPet } from '../utils/healthRecordSync';
import { 
  Pet, 
  HealthRecord as DbHealthRecord, 
  Medication as DbMedication, 
  WeightRecord 
} from '../types/components';

const { width } = Dimensions.get('window');

type HealthScreenProps = NativeStackScreenProps<MainStackParamList, 'Health'>;

interface HealthRecord {
  id: string;
  date: string;
  type: string;
  displayType: string;
  notes: string;
  provider: string;
  icon?: string;
  followUpNeeded?: boolean;
  followUpDate?: string;
  title?: string;
}

interface Medication {
  id: string;
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  nextDue: string;
  color?: string;
  status?: string; // Add status field
}

interface HealthMetric {
  id: string;
  name: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon: string;
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
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [recordType, setRecordType] = useState<string>('All');
  const [medicationFilter, setMedicationFilter] = useState<string>('All'); // Add medication filter state
  const [healthSummary, setHealthSummary] = useState({
    status: 'Good',
    lastCheckup: 'No record',
    nextVaccination: 'No record',
    nextHealthEvent: 'None scheduled',
    recordsSummary: 'No records yet'
  });
  
  // Add state for recommendations
  const [recommendations, setRecommendations] = useState({
    weight: {
      title: 'Maintain Healthy Weight',
      text: 'Continue with regular exercise and balanced diet.'
    },
    vaccination: {
      title: 'Vaccination Reminder',
      text: 'No vaccination records found.'
    },
    checkup: {
      title: 'Regular Health Checkups',
      text: 'Schedule a wellness checkup to establish a health baseline.'
    }
  });
  
  // New state for health record details modal
  const [selectedRecord, setSelectedRecord] = useState<DbHealthRecord | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  
  // New state for medication details modal
  const [selectedMedication, setSelectedMedication] = useState<DbMedication | null>(null);
  const [medicationDetailsVisible, setMedicationDetailsVisible] = useState(false);
  
  // Add ref to track initial mount and loading state
  const isInitialMount = useRef(true);
  const isLoadingRef = useRef(false);

  // Calculate health status and statistics
  const calculateHealthMetrics = (
    pet: Pet, 
    records: DbHealthRecord[], 
    medications: DbMedication[],
    weights: WeightRecord[]
  ) => {
    console.log('=== CALCULATE HEALTH METRICS DEBUG ===');
    console.log('Total records received:', records.length);
    
    // Calculate vaccination status
    const vaccinations = records.filter(r => r.type === 'vaccination');
    console.log('All vaccinations found:', vaccinations.length);
    
    // Log detailed information about all vaccinations
    vaccinations.forEach((v, index) => {
      console.log(`Vaccination ${index + 1}:`, {
        id: v.id,
        title: v.title,
        type: v.type,
        date: v.date,
        followUpNeeded: v.followUpNeeded,
        followUpDate: v.followUpDate,
        status: v.status,
        raw: JSON.stringify(v, null, 2)
      });
    });
    
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
          administeredDoses += med.history.filter((h: any) => h.administered).length;
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
      console.log('Processing vaccinations for next vaccination date:', vaccinations.length);
      vaccinations.forEach(v => {
        console.log(`Vaccination ${v.id}: followUpNeeded=${v.followUpNeeded}, followUpDate=${v.followUpDate}, status=${v.status}`);
      });
      
      // First check if any vaccination records have follow-up dates
      const vaccinationsWithFollowUp = vaccinations.filter(v => {
        const hasFollowUp = v.followUpNeeded && v.followUpDate;
        
        // For vaccinations, we need to include:
        // 1. Not completed vaccinations with follow-ups, OR  
        // 2. Completed vaccinations with future follow-up dates (boosters/next doses)
        const isNotCompleted = v.status !== 'completed';
        let hasFutureFollowUp = false;
        
        if (v.followUpDate) {
          try {
            const followUpDate = new Date(v.followUpDate);
            hasFutureFollowUp = followUpDate > new Date();
          } catch (error) {
            console.error('Error parsing vaccination follow-up date:', v.followUpDate, error);
          }
        }
        
        const shouldInclude = hasFollowUp && (isNotCompleted || hasFutureFollowUp);
        
        console.log(`Vaccination ${v.id} filter check:`, {
          followUpNeeded: v.followUpNeeded,
          followUpDate: v.followUpDate,
          status: v.status,
          hasFollowUp,
          isNotCompleted,
          hasFutureFollowUp,
          shouldInclude
        });
        
        return shouldInclude;
      });
      
      console.log('Vaccinations with follow-up (not completed):', vaccinationsWithFollowUp.length);
      
      if (vaccinationsWithFollowUp.length > 0) {
        // For vaccinations, be less restrictive with date filtering - only exclude very old dates (more than 30 days ago)
        const validVaccinations = vaccinationsWithFollowUp.filter(v => {
          try {
            const followUpDate = new Date(v.followUpDate!);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isValid = followUpDate > thirtyDaysAgo;
            
            console.log(`Vaccination ${v.id} date check: followUpDate=${followUpDate.toISOString()}, thirtyDaysAgo=${thirtyDaysAgo.toISOString()}, isValid=${isValid}`);
            return isValid;
          } catch (error) {
            console.error('Error parsing vaccination follow-up date:', v.followUpDate, error);
            return false;
          }
        });
        
        console.log('Valid vaccinations after date filtering:', validVaccinations.length);
        
        if (validVaccinations.length > 0) {
          // Sort by follow-up date (soonest first)
          validVaccinations.sort((a, b) => {
            return new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime();
          });
          
          // Get the soonest follow-up date
          const nextFollowUpDate = new Date(validVaccinations[0].followUpDate!);
          
          console.log('Next vaccination follow-up date:', nextFollowUpDate.toISOString());
      
          if (nextFollowUpDate > new Date()) {
            nextVaccination = formatDate(nextFollowUpDate);
            console.log('Setting next vaccination to:', nextVaccination);
      } else {
            // Check if it's recent (within last 7 days) - consider as overdue
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            if (nextFollowUpDate > sevenDaysAgo) {
        nextVaccination = 'Overdue';
              console.log('Setting next vaccination to: Overdue');
            } else {
              // If vaccination is old, show no record
              nextVaccination = 'No record';
              console.log('Setting next vaccination to: No record (too old)');
            }
          }
        } else {
          console.log('No valid vaccinations after date filtering');
        }
      } else {
        console.log('No vaccinations with follow-up found');
      }
      // Removed the fallback calculation that was adding 1 year automatically
      // If no valid follow-ups exist, we'll keep "No record"
    }
    
    // Find next health event (any follow-up or scheduled appointment)
    let nextHealthEvent = 'No upcoming health events';
    
    console.log('=== NEXT HEALTH EVENT DEBUG ===');
    console.log('Total records for health events:', records.length);
    
    // Get all records with follow-up dates that are not yet completed
    const recordsWithFollowUp = records.filter(r => {
      const hasFollowUp = r.followUpNeeded && r.followUpDate;
      
      // For health events, we need to include:
      // 1. Not completed records with follow-ups, OR
      // 2. Completed records with future follow-up dates (like vaccination boosters)
      const isNotCompleted = r.status !== 'completed';
      let hasFutureFollowUp = false;
      
      if (r.followUpDate) {
        try {
          const followUpDate = new Date(r.followUpDate);
          hasFutureFollowUp = followUpDate > new Date();
        } catch (error) {
          console.error('Error parsing follow-up date:', r.followUpDate, error);
        }
      }
      
      // followUpDate is a Date object, so we just need to check if it exists
      const hasValidDate = r.followUpDate !== null && r.followUpDate !== undefined;
      const shouldInclude = hasFollowUp && hasValidDate && (isNotCompleted || hasFutureFollowUp);
      
      console.log(`Record ${r.id} (${r.type}):`, {
        followUpNeeded: r.followUpNeeded,
        followUpDate: r.followUpDate,
        status: r.status,
        hasFollowUp,
        isNotCompleted,
        hasFutureFollowUp,
        hasValidDate,
        shouldInclude
      });
      
      return shouldInclude;
    });
    
    console.log('Records with valid follow-ups for health events:', recordsWithFollowUp.length);
    
    if (recordsWithFollowUp.length > 0) {
      // Filter out any follow-up dates that are in the past (more than 7 days ago)
      const futureFollowUps = recordsWithFollowUp.filter(r => {
        try {
          const followUpDate = new Date(r.followUpDate!);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return followUpDate > sevenDaysAgo;
        } catch (error) {
          console.error('Error parsing follow-up date:', r.followUpDate, error);
          return false;
        }
      });
      
      console.log('Future follow-ups after filtering old dates:', futureFollowUps.length);
      
      if (futureFollowUps.length > 0) {
        // Sort by follow-up date (soonest first)
        futureFollowUps.sort((a, b) => 
          new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime()
        );
        
        // Get the soonest follow-up date
        const nextEvent = futureFollowUps[0];
        const nextEventDate = new Date(nextEvent.followUpDate!);
        
        if (nextEventDate > new Date()) {
          nextHealthEvent = `${nextEvent.type.charAt(0).toUpperCase() + nextEvent.type.slice(1)} on ${formatDate(nextEventDate)}`;
        } else {
          // Check if it's very recent (within last 3 days) - consider as current/overdue
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          if (nextEventDate > threeDaysAgo) {
            nextHealthEvent = `${nextEvent.type.charAt(0).toUpperCase() + nextEvent.type.slice(1)} (Overdue)`;
          } else {
            // If all events are too far in the past, show no upcoming events
            nextHealthEvent = 'No upcoming health events';
          }
        }
      }
    }
    
    // Generate a summary of past health events
    let recordsSummary = 'No records yet';
    
    if (records.length > 0) {
      // Filter records from the past year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const recentRecords = records.filter(r => new Date(r.date) >= oneYearAgo);
      
      // Count records by type
      const vaccinationCount = recentRecords.filter(r => r.type.toLowerCase() === 'vaccination').length;
      const checkupCount = recentRecords.filter(r => r.type.toLowerCase() === 'checkup').length;
      const otherCount = recentRecords.length - vaccinationCount - checkupCount;
      
      const parts = [];
      if (vaccinationCount > 0) parts.push(`${vaccinationCount} vaccination${vaccinationCount !== 1 ? 's' : ''}`);
      if (checkupCount > 0) parts.push(`${checkupCount} checkup${checkupCount !== 1 ? 's' : ''}`);
      if (otherCount > 0) parts.push(`${otherCount} other${otherCount !== 1 ? 's' : ''}`);
      
      if (parts.length > 0) {
        recordsSummary = `Past year: ${parts.join(', ')}`;
      } else {
        recordsSummary = 'No recent records (past year)';
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
      medicationTrend,
      nextHealthEvent,
      recordsSummary
    };
  };

  // Function to convert health records to weight records for analytics
  const extractWeightRecords = (records: DbHealthRecord[], pet: Pet): WeightRecord[] => {
    const weightRecords: WeightRecord[] = [];
    
    // Get all checkup records that might contain weight information
    const checkups = records.filter(r => r.type === 'checkup');
    
    // Extract weight from checkups if available in weight field
    checkups.forEach(checkup => {
      if (checkup.weight && checkup.weight > 0) {
        try {
          const weight = parseFloat(checkup.weight.toString());
          const unit = pet.weightUnit; // Use pet's weight unit as default
          
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
  const loadHealthData = async (silentReload = false) => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('Already loading health data, skipping...');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      
      // Only show loading screen on initial load, not on silent reloads
      if (!silentReload) {
        setLoading(true);
      }
      
      console.log(`Loading health data... (silent: ${silentReload})`);
      
      
      // Get active pet ID from context first, then AsyncStorage if needed
      let currentPetId = activePetId;
      
      // If no pet ID in context, try to get from AsyncStorage
      if (!currentPetId) {
        const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        console.log('Loading health data for pet ID from storage:', storedActivePetId);
        currentPetId = storedActivePetId;
      }
      
      console.log('Final pet ID to load health data for:', currentPetId);
      
      if (currentPetId) {
        // Get active pet info
        const pet = await unifiedDatabaseManager.pets.getById(currentPetId);
        if (pet) {
          console.log('Successfully loaded pet:', pet.name, pet.id);
          setActivePet(pet);
          
          // Try to sync health records with Supabase (only during non-silent reloads)
          if (!silentReload) {
            try {
              setSyncingRecords(true);
              console.log('Syncing health records with Supabase...');
              const syncResult = await syncHealthRecordsForPet(currentPetId);
              console.log('Health records sync result:', syncResult);
              
              if (syncResult.syncedRecords > 0) {
                console.log(`Successfully synced ${syncResult.syncedRecords} health records`);
              }
            } catch (syncError) {
              console.error('Error syncing health records:', syncError);
            } finally {
              setSyncingRecords(false);
            }
          } else {
            // Silent background sync without showing loading state
            try {
              console.log('Silent background sync of health records...');
              const syncResult = await syncHealthRecordsForPet(currentPetId);
              if (syncResult.syncedRecords > 0) {
                console.log(`Silently synced ${syncResult.syncedRecords} health records`);
              }
            } catch (syncError) {
              console.error('Error in silent sync:', syncError);
            }
          }
          
          // Load health records
          const allHealthRecords = await unifiedDatabaseManager.healthRecords.getAll();
          const records = allHealthRecords.filter(record => record.petId === currentPetId);
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
                icon,
                // Allow completed records with future follow-up dates to show in upcoming events
                followUpNeeded: record.followUpNeeded && (
                  record.status !== 'completed' || 
                  (record.followUpDate && new Date(record.followUpDate) > new Date())
                ),
                followUpDate: record.followUpDate ? record.followUpDate.toString() : undefined,
                title: record.title
              };
            });
            
            console.log('Formatted health records:', formattedRecords?.length || 0);
            setHealthRecords(formattedRecords);
          } else {
            // Reset records to empty array if no records found
            console.log('No health records found');
            setHealthRecords([]);
          }
          
          // Load actual weight records from the weight records table
          const allWeightRecords = await unifiedDatabaseManager.weightRecords.getAll();
          const petWeightRecords = allWeightRecords
            .filter(record => record.petId === currentPetId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // If no weight records exist, create one from pet's current weight
          if (petWeightRecords.length === 0) {
            const initialWeight: Omit<WeightRecord, 'id'> = {
              petId: currentPetId,
              date: new Date(),
              weight: pet.weight,
              unit: pet.weightUnit,
              notes: 'Initial weight from profile',
              bodyConditionScore: 3
            };
            
            try {
              const createdRecord = await unifiedDatabaseManager.weightRecords.create(initialWeight);
              petWeightRecords.push(createdRecord);
              console.log('Created initial weight record:', createdRecord);
            } catch (error) {
              console.error('Error creating initial weight record:', error);
              // Fallback to in-memory record for display
              petWeightRecords.push({
                id: `initial-weight-${currentPetId}`,
                ...initialWeight
              } as WeightRecord);
            }
          }

          setWeightRecords(petWeightRecords);
          console.log(`Loaded ${petWeightRecords.length} weight records for pet ${pet.name}`);
          
          // Load medications
          const allMedications = await unifiedDatabaseManager.medications.getAll();
          let meds = allMedications.filter(med => med.petId === currentPetId);
          
          // Check and update expired medications first
          console.log('Checking for expired medications...');
          const expiredMedications = await unifiedDatabaseManager.medications.checkAndUpdateExpiredMedications(currentPetId);
          if (expiredMedications.length > 0) {
            console.log(`Automatically marked ${expiredMedications.length} medications as completed`);
            // Reload medications to get updated statuses
            const updatedMedications = await unifiedDatabaseManager.medications.getAll();
            meds = updatedMedications.filter(med => med.petId === currentPetId);
          }
          
          // Filter medications by status based on medicationFilter
          let filteredMeds = meds;
          switch (medicationFilter) {
            case 'Active':
              filteredMeds = meds.filter(med => med.status === 'active');
              break;
            case 'Completed':
              filteredMeds = meds.filter(med => med.status === 'completed');
              break;
            case 'Discontinued':
              filteredMeds = meds.filter(med => med.status === 'discontinued');
              break;
            case 'All':
            default:
              filteredMeds = meds; // Show all medications
              break;
          }
          
          console.log(`Total medications: ${meds.length}, Filtered: ${filteredMeds.length} (filter: ${medicationFilter})`);
          
          // Calculate health metrics and analytics based on real data
          const healthStats = calculateHealthMetrics(pet, records, filteredMeds, petWeightRecords);
          
          // Update health metrics
          const updatedHealthMetrics: HealthMetric[] = [
            {
              id: '1',
              name: 'Weight',
              value: pet.weight.toString(),
              unit: pet.weightUnit,
              trend: healthStats.weightTrend,
              icon: 'scale-outline'
            },
            {
              id: '2',
              name: 'Vaccination Status',
              value: healthStats.vaccinationStatus,
              unit: '',
              trend: healthStats.vaccinationTrend,
              icon: 'shield-checkmark-outline'
            }
          ];
          setHealthMetrics(updatedHealthMetrics);
          
          if (filteredMeds.length > 0) {
            // Sort medications by next due date
            filteredMeds.sort((a, b) => {
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
            const formattedMeds = filteredMeds.map((med, index): Medication => {
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
              
              // Get specific times if available, or generate evenly distributed times
              let specificTimes = frequency.specificTimes;
              if (!specificTimes || specificTimes.length === 0) {
                // Generate evenly distributed times based on frequency
                if (frequency.period === 'day' && frequency.times > 1) {
                  // Generate multiple times per day
                  const numDoses = frequency.times;
                  const wakeHour = 8; // 8:00 AM
                  const sleepHour = 22; // 10:00 PM
                  const availableHours = sleepHour - wakeHour;
                  const interval = availableHours / numDoses;
                  
                  specificTimes = [];
                  for (let i = 0; i < numDoses; i++) {
                    const hour = wakeHour + Math.floor(interval * i);
                    const minute = Math.round((interval * i - Math.floor(interval * i)) * 60);
                    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    specificTimes.push(timeString);
                  }
                } else {
                  // Default to single morning dose
                  specificTimes = ['09:00'];
                }
              } else if (frequency.period === 'day' && frequency.times > 1 && specificTimes.length < frequency.times) {
                // Handle mismatch: frequency says 3x day but only 1 specific time provided
                console.log(`🔧 Detected mismatch: ${frequency.times}x day but only ${specificTimes.length} time(s) specified. Generating additional times.`);
                
                const numDoses = frequency.times;
                const wakeHour = 8; // 8:00 AM
                const sleepHour = 22; // 10:00 PM
                const availableHours = sleepHour - wakeHour;
                const interval = availableHours / numDoses;
                
                const generatedTimes = [];
                for (let i = 0; i < numDoses; i++) {
                  const hour = wakeHour + Math.floor(interval * i);
                  const minute = Math.round((interval * i - Math.floor(interval * i)) * 60);
                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  generatedTimes.push(timeString);
                }
                
                specificTimes = generatedTimes;
                console.log(`🔧 Generated times for ${med.name}:`, generatedTimes);
              }
              
              console.log(`💊 Medication ${med.name} - Times:`, {
                frequency: `${frequency.times}x ${frequency.period}`,
                specificTimes,
                originalSpecificTimes: frequency.specificTimes
              });
              
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
              
              // Calculate next due time only for active medications
              let nextDue;
              
              if (med.status === 'completed') {
                nextDue = 'Completed';
              } else if (med.status === 'discontinued') {
                nextDue = 'Discontinued';
              } else {
                // Only calculate next due for active medications
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
                if (nextDueDate.toDateString() === today.toDateString()) {
                  // If due today, show "Today" with the time
                  const hours = nextDueDate.getHours().toString().padStart(2, '0');
                  const minutes = nextDueDate.getMinutes().toString().padStart(2, '0');
                  nextDue = `Today, ${hours}:${minutes}`;
                } else {
                  nextDue = formatDate(nextDueDate);
                }
              }
              
              return {
                id: med.id,
                name: med.name,
                type: med.type || 'pill',
                dosage: `${med.dosage.amount} ${med.dosage.unit}`,
                frequency: `${med.frequency.times}x ${med.frequency.period}`,
                nextDue,
                color,
                status: med.status || 'Active'
              };
            });
            
            setMedications(formattedMeds);
          } else {
            // Reset medications to empty array if none found
            setMedications([]);
          }
          
          // Generate weight trend data for analytics
          let weightData: number[] = [];
          let weightLabels: string[] = [];
          
          if (petWeightRecords.length > 0) {
            // Take the last 6 weight records (or all if fewer than 6)
            const recentWeights = petWeightRecords.slice(-6);
            weightData = recentWeights.map(w => w.weight);
            weightLabels = recentWeights.map(w => {
              const date = new Date(w.date);
              return date.toLocaleString('default', { month: 'short' });
            });
          } else if (pet) {
            // Instead of showing fake historical data, show a flat line at current weight
            // with correct dates starting from pet creation date
            const petCreationDate = new Date(pet.birthDate || new Date());
            const today = new Date();
            const months = [];
            const currentMonth = today.getMonth();
            
            // Generate labels for last 5 months starting from pet creation or at most 5 months ago
            for (let i = 4; i >= 0; i--) {
              const monthDate = new Date(today);
              monthDate.setMonth(currentMonth - i);
              
              // Only include months after pet creation
              if (monthDate >= petCreationDate) {
                months.push(monthDate.toLocaleString('default', { month: 'short' }));
              }
            }
            
            // If we have less than 2 months since pet creation, add current month twice for visual effect
            if (months.length < 2) {
              months.push(today.toLocaleString('default', { month: 'short' }));
            }
            
            // Create flat data at current weight (since no history)
            weightData = Array(months.length).fill(pet.weight);
            weightLabels = months;
          }
          
          // Format weight change for display
          const weightChangeDisplay = healthStats.weightChange !== 0 
            ? `${healthStats.weightChange > 0 ? '+' : ''}${healthStats.weightChange.toFixed(1)} ${pet.weightUnit}`
            : 'Stable';
          
          // Update health summary
          const healthSummary = {
            status: healthStats.healthStatus,
            lastCheckup: healthStats.lastCheckup,
            nextVaccination: healthStats.nextVaccination,
            nextHealthEvent: healthStats.nextHealthEvent,
            recordsSummary: healthStats.recordsSummary
          };
          setHealthSummary(healthSummary);
          
          // Generate recommendation data
          const weightRecommendation = {
            title: healthStats.weightTrend === 'up' 
              ? 'Monitor Weight Gain' 
              : healthStats.weightTrend === 'down' 
                ? 'Monitor Weight Loss' 
                : 'Maintain Healthy Weight',
            text: healthStats.weightTrend === 'up' 
              ? `Regular weight tracking recommended. Consult your vet if ${pet?.type === 'cat' ? 'your cat' : 'your dog'} continues to gain weight.` 
              : healthStats.weightTrend === 'down' 
                ? `Regular weight tracking recommended. Consult your vet if ${pet?.type === 'cat' ? 'your cat' : 'your dog'} continues to lose weight.`
                : `${pet?.type === 'cat' ? 'Your cat\'s' : 'Your dog\'s'} weight is stable. Continue with regular exercise and balanced diet.`
          };
          
          const vaccinationRecommendation = {
            title: healthStats.vaccinationStatus === 'Up to date' 
              ? 'Vaccinations on Track' 
              : 'Vaccination Reminder',
            text: healthStats.vaccinationStatus === 'Up to date' 
              ? `Vaccinations are current. Next vaccination due on ${healthStats.nextVaccination}.` 
              : healthStats.nextVaccination === 'Overdue'
                ? 'Vaccinations are overdue. Schedule a vet appointment as soon as possible.'
                : `Schedule the next vaccination by ${healthStats.nextVaccination}.`
          };
          
          const checkupRecommendation = {
            title: 'Regular Health Checkups',
            text: healthStats.lastCheckup === 'No record' 
              ? `Schedule a wellness checkup for ${pet?.type === 'cat' ? 'your cat' : 'your dog'} to establish a health baseline.`
              : `Last checkup: ${healthStats.lastCheckup}. ${
                  new Date(healthStats.lastCheckup).getTime() < new Date().getTime() - (365 * 24 * 60 * 60 * 1000)
                    ? 'Consider scheduling an annual wellness exam.'
                    : 'You\'re on track with regular checkups.'
                }`
          };
          
          // Set recommendations state
          setRecommendations({
            weight: weightRecommendation,
            vaccination: vaccinationRecommendation,
            checkup: checkupRecommendation
          });
          
          console.log('Health data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      // Always ensure loading is false after any load operation
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Only load data on initial mount - let useFocusEffect handle navigation
  useEffect(() => {
    if (isInitialMount.current) {

      loadHealthData(true); // Use silent load even on initial mount to prevent loading screen
      // Set this to false AFTER the loadHealthData call to prevent medication filter from triggering
      setTimeout(() => {
        isInitialMount.current = false;
      }, 100);
    }
  }, []); // Empty dependency array for initial mount only
  
  // Reload data when medication filter changes (but not on initial mount)
  useEffect(() => {
    if (medicationFilter && !isInitialMount.current) {
      console.log('→→→ Medication filter changed to:', medicationFilter);
      loadHealthData(false); // Show loading screen when filter changes
    }
  }, [medicationFilter]);

  // Use useFocusEffect to reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('→→→ Health screen focused - reloading data');
      console.log('→→→ Current active pet ID from context:', activePetId);
      

      // Use silent reload to avoid showing loading screen during navigation
      loadHealthData(true);
      
      return () => {
        // Clean up if needed
      };
    }, []) // Remove activePetId dependency to prevent double-triggering
  );
  


  // Filter health records based on selected type
  const filteredHealthRecords = healthRecords.filter(record => {
    if (recordType === 'All') {
      return true;
    }
    
    // Make more robust comparisons using String methods
    const recordTypeStr = String(record.type).toLowerCase().trim();
    const filterTypeStr = String(recordType).toLowerCase().trim();
    
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

  const handleViewRecordDetails = async (recordId: string) => {
    try {
      // Get the full record from the database
      const record = await unifiedDatabaseManager.healthRecords.getById(recordId);
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
    navigation.navigate('AddHealthRecord', { 
      petId: activePetId || '',
      recordToEdit: record 
    });
  };
  
  const handleRecordDeleted = () => {
    // Refresh the records list silently
    loadHealthData(true);
  };
  
  const handleViewMedicationDetails = async (medicationId: string) => {
    try {
      // Get the full medication from the database
      const medication = await unifiedDatabaseManager.medications.getById(medicationId);
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
    navigation.navigate('AddMedication', { 
      petId: activePetId || '',
      medicationToEdit: medication 
    });
  };
  
  const handleMedicationDeleted = () => {
    // Refresh the medications list silently
    loadHealthData(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Weight Trend Card */}
            {activePet && (
              <WeightTrendCard
                pet={activePet}
                weightRecords={weightRecords}
                onPress={() => navigation.navigate('WeightTrend', { petId: activePet.id })}
              />
            )}

            {/* Enhanced Vaccination Status Card */}
            <TouchableOpacity 
              style={[styles.enhancedVaccinationCard, { backgroundColor: colors.card }]}
              onPress={() => {
                // Navigate to records tab with vaccination filter
                setActiveTab('records');
                setRecordType('Vaccination');
              }}
            >
              <View style={styles.vaccinationCardHeader}>
                <View style={styles.vaccinationTitleSection}>
                  <View style={[styles.vaccinationMainIcon, { 
                    backgroundColor: healthSummary.nextVaccination === 'Overdue' ? '#EF444415' : 
                                   healthSummary.nextVaccination === 'Due soon' ? '#F59E0B15' : '#10B98115' 
                  }]}>
                    <Ionicons 
                      name="shield-checkmark-outline" 
                      size={28} 
                      color={healthSummary.nextVaccination === 'Overdue' ? '#EF4444' : 
                             healthSummary.nextVaccination === 'Due soon' ? '#F59E0B' : '#10B981'} 
                    />
                  </View>
                  <View style={styles.vaccinationTitleContent}>
                    <Text style={[styles.vaccinationCardTitle, { color: colors.text }]}>Vaccination Status</Text>
                    <View style={styles.vaccinationStatusRow}>
                      <View style={[styles.vaccinationStatusBadge, { 
                        backgroundColor: healthSummary.nextVaccination === 'Overdue' ? '#EF444415' : 
                                       healthSummary.nextVaccination === 'Due soon' ? '#F59E0B15' : '#10B98115' 
                      }]}>
                        <Text style={[styles.vaccinationStatusText, { 
                          color: healthSummary.nextVaccination === 'Overdue' ? '#EF4444' : 
                                 healthSummary.nextVaccination === 'Due soon' ? '#F59E0B' : '#10B981' 
                        }]}>
                          {(() => {
                            const vaccinationRecords = healthRecords.filter(r => r.type === 'vaccination');
                            if (vaccinationRecords.length === 0) return 'No records';
                            if (healthSummary.nextVaccination === 'Overdue') return 'Overdue';
                            if (healthSummary.nextVaccination === 'Due soon') return 'Due soon';
                            return 'Up to date';
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text + '60'} />
              </View>

              <View style={styles.vaccinationCardContent}>
                {(() => {
                  const vaccinationRecords = healthRecords.filter(r => r.type === 'vaccination');
                  if (vaccinationRecords.length > 0) {
                    return (
                      <>
                        <View style={styles.vaccinationInfoRow}>
                          <View style={styles.vaccinationInfoItem}>
                            <Text style={[styles.vaccinationInfoLabel, { color: colors.text + '70' }]}>
                              Latest Vaccination
                            </Text>
                                                         <Text style={[styles.enhancedVaccinationInfoValue, { color: colors.text }]}>
                               {vaccinationRecords[0].title || 'Unknown vaccine'}
                             </Text>
                             <Text style={[styles.vaccinationInfoDate, { color: colors.text + '60' }]}>
                               {vaccinationRecords[0].date}
                             </Text>
                           </View>
                           {healthSummary.nextVaccination !== 'No record' && (
                             <View style={styles.vaccinationInfoItem}>
                               <Text style={[styles.vaccinationInfoLabel, { color: colors.text + '70' }]}>
                                 Next Due
                               </Text>
                               <Text style={[styles.enhancedVaccinationInfoValue, { 
                                 color: healthSummary.nextVaccination === 'Overdue' ? '#EF4444' : colors.text 
                               }]}>
                                 {healthSummary.nextVaccination}
                               </Text>
                             </View>
                           )}
                         </View>
                         
                         <View style={styles.vaccinationProgress}>
                           <View style={styles.enhancedVaccinationProgressRow}>
                             <Text style={[styles.enhancedVaccinationProgressLabel, { color: colors.text + '70' }]}>
                               Total Vaccinations
                             </Text>
                            <Text style={[styles.vaccinationProgressCount, { color: colors.text }]}>
                              {vaccinationRecords.length}
                            </Text>
                          </View>
                          <View style={[styles.vaccinationProgressBar, { backgroundColor: colors.background }]}>
                            <View style={[styles.vaccinationProgressFill, { 
                              backgroundColor: healthSummary.nextVaccination === 'Overdue' ? '#EF4444' : 
                                             healthSummary.nextVaccination === 'Due soon' ? '#F59E0B' : '#10B981',
                              width: `${Math.min((vaccinationRecords.length / 5) * 100, 100)}%` 
                            }]} />
                          </View>
                        </View>
                      </>
                    );
                  } else {
                    return (
                      <View style={styles.vaccinationEmptyState}>
                        <Text style={[styles.vaccinationEmptyText, { color: colors.text + '60' }]}>
                          No vaccination records found
                        </Text>
                        <Text style={[styles.vaccinationEmptySubtext, { color: colors.text + '50' }]}>
                          Tap to add your first vaccination record
                        </Text>
                      </View>
                    );
                  }
                })()}
              </View>
            </TouchableOpacity>

            {/* Other Health Metrics - excluding Weight and Vaccination Status since they have dedicated cards */}
            <View style={styles.healthMetricsContainer}>
              {healthMetrics.filter(metric => metric.name !== 'Vaccination Status' && metric.name !== 'Weight').map(metric => (
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

            {/* Health Recommendations Section */}
            <View style={styles.healthRecommendationsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Recommendations</Text>
              <View style={[styles.recommendationsCard, { backgroundColor: colors.card }]}>
                {/* Weight recommendation */}
                <View style={styles.recommendationItem}>
                  <View style={[styles.recommendationIconContainer, { backgroundColor: '#4F46E520' }]}>
                    <Ionicons name="fitness-outline" size={20} color="#4F46E5" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                      {recommendations.weight.title}
                    </Text>
                    <Text style={[styles.recommendationText, { color: colors.text + '80' }]}>
                      {recommendations.weight.text}
                          </Text>
                        </View>
                      </View>

                {/* Vaccination recommendation */}
                <View style={styles.recommendationItem}>
                  <View style={[styles.recommendationIconContainer, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                    </View>
                  <View style={styles.recommendationContent}>
                    <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                      {recommendations.vaccination.title}
                    </Text>
                    <Text style={[styles.recommendationText, { color: colors.text + '80' }]}>
                      {recommendations.vaccination.text}
                    </Text>
                  </View>
                </View>

                {/* Checkup recommendation */}
                <View style={styles.recommendationItem}>
                  <View style={[styles.recommendationIconContainer, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="medkit-outline" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                      {recommendations.checkup.title}
                  </Text>
                    <Text style={[styles.recommendationText, { color: colors.text + '80' }]}>
                      {recommendations.checkup.text}
                    </Text>
                  </View>
                </View>
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
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="documents-outline" size={24} color={colors.info} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Health Records Summary</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {healthSummary.recordsSummary}
                    </Text>
                  </View>
                </View>

              </View>
            </View>

            <View style={styles.upcomingContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Health Events</Text>
              <View style={[styles.upcomingCard, { backgroundColor: colors.card }]}>
                {healthRecords.filter(record => record.followUpNeeded && record.followUpDate).length > 0 ? (
                  healthRecords
                    .filter(record => record.followUpNeeded && record.followUpDate)
                    .map(record => {
                      const followUpDate = record.followUpDate ? new Date(record.followUpDate) : new Date();
                      return (
                        <View key={record.id} style={styles.upcomingItem}>
                          <View style={[styles.upcomingIconContainer, { 
                            backgroundColor: record.type.toLowerCase() === 'vaccination' ? '#4F46E5' + '15' :
                              record.type.toLowerCase() === 'checkup' ? '#10B981' + '15' :
                              record.type.toLowerCase() === 'surgery' ? '#EF4444' + '15' :
                              record.type.toLowerCase() === 'dental' ? '#6366F1' + '15' : 
                              colors.primary + '15' 
                          }]}>
                            <Ionicons name="medkit-outline" size={24} color={
                              record.type.toLowerCase() === 'vaccination' ? '#4F46E5' :
                              record.type.toLowerCase() === 'checkup' ? '#10B981' :
                              record.type.toLowerCase() === 'surgery' ? '#EF4444' :
                              record.type.toLowerCase() === 'dental' ? '#6366F1' : 
                              colors.primary
                            } />
                  </View>
                  <View style={styles.upcomingContent}>
                            <Text style={[styles.upcomingTitle, { color: colors.text }]}>
                              {record.title || record.type}
                            </Text>
                            <Text style={[styles.upcomingDate, { color: colors.text + '80' }]}>
                              Due: {record.followUpDate ? format(followUpDate, 'MMMM d, yyyy') : 'Unknown date'}
                            </Text>
                  </View>
                          <TouchableOpacity 
                            style={[styles.upcomingButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleViewRecordDetails(record.id)}
                          >
                            <Text style={styles.upcomingButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
                      );
                    })
                ) : (
                  <View style={styles.emptyUpcomingContainer}>
                    <Ionicons name="calendar-outline" size={32} color={colors.text + '40'} />
                    <Text style={[styles.emptyUpcomingText, { color: colors.text + '80' }]}>
                      No upcoming health events
                    </Text>
                    <Text style={[styles.emptyUpcomingSubtext, { color: colors.text + '60' }]}>
                      Add follow-up dates to health records to see them here
                    </Text>
                  </View>
                )}
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
                    navigation.navigate('AddHealthRecord', { petId: activePetId });
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
                          navigation.navigate('AddHealthRecord', { petId: activePetId });
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
                  {medicationFilter === 'All' ? `Total: ${medications.length} medications` : `${medicationFilter}: ${medications.length} medications`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addMedicationButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (activePetId) {
                    navigation.navigate('AddMedication', { petId: activePetId });
                  } else {
                    alert('Please select a pet first');
                  }
                }}
              >
                <Ionicons name="add" size={22} color="white" />
                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>

            {/* Add MedicationReminders component */}
            <View style={[styles.medicationRemindersContainer, { marginBottom: 16 }]}>
              <MedicationReminders 
                petId={activePetId || undefined}
                onMedicationPress={handleViewMedicationDetails}
              />
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
                {['All', 'Active', 'Completed', 'Discontinued'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.medicationTypeChip,
                      { 
                        backgroundColor: type === medicationFilter ? colors.primary : colors.card,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setMedicationFilter(type)}
                  >
                    <Text 
                      style={[
                        styles.medicationTypeChipText, 
                        { color: type === medicationFilter ? 'white' : colors.text }
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
                  onPress={() => handleViewMedicationDetails(medication.id)}
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
                            {/* Show actual medication status instead of hardcoded "Active" */}
                            {medicationFilter === 'All' ? medication.status || 'Active' : medicationFilter}
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
                          {medication.nextDue === 'Completed' ? (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                              <Text style={[styles.medicationNextDueText, { color: colors.success }]}>
                                {medication.nextDue}
                              </Text>
                            </>
                          ) : medication.nextDue === 'Discontinued' ? (
                            <>
                              <Ionicons name="stop-circle-outline" size={14} color={colors.warning} />
                              <Text style={[styles.medicationNextDueText, { color: colors.warning }]}>
                                {medication.nextDue}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="time-outline" size={14} color={colors.text + '70'} />
                              <Text style={[styles.medicationNextDueText, { color: colors.text + '70' }]}>
                                Next dose: {medication.nextDue}
                              </Text>
                            </>
                          )}
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

  // Show loading indicator while data is being fetched
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 20, fontSize: 16 }}>
          {syncingRecords ? 'Synchronizing health records...' : 'Loading pet health data...'}
        </Text>
        {syncingRecords && (
          <Text style={{ color: colors.text + '80', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            This may take a moment if this pet was created on another device
          </Text>
        )}
      </View>
    );
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
                source={{ uri: activePet && activePet.image ? activePet.image : 'https://via.placeholder.com/150' }} 
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
  metricSecondary: {
    fontSize: 12,
    marginTop: 4,
  },
  trendContainer: {
    marginTop: 8,
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
  healthRecommendationsContainer: {
    marginBottom: 24,
  },
  recommendationsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationText: {
    fontSize: 14,
    marginTop: 4,
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
  medicationRemindersContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  emptyUpcomingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyUpcomingText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyUpcomingSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  vaccinationStatusCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  vaccinationHeader: {
    marginBottom: 16,
  },
  vaccinationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaccinationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vaccinationTitleContent: {
    flex: 1,
  },
  vaccinationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  vaccinationSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  vaccinationActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vaccinationActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  vaccinationProgress: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
  },
  recentVaccinationInfo: {
    marginBottom: 16,
  },
  recentVaccinationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentVaccinationLeft: {
    flex: 1,
  },
  recentVaccinationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentVaccinationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentVaccinationDate: {
    fontSize: 12,
    marginTop: 4,
  },
  nextVaccinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextVaccinationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextVaccinationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  vaccinationRecommendations: {
    marginBottom: 16,
  },
  recommendationsList: {
    marginBottom: 16,
  },
  priorityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
  },
  vaccinationInfo: {
    marginBottom: 16,
  },
  vaccinationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccinationDetail: {
    flex: 1,
  },
  vaccinationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  vaccinationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  vaccinationDate: {
    fontSize: 12,
    marginTop: 4,
  },
  // Enhanced Vaccination Card Styles
  enhancedVaccinationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  vaccinationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vaccinationTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vaccinationMainIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vaccinationCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  vaccinationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaccinationStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vaccinationStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vaccinationCardContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  vaccinationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vaccinationInfoItem: {
    flex: 1,
    marginRight: 12,
  },
  vaccinationInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  enhancedVaccinationInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  vaccinationInfoDate: {
    fontSize: 12,
  },
  enhancedVaccinationProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enhancedVaccinationProgressLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vaccinationProgressCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  vaccinationProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  vaccinationProgressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 12,
  },
  vaccinationEmptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  vaccinationEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  vaccinationEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Health; 