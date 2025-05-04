"use strict";
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
exports.checkPetsTableExists = exports.forceSyncPetsToSupabase = exports.loadRemotePets = exports.loadLocalPets = void 0;
exports.createPetForSupabase = createPetForSupabase;
var async_storage_1 = require("@react-native-async-storage/async-storage");
var supabase_1 = require("../services/supabase");
var pet_1 = require("../types/pet");
var syncStorage_1 = require("./syncStorage");
var auth_1 = require("../services/auth");
var KEYS = {
    PETS: 'pets',
};
/**
 * Creates a properly formatted pet object for Supabase that matches the actual table schema
 * Only includes fields that exist in the Supabase pets table
 */
function createPetForSupabase(pet) {
    // Only include fields that actually exist in the Supabase schema
    return {
        id: pet.id,
        user_id: pet.userId,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        birth_date: pet.birthDate ? new Date(pet.birthDate).toISOString() : null,
        gender: pet.gender,
        weight: pet.weight || null,
        weight_unit: pet.weightUnit || null,
        microchipped: pet.microchipped || null,
        microchip_id: pet.microchipId || null,
        neutered: pet.neutered || null,
        adoption_date: pet.adoptionDate ? new Date(pet.adoptionDate).toISOString() : null,
        color: pet.color || null,
        image: pet.image || null,
        medical_conditions: pet.medicalConditions || [],
        allergies: pet.allergies || [],
        status: pet.status || 'healthy',
        created_at: new Date().toISOString()
    };
}
/**
 * Loads all pets from AsyncStorage
 */
var loadLocalPets = function () { return __awaiter(void 0, void 0, void 0, function () {
    var petsJson, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, async_storage_1.default.getItem(KEYS.PETS)];
            case 1:
                petsJson = _a.sent();
                if (!petsJson)
                    return [2 /*return*/, []];
                return [2 /*return*/, JSON.parse(petsJson)];
            case 2:
                error_1 = _a.sent();
                console.error('Error loading local pets:', error_1);
                return [2 /*return*/, []];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.loadLocalPets = loadLocalPets;
/**
 * Loads all pets from Supabase for the current user
 */
var loadRemotePets = function () { return __awaiter(void 0, void 0, void 0, function () {
    var user, _a, data, error, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, auth_1.getUser)()];
            case 1:
                user = _b.sent();
                if (!user) {
                    console.log('No authenticated user');
                    return [2 /*return*/, []];
                }
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('*')
                        .eq('user_id', user.id)];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error) {
                    console.error('Error loading remote pets:', error);
                    return [2 /*return*/, []];
                }
                // Convert from DB format to Pet objects
                return [2 /*return*/, (data || []).map(function (pet) { return (0, pet_1.dbFormatToPet)(pet); })];
            case 3:
                error_2 = _b.sent();
                console.error('Error loading remote pets:', error_2);
                return [2 /*return*/, []];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.loadRemotePets = loadRemotePets;
/**
 * Force synchronize all local pets to Supabase
 */
var forceSyncPetsToSupabase = function () { return __awaiter(void 0, void 0, void 0, function () {
    var result, user, localPets, _i, localPets_1, pet, petData, _a, existingPet, checkError, updateError, insertError, petError_1, errorMessage, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                result = {
                    success: false,
                    totalPets: 0,
                    syncedPets: 0,
                    errors: [],
                };
                _b.label = 1;
            case 1:
                _b.trys.push([1, 16, , 17]);
                return [4 /*yield*/, (0, auth_1.getUser)()];
            case 2:
                user = _b.sent();
                if (!user) {
                    throw new Error('No authenticated user');
                }
                return [4 /*yield*/, (0, exports.loadLocalPets)()];
            case 3:
                localPets = _b.sent();
                result.totalPets = localPets.length;
                _i = 0, localPets_1 = localPets;
                _b.label = 4;
            case 4:
                if (!(_i < localPets_1.length)) return [3 /*break*/, 13];
                pet = localPets_1[_i];
                _b.label = 5;
            case 5:
                _b.trys.push([5, 11, , 12]);
                petData = createPetForSupabase(pet);
                // Ensure user_id is set correctly
                petData.user_id = user.id;
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('id')
                        .eq('id', pet.id)
                        .eq('user_id', user.id)
                        .single()];
            case 6:
                _a = _b.sent(), existingPet = _a.data, checkError = _a.error;
                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
                    throw new Error("Error checking pet existence: ".concat(checkError.message));
                }
                if (!existingPet) return [3 /*break*/, 8];
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .update(petData)
                        .eq('id', pet.id)
                        .eq('user_id', user.id)];
            case 7:
                updateError = (_b.sent()).error;
                if (updateError) {
                    throw new Error("Error updating pet: ".concat(updateError.message));
                }
                return [3 /*break*/, 10];
            case 8: return [4 /*yield*/, supabase_1.supabase
                    .from('pets')
                    .insert([petData])];
            case 9:
                insertError = (_b.sent()).error;
                if (insertError) {
                    throw new Error("Error inserting pet: ".concat(insertError.message));
                }
                _b.label = 10;
            case 10:
                result.syncedPets++;
                return [3 /*break*/, 12];
            case 11:
                petError_1 = _b.sent();
                errorMessage = petError_1 instanceof Error ? petError_1.message : 'Unknown error';
                result.errors.push({
                    petId: pet.id,
                    error: errorMessage,
                });
                console.error("Error syncing pet ".concat(pet.id, ":"), petError_1);
                return [3 /*break*/, 12];
            case 12:
                _i++;
                return [3 /*break*/, 4];
            case 13:
                if (!(result.syncedPets > 0)) return [3 /*break*/, 15];
                return [4 /*yield*/, (0, syncStorage_1.saveLastSyncTime)(new Date().toISOString())];
            case 14:
                _b.sent();
                _b.label = 15;
            case 15:
                result.success = result.errors.length === 0;
                return [2 /*return*/, result];
            case 16:
                error_3 = _b.sent();
                console.error('Error in forceSyncPetsToSupabase:', error_3);
                result.success = false;
                return [2 /*return*/, result];
            case 17: return [2 /*return*/];
        }
    });
}); };
exports.forceSyncPetsToSupabase = forceSyncPetsToSupabase;
/**
 * Checks if the pets table exists in Supabase
 */
var checkPetsTableExists = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error, error_4, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('id')
                        .limit(1)];
            case 1:
                error = (_a.sent()).error;
                // If there's no error, the table exists
                if (!error) {
                    return [2 /*return*/, { exists: true }];
                }
                // If the error is related to the table not existing
                if (error.code === '42P01') { // PostgreSQL code for undefined_table
                    return [2 /*return*/, { exists: false, error: 'Pets table does not exist' }];
                }
                // Other errors might indicate permission issues
                return [2 /*return*/, { exists: false, error: "Error checking pets table: ".concat(error.message) }];
            case 2:
                error_4 = _a.sent();
                errorMessage = error_4 instanceof Error ? error_4.message : 'Unknown error';
                return [2 /*return*/, { exists: false, error: "Exception checking pets table: ".concat(errorMessage) }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.checkPetsTableExists = checkPetsTableExists;
