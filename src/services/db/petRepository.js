"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.PetRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
var supabase_1 = require("../../services/supabase");
var petSync_1 = require("../../utils/petSync");
/**
 * Repository for managing Pet entities
 */
var PetRepository = /** @class */ (function (_super) {
    __extends(PetRepository, _super);
    function PetRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.PETS) || this;
    }
    /**
     * Override create method to save to both AsyncStorage and Supabase
     * @param pet Pet to create
     * @returns Created pet
     */
    PetRepository.prototype.create = function (pet) {
        return __awaiter(this, void 0, void 0, function () {
            var petData, _a, data, error, supabaseError_1, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('PetRepository.create called with pet:', JSON.stringify({
                            id: pet.id,
                            name: pet.name,
                            userId: pet.userId
                        }));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        // First save to AsyncStorage (using parent implementation)
                        return [4 /*yield*/, _super.prototype.create.call(this, pet)];
                    case 2:
                        // First save to AsyncStorage (using parent implementation)
                        _b.sent();
                        console.log('Pet saved to AsyncStorage successfully');
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        petData = (0, petSync_1.createPetForSupabase)(pet);
                        console.log('Attempting to save pet to Supabase:', JSON.stringify({
                            id: petData.id,
                            name: petData.name,
                            user_id: petData.user_id
                        }));
                        return [4 /*yield*/, supabase_1.supabase
                                .from('pets')
                                .insert([petData])
                                .select()
                                .single()];
                    case 4:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error creating pet in Supabase:', error);
                            console.error('Error details:', JSON.stringify(error));
                            // Additional diagnostics for specific error types
                            if (error.code === '42P01') {
                                console.error('The pets table does not exist in Supabase');
                            }
                            else if (error.code === '42703') {
                                console.error('Column error - schema mismatch between app and Supabase');
                                console.error('Error message:', error.message);
                                // Log the full petData object to see what fields might be causing issues
                                console.error('Pet data structure:', Object.keys(petData).join(', '));
                            }
                            else if (error.code === '23505') {
                                console.error('Unique constraint violation - pet ID already exists');
                            }
                            else if (error.code === '23503') {
                                console.error('Foreign key constraint violation - user_id may not exist');
                            }
                            console.log('Pet was saved to local storage only. Will sync later when Supabase is available.');
                        }
                        else {
                            console.log('Pet saved to Supabase successfully:', data);
                            return [2 /*return*/, (0, supabase_1.snakeToCamel)(data)];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        supabaseError_1 = _b.sent();
                        console.error('Exception saving to Supabase:', supabaseError_1);
                        console.log('Pet was saved to local storage only. Will sync later when Supabase is available.');
                        return [3 /*break*/, 6];
                    case 6: 
                    // Return the pet regardless of whether Supabase save succeeded
                    return [2 /*return*/, pet];
                    case 7:
                        error_1 = _b.sent();
                        console.error('Exception creating pet in repository:', error_1);
                        throw error_1;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find pets by user ID
     * @param userId User ID
     * @returns Array of pets belonging to the user
     */
    PetRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, e_1, localPets;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('pets')
                                .select('*')
                                .eq('user_id', userId)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error("Error fetching pets for user ".concat(userId, " from Supabase:"), error);
                            // Fall back to local storage
                            return [2 /*return*/, this.find(function (pet) { return pet.userId === userId; })];
                        }
                        if (data && data.length > 0) {
                            console.log("Found ".concat(data.length, " pets in Supabase for user ").concat(userId));
                            return [2 /*return*/, (0, supabase_1.snakeToCamel)(data)];
                        }
                        else {
                            console.log("No pets found in Supabase for user ".concat(userId, ", checking local storage..."));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _b.sent();
                        console.error('Exception fetching pets from Supabase:', e_1);
                        return [3 /*break*/, 3];
                    case 3: return [4 /*yield*/, this.find(function (pet) { return pet.userId === userId; })];
                    case 4:
                        localPets = _b.sent();
                        console.log("Found ".concat(localPets.length, " pets in local storage for user ").concat(userId));
                        return [2 /*return*/, localPets];
                }
            });
        });
    };
    /**
     * Find pets by type
     * @param type Pet type
     * @returns Array of pets with the given type
     */
    PetRepository.prototype.findByType = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (pet) { return pet.type === type; })];
            });
        });
    };
    /**
     * Find pets by health status
     * @param status Health status
     * @returns Array of pets with the given status
     */
    PetRepository.prototype.findByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (pet) { return pet.status === status; })];
            });
        });
    };
    /**
     * Find pets with a specific health condition
     * @param condition Health condition to search for
     * @returns Array of pets with the given condition
     */
    PetRepository.prototype.findByMedicalCondition = function (condition) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (pet) {
                        return pet.medicalConditions.some(function (c) {
                            return c.toLowerCase().includes(condition.toLowerCase());
                        });
                    })];
            });
        });
    };
    /**
     * Find pets with a specific allergy
     * @param allergy Allergy to search for
     * @returns Array of pets with the given allergy
     */
    PetRepository.prototype.findByAllergy = function (allergy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (pet) {
                        return pet.allergies.some(function (a) {
                            return a.toLowerCase().includes(allergy.toLowerCase());
                        });
                    })];
            });
        });
    };
    /**
     * Get pets sorted by name
     * @param ascending Whether to sort in ascending order
     * @returns Array of pets sorted by name
     */
    PetRepository.prototype.getSortedByName = function () {
        return __awaiter(this, arguments, void 0, function (ascending) {
            var pets;
            if (ascending === void 0) { ascending = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAll()];
                    case 1:
                        pets = _a.sent();
                        return [2 /*return*/, pets.sort(function (a, b) {
                                var comparison = a.name.localeCompare(b.name);
                                return ascending ? comparison : -comparison;
                            })];
                }
            });
        });
    };
    /**
     * Get pets sorted by age
     * @param ascending Whether to sort in ascending order
     * @returns Array of pets sorted by age
     */
    PetRepository.prototype.getSortedByAge = function () {
        return __awaiter(this, arguments, void 0, function (ascending) {
            var pets;
            if (ascending === void 0) { ascending = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAll()];
                    case 1:
                        pets = _a.sent();
                        return [2 /*return*/, pets.sort(function (a, b) {
                                var aAge = a.birthDate.getTime();
                                var bAge = b.birthDate.getTime();
                                // Older pets (smaller birthDate value) are considered to have higher age
                                var comparison = bAge - aAge;
                                return ascending ? comparison : -comparison;
                            })];
                }
            });
        });
    };
    return PetRepository;
}(repository_1.BaseRepository));
exports.PetRepository = PetRepository;
