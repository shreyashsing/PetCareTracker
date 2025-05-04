"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatTables = exports.databaseManager = exports.DatabaseManager = void 0;
exports.migratePetsToUser = migratePetsToUser;
// Database services
__exportStar(require("./asyncStorage"), exports);
__exportStar(require("./constants"), exports);
__exportStar(require("./repository"), exports);
// Entity-specific repositories
__exportStar(require("./petRepository"), exports);
__exportStar(require("./taskRepository"), exports);
__exportStar(require("./mealRepository"), exports);
__exportStar(require("./foodItemRepository"), exports);
__exportStar(require("./healthRecordRepository"), exports);
__exportStar(require("./medicationRepository"), exports);
__exportStar(require("./userRepository"), exports);
// Database manager
var asyncStorage_1 = require("./asyncStorage");
var constants_1 = require("./constants");
var foodItemRepository_1 = require("./foodItemRepository");
var healthRecordRepository_1 = require("./healthRecordRepository");
var mealRepository_1 = require("./mealRepository");
var medicationRepository_1 = require("./medicationRepository");
var petRepository_1 = require("./petRepository");
var taskRepository_1 = require("./taskRepository");
var userRepository_1 = require("./userRepository");
var activitySessionRepository_1 = require("./activitySessionRepository");
var helpers_1 = require("../../utils/helpers");
var supabase_1 = require("../supabase");
var migrations_1 = require("./migrations");
/**
 * Database manager class for initializing repositories and handling app data
 */
var DatabaseManager = /** @class */ (function () {
    function DatabaseManager() {
        // Initialize repositories
        this.pets = new petRepository_1.PetRepository();
        this.tasks = new taskRepository_1.TaskRepository();
        this.meals = new mealRepository_1.MealRepository();
        this.foodItems = new foodItemRepository_1.FoodItemRepository();
        this.healthRecords = new healthRecordRepository_1.HealthRecordRepository();
        this.medications = new medicationRepository_1.MedicationRepository();
        this.users = new userRepository_1.UserRepository();
        this.activitySessions = new activitySessionRepository_1.ActivitySessionRepository();
    }
    /**
     * Initialize the database with default values if needed
     */
    DatabaseManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var hasData_1, runMigrations_1, initPromise, timeoutPromise, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem('dbInitialized')];
                    case 1:
                        hasData_1 = _a.sent();
                        runMigrations_1 = require('./migrations').runMigrations;
                        initPromise = new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                            var existingPets, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 8, , 9]);
                                        if (!!hasData_1) return [3 /*break*/, 6];
                                        console.log('First run, initializing database...');
                                        return [4 /*yield*/, this.pets.getAll()];
                                    case 1:
                                        existingPets = _a.sent();
                                        if (!(existingPets.length === 0)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, this.setDefaultValues()];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        console.log('Pets already exist, skipping default pet creation');
                                        _a.label = 4;
                                    case 4: return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem('dbInitialized', true)];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6: 
                                    // Run migrations regardless of initialization status
                                    // This ensures database schema is up to date
                                    return [4 /*yield*/, runMigrations_1()];
                                    case 7:
                                        // Run migrations regardless of initialization status
                                        // This ensures database schema is up to date
                                        _a.sent();
                                        resolve();
                                        return [3 /*break*/, 9];
                                    case 8:
                                        err_1 = _a.sent();
                                        console.error('Error in database initialization:', err_1);
                                        reject(err_1);
                                        return [3 /*break*/, 9];
                                    case 9: return [2 /*return*/];
                                }
                            });
                        }); });
                        timeoutPromise = new Promise(function (_resolve, reject) {
                            setTimeout(function () { return reject(new Error('Database initialization timed out')); }, 5000);
                        });
                        // Use Promise.race to implement timeout
                        return [4 /*yield*/, Promise.race([initPromise, timeoutPromise])];
                    case 2:
                        // Use Promise.race to implement timeout
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error initializing database:', error_1);
                        // Throw error only for critical failures
                        if (error_1 instanceof Error && error_1.message.includes('timed out')) {
                            throw error_1;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set default values for the database
     */
    DatabaseManager.prototype.setDefaultValues = function () {
        return __awaiter(this, void 0, void 0, function () {
            var petId, userId, pet, tasks, foodItems, meals, medications, healthRecords, weightRecords, activitySessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        petId = (0, helpers_1.generateUUID)();
                        userId = "123";
                        pet = {
                            id: petId,
                            userId: userId, // Associate with the default user
                            name: "Luna",
                            type: "dog",
                            breed: "Golden Retriever",
                            birthDate: new Date(2021, 3, 15), // April 15, 2021
                            gender: "female",
                            weight: 28.5,
                            weightUnit: "kg",
                            microchipped: true,
                            microchipId: "9834762583",
                            neutered: true,
                            adoptionDate: new Date(2021, 5, 20), // June 20, 2021
                            color: "Golden",
                            image: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1924&q=80",
                            medicalConditions: ["Mild hip dysplasia", "Seasonal allergies"],
                            allergies: ["Chicken", "Certain grass pollens"],
                            veterinarian: {
                                name: "Dr. Sarah Johnson",
                                phone: "555-123-4567",
                                clinic: "Pawsome Veterinary Clinic"
                            },
                            status: "healthy"
                        };
                        tasks = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                title: "Morning Walk",
                                description: "30-minute walk in the neighborhood park",
                                category: "exercise",
                                priority: "medium",
                                scheduleInfo: {
                                    date: new Date(),
                                    time: new Date(new Date().setHours(7, 30, 0, 0)),
                                    duration: 30,
                                    recurringPattern: "daily",
                                    recurringDays: [0, 1, 2, 3, 4, 5, 6],
                                },
                                reminderSettings: {
                                    enabled: true,
                                    times: [15],
                                    notificationType: "both"
                                },
                                status: "pending"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                title: "Medication Time",
                                description: "Administer allergy medication",
                                category: "medication",
                                priority: "high",
                                scheduleInfo: {
                                    date: new Date(),
                                    time: new Date(new Date().setHours(8, 0, 0, 0)),
                                    recurringPattern: "daily",
                                },
                                reminderSettings: {
                                    enabled: true,
                                    times: [10, 5],
                                    notificationType: "push"
                                },
                                status: "pending"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                title: "Grooming Session",
                                description: "Brush coat and clean ears",
                                category: "grooming",
                                priority: "medium",
                                scheduleInfo: {
                                    date: new Date(new Date().setDate(new Date().getDate() + 2)),
                                    time: new Date(new Date().setHours(17, 0, 0, 0)),
                                    duration: 45,
                                    recurringPattern: "weekly",
                                },
                                reminderSettings: {
                                    enabled: true,
                                    times: [60],
                                    notificationType: "both"
                                },
                                status: "pending"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                title: "Vet Checkup",
                                description: "Annual wellness examination",
                                category: "veterinary",
                                priority: "high",
                                scheduleInfo: {
                                    date: new Date(new Date().setDate(new Date().getDate() + 14)),
                                    time: new Date(new Date().setHours(10, 15, 0, 0)),
                                    duration: 60,
                                },
                                location: {
                                    name: "Pawsome Veterinary Clinic",
                                    address: "123 Main Street, Anytown, USA"
                                },
                                reminderSettings: {
                                    enabled: true,
                                    times: [1440, 120], // 1 day and 2 hours before
                                    notificationType: "both"
                                },
                                status: "pending"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                title: "Training Session",
                                description: "Practice recall commands and leash training",
                                category: "training",
                                priority: "medium",
                                scheduleInfo: {
                                    date: new Date(new Date().setDate(new Date().getDate() + 1)),
                                    time: new Date(new Date().setHours(16, 0, 0, 0)),
                                    duration: 45,
                                    recurringPattern: "weekdays",
                                },
                                reminderSettings: {
                                    enabled: true,
                                    times: [30],
                                    notificationType: "push"
                                },
                                status: "pending"
                            }
                        ];
                        foodItems = [
                        // Dummy food items have been removed
                        ];
                        meals = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(),
                                time: new Date(new Date().setHours(7, 0, 0, 0)),
                                type: "breakfast",
                                foods: [],
                                totalCalories: 0,
                                hydration: {
                                    waterAmount: 200,
                                    unit: "ml"
                                },
                                completed: true,
                                skipped: false,
                                reaction: "good",
                                fedBy: "Jane",
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 10
                                },
                                recurring: true,
                                recurrencePattern: "daily"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(),
                                time: new Date(new Date().setHours(18, 0, 0, 0)),
                                type: "dinner",
                                foods: [],
                                totalCalories: 0,
                                hydration: {
                                    waterAmount: 250,
                                    unit: "ml"
                                },
                                specialInstructions: "Mix wet and dry food thoroughly",
                                completed: false,
                                skipped: false,
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 15
                                },
                                recurring: true,
                                recurrencePattern: "daily"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 1)),
                                time: new Date(new Date().setHours(7, 0, 0, 0)),
                                type: "breakfast",
                                foods: [],
                                totalCalories: 0,
                                hydration: {
                                    waterAmount: 200,
                                    unit: "ml"
                                },
                                completed: true,
                                skipped: false,
                                reaction: "good",
                                fedBy: "John",
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 10
                                },
                                recurring: true,
                                recurrencePattern: "daily"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 1)),
                                time: new Date(new Date().setHours(18, 0, 0, 0)),
                                type: "dinner",
                                foods: [],
                                totalCalories: 0,
                                hydration: {
                                    waterAmount: 200,
                                    unit: "ml"
                                },
                                completed: true,
                                skipped: false,
                                reaction: "good",
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 15
                                },
                                recurring: true,
                                recurrencePattern: "daily"
                            }
                        ];
                        medications = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                name: "Zyrtec (Cetirizine)",
                                genericName: "Cetirizine",
                                type: "pill",
                                dosage: {
                                    amount: 1,
                                    unit: "tablet(s)"
                                },
                                frequency: {
                                    times: 1,
                                    period: "day",
                                    specificTimes: ["08:00"]
                                },
                                duration: {
                                    startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
                                    indefinite: true
                                },
                                administrationMethod: "oral",
                                prescribedBy: "Dr. Sarah Johnson",
                                prescriptionNumber: "RX-78292",
                                pharmacy: "PetMeds",
                                refillable: true,
                                refillsRemaining: 3,
                                purpose: "Control seasonal allergies",
                                sideEffects: ["Drowsiness", "Dry mouth"],
                                specialInstructions: "Give with food if stomach upset occurs",
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 15
                                },
                                history: [
                                    {
                                        date: new Date(new Date().setDate(new Date().getDate() - 1)),
                                        administered: true,
                                        skipped: false,
                                        administeredBy: "Jane"
                                    },
                                    {
                                        date: new Date(new Date().setDate(new Date().getDate() - 2)),
                                        administered: true,
                                        skipped: false,
                                        administeredBy: "John"
                                    },
                                    {
                                        date: new Date(new Date().setDate(new Date().getDate() - 3)),
                                        administered: true,
                                        skipped: false,
                                        administeredBy: "Jane"
                                    }
                                ],
                                status: "active",
                                inventory: {
                                    currentAmount: 25,
                                    totalAmount: 30,
                                    unit: "tablet(s)",
                                    lowStockThreshold: 5,
                                    reorderAlert: true
                                }
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                name: "Joint Support Supplement",
                                type: "chewable",
                                dosage: {
                                    amount: 2,
                                    unit: "tablet(s)"
                                },
                                frequency: {
                                    times: 1,
                                    period: "day",
                                    specificTimes: ["18:00"]
                                },
                                duration: {
                                    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                                    indefinite: true
                                },
                                administrationMethod: "oral",
                                prescribedBy: "Dr. Sarah Johnson",
                                purpose: "Support joint health and mobility",
                                specialInstructions: "Can be given as a treat",
                                reminderSettings: {
                                    enabled: true,
                                    reminderTime: 15
                                },
                                history: [
                                    {
                                        date: new Date(new Date().setDate(new Date().getDate() - 1)),
                                        administered: true,
                                        skipped: false,
                                        administeredBy: "Jane"
                                    },
                                    {
                                        date: new Date(new Date().setDate(new Date().getDate() - 2)),
                                        administered: true,
                                        skipped: false,
                                        administeredBy: "John"
                                    }
                                ],
                                status: "active",
                                refillable: true,
                                inventory: {
                                    currentAmount: 38,
                                    totalAmount: 60,
                                    unit: "tablet(s)",
                                    lowStockThreshold: 10,
                                    reorderAlert: true
                                }
                            }
                        ];
                        healthRecords = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                                type: "checkup",
                                title: "Annual Wellness Exam",
                                description: "Comprehensive physical examination and vaccinations",
                                diagnosis: "Healthy with mild hip dysplasia noted",
                                treatment: "Continue joint supplements, maintain healthy weight",
                                medications: [
                                    {
                                        name: "Rabies Vaccine",
                                        dosage: "1 dose",
                                        frequency: "Annual",
                                        startDate: new Date(new Date().setMonth(new Date().getMonth() - 6))
                                    },
                                    {
                                        name: "DHPP Vaccine",
                                        dosage: "1 dose",
                                        frequency: "3 years",
                                        startDate: new Date(new Date().setMonth(new Date().getMonth() - 6))
                                    }
                                ],
                                labResults: [
                                    {
                                        name: "Complete Blood Count",
                                        value: "Normal",
                                        unit: "",
                                        normalRange: "Within range"
                                    },
                                    {
                                        name: "Chemistry Panel",
                                        value: "Normal",
                                        unit: "",
                                        normalRange: "Within range"
                                    }
                                ],
                                provider: {
                                    name: "Dr. Sarah Johnson",
                                    specialty: "General Veterinary Medicine",
                                    clinic: "Pawsome Veterinary Clinic",
                                    phone: "555-123-4567",
                                    email: "dr.johnson@pawsome.vet"
                                },
                                cost: 250,
                                insuranceCovered: true,
                                followUpNeeded: true,
                                followUpDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
                                status: "completed"
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                                type: "specialized",
                                title: "Dermatology Consultation",
                                description: "Evaluation for seasonal skin irritation and allergies",
                                symptoms: ["Itching", "Redness around paws", "Ear irritation"],
                                diagnosis: "Seasonal environmental allergies",
                                treatment: "Daily antihistamine, limited exposure to allergens, special shampoo",
                                medications: [
                                    {
                                        name: "Zyrtec (Cetirizine)",
                                        dosage: "10mg",
                                        frequency: "Once daily",
                                        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3))
                                    },
                                    {
                                        name: "Medicated Shampoo",
                                        dosage: "As needed",
                                        frequency: "Twice monthly",
                                        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3))
                                    }
                                ],
                                provider: {
                                    name: "Dr. Amy Lee",
                                    specialty: "Veterinary Dermatology",
                                    clinic: "Animal Skin Specialists",
                                    phone: "555-987-6543"
                                },
                                cost: 175,
                                insuranceCovered: true,
                                followUpNeeded: true,
                                followUpDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                                status: "completed"
                            }
                        ];
                        weightRecords = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                                weight: 27.5,
                                unit: "kg",
                                measuredBy: "Dr. Sarah Johnson",
                                bodyConditionScore: 5
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                                weight: 28,
                                unit: "kg",
                                measuredBy: "Dr. Amy Lee",
                                bodyConditionScore: 5
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 7)),
                                weight: 28.5,
                                unit: "kg",
                                measuredBy: "Jane",
                                notes: "Home measurement on bathroom scale",
                                bodyConditionScore: 5
                            }
                        ];
                        activitySessions = [
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 1)),
                                startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(7, 30, 0, 0)),
                                endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(8, 0, 0, 0)),
                                type: "walk",
                                duration: 30,
                                distance: 2.1,
                                distanceUnit: "km",
                                intensity: "moderate",
                                location: {
                                    name: "Neighborhood Park"
                                },
                                weatherConditions: {
                                    temperature: 18,
                                    temperatureUnit: "C",
                                    condition: "sunny",
                                    humidity: 65
                                },
                                mood: "energetic",
                                caloriesBurned: 120
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 2)),
                                startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 0, 0, 0)),
                                endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 45, 0, 0)),
                                type: "play",
                                duration: 45,
                                intensity: "high",
                                location: {
                                    name: "Backyard"
                                },
                                weatherConditions: {
                                    temperature: 22,
                                    temperatureUnit: "C",
                                    condition: "cloudy"
                                },
                                companions: ["Max", "Bella"],
                                notes: "Played fetch and tug-of-war with neighboring dogs",
                                mood: "happy",
                                caloriesBurned: 180
                            },
                            {
                                id: (0, helpers_1.generateUUID)(),
                                petId: petId,
                                date: new Date(new Date().setDate(new Date().getDate() - 3)),
                                startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 0, 0, 0)),
                                endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 30, 0, 0)),
                                type: "training",
                                duration: 30,
                                intensity: "moderate",
                                location: {
                                    name: "Home"
                                },
                                notes: "Practiced recall commands and leash walking",
                                mood: "energetic",
                                caloriesBurned: 90
                            }
                        ];
                        // Save all the data to AsyncStorage
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.PETS, [pet])];
                    case 1:
                        // Save all the data to AsyncStorage
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.TASKS, tasks)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.MEALS, meals)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.FOOD_ITEMS, foodItems)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.MEDICATIONS, medications)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.HEALTH_RECORDS, healthRecords)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.WEIGHT_RECORDS, weightRecords)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS, activitySessions)];
                    case 8:
                        _a.sent();
                        // Set this pet as the active pet
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVE_PET_ID, petId)];
                    case 9:
                        // Set this pet as the active pet
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset the database to its initial state
     */
    DatabaseManager.prototype.resetDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.clear()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.setDefaultValues()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem('dbInitialized', true)];
                    case 3:
                        _a.sent();
                        console.log('Database reset completed');
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error('Error resetting database:', error_2);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Export the database to a JSON string
     * @returns Database as a JSON string
     */
    DatabaseManager.prototype.exportDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var exportData, keys, _i, keys_1, key, _a, _b, error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 6, , 7]);
                        exportData = {};
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getAllKeys()];
                    case 1:
                        keys = _c.sent();
                        _i = 0, keys_1 = keys;
                        _c.label = 2;
                    case 2:
                        if (!(_i < keys_1.length)) return [3 /*break*/, 5];
                        key = keys_1[_i];
                        _a = exportData;
                        _b = key;
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem(key)];
                    case 3:
                        _a[_b] = _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, JSON.stringify(exportData)];
                    case 6:
                        error_3 = _c.sent();
                        console.error('Error exporting database:', error_3);
                        throw error_3;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Import data from a JSON string
     * @param jsonData JSON string containing database data
     */
    DatabaseManager.prototype.importDatabase = function (jsonData) {
        return __awaiter(this, void 0, void 0, function () {
            var importData, _i, _a, _b, key, value, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 6, , 7]);
                        importData = JSON.parse(jsonData);
                        // Clear the existing database
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.clear()];
                    case 1:
                        // Clear the existing database
                        _c.sent();
                        _i = 0, _a = Object.entries(importData);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        _b = _a[_i], key = _b[0], value = _b[1];
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(key, value)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log('Database import completed');
                        return [3 /*break*/, 7];
                    case 6:
                        error_4 = _c.sent();
                        console.error('Error importing database:', error_4);
                        throw error_4;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return DatabaseManager;
}());
exports.DatabaseManager = DatabaseManager;
// Export singleton instance
exports.databaseManager = new DatabaseManager();
/**
 * Migrates existing pets that don't have a userId to assign them to the given user
 * @param userId The ID of the user to assign pets to
 * @returns Promise that resolves when migration is complete
 */
function migratePetsToUser(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var allPets, petsToMigrate, _i, petsToMigrate_1, pet, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    console.log("Migrating pets without userId to user: ".concat(userId));
                    return [4 /*yield*/, exports.databaseManager.pets.getAll()];
                case 1:
                    allPets = _a.sent();
                    petsToMigrate = allPets.filter(function (pet) { return !pet.userId; });
                    if (!(petsToMigrate.length > 0)) return [3 /*break*/, 6];
                    console.log("Found ".concat(petsToMigrate.length, " pets without userId, assigning to current user"));
                    _i = 0, petsToMigrate_1 = petsToMigrate;
                    _a.label = 2;
                case 2:
                    if (!(_i < petsToMigrate_1.length)) return [3 /*break*/, 5];
                    pet = petsToMigrate_1[_i];
                    return [4 /*yield*/, exports.databaseManager.pets.update(pet.id, { userId: userId })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("Migration complete: ".concat(petsToMigrate.length, " pets updated with userId: ").concat(userId));
                    return [3 /*break*/, 7];
                case 6:
                    console.log('No pets need migration');
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_5 = _a.sent();
                    console.error('Error migrating pets:', error_5);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create the chat tables if they don't exist
 */
var createChatTables = function () { return __awaiter(void 0, void 0, void 0, function () {
    var sessionsError, messagesError, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, supabase_1.supabase.from('chat_sessions').select('count').limit(1)];
            case 1:
                sessionsError = (_a.sent()).error;
                if (sessionsError && sessionsError.code === '42P01') {
                    console.log('Chat tables not found. You need to create them in Supabase.');
                    console.log('Run the following SQL in the Supabase SQL Editor:');
                    console.log(migrations_1.createChatTablesSQL);
                    // Alert the user
                    alert("The Pet Assistant requires database tables that don't exist yet. \n      \nPlease log into the Supabase dashboard and run the SQL shown in the console to create the required tables.");
                    return [2 /*return*/, false];
                }
                return [4 /*yield*/, supabase_1.supabase.from('chat_messages').select('count').limit(1)];
            case 2:
                messagesError = (_a.sent()).error;
                if (messagesError && messagesError.code === '42P01') {
                    console.log('Chat messages table not found but sessions table exists. Running SQL to create it.');
                    console.log('Run the following SQL in the Supabase SQL Editor:');
                    console.log(migrations_1.createChatTablesSQL);
                    // Alert the user
                    alert("The Pet Assistant requires the chat_messages table. \n      \nPlease log into the Supabase dashboard and run the SQL shown in the console to create the required tables.");
                    return [2 /*return*/, false];
                }
                // Both tables exist
                return [2 /*return*/, !sessionsError && !messagesError];
            case 3:
                error_6 = _a.sent();
                console.error('Error checking for chat tables:', error_6);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.createChatTables = createChatTables;
