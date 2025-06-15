import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { useActivePet } from '../hooks/useActivePet';
import { useToast } from '../hooks/use-toast';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { format, subWeeks, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { unifiedDatabaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { Pet, WeightRecord } from '../types/components';
import { Input, Button, DatePicker } from '../forms';
import { usePetStore } from '../store/PetStore';

const { width } = Dimensions.get('window');

type WeightTrendScreenProps = NativeStackScreenProps<MainStackParamList, 'WeightTrend'>;

interface WeightStats {
  currentWeight: number;
  weightUnit: string;
  trend: 'up' | 'down' | 'stable';
  changeFromLast: number;
  changeFromLastPercent: number;
  averageWeeklyChange: number;
  idealWeight: { min: number; max: number };
  bmi: string;
  lastWeighed: Date | null;
}

interface ChartDataPoint {
  value: number;
  label: string;
  date: Date;
  weight: number;
  unit: string;
  notes?: string;
  frontColor?: string;
  dataPointText?: string;
  labelTextStyle?: object;
  dataPointColor?: string;
  dataPointRadius?: number;
  showDataPointLabel?: boolean;
}

const WeightTrend: React.FC<WeightTrendScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useAppColors();
  const { activePetId } = useActivePet();
  const { updatePet } = usePetStore();
  const { toast } = useToast();
  
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1week' | '1month' | '1year' | 'all'>('1week');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartDataPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Add weight form state
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [bodyConditionScore, setBodyConditionScore] = useState<number>(3);
  const [addingWeight, setAddingWeight] = useState(false);

  // Load pet and weight data
  const loadWeightData = useCallback(async () => {
    try {
      setLoading(true);
      
      let currentPetId = activePetId;
      if (!currentPetId) {
        const storedPetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        currentPetId = storedPetId;
      }

      if (!currentPetId) {
        toast({
          title: 'Error',
          description: 'No pet selected',
          type: 'error'
        });
        navigation.goBack();
        return;
      }

      // Load pet info
      const pet = await unifiedDatabaseManager.pets.getById(currentPetId);
      if (!pet) {
        toast({
          title: 'Error',
          description: 'Pet not found',
          type: 'error'
        });
        navigation.goBack();
        return;
      }
      setActivePet(pet);

      // Load weight records
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
        
        const createdRecord = await unifiedDatabaseManager.weightRecords.create(initialWeight);
        petWeightRecords.push(createdRecord);
      }

      setWeightRecords(petWeightRecords);

      // Calculate weight statistics
      const stats = calculateWeightStats(petWeightRecords, pet);
      setWeightStats(stats);

    } catch (error) {
      console.error('Error loading weight data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weight data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [activePetId, navigation]);

  useEffect(() => {
    loadWeightData();
  }, [loadWeightData]);

  // Calculate weight statistics
  const calculateWeightStats = (records: WeightRecord[], pet: Pet): WeightStats => {
    if (records.length === 0) {
      return {
        currentWeight: pet.weight,
        weightUnit: pet.weightUnit,
        trend: 'stable',
        changeFromLast: 0,
        changeFromLastPercent: 0,
        averageWeeklyChange: 0,
        idealWeight: getIdealWeightRange(pet),
        bmi: 'Normal',
        lastWeighed: null
      };
    }

    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const currentWeight = sortedRecords[0].weight;
    const lastWeighed = new Date(sortedRecords[0].date);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changeFromLast = 0;
    let changeFromLastPercent = 0;

    if (sortedRecords.length >= 2) {
      const previousWeight = sortedRecords[1].weight;
      changeFromLast = currentWeight - previousWeight;
      changeFromLastPercent = (changeFromLast / previousWeight) * 100;

      if (Math.abs(changeFromLast) < 0.1) {
        trend = 'stable';
      } else if (changeFromLast > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }
    }

    // Calculate average weekly change over the last 8 weeks
    const eightWeeksAgo = subWeeks(new Date(), 8);
    const recentRecords = sortedRecords.filter(record => 
      new Date(record.date) >= eightWeeksAgo
    );

    let averageWeeklyChange = 0;
    if (recentRecords.length >= 2) {
      const oldestRecent = recentRecords[recentRecords.length - 1];
      const newestRecent = recentRecords[0];
      const weightDifference = newestRecent.weight - oldestRecent.weight;
      const timeDifference = new Date(newestRecent.date).getTime() - new Date(oldestRecent.date).getTime();
      const weeksDifference = timeDifference / (7 * 24 * 60 * 60 * 1000);
      
      if (weeksDifference > 0) {
        averageWeeklyChange = weightDifference / weeksDifference;
      }
    }

    const idealWeight = getIdealWeightRange(pet);
    const bmi = getBMIStatus(currentWeight, idealWeight);

    return {
      currentWeight,
      weightUnit: pet.weightUnit,
      trend,
      changeFromLast,
      changeFromLastPercent,
      averageWeeklyChange,
      idealWeight,
      bmi,
      lastWeighed
    };
  };

  // Get ideal weight range based on pet type, breed, and age
  const getIdealWeightRange = (pet: Pet): { min: number; max: number } => {
    const currentAge = pet.birthDate ? 
      Math.floor((new Date().getTime() - new Date(pet.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
      1; // Default to 1 year if no birth date

    if (pet.type === 'dog') {
      return getDogIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else if (pet.type === 'cat') {
      return getCatIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else if (pet.type === 'bird') {
      return getBirdIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else if (pet.type === 'rabbit') {
      return getRabbitIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else if (pet.type === 'fish') {
      return getFishIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else if (pet.type === 'reptile') {
      return getReptileIdealWeight(pet.breed, currentAge, pet.size, pet.gender);
    } else {
      return getOtherPetIdealWeight(pet.breed, currentAge, pet.size, pet.weight, pet.gender);
    }
  };

  // Dog breed and age-specific weight ranges (in kg)
  const getDogIdealWeight = (breed: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const breedLower = breed.toLowerCase();
    
    // Age adjustment factors
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 0.5) { // Puppy (0-6 months)
        return { min: minAdult * 0.2, max: maxAdult * 0.3 };
      } else if (age < 1) { // Young dog (6-12 months)
        return { min: minAdult * 0.7, max: maxAdult * 0.8 };
      } else if (age <= 7) { // Adult dog (1-7 years)
        return { min: minAdult, max: maxAdult };
      } else { // Senior dog (7+ years)
        return { min: minAdult * 0.95, max: maxAdult * 1.05 };
      }
    };

    // Gender adjustment factors - males are typically 10-20% heavier than females
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.05, max: maxWeight * 1.15 }; // Males 5-15% heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.85, max: maxWeight * 0.95 }; // Females 5-15% lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 1, max: 2.5 },     // Under 5 lbs (1-2.5 kg)
        'small': { min: 2.5, max: 11 },  // 5-25 lbs (2.5-11 kg)
        'medium': { min: 11, max: 27 },  // 25-60 lbs (11-27 kg)
        'large': { min: 27, max: 41 },   // 60-90 lbs (27-41 kg)
        'giant': { min: 41, max: 70 },   // Over 90 lbs (41+ kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 11, max: 27 }; // Default to medium
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Toy breeds (1-4 kg)
    if (breedLower.includes('chihuahua')) return getAgeAdjustment(1.5, 3);
    if (breedLower.includes('pomeranian')) return getAgeAdjustment(1.9, 3.5);
    if (breedLower.includes('yorkie') || breedLower.includes('yorkshire')) return getAgeAdjustment(2, 3.2);
    if (breedLower.includes('maltese')) return getAgeAdjustment(2, 4);

    // Small breeds (4-10 kg)
    if (breedLower.includes('pug')) return getAgeAdjustment(6, 8);
    if (breedLower.includes('beagle')) return getAgeAdjustment(8, 14);
    if (breedLower.includes('dachshund')) return getAgeAdjustment(7, 15);
    if (breedLower.includes('shih tzu')) return getAgeAdjustment(4, 7.5);
    if (breedLower.includes('boston terrier')) return getAgeAdjustment(5, 11);

    // Medium breeds (10-25 kg)
    if (breedLower.includes('cocker spaniel')) return getAgeAdjustment(12, 16);
    if (breedLower.includes('border collie')) return getAgeAdjustment(14, 20);
    if (breedLower.includes('australian shepherd')) return getAgeAdjustment(16, 32);
    if (breedLower.includes('bulldog')) return getAgeAdjustment(18, 25);
    if (breedLower.includes('siberian husky')) return getAgeAdjustment(16, 27);

    // Large breeds (25-45 kg)
    if (breedLower.includes('labrador')) return getAgeAdjustment(25, 36);
    if (breedLower.includes('golden retriever')) return getAgeAdjustment(25, 34);
    if (breedLower.includes('german shepherd')) return getAgeAdjustment(22, 40);
    if (breedLower.includes('rottweiler')) return getAgeAdjustment(35, 60);
    if (breedLower.includes('boxer')) return getAgeAdjustment(25, 32);

    // Giant breeds (45+ kg)
    if (breedLower.includes('great dane')) return getAgeAdjustment(45, 90);
    if (breedLower.includes('saint bernard')) return getAgeAdjustment(54, 82);
    if (breedLower.includes('mastiff')) return getAgeAdjustment(54, 113);

    // Default medium dog if breed not recognized
    return getAgeAdjustment(12, 25);
  };

  // Cat breed and age-specific weight ranges (in kg)
  const getCatIdealWeight = (breed: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const breedLower = breed.toLowerCase();
    
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 0.5) { // Kitten (0-6 months)
        return { min: minAdult * 0.15, max: maxAdult * 0.25 };
      } else if (age < 1) { // Young cat (6-12 months)
        return { min: minAdult * 0.7, max: maxAdult * 0.85 };
      } else if (age <= 10) { // Adult cat (1-10 years)
        return { min: minAdult, max: maxAdult };
      } else { // Senior cat (10+ years)
        return { min: minAdult * 0.9, max: maxAdult * 1.1 };
      }
    };

    // Gender adjustment factors - male cats are typically 15-25% heavier than females
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.1, max: maxWeight * 1.2 }; // Males 10-20% heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.8, max: maxWeight * 0.9 }; // Females 10-20% lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 2, max: 3.5 },     // Small cat breeds (2-3.5 kg)
        'small': { min: 2.5, max: 4.5 },  // Small-medium cat breeds (2.5-4.5 kg)
        'medium': { min: 3.5, max: 5.5 }, // Average domestic cats (3.5-5.5 kg)
        'large': { min: 4.5, max: 8 },    // Large cat breeds (4.5-8 kg)
        'giant': { min: 6, max: 11 },     // Giant cat breeds like Savannah (6-11 kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 3.5, max: 5.5 }; // Default to medium
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to breed-specific matching if no size provided
    // Small cat breeds
    if (breedLower.includes('singapura')) return getAgeAdjustment(2, 3);
    if (breedLower.includes('devon rex')) return getAgeAdjustment(2.3, 4.5);
    if (breedLower.includes('cornish rex')) return getAgeAdjustment(2.7, 4.5);

    // Medium cat breeds
    if (breedLower.includes('persian')) return getAgeAdjustment(3.2, 5.5);
    if (breedLower.includes('british shorthair')) return getAgeAdjustment(3.2, 5.5);
    if (breedLower.includes('siamese')) return getAgeAdjustment(2.5, 4.5);
    if (breedLower.includes('russian blue')) return getAgeAdjustment(3, 5.5);

    // Large cat breeds
    if (breedLower.includes('maine coon')) return getAgeAdjustment(4.5, 8.2);
    if (breedLower.includes('ragdoll')) return getAgeAdjustment(4.5, 9);
    if (breedLower.includes('norwegian forest')) return getAgeAdjustment(4, 7.5);
    if (breedLower.includes('savannah')) return getAgeAdjustment(5.5, 11);

    // Default domestic cat
    return getAgeAdjustment(3.5, 5.5);
  };

  // Bird species and age-specific weight ranges (in grams)
  const getBirdIdealWeight = (species: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const speciesLower = species.toLowerCase();
    
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 0.25) { // Chick (0-3 months)
        return { min: minAdult * 0.1, max: maxAdult * 0.3 };
      } else if (age < 1) { // Juvenile (3-12 months)
        return { min: minAdult * 0.8, max: maxAdult * 0.9 };
      } else { // Adult
        return { min: minAdult, max: maxAdult };
      }
    };

    // Gender adjustment factors - male birds are often slightly larger than females
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.05, max: maxWeight * 1.1 }; // Males 5-10% heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.9, max: maxWeight * 0.95 }; // Females 5-10% lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide (in grams)
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 10, max: 50 },     // Very small birds like finches (10-50g)
        'small': { min: 25, max: 120 },   // Small birds like budgies, cockatiels (25-120g)
        'medium': { min: 120, max: 500 }, // Medium birds like conures (120-500g)
        'large': { min: 400, max: 1000 }, // Large birds like African Grey (400-1000g)
        'giant': { min: 800, max: 2000 }, // Giant birds like macaws (800-2000g)
      };
      
      const baseRange = sizeWeights[size] || { min: 25, max: 120 }; // Default to small
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to species-specific matching if no size provided
    // Small birds (10-100g)
    if (speciesLower.includes('canary')) return getAgeAdjustment(15, 25);
    if (speciesLower.includes('finch')) return getAgeAdjustment(10, 20);
    if (speciesLower.includes('budgie') || speciesLower.includes('parakeet')) return getAgeAdjustment(25, 45);

    // Medium birds (100-500g)
    if (speciesLower.includes('cockatiel')) return getAgeAdjustment(80, 120);
    if (speciesLower.includes('lovebird')) return getAgeAdjustment(45, 65);
    if (speciesLower.includes('conure')) return getAgeAdjustment(90, 150);

    // Large birds (500g+)
    if (speciesLower.includes('african grey')) return getAgeAdjustment(400, 550);
    if (speciesLower.includes('macaw')) return getAgeAdjustment(900, 1500);
    if (speciesLower.includes('cockatoo')) return getAgeAdjustment(300, 800);

    // Default small bird
    return getAgeAdjustment(20, 50);
  };

  // Rabbit breed and age-specific weight ranges (in kg)
  const getRabbitIdealWeight = (breed: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const breedLower = breed.toLowerCase();
    
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 0.5) { // Baby rabbit (0-6 months)
        return { min: minAdult * 0.2, max: maxAdult * 0.4 };
      } else if (age < 1) { // Young rabbit (6-12 months)
        return { min: minAdult * 0.8, max: maxAdult * 0.9 };
      } else { // Adult
        return { min: minAdult, max: maxAdult };
      }
    };

    // Gender adjustment factors - male rabbits (bucks) are often larger than females (does)
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.05, max: maxWeight * 1.15 }; // Males 5-15% heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.85, max: maxWeight * 0.95 }; // Females 5-15% lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 0.5, max: 1.5 },   // Dwarf rabbits (0.5-1.5 kg)
        'small': { min: 1.2, max: 2.5 },  // Small rabbits (1.2-2.5 kg)
        'medium': { min: 2, max: 4.5 },   // Medium rabbits (2-4.5 kg)
        'large': { min: 4, max: 7 },      // Large rabbits (4-7 kg)
        'giant': { min: 6, max: 12 },     // Giant rabbits like Flemish Giant (6-12 kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 2, max: 4.5 }; // Default to medium
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to breed-specific matching if no size provided
    // Small breeds
    if (breedLower.includes('netherland dwarf')) return getAgeAdjustment(0.5, 1.1);
    if (breedLower.includes('holland lop')) return getAgeAdjustment(1.1, 1.8);
    if (breedLower.includes('mini rex')) return getAgeAdjustment(1.4, 2);

    // Medium breeds
    if (breedLower.includes('dutch')) return getAgeAdjustment(1.8, 2.5);
    if (breedLower.includes('rex')) return getAgeAdjustment(3.2, 4.8);
    if (breedLower.includes('english angora')) return getAgeAdjustment(2.3, 3.4);

    // Large breeds
    if (breedLower.includes('new zealand')) return getAgeAdjustment(4, 5.4);
    if (breedLower.includes('flemish giant')) return getAgeAdjustment(6.8, 10);
    if (breedLower.includes('french lop')) return getAgeAdjustment(4.5, 6.8);

    // Default medium rabbit
    return getAgeAdjustment(2, 4);
  };

  // Fish species and age-specific weight ranges (in grams)
  const getFishIdealWeight = (species: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const speciesLower = species.toLowerCase();
    
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 1) { // Juvenile
        return { min: minAdult * 0.3, max: maxAdult * 0.5 };
      } else { // Adult
        return { min: minAdult, max: maxAdult };
      }
    };

    // Gender adjustment factors - varies by species, generally minimal difference
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.02, max: maxWeight * 1.05 }; // Males slightly heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.95, max: maxWeight * 0.98 }; // Females slightly lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide (in grams)
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 0.3, max: 2 },     // Tiny fish like neon tetras (0.3-2g)
        'small': { min: 1, max: 15 },     // Small fish like bettas (1-15g)
        'medium': { min: 10, max: 100 },  // Medium fish like angelfish (10-100g)
        'large': { min: 50, max: 1000 },  // Large fish like goldfish (50-1000g)
        'giant': { min: 500, max: 15000 }, // Giant fish like koi (500g-15kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 1, max: 15 }; // Default to small
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to species-specific matching if no size provided
    // Small fish (1-10g)
    if (speciesLower.includes('betta')) return getAgeAdjustment(2, 5);
    if (speciesLower.includes('guppy')) return getAgeAdjustment(0.5, 1.5);
    if (speciesLower.includes('neon tetra')) return getAgeAdjustment(0.3, 0.8);

    // Medium fish (10-100g)
    if (speciesLower.includes('angelfish')) return getAgeAdjustment(15, 45);
    if (speciesLower.includes('discus')) return getAgeAdjustment(50, 150);
    if (speciesLower.includes('cichlid')) return getAgeAdjustment(20, 80);

    // Large fish (100g+)
    if (speciesLower.includes('goldfish')) return getAgeAdjustment(100, 500);
    if (speciesLower.includes('koi')) return getAgeAdjustment(2000, 10000);
    if (speciesLower.includes('oscar')) return getAgeAdjustment(300, 1500);

    // Default small fish
    return getAgeAdjustment(2, 10);
  };

  // Reptile species and age-specific weight ranges (in grams)
  const getReptileIdealWeight = (species: string, age: number, size?: string, gender?: string): { min: number; max: number } => {
    const speciesLower = species.toLowerCase();
    
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 1) { // Juvenile
        return { min: minAdult * 0.1, max: maxAdult * 0.3 };
      } else if (age < 3) { // Sub-adult
        return { min: minAdult * 0.7, max: maxAdult * 0.8 };
      } else { // Adult
        return { min: minAdult, max: maxAdult };
      }
    };

    // Gender adjustment factors - varies significantly by species
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.05, max: maxWeight * 1.15 }; // Males often larger
      } else if (gender === 'female') {
        return { min: minWeight * 0.85, max: maxWeight * 0.95 }; // Females often smaller
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide (in grams)
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 3, max: 50 },      // Tiny reptiles like anoles (3-50g)
        'small': { min: 40, max: 300 },   // Small reptiles like geckos (40-300g)
        'medium': { min: 200, max: 1000 }, // Medium reptiles like bearded dragons (200g-1kg)
        'large': { min: 800, max: 5000 }, // Large reptiles like iguanas (0.8-5kg)
        'giant': { min: 3000, max: 20000 }, // Giant reptiles like large monitors (3-20kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 200, max: 1000 }; // Default to medium
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to species-specific matching if no size provided
    // Small reptiles
    if (speciesLower.includes('gecko')) return getAgeAdjustment(40, 120);
    if (speciesLower.includes('anole')) return getAgeAdjustment(3, 8);
    if (speciesLower.includes('chameleon')) return getAgeAdjustment(100, 300);

    // Medium reptiles
    if (speciesLower.includes('bearded dragon')) return getAgeAdjustment(300, 600);
    if (speciesLower.includes('blue tongue skink')) return getAgeAdjustment(350, 600);
    if (speciesLower.includes('corn snake')) return getAgeAdjustment(400, 900);

    // Large reptiles
    if (speciesLower.includes('ball python')) return getAgeAdjustment(1200, 2500);
    if (speciesLower.includes('iguana')) return getAgeAdjustment(4000, 8000);
    if (speciesLower.includes('monitor')) return getAgeAdjustment(2000, 15000);

    // Turtles/Tortoises
    if (speciesLower.includes('turtle') || speciesLower.includes('tortoise')) {
      if (speciesLower.includes('russian')) return getAgeAdjustment(1500, 2500);
      if (speciesLower.includes('red-eared slider')) return getAgeAdjustment(2000, 3000);
      return getAgeAdjustment(1000, 5000);
    }

    // Default small reptile
    return getAgeAdjustment(50, 200);
  };

  // Other pet types weight ranges
  const getOtherPetIdealWeight = (breed: string, age: number, size?: string, currentWeight?: number, gender?: string): { min: number; max: number } => {
    const getAgeAdjustment = (minAdult: number, maxAdult: number) => {
      if (age < 1) {
        return { min: minAdult * 0.6, max: maxAdult * 0.8 };
      } else if (age > 10) {
        return { min: minAdult * 0.95, max: maxAdult * 1.1 };
      } else {
        return { min: minAdult, max: maxAdult };
      }
    };

    // Gender adjustment factors - general assumption for other pets
    const getGenderAdjustment = (minWeight: number, maxWeight: number) => {
      if (gender === 'male') {
        return { min: minWeight * 1.05, max: maxWeight * 1.1 }; // Males slightly heavier
      } else if (gender === 'female') {
        return { min: minWeight * 0.9, max: maxWeight * 0.95 }; // Females slightly lighter
      } else {
        return { min: minWeight, max: maxWeight }; // Unknown gender - use average
      }
    };

    // If size is provided, use size-based weight ranges as primary guide
    if (size) {
      const sizeWeights: Record<string, { min: number; max: number }> = {
        'tiny': { min: 0.1, max: 1 },     // Very small pets (0.1-1 kg)
        'small': { min: 0.5, max: 3 },    // Small pets (0.5-3 kg)
        'medium': { min: 2, max: 8 },     // Medium pets (2-8 kg)
        'large': { min: 5, max: 20 },     // Large pets (5-20 kg)
        'giant': { min: 15, max: 50 },    // Giant pets (15-50 kg)
      };
      
      const baseRange = sizeWeights[size] || { min: 2, max: 8 }; // Default to medium
      const genderAdjusted = getGenderAdjustment(baseRange.min, baseRange.max);
      return getAgeAdjustment(genderAdjusted.min, genderAdjusted.max);
    }

    // Fallback to current weight-based calculation if no size provided
    const baseWeight = currentWeight || 5; // Default 5kg if no current weight
    const ageFactor = age < 1 ? 0.7 : age > 10 ? 1.1 : 1.0;
    const genderFactor = gender === 'male' ? 1.05 : gender === 'female' ? 0.95 : 1.0;
    return { 
      min: baseWeight * 0.85 * ageFactor * genderFactor, 
      max: baseWeight * 1.15 * ageFactor * genderFactor 
    };
  };

  // Get BMI status with detailed health assessment
  const getBMIStatus = (weight: number, idealRange: { min: number; max: number }): string => {
    const weightRatio = weight / ((idealRange.min + idealRange.max) / 2);
    
    if (weight < idealRange.min * 0.8) {
      return 'Severely Underweight';
    } else if (weight < idealRange.min * 0.9) {
      return 'Underweight';
    } else if (weight < idealRange.min) {
      return 'Slightly Underweight';
    } else if (weight <= idealRange.max) {
      return 'Ideal Weight';
    } else if (weight <= idealRange.max * 1.1) {
      return 'Slightly Overweight';
    } else if (weight <= idealRange.max * 1.2) {
      return 'Overweight';
    } else {
      return 'Severely Overweight';
    }
  };

  // Get health recommendations based on weight status
  const getHealthRecommendations = (pet: Pet, weightStats: WeightStats): string[] => {
    const recommendations: string[] = [];
    const currentAge = pet.birthDate ? 
      Math.floor((new Date().getTime() - new Date(pet.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
      1;

    // Size and gender-specific recommendations
    const getSizeAndGenderSpecificAdvice = () => {
      const advice: string[] = [];
      
      // Gender-specific advice
      if (pet.gender === 'male') {
        if (pet.type === 'dog' || pet.type === 'cat') {
          advice.push("Male pets typically have higher caloric needs than females");
          if (!pet.neutered) {
            advice.push("Intact males may have higher activity levels affecting weight");
          }
        }
      } else if (pet.gender === 'female') {
        if (pet.type === 'dog' || pet.type === 'cat') {
          advice.push("Female pets often require 10-15% fewer calories than males");
          if (!pet.neutered) {
            advice.push("Intact females may experience weight fluctuations during heat cycles");
          }
        }
      }
      
      // Size-specific advice
      if (!pet.size) return advice;
      
      switch (pet.size) {
        case 'tiny':
          if (pet.type === 'dog') {
            advice.push("Tiny breeds need frequent small meals to prevent hypoglycemia");
            advice.push("Monitor for cold sensitivity during weight loss");
          } else if (pet.type === 'cat') {
            advice.push("Small cats may need multiple feeding stations");
          } else if (pet.type === 'bird') {
            advice.push("Small birds need consistent weight monitoring - even small changes matter");
          }
          break;
          
        case 'small':
          if (pet.type === 'dog') {
            advice.push("Small breeds often have faster metabolisms");
          } else if (pet.type === 'rabbit') {
            advice.push("Dwarf rabbits need carefully measured pellet portions");
          }
          break;
          
        case 'medium':
          advice.push("Standard feeding guidelines typically apply well");
          break;
          
        case 'large':
          if (pet.type === 'dog') {
            advice.push("Large breeds benefit from controlled exercise during growth");
            advice.push("Monitor for joint stress with excess weight");
          } else if (pet.type === 'cat') {
            advice.push("Large cat breeds may need elevated feeding stations");
          }
          break;
          
        case 'giant':
          if (pet.type === 'dog') {
            advice.push("Giant breeds need slow, controlled growth to prevent joint issues");
            advice.push("Avoid overfeeding during puppyhood - slower growth is healthier");
          } else if (pet.type === 'rabbit') {
            advice.push("Giant rabbit breeds need plenty of space for exercise");
          }
          break;
      }
      
      return advice;
    };

    // Add size and gender-specific recommendations
    recommendations.push(...getSizeAndGenderSpecificAdvice());

    // Age-based recommendations
    if (currentAge < 1) {
      if (pet.size === 'giant') {
        recommendations.push("Growing giant breeds need careful nutrition to prevent rapid weight gain");
      } else {
        recommendations.push("Growing pets need nutrient-rich food for healthy development");
      }
      if (weightStats.trend === 'down') {
        recommendations.push("Consult vet if weight loss continues during growth period");
      }
    } else if (currentAge > 7 && pet.type === 'dog') {
      recommendations.push("Senior pets may need adjusted portion sizes");
      recommendations.push("Regular weight monitoring is crucial for aging pets");
    } else if (currentAge > 10 && pet.type === 'cat') {
      recommendations.push("Senior cats may experience metabolism changes");
    }

    // Weight status recommendations with size context
    if (weightStats.bmi.includes('Underweight')) {
      if (pet.size === 'tiny') {
        recommendations.push("Small weight losses can be dangerous for tiny breeds");
      }
      recommendations.push("Consider increasing food portions or frequency");
      recommendations.push("Rule out underlying health issues with vet checkup");
    } else if (weightStats.bmi.includes('Overweight')) {
      if (pet.size === 'large' || pet.size === 'giant') {
        recommendations.push("Extra weight puts significant stress on large breed joints");
      }
      recommendations.push("Reduce food portions and increase exercise");
      recommendations.push("Switch to weight management food if recommended by vet");
    } else if (weightStats.bmi === 'Ideal Weight') {
      recommendations.push(`Great job! Maintain current diet and exercise routine for your ${pet.size || 'medium'} ${pet.type}`);
    }

    // Trend-based recommendations with size adjustments
    const significantChange = pet.size === 'tiny' ? 0.05 : pet.size === 'giant' ? 0.2 : 0.1;
    if (Math.abs(weightStats.averageWeeklyChange) > significantChange) {
      if (weightStats.trend === 'up') {
        recommendations.push("Monitor portion sizes to prevent rapid weight gain");
      } else {
        recommendations.push("Track appetite and energy levels during weight loss");
      }
    }

    return recommendations;
  };

  // Get chart data based on selected time range
  const getChartData = (): ChartDataPoint[] => {
    if (weightRecords.length === 0) {
      return [];
    }

    let filteredRecords = [...weightRecords];
    
    // First, find the most recent record date
    const sortedRecords = [...weightRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const mostRecentRecordDate = new Date(sortedRecords[0].date);

    switch (selectedTimeRange) {
      case '1week':
        // Show last 7 days from most recent record
        const oneWeekBack = subWeeks(mostRecentRecordDate, 1);
        filteredRecords = weightRecords.filter(record => 
          new Date(record.date) >= oneWeekBack && new Date(record.date) <= mostRecentRecordDate
        );
        break;
      case '1month':
        // Show last 4 weeks (1 month) from most recent record
        const oneMonthBack = subWeeks(mostRecentRecordDate, 4);
        filteredRecords = weightRecords.filter(record => 
          new Date(record.date) >= oneMonthBack && new Date(record.date) <= mostRecentRecordDate
        );
        break;
      case '1year':
        // Show last 12 months (1 year) from most recent record
        const oneYearBack = subWeeks(mostRecentRecordDate, 52);
        filteredRecords = weightRecords.filter(record => 
          new Date(record.date) >= oneYearBack && new Date(record.date) <= mostRecentRecordDate
        );
        break;
      case 'all':
      default:
        // Use all records - no filtering
        filteredRecords = [...weightRecords];
        break;
    }

    if (filteredRecords.length === 0) {
      return [];
    }

    // Sort by date
    filteredRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Aggregate data based on time range requirements
    let aggregatedData: ChartDataPoint[] = [];

    if (selectedTimeRange === '1week') {
      // For 1 week: Show individual daily records (no aggregation needed)
      aggregatedData = filteredRecords.map((record, index) => {
        const recordDate = new Date(record.date);
        const isLatest = index === filteredRecords.length - 1;
        
        return {
          value: record.weight,
          label: format(recordDate, 'EEE dd'), // Mon 15, Tue 16, etc.
          date: recordDate,
          weight: record.weight,
          unit: record.unit,
          notes: record.notes,
          dataPointText: `${record.weight}`,
          dataPointColor: colors.primary,
          dataPointRadius: isLatest ? 6 : 4,
          showDataPointLabel: isLatest,
          labelTextStyle: {
            color: colors.text,
            fontSize: 10,
            fontWeight: '500',
          },
          frontColor: colors.primary,
        };
      });
    } else if (selectedTimeRange === '1month') {
      // For 1 month: Show weekly averages for 4 weeks from most recent record
      aggregatedData = aggregateByWeekFromRecent(filteredRecords, mostRecentRecordDate);
    } else if (selectedTimeRange === '1year') {
      // For 1 year: Show monthly averages for 12 months from most recent record
      aggregatedData = aggregateByMonthFromRecent(filteredRecords, mostRecentRecordDate);
    } else if (selectedTimeRange === 'all') {
      // For all: Group by month from first record to current month
      aggregatedData = aggregateByMonthFromStart(filteredRecords);
    }

    return aggregatedData;
  };

  // Helper function to aggregate weight records by week from most recent record backwards
  const aggregateByWeekFromRecent = (records: WeightRecord[], mostRecentDate: Date): ChartDataPoint[] => {
    const weekGroups = new Map<string, WeightRecord[]>();
    
    // Generate 4 weeks back from most recent record date
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(mostRecentDate, i), { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      weekGroups.set(weekKey, []);
    }

    // Group records by week
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const weekStart = startOfWeek(recordDate, { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (weekGroups.has(weekKey)) {
        weekGroups.get(weekKey)!.push(record);
      }
    });

    const aggregatedData: ChartDataPoint[] = [];
    const sortedWeeks = Array.from(weekGroups.keys()).sort();

    sortedWeeks.forEach((weekKey, index) => {
      const weekRecords = weekGroups.get(weekKey)!;
      const weekStart = new Date(weekKey);
      
      if (weekRecords.length > 0) {
        // Calculate average weight for the week
        const avgWeight = weekRecords.reduce((sum, record) => sum + record.weight, 0) / weekRecords.length;
        
        // Use the most recent record's unit and notes from that week
        const mostRecentRecord = weekRecords[weekRecords.length - 1];
        const isLatest = index === sortedWeeks.length - 1;
        
        aggregatedData.push({
          value: parseFloat(avgWeight.toFixed(1)),
          label: format(weekStart, 'MMM dd'),
          date: weekStart,
          weight: parseFloat(avgWeight.toFixed(1)),
          unit: mostRecentRecord.unit,
          notes: weekRecords.length > 1 ? `${weekRecords.length} measurements this week` : mostRecentRecord.notes,
          dataPointText: `${avgWeight.toFixed(1)}`,
          dataPointColor: colors.primary,
          dataPointRadius: isLatest ? 6 : 4,
          showDataPointLabel: isLatest,
          labelTextStyle: {
            color: colors.text,
            fontSize: 10,
            fontWeight: '500',
          },
          frontColor: colors.primary,
        });
      }
    });

    return aggregatedData;
  };

  // Helper function to aggregate weight records by month from most recent record backwards
  const aggregateByMonthFromRecent = (records: WeightRecord[], mostRecentDate: Date): ChartDataPoint[] => {
    const monthGroups = new Map<string, WeightRecord[]>();
    
    // Generate exactly 12 months back from most recent record date
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth() - i, 1);
      const monthKey = format(monthDate, 'yyyy-MM');
      monthGroups.set(monthKey, []);
    }

    // Group records by month
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const monthKey = format(recordDate, 'yyyy-MM');
      
      if (monthGroups.has(monthKey)) {
        monthGroups.get(monthKey)!.push(record);
      }
    });

    const aggregatedData: ChartDataPoint[] = [];
    const sortedMonths = Array.from(monthGroups.keys()).sort();

    sortedMonths.forEach((monthKey, index) => {
      const monthRecords = monthGroups.get(monthKey)!;
      const monthStart = new Date(monthKey + '-01');
      
      if (monthRecords.length > 0) {
        // Calculate average weight for the month
        const avgWeight = monthRecords.reduce((sum, record) => sum + record.weight, 0) / monthRecords.length;
        
        // Use the most recent record's unit and notes from that month
        const mostRecentRecord = monthRecords[monthRecords.length - 1];
        const isLatest = index === sortedMonths.length - 1;
        
        aggregatedData.push({
          value: parseFloat(avgWeight.toFixed(1)),
          label: format(monthStart, 'MMM yy'),
          date: monthStart,
          weight: parseFloat(avgWeight.toFixed(1)),
          unit: mostRecentRecord.unit,
          notes: monthRecords.length > 1 ? `${monthRecords.length} measurements this month` : mostRecentRecord.notes,
          dataPointText: `${avgWeight.toFixed(1)}`,
          dataPointColor: colors.primary,
          dataPointRadius: isLatest ? 6 : 4,
          showDataPointLabel: isLatest,
          labelTextStyle: {
            color: colors.text,
            fontSize: 10,
            fontWeight: '500',
          },
          frontColor: colors.primary,
        });
      }
    });

    return aggregatedData;
  };

  // Helper function to aggregate weight records by month from start to current month
  const aggregateByMonthFromStart = (records: WeightRecord[]): ChartDataPoint[] => {
    if (records.length === 0) return [];
    
    const monthGroups = new Map<string, WeightRecord[]>();
    
    // Find the earliest record date
    const sortedByDate = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstRecordDate = new Date(sortedByDate[0].date);
    const currentDate = new Date();
    
    // Generate all months from first record to current month
    const startMonth = new Date(firstRecordDate.getFullYear(), firstRecordDate.getMonth(), 1);
    const endMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Initialize month groups for all months in range
    let currentMonth = new Date(startMonth);
    while (currentMonth <= endMonth) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      monthGroups.set(monthKey, []);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Group records by month
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const monthKey = format(recordDate, 'yyyy-MM');
      
      if (monthGroups.has(monthKey)) {
        monthGroups.get(monthKey)!.push(record);
      }
    });

    const aggregatedData: ChartDataPoint[] = [];
    const sortedMonths = Array.from(monthGroups.keys()).sort();

    sortedMonths.forEach((monthKey, index) => {
      const monthRecords = monthGroups.get(monthKey)!;
      const monthStart = new Date(monthKey + '-01');
      
      if (monthRecords.length > 0) {
        // Calculate average weight for the month
        const avgWeight = monthRecords.reduce((sum, record) => sum + record.weight, 0) / monthRecords.length;
        
        // Use the most recent record's unit and notes from that month
        const mostRecentRecord = monthRecords[monthRecords.length - 1];
        const isLatest = index === sortedMonths.length - 1;
        
        aggregatedData.push({
          value: parseFloat(avgWeight.toFixed(1)),
          label: format(monthStart, 'MMM yy'),
          date: monthStart,
          weight: parseFloat(avgWeight.toFixed(1)),
          unit: mostRecentRecord.unit,
          notes: monthRecords.length > 1 ? `${monthRecords.length} measurements this month` : mostRecentRecord.notes,
          dataPointText: `${avgWeight.toFixed(1)}`,
          dataPointColor: colors.primary,
          dataPointRadius: isLatest ? 6 : 4,
          showDataPointLabel: isLatest,
          labelTextStyle: {
            color: colors.text,
            fontSize: 10,
            fontWeight: '500',
          },
          frontColor: colors.primary,
        });
      } else {
        // For months with no data, we might want to show a gap or interpolate
        // For now, we'll skip empty months to keep the chart clean
      }
    });

    return aggregatedData;
  };

  // Add new weight record
  const handleAddWeight = async () => {
    if (!newWeight || !activePet) {
      toast({
        title: 'Error',
        description: 'Please enter a valid weight',
        type: 'error'
      });
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid weight',
        type: 'error'
      });
      return;
    }

    try {
      setAddingWeight(true);

      const newRecord: Omit<WeightRecord, 'id'> = {
        petId: activePet.id,
        date: newDate,
        weight,
        unit: activePet.weightUnit,
        notes: notes.trim() || undefined,
        bodyConditionScore
      };

      await unifiedDatabaseManager.weightRecords.create(newRecord);

      // Update only the weight field in the pet's profile to avoid validation issues with other fields
      await unifiedDatabaseManager.pets.update(activePet.id, { 
        weight: weight
      });
      
      // Update the pet store to propagate changes to other pages
      const updatedPet = { ...activePet, weight };
      updatePet(updatedPet);
      setActivePet(updatedPet);

      // Reload data
      await loadWeightData();

      // Reset form
      setNewWeight('');
      setNewDate(new Date());
      setNotes('');
      setBodyConditionScore(3);
      setShowAddWeight(false);

      toast({
        title: 'Success',
        description: 'Weight record added successfully!',
        type: 'success'
      });

    } catch (error) {
      console.error('Error adding weight record:', error);
      toast({
        title: 'Error',
        description: 'Failed to add weight record',
        type: 'error'
      });
    } finally {
      setAddingWeight(false);
    }
  };

  // Check if user can add weight this week
  const canAddWeightToday = (): boolean => {
    if (weightRecords.length === 0) {
      console.log('✅ No weight records found, allowing weight entry');
      return true;
    }

    // Get today's date in UTC to match database timestamps
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    console.log('🔍 Weight Check Debug (UTC):', {
      now: now.toISOString(),
      todayUTC: todayUTC.toISOString(),
      tomorrowUTC: tomorrowUTC.toISOString(),
      totalRecords: weightRecords.length,
      recordDates: weightRecords.map(r => r.date)
    });

    const todayRecords = weightRecords.filter(record => {
      const recordDate = new Date(record.date);
      const isToday = recordDate >= todayUTC && recordDate < tomorrowUTC;
      console.log(`📅 Record ${record.id}: ${recordDate.toISOString()} - isToday: ${isToday}`);
      return isToday;
    });

    console.log(`🎯 Today's records found: ${todayRecords.length}`);
    return todayRecords.length === 0;
  };

  const renderWeightStats = () => {
    if (!weightStats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Current Weight</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weightStats.currentWeight} {weightStats.weightUnit}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Trend</Text>
            <View style={styles.trendContainer}>
              <Ionicons 
                name={
                  weightStats.trend === 'up' ? 'trending-up' :
                  weightStats.trend === 'down' ? 'trending-down' : 'remove'
                }
                size={16}
                color={
                  weightStats.trend === 'up' ? '#f59e0b' :
                  weightStats.trend === 'down' ? '#3b82f6' : '#6b7280'
                }
              />
              <Text style={[styles.trendText, { 
                color: weightStats.trend === 'up' ? '#f59e0b' :
                       weightStats.trend === 'down' ? '#3b82f6' : '#6b7280'
              }]}>
                {weightStats.trend === 'up' ? 'Gaining' :
                 weightStats.trend === 'down' ? 'Losing' : 'Stable'}
              </Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Change from Last</Text>
            <Text style={[styles.statValue, { 
              color: weightStats.changeFromLast === 0 ? colors.text :
                     weightStats.changeFromLast > 0 ? '#f59e0b' : '#3b82f6'
            }]}>
              {weightStats.changeFromLast > 0 ? '+' : ''}{weightStats.changeFromLast.toFixed(1)} {weightStats.weightUnit}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Body Condition</Text>
            <Text style={[styles.statValue, { 
              color: weightStats.bmi === 'Normal' ? '#10b981' :
                     weightStats.bmi.includes('Underweight') ? '#3b82f6' : '#f59e0b'
            }]}>
              {weightStats.bmi}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Ideal Range</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.round(weightStats.idealWeight.min)} - {Math.round(weightStats.idealWeight.max)} {weightStats.weightUnit}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Last Weighed</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weightStats.lastWeighed ? format(weightStats.lastWeighed, 'MMM dd, yyyy') : 'Never'}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Pet Age</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {activePet?.birthDate ? 
                Math.floor((new Date().getTime() - new Date(activePet.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
                'Unknown'} {activePet?.birthDate ? 'years' : ''}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.text + '80' }]}>Weekly Change</Text>
            <Text style={[styles.statValue, { 
              color: Math.abs(weightStats.averageWeeklyChange) < 0.05 ? '#10b981' :
                     weightStats.averageWeeklyChange > 0 ? '#f59e0b' : '#3b82f6'
            }]}>
              {weightStats.averageWeeklyChange > 0 ? '+' : ''}{weightStats.averageWeeklyChange.toFixed(2)} {weightStats.weightUnit}/week
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHealthInsights = () => {
    if (!weightStats || !activePet) return null;

    const recommendations = getHealthRecommendations(activePet, weightStats);
    const currentAge = activePet.birthDate ? 
      Math.floor((new Date().getTime() - new Date(activePet.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
      1;

    let ageCategory = 'Adult';
    if (currentAge < 1) ageCategory = activePet.type === 'dog' ? 'Puppy' : activePet.type === 'cat' ? 'Kitten' : 'Young';
    else if ((currentAge > 7 && activePet.type === 'dog') || (currentAge > 10 && activePet.type === 'cat')) 
      ageCategory = 'Senior';

    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Insights</Text>
        
        <View style={styles.insightRow}>
          <View style={styles.insightItem}>
            <Text style={[styles.insightLabel, { color: colors.text + '80' }]}>Life Stage</Text>
            <Text style={[styles.insightValue, { color: colors.primary }]}>
              {ageCategory} ({currentAge} {currentAge === 1 ? 'year' : 'years'})
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Text style={[styles.insightLabel, { color: colors.text + '80' }]}>Weight Status</Text>
            <Text style={[styles.insightValue, { 
              color: weightStats.bmi === 'Ideal Weight' ? '#10b981' :
                     weightStats.bmi.includes('Underweight') ? '#3b82f6' : '#f59e0b'
            }]}>
              {weightStats.bmi}
            </Text>
          </View>
        </View>

        <View style={styles.insightRow}>
          <View style={styles.insightItem}>
            <Text style={[styles.insightLabel, { color: colors.text + '80' }]}>Gender & Size</Text>
            <Text style={[styles.insightValue, { color: colors.text }]}>
              {activePet.gender === 'unknown' ? 'Unknown' : activePet.gender.charAt(0).toUpperCase() + activePet.gender.slice(1)} {activePet.size ? `• ${activePet.size.charAt(0).toUpperCase() + activePet.size.slice(1)}` : ''}
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Text style={[styles.insightLabel, { color: colors.text + '80' }]}>Spay/Neuter Status</Text>
            <Text style={[styles.insightValue, { color: activePet.neutered ? '#10b981' : '#f59e0b' }]}>
              {activePet.neutered ? 'Spayed/Neutered' : 'Intact'}
            </Text>
          </View>
        </View>

        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={[styles.recommendationsTitle, { color: colors.text }]}>
              Personalized Recommendations
            </Text>
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={16} 
                  color={colors.primary} 
                  style={styles.recommendationIcon}
                />
                <Text style={[styles.recommendationText, { color: colors.text + '90' }]}>
                  {recommendation}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {(['1week', '1month', '1year', 'all'] as const).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            { backgroundColor: selectedTimeRange === range ? colors.primary : colors.card },
          ]}
          onPress={() => setSelectedTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            { color: selectedTimeRange === range ? 'white' : colors.text }
          ]}>
            {range === '1week' ? '1W' :
             range === '1month' ? '1M' :
             range === '1year' ? '1Y' : 'All'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAddWeightForm = () => {
    if (!showAddWeight) return null;

    return (
      <View style={[styles.addWeightForm, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Weight Record</Text>
        
        <Input
          label={`Weight (${activePet?.weightUnit})`}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder={`Enter weight in ${activePet?.weightUnit}`}
          keyboardType="decimal-pad"
        />

        <DatePicker
          label="Date"
          value={newDate}
          onChange={setNewDate}
        />

        <Input
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this measurement"
          multiline
          numberOfLines={3}
        />

        <View style={styles.bodyConditionContainer}>
          <Text style={[styles.bodyConditionLabel, { color: colors.text }]}>
            Body Condition Score: {bodyConditionScore}/5
          </Text>
          <View style={styles.bodyConditionSelector}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                style={[
                  styles.bodyConditionButton,
                  { 
                    backgroundColor: bodyConditionScore === score ? colors.primary : colors.background,
                    borderColor: colors.primary
                  }
                ]}
                onPress={() => setBodyConditionScore(score)}
              >
                <Text style={[
                  styles.bodyConditionButtonText,
                  { color: bodyConditionScore === score ? 'white' : colors.primary }
                ]}>
                  {score}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.bodyConditionHint, { color: colors.text + '60' }]}>
            1: Underweight, 3: Ideal, 5: Overweight
          </Text>
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.background }]}
            onPress={() => setShowAddWeight(false)}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddWeight}
            disabled={addingWeight}
          >
            {addingWeight ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.addButtonText}>Add Weight</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading weight data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Weight Trend</Text>
          <TouchableOpacity
            onPress={() => setShowAddWeight(true)}
            disabled={!canAddWeightToday()}
            style={[
              styles.addWeightButton,
              { 
                backgroundColor: canAddWeightToday() ? colors.primary : colors.text + '20',
                opacity: canAddWeightToday() ? 1 : 0.5
              }
            ]}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderWeightStats()}
        
        {renderHealthInsights()}

        <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight Trend Chart</Text>
          
          {renderTimeRangeSelector()}

          <View style={styles.chartWrapper}>
            {weightRecords.length > 0 && getChartData().length > 0 ? (
              <TouchableOpacity 
                style={[styles.chartCard, { backgroundColor: colors.background }]}
                activeOpacity={1}
                onPress={() => {
                  // Close tooltip when tapping outside chart area
                  if (selectedDataPoint) {
                    setSelectedDataPoint(null);
                    setTooltipPosition(null);
                  }
                }}
              >
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.chartScrollView}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <LineChart
                    data={getChartData()}
                    width={Math.max(width - 80, getChartData().length * 80 + 80)} // Give more space per data point
                    height={220}
                    color={colors.primary}
                    thickness={3}
                    startFillColor={colors.primary + '30'}
                    endFillColor={colors.primary + '10'}
                    startOpacity={0.3}
                    endOpacity={0.1}
                    spacing={70} // Fixed spacing for better readability
                    backgroundColor={colors.card}
                    hideRules={true}
                    hideYAxisText={false}
                    yAxisColor={colors.text + '20'}
                    xAxisColor={colors.text + '20'}
                    yAxisTextStyle={{
                      color: colors.text + '80',
                      fontSize: 12,
                    }}
                    xAxisLabelTextStyle={{
                      color: colors.text + '80',
                      fontSize: 10,
                      fontWeight: '500',
                    }}
                    dataPointsColor={colors.primary}
                    dataPointsRadius={4}
                    textShiftY={-8}
                    textShiftX={-5}
                    textColor={colors.text}
                    textFontSize={10}
                    focusEnabled
                    showDataPointOnFocus
                    showStripOnFocus
                    showTextOnFocus
                    stripColor={colors.primary + '40'}
                    stripHeight={200}
                    stripOpacity={0.2}
                    initialSpacing={40} // Good starting space
                    endSpacing={40} // Good ending space
                    onFocus={(item: ChartDataPoint, index: number) => {
                      // Calculate tooltip position relative to the data point
                      const spacing = 70;
                      const initialSpacing = 40;
                      
                      // Calculate the actual x position of the data point within the chart
                      const dataPointX = initialSpacing + (index * spacing);
                      
                      // Position tooltip above the data point
                      const yPosition = 30; // Close to the data point
                      
                      // For horizontal scrolling charts, we want the tooltip to be centered on the data point
                      // but adjusted to stay within the visible screen area
                      const screenWidth = width;
                      const tooltipWidth = 140;
                      
                      // Center the tooltip on the data point
                      let adjustedX = dataPointX - (tooltipWidth / 2);
                      
                      // Ensure tooltip doesn't go off the left edge of the screen
                      if (adjustedX < 10) {
                        adjustedX = 10;
                      }
                      
                      // Ensure tooltip doesn't go off the right edge of the visible screen
                      const visibleRightEdge = screenWidth - 20; // Account for padding
                      if (adjustedX + tooltipWidth > visibleRightEdge) {
                        adjustedX = visibleRightEdge - tooltipWidth;
                      }
                      
                      // Toggle tooltip - if same item is selected, close it
                      if (selectedDataPoint && selectedDataPoint.value === item.value && selectedDataPoint.date.getTime() === item.date.getTime()) {
                        setSelectedDataPoint(null);
                        setTooltipPosition(null);
                      } else {
                        setSelectedDataPoint(item);
                        setTooltipPosition({ x: adjustedX, y: yPosition });
                      }
                    }}
                    curved
                    isAnimated
                    animationDuration={1000}
                    areaChart
                  />
                </ScrollView>
                
                {/* Tooltip for selected data point */}
                {selectedDataPoint && tooltipPosition && (
                  <TouchableOpacity
                    style={[
                      styles.tooltip, 
                      { 
                        backgroundColor: colors.card, 
                        borderColor: colors.primary,
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                      }
                    ]}
                    onPress={() => {
                      setSelectedDataPoint(null);
                      setTooltipPosition(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.tooltipArrow, { borderBottomColor: colors.card }]} />
                    <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                      {format(selectedDataPoint.date, 'MMM dd, yyyy')}
                    </Text>
                    <Text style={[styles.tooltipWeight, { color: colors.primary }]}>
                      {selectedDataPoint.weight} {selectedDataPoint.unit}
                    </Text>
                    {selectedDataPoint.notes && (
                      <Text style={[styles.tooltipNotes, { color: colors.text + '80' }]}>
                        {selectedDataPoint.notes}
                      </Text>
                    )}
                    <Text style={[styles.tooltipHint, { color: colors.text + '60' }]}>
                      Tap to close
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="scale-outline" size={48} color={colors.text + '40'} />
                <Text style={[styles.noDataText, { color: colors.text + '60' }]}>
                  No weight data available
                </Text>
                <Text style={[styles.noDataSubtext, { color: colors.text + '40' }]}>
                  Add your first weight measurement to see the trend
                </Text>
              </View>
            )}
          </View>
        </View>

        {renderAddWeightForm()}

        {/* Daily reminder info */}
        {!canAddWeightToday() && (
          <View style={[styles.reminderContainer, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.reminderText, { color: colors.primary }]}>
              You've already recorded weight today. Come back tomorrow to add another measurement.
            </Text>
          </View>
        )}

        <View style={styles.spacer} />
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  addWeightButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14, // Increased back since we have fewer options
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'flex-start',
    width: '100%',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  noDataText: {
    fontSize: 16,
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 16,
    padding: 16, // Restored original padding
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minWidth: 120,
    maxWidth: 200,
    zIndex: 1000, // Ensure tooltip appears above chart
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6, // Position arrow at bottom of tooltip to point down to data point
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white', // Point downward
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  tooltipNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  tooltipHint: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  addWeightForm: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  bodyConditionContainer: {
    marginVertical: 16,
  },
  bodyConditionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  bodyConditionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bodyConditionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyConditionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bodyConditionHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  reminderContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  reminderText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  spacer: {
    height: 40,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightItem: {
    flex: 1,
    marginHorizontal: 8,
  },
  insightLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  chartScrollView: {
    flexGrow: 0,
  },
  chartScrollContent: {
    paddingHorizontal: 16,
  },
});

export default WeightTrend; 