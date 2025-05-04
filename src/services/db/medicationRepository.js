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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicationRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
/**
 * Repository for managing Medication entities
 */
var MedicationRepository = /** @class */ (function (_super) {
    __extends(MedicationRepository, _super);
    function MedicationRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.MEDICATIONS) || this;
    }
    MedicationRepository.prototype.petMedicationsKey = function (petId) {
        return constants_1.RELATED_KEYS.PET_MEDICATIONS(petId);
    };
    /**
     * Get medications for a specific pet
     * @param petId Pet ID
     * @returns Array of medications for the pet
     */
    MedicationRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) { return medication.petId === petId; })];
            });
        });
    };
    /**
     * Get active medications for a specific pet
     * @param petId Pet ID
     * @returns Array of active medications for the pet
     */
    MedicationRepository.prototype.getActiveByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) {
                        return medication.petId === petId &&
                            medication.status === 'active';
                    })];
            });
        });
    };
    /**
     * Get medications by type
     * @param type Medication type
     * @returns Array of medications with the given type
     */
    MedicationRepository.prototype.getByType = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) { return medication.type === type; })];
            });
        });
    };
    /**
     * Get medications by status
     * @param status Medication status
     * @returns Array of medications with the given status
     */
    MedicationRepository.prototype.getByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) { return medication.status === status; })];
            });
        });
    };
    /**
     * Get medications that are due within a specific time period
     * @param petId Pet ID
     * @param hours Number of hours to look ahead
     * @returns Array of medications due within the specified hours
     */
    MedicationRepository.prototype.getDueWithinHours = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, hours) {
            var now, futureTime;
            if (hours === void 0) { hours = 24; }
            return __generator(this, function (_a) {
                now = new Date();
                futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
                return [2 /*return*/, this.find(function (medication) {
                        // Check if the medication is for the specified pet
                        if (medication.petId !== petId)
                            return false;
                        // Check if the medication is active
                        if (medication.status !== 'active')
                            return false;
                        // Check if the next due date is within the time period
                        if (!medication.history || medication.history.length === 0) {
                            // If no history, use start date as reference
                            var startDate = new Date(medication.duration.startDate);
                            return startDate <= futureTime;
                        }
                        // Sort history entries by date (newest first)
                        var sortedHistory = __spreadArray([], medication.history, true).sort(function (a, b) {
                            return new Date(b.date).getTime() - new Date(a.date).getTime();
                        });
                        // Get the most recent entry
                        var lastEntry = sortedHistory[0];
                        var lastEntryDate = new Date(lastEntry.date);
                        // Calculate when the next dose is due based on frequency
                        var nextDueDate = new Date(lastEntryDate);
                        if (medication.frequency.period === 'day') {
                            nextDueDate.setDate(nextDueDate.getDate() + (1 / medication.frequency.times));
                        }
                        else if (medication.frequency.period === 'week') {
                            nextDueDate.setDate(nextDueDate.getDate() + (7 / medication.frequency.times));
                        }
                        else if (medication.frequency.period === 'month') {
                            nextDueDate.setDate(nextDueDate.getDate() + (30 / medication.frequency.times));
                        }
                        return nextDueDate <= futureTime;
                    })];
            });
        });
    };
    /**
     * Get medications with low inventory
     * @param petId Pet ID
     * @returns Array of medications with inventory below threshold
     */
    MedicationRepository.prototype.getLowInventory = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) {
                        return medication.petId === petId &&
                            medication.inventory.currentAmount <= medication.inventory.lowStockThreshold;
                    })];
            });
        });
    };
    /**
     * Add an administration record to a medication
     * @param id Medication ID
     * @param administered Whether the medication was administered
     * @param notes Optional notes about the administration
     * @param administeredBy Optional name of who administered the medication
     * @returns Updated medication if found, null otherwise
     */
    MedicationRepository.prototype.addAdministrationRecord = function (id, administered, notes, administeredBy) {
        return __awaiter(this, void 0, void 0, function () {
            var medication, historyEntry, updatedHistory, updatedInventory;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        medication = _a.sent();
                        if (!medication) {
                            return [2 /*return*/, null];
                        }
                        historyEntry = {
                            date: new Date(),
                            administered: administered,
                            skipped: !administered,
                            notes: notes,
                            administeredBy: administeredBy
                        };
                        updatedHistory = __spreadArray(__spreadArray([], (medication.history || []), true), [historyEntry], false);
                        updatedInventory = __assign({}, medication.inventory);
                        if (administered && medication.inventory) {
                            updatedInventory = __assign(__assign({}, medication.inventory), { currentAmount: Math.max(0, medication.inventory.currentAmount - medication.dosage.amount) });
                        }
                        return [2 /*return*/, this.update(id, {
                                history: updatedHistory,
                                inventory: updatedInventory
                            })];
                }
            });
        });
    };
    /**
     * Update medication status
     * @param id Medication ID
     * @param status New status
     * @returns Updated medication if found, null otherwise
     */
    MedicationRepository.prototype.updateStatus = function (id, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.update(id, { status: status })];
            });
        });
    };
    /**
     * Get medications that need refill
     * @param petId Pet ID
     * @returns Array of medications that need refill
     */
    MedicationRepository.prototype.getNeedingRefill = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) {
                        return medication.petId === petId &&
                            medication.status === 'active' &&
                            medication.refillable &&
                            (medication.refillsRemaining !== undefined && medication.refillsRemaining > 0) &&
                            medication.inventory.currentAmount <= medication.inventory.lowStockThreshold &&
                            medication.inventory.reorderAlert;
                    })];
            });
        });
    };
    /**
     * Get medications by administration method
     * @param method Administration method
     * @returns Array of medications with the given administration method
     */
    MedicationRepository.prototype.getByAdministrationMethod = function (method) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) { return medication.administrationMethod === method; })];
            });
        });
    };
    /**
     * Get medications by prescription provider
     * @param provider Name of the provider who prescribed the medication
     * @returns Array of medications prescribed by the given provider
     */
    MedicationRepository.prototype.getByProvider = function (provider) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (medication) {
                        return medication.prescribedBy.toLowerCase().includes(provider.toLowerCase());
                    })];
            });
        });
    };
    return MedicationRepository;
}(repository_1.BaseRepository));
exports.MedicationRepository = MedicationRepository;
