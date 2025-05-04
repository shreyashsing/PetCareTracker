"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchemas = exports.baseEntitySchema = exports.userSchema = exports.medicationSchema = exports.healthRecordSchema = exports.taskSchema = exports.petSchema = void 0;
exports.validateData = validateData;
exports.formatValidationErrors = formatValidationErrors;
var zod_1 = require("zod");
var constants_1 = require("../db/constants");
// Pet validation schema
exports.petSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid pet ID format" }),
    userId: zod_1.z.string().min(1, { message: "User ID is required" }),
    name: zod_1.z.string().min(1, { message: "Pet name is required" }).max(50),
    type: zod_1.z.string().min(1, { message: "Pet type is required" }),
    breed: zod_1.z.string().optional(),
    birthDate: zod_1.z.date({ message: "Birth date must be a valid date" }),
    gender: zod_1.z.enum(["male", "female", "unknown"], {
        errorMap: function () { return ({ message: "Gender must be male, female, or unknown" }); }
    }),
    weight: zod_1.z.number().positive({ message: "Weight must be a positive number" }).optional(),
    weightUnit: zod_1.z.enum(["kg", "lb"], {
        errorMap: function () { return ({ message: "Weight unit must be kg or lb" }); }
    }).optional(),
    microchipped: zod_1.z.boolean().optional(),
    microchipId: zod_1.z.string().optional(),
    neutered: zod_1.z.boolean().optional(),
    adoptionDate: zod_1.z.date().optional(),
    color: zod_1.z.string().optional(),
    image: zod_1.z.string().url().optional().nullable(),
    medicalConditions: zod_1.z.array(zod_1.z.string()).default([]),
    allergies: zod_1.z.array(zod_1.z.string()).default([]),
    veterinarian: zod_1.z.object({
        name: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        clinic: zod_1.z.string().optional(),
    }).optional(),
    insuranceInfo: zod_1.z.object({
        provider: zod_1.z.string().optional(),
        policyNumber: zod_1.z.string().optional(),
        expiryDate: zod_1.z.date().optional(),
    }).optional(),
    status: zod_1.z.string().default("healthy"),
});
// Task validation schema
exports.taskSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid task ID format" }),
    petId: zod_1.z.string().uuid({ message: "Invalid pet ID format" }),
    title: zod_1.z.string().min(1, { message: "Task title is required" }).max(100),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum(['feeding', 'medication', 'exercise', 'grooming', 'training', 'veterinary', 'social', 'other'], {
        errorMap: function () { return ({ message: "Invalid task category" }); }
    }),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent'], {
        errorMap: function () { return ({ message: "Invalid priority level" }); }
    }),
    scheduleInfo: zod_1.z.object({
        date: zod_1.z.date({ message: "Date must be a valid date" }),
        time: zod_1.z.date({ message: "Time must be a valid date" }),
        duration: zod_1.z.number().optional(),
        recurringPattern: zod_1.z.enum(['daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
        recurringDays: zod_1.z.array(zod_1.z.number()).optional(),
        endRecurrence: zod_1.z.date().optional()
    }),
    location: zod_1.z.object({
        name: zod_1.z.string(),
        address: zod_1.z.string().optional(),
        coordinates: zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number()
        }).optional()
    }).optional(),
    assignedTo: zod_1.z.array(zod_1.z.string()).optional(),
    reminderSettings: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        times: zod_1.z.array(zod_1.z.number()),
        notificationType: zod_1.z.enum(['push', 'sound', 'both'])
    }),
    status: zod_1.z.enum(['pending', 'in-progress', 'completed', 'skipped', 'rescheduled']),
    completionDetails: zod_1.z.object({
        completedAt: zod_1.z.date(),
        completedBy: zod_1.z.string(),
        notes: zod_1.z.string().optional(),
        attachments: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(['image', 'video', 'document']),
            url: zod_1.z.string()
        })).optional()
    }).optional()
});
// Health record validation schema
exports.healthRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid health record ID format" }),
    petId: zod_1.z.string().uuid({ message: "Invalid pet ID format" }),
    date: zod_1.z.date({ message: "Date must be a valid date" }),
    type: zod_1.z.string().min(1, { message: "Record type is required" }),
    description: zod_1.z.string().optional(),
    veterinarian: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.string()).default([]),
    reminder: zod_1.z.date().optional(),
    notes: zod_1.z.string().optional(),
    cost: zod_1.z.number().nonnegative().optional(),
});
// Medication validation schema
exports.medicationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({ message: "Invalid medication ID format" }),
    petId: zod_1.z.string().uuid({ message: "Invalid pet ID format" }),
    name: zod_1.z.string().min(1, { message: "Medication name is required" }),
    type: zod_1.z.enum(['pill', 'liquid', 'injection', 'topical', 'chewable', 'other'], {
        errorMap: function () { return ({ message: "Invalid medication type" }); }
    }),
    dosage: zod_1.z.object({
        amount: zod_1.z.number().positive({ message: "Dosage amount must be a positive number" }),
        unit: zod_1.z.enum(['mg', 'ml', 'g', 'tablet(s)', 'drop(s)', 'application(s)'], {
            errorMap: function () { return ({ message: "Invalid dosage unit" }); }
        })
    }),
    frequency: zod_1.z.object({
        times: zod_1.z.number().int().positive({ message: "Frequency times must be a positive integer" }),
        period: zod_1.z.enum(['day', 'week', 'month'], {
            errorMap: function () { return ({ message: "Invalid frequency period" }); }
        }),
        specificTimes: zod_1.z.array(zod_1.z.string()).optional()
    }),
    duration: zod_1.z.object({
        startDate: zod_1.z.date({ message: "Start date must be a valid date" }),
        endDate: zod_1.z.date().optional(),
        indefinite: zod_1.z.boolean()
    }),
    administrationMethod: zod_1.z.enum(['oral', 'topical', 'injection', 'with food', 'other'], {
        errorMap: function () { return ({ message: "Invalid administration method" }); }
    }),
    prescribedBy: zod_1.z.string().optional(),
    prescriptionNumber: zod_1.z.string().optional(),
    pharmacy: zod_1.z.string().optional(),
    refillable: zod_1.z.boolean(),
    refillsRemaining: zod_1.z.number().optional(),
    purpose: zod_1.z.string().optional(),
    sideEffects: zod_1.z.array(zod_1.z.string()).optional(),
    specialInstructions: zod_1.z.string().optional(),
    reminderSettings: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        reminderTime: zod_1.z.number().int().min(0),
        reminderSound: zod_1.z.string().optional()
    }),
    history: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        administered: zod_1.z.boolean(),
        skipped: zod_1.z.boolean(),
        notes: zod_1.z.string().optional(),
        administeredBy: zod_1.z.string().optional()
    })).optional(),
    status: zod_1.z.enum(['active', 'completed', 'discontinued'], {
        errorMap: function () { return ({ message: "Invalid medication status" }); }
    }),
    inventory: zod_1.z.object({
        currentAmount: zod_1.z.number(),
        totalAmount: zod_1.z.number(),
        unit: zod_1.z.string(),
        lowStockThreshold: zod_1.z.number(),
        reorderAlert: zod_1.z.boolean()
    }).optional()
});
// User validation schema
exports.userSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, { message: "User ID is required" }),
    email: zod_1.z.string().email({ message: "Invalid email address" }),
    passwordHash: zod_1.z.string().min(1, { message: "Password hash is required" }),
    name: zod_1.z.string().min(1, { message: "Name is required" }),
    displayName: zod_1.z.string().optional(),
    createdAt: zod_1.z.date({ message: "Created date must be a valid date" }),
    petIds: zod_1.z.array(zod_1.z.string()).default([]),
    lastLogin: zod_1.z.date().optional(),
    isVerified: zod_1.z.boolean().optional(),
    role: zod_1.z.enum(['user', 'admin']).optional(),
    isNewUser: zod_1.z.boolean().default(true),
    preferences: zod_1.z.object({
        emailNotifications: zod_1.z.boolean().optional(),
        pushNotifications: zod_1.z.boolean().optional(),
        theme: zod_1.z.enum(['light', 'dark', 'system']).optional(),
    }).optional(),
    resetPasswordToken: zod_1.z.string().optional(),
    resetPasswordExpires: zod_1.z.date().optional(),
});
// Generic schema that all entities must follow
exports.baseEntitySchema = zod_1.z.object({
    id: zod_1.z.string(),
});
// Mapping between storage keys and their validation schemas
exports.validationSchemas = (_a = {},
    _a[constants_1.STORAGE_KEYS.PETS] = exports.petSchema,
    _a[constants_1.STORAGE_KEYS.TASKS] = exports.taskSchema,
    _a[constants_1.STORAGE_KEYS.HEALTH_RECORDS] = exports.healthRecordSchema,
    _a[constants_1.STORAGE_KEYS.MEDICATIONS] = exports.medicationSchema,
    _a[constants_1.STORAGE_KEYS.USERS] = exports.userSchema,
    _a);
// Generic validation function that accepts any schema
function validateData(data, schema) {
    try {
        schema.parse(data);
        return { valid: true };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return { valid: false, errors: error };
        }
        throw error;
    }
}
// Function to format validation errors into a user-friendly message
function formatValidationErrors(errors) {
    return errors.errors.map(function (err) {
        var path = err.path.join('.');
        return "".concat(path ? path + ': ' : '').concat(err.message);
    }).join('\n');
}
