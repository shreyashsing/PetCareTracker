export interface Pet {
  id: string;
  userId: string;
  name: string;
  type: 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'reptile' | 'small_mammal' | 'other';
  breed: string;
  birthDate: Date;
  gender: 'male' | 'female' | 'unknown';
  weight: number;
  weightUnit: 'kg' | 'lb';
  microchipped: boolean;
  microchipId?: string;
  neutered: boolean;
  adoptionDate?: Date;
  color: string;
  image?: string;
  medicalConditions: string[];
  allergies: string[];
  veterinarian?: {
    name: string;
    phone: string;
    clinic: string;
  };
  status: 'healthy' | 'recovering' | 'ill' | 'chronic' | 'unknown';
  
  // Nutritional info
  foodType?: string;
  dailyTarget?: string;
  specialNotes?: string;
  proteinPercentage?: number;
  fatPercentage?: number;
  fiberPercentage?: number;
}

export interface Task {
  id: string;
  petId: string;
  title: string;
  description?: string;
  category: 'feeding' | 'medication' | 'exercise' | 'grooming' | 'training' | 'veterinary' | 'social' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduleInfo: {
    date: Date;
    time: Date;
    duration?: number;
    recurringPattern?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    recurringDays?: number[];
    endRecurrence?: Date;
  };
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  assignedTo?: string[];
  reminderSettings: {
    enabled: boolean;
    times: number[];
    notificationType: 'push' | 'sound' | 'both';
  };
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'rescheduled';
  completionDetails?: {
    completedAt: Date;
    completedBy: string;
    notes?: string;
    attachments?: {
      id: string;
      type: 'image' | 'video' | 'document';
      url: string;
    }[];
  };
}

export interface Meal {
  id: string;
  petId: string;
  userId?: string;
  date: Date;
  time: Date;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'medication' | 'custom';
  foods: {
    foodItemId: string;
    amount: number;
    unit: string;
    calories: number;
  }[];
  totalCalories: number;
  hydration?: {
    waterAmount: number;
    unit: 'ml' | 'oz' | 'cups';
  };
  specialInstructions?: string;
  fedBy?: string;
  completed: boolean;
  skipped: boolean;
  skipReason?: string;
  reaction?: 'good' | 'neutral' | 'poor';
  notes?: string;
  reminderSettings: {
    enabled: boolean;
    reminderTime: number;
  };
  recurring: boolean;
  recurrencePattern?: 'daily' | 'weekdays' | 'weekends' | 'custom';
  recurrenceDays?: number[];
  
  // UI properties
  amount?: string | number;
  calories?: number;
}

export interface FoodItem {
  id: string;
  petId: string;
  name: string;
  brand: string;
  category: 'dry' | 'wet' | 'treats' | 'supplements' | 'prescription' | 'other';
  nutritionalInfo?: {
    calories: number;
    protein: number;
    fat: number;
    fiber: number;
    ingredients: string[];
    allergens?: string[];
  };
  inventory?: {
    currentAmount: number;
    totalAmount: number;
    unit: 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans';
    dailyFeedingAmount: number;
    dailyFeedingUnit: 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans';
    daysRemaining: number;
    lowStockThreshold: number;
    reorderAlert: boolean;
  };
  purchaseDetails?: {
    date: Date;
    expiryDate?: Date;
    price: number;
    supplier: string;
  };
  servingSize?: {
    amount: number;
    unit: string;
    caloriesPerServing: number;
  };
  rating?: number;
  petPreference?: 'favorite' | 'neutral' | 'disliked';
  is_preferred?: boolean;
  veterinarianApproved?: boolean;
  specialNotes?: string;
  // UI-specific properties
  amount?: string;
  lowStock?: boolean;
  nextPurchase?: string;
  // Flattened properties directly from database
  total_amount?: number;
  unit?: string;
  current_amount?: number;
  daily_feeding_amount?: number;
  daily_feeding_unit?: string;
  days_remaining?: number;
  low_stock_threshold?: number;
  reorder_alert?: boolean;
  purchase_date?: Date;
  expiry_date?: Date;
  special_notes?: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  genericName?: string;
  type: 'pill' | 'liquid' | 'injection' | 'topical' | 'chewable' | 'other';
  dosage: {
    amount: number;
    unit: 'mg' | 'ml' | 'g' | 'tablet(s)' | 'drop(s)' | 'application(s)';
  };
  frequency: {
    times: number;
    period: 'day' | 'week' | 'month';
    specificTimes?: string[];
  };
  duration: {
    startDate: Date;
    endDate?: Date;
    indefinite: boolean;
  };
  administrationMethod: 'oral' | 'topical' | 'injection' | 'with food' | 'other';
  prescribedBy: string;
  prescriptionNumber?: string;
  pharmacy?: string;
  refillable: boolean;
  refillsRemaining?: number;
  purpose: string;
  sideEffects?: string[];
  specialInstructions?: string;
  reminderSettings: {
    enabled: boolean;
    reminderTime: number;
    reminderSound?: string;
  };
  history: {
    date: Date;
    administered: boolean;
    skipped: boolean;
    notes?: string;
    administeredBy?: string;
  }[];
  status: 'active' | 'completed' | 'discontinued';
  inventory: {
    currentAmount: number;
    totalAmount: number;
    unit: string;
    lowStockThreshold: number;
    reorderAlert: boolean;
  };
}

export interface HealthRecord {
  id: string;
  petId: string;
  date: Date;
  type: 'vaccination' | 'checkup' | 'surgery' | 'dental' | 'emergency' | 'specialized' | 'other';
  title: string;
  description: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string;
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
  }[];
  labResults?: {
    name: string;
    value: string;
    unit: string;
    normalRange?: string;
  }[];
  provider: {
    name: string;
    specialty?: string;
    clinic: string;
    phone?: string;
    email?: string;
  };
  // Direct properties for provider info
  veterinarian?: string;
  clinic?: string;
  // Snake case for database
  provider_name?: string;  
  provider_clinic?: string;
  // Camel case for direct database operations
  providerName?: string;
  providerClinic?: string;
  insuranceCovered: boolean;
  followUpNeeded: boolean;
  followUpDate?: Date;
  status: 'completed' | 'ongoing' | 'scheduled';
  severity?: 'low' | 'medium' | 'high';
  weight?: number;
}

export interface WeightRecord {
  id: string;
  petId: string;
  date: Date;
  weight: number;
  unit: 'kg' | 'lb';
  notes?: string;
  measuredBy?: string;
  bodyConditionScore?: number;
}

export interface GrowthMilestone {
  id: string;
  petId: string;
  date: Date;
  type: 'height' | 'length' | 'teeth' | 'developmental';
  description: string;
  value?: number;
  unit?: string;
  notes?: string;
  image?: string;
}

export interface ActivitySession {
  id: string;
  petId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  type: 'walk' | 'run' | 'play' | 'swim' | 'training' | 'other';
  duration: number;
  distance?: number;
  distanceUnit?: 'km' | 'mi';
  intensity: 'low' | 'moderate' | 'high';
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    route?: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  };
  weatherConditions?: {
    temperature: number;
    temperatureUnit: 'C' | 'F';
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'other';
    humidity?: number;
  };
  companions?: string[];
  notes?: string;
  mood: 'energetic' | 'happy' | 'tired' | 'reluctant';
  caloriesBurned?: number;
  images?: string[];
}

export interface PetStatsProps {
  tasksLoading: boolean;
  mealsLoading: boolean;
  tasks?: Task[];
  meals?: Meal[];
}

// Add User interface
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  displayName?: string;
  createdAt: Date;
  petIds: string[];
  lastLogin?: Date;
  isVerified?: boolean;
  role?: 'user' | 'admin';
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
  isNewUser?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
} 