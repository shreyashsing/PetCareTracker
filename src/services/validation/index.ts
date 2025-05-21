import { z } from 'zod';
import { STORAGE_KEYS } from '../db/constants';

// Pet validation schema
export const petSchema = z.object({
  id: z.string().uuid({ message: "Invalid pet ID format" }),
  userId: z.string().min(1, { message: "User ID is required" }),
  name: z.string().min(1, { message: "Pet name is required" }).max(50),
  type: z.string().min(1, { message: "Pet type is required" }),
  breed: z.string().optional(),
  birthDate: z.date({ message: "Birth date must be a valid date" }),
  gender: z.enum(["male", "female", "unknown"], { 
    errorMap: () => ({ message: "Gender must be male, female, or unknown" }) 
  }),
  weight: z.number().positive({ message: "Weight must be a positive number" }).optional(),
  weightUnit: z.enum(["kg", "lb"], { 
    errorMap: () => ({ message: "Weight unit must be kg or lb" }) 
  }).optional(),
  microchipped: z.boolean().optional(),
  microchipId: z.string().optional(),
  neutered: z.boolean().optional(),
  adoptionDate: z.date().optional(),
  color: z.string().optional(),
  image: z.string().url().optional().nullable(),
  medicalConditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  veterinarian: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    clinic: z.string().optional(),
  }).optional(),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    expiryDate: z.date().optional(),
  }).optional(),
  status: z.string().default("healthy"),
});

// Task validation schema
export const taskSchema = z.object({
  id: z.string().uuid({ message: "Invalid task ID format" }),
  petId: z.string().uuid({ message: "Invalid pet ID format" }),
  title: z.string().min(1, { message: "Task title is required" }).max(100),
  description: z.string().optional(),
  category: z.enum(['feeding', 'medication', 'exercise', 'grooming', 'training', 'veterinary', 'social', 'other'], {
    errorMap: () => ({ message: "Invalid task category" })
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: "Invalid priority level" })
  }),
  scheduleInfo: z.object({
    date: z.date({ message: "Date must be a valid date" }),
    time: z.date({ message: "Time must be a valid date" }),
    duration: z.number().optional(),
    recurringPattern: z.enum(['daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
    recurringDays: z.array(z.number()).optional(),
    endRecurrence: z.date().optional()
  }),
  location: z.object({
    name: z.string(),
    address: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  assignedTo: z.array(z.string()).optional(),
  reminderSettings: z.object({
    enabled: z.boolean(),
    times: z.array(z.number()),
    notificationType: z.enum(['push', 'sound', 'both'])
  }),
  status: z.enum(['pending', 'in-progress', 'completed', 'skipped', 'rescheduled']),
  completionDetails: z.object({
    completedAt: z.date(),
    completedBy: z.string(),
    notes: z.string().optional(),
    attachments: z.array(z.object({
      id: z.string(),
      type: z.enum(['image', 'video', 'document']),
      url: z.string()
    })).optional()
  }).optional()
});

// Health record validation schema
export const healthRecordSchema = z.object({
  id: z.string().uuid({ message: "Invalid health record ID format" }),
  petId: z.string().uuid({ message: "Invalid pet ID format" }),
  date: z.date({ message: "Date must be a valid date" }),
  type: z.string().min(1, { message: "Record type is required" }),
  description: z.string().optional(),
  veterinarian: z.string().optional(),
  location: z.string().optional(),
  reminder: z.date().optional(),
  notes: z.string().optional(),
});

// Medication validation schema
export const medicationSchema = z.object({
  id: z.string().uuid({ message: "Invalid medication ID format" }),
  petId: z.string().uuid({ message: "Invalid pet ID format" }),
  name: z.string().min(1, { message: "Medication name is required" }),
  type: z.enum(['pill', 'liquid', 'injection', 'topical', 'chewable', 'other'], { 
    errorMap: () => ({ message: "Invalid medication type" }) 
  }),
  dosage: z.object({
    amount: z.number().positive({ message: "Dosage amount must be a positive number" }),
    unit: z.enum(['mg', 'ml', 'g', 'tablet(s)', 'drop(s)', 'application(s)'], {
      errorMap: () => ({ message: "Invalid dosage unit" })
    })
  }),
  frequency: z.object({
    times: z.number().int().positive({ message: "Frequency times must be a positive integer" }),
    period: z.enum(['day', 'week', 'month'], {
      errorMap: () => ({ message: "Invalid frequency period" })
    }),
    specificTimes: z.array(z.string()).optional()
  }),
  duration: z.object({
    startDate: z.date({ message: "Start date must be a valid date" }),
    endDate: z.date().optional(),
    indefinite: z.boolean()
  }),
  administrationMethod: z.enum(['oral', 'topical', 'injection', 'with food', 'other'], {
    errorMap: () => ({ message: "Invalid administration method" })
  }),
  prescribedBy: z.string().optional(),
  prescriptionNumber: z.string().optional(),
  pharmacy: z.string().optional(),
  refillable: z.boolean(),
  refillsRemaining: z.number().optional(),
  purpose: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
  specialInstructions: z.string().optional(),
  reminderSettings: z.object({
    enabled: z.boolean(),
    reminderTime: z.number().int().min(0),
    reminderSound: z.string().optional()
  }),
  history: z.array(
    z.object({
      date: z.date(),
      administered: z.boolean(),
      skipped: z.boolean(),
      notes: z.string().optional(),
      administeredBy: z.string().optional()
    })
  ).optional(),
  status: z.enum(['active', 'completed', 'discontinued'], {
    errorMap: () => ({ message: "Invalid medication status" })
  }),
  inventory: z.object({
    currentAmount: z.number(),
    totalAmount: z.number(),
    unit: z.string(),
    lowStockThreshold: z.number(),
    reorderAlert: z.boolean()
  }).optional()
});

// User validation schema
export const userSchema = z.object({
  id: z.string().min(1, { message: "User ID is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  passwordHash: z.string().min(1, { message: "Password hash is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  displayName: z.string().optional(),
  createdAt: z.date({ message: "Created date must be a valid date" }),
  petIds: z.array(z.string()).default([]),
  lastLogin: z.date().optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isNewUser: z.boolean().default(true),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }).optional(),
  resetPasswordToken: z.string().optional(),
  resetPasswordExpires: z.date().optional(),
});

// Generic schema that all entities must follow
export const baseEntitySchema = z.object({
  id: z.string(),
});

// Export type for our schemas
export type SchemaMap = {
  [key: string]: z.ZodType<any>;
};

// Mapping between storage keys and their validation schemas
export const validationSchemas: SchemaMap = {
  [STORAGE_KEYS.PETS]: petSchema,
  [STORAGE_KEYS.TASKS]: taskSchema,
  [STORAGE_KEYS.HEALTH_RECORDS]: healthRecordSchema,
  [STORAGE_KEYS.MEDICATIONS]: medicationSchema,
  [STORAGE_KEYS.USERS]: userSchema,
  // Add other schemas as needed
};

// Generic validation function that accepts any schema
export function validateData<T>(data: T, schema: z.ZodType<any>): { valid: boolean; errors?: z.ZodError } {
  try {
    schema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

// Function to format validation errors into a user-friendly message
export function formatValidationErrors(errors: z.ZodError): string {
  return errors.errors.map(err => {
    const path = err.path.join('.');
    return `${path ? path + ': ' : ''}${err.message}`;
  }).join('\n');
} 