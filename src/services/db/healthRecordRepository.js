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
exports.HealthRecordRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
/**
 * Repository for managing HealthRecord entities
 */
var HealthRecordRepository = /** @class */ (function (_super) {
    __extends(HealthRecordRepository, _super);
    function HealthRecordRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.HEALTH_RECORDS) || this;
    }
    HealthRecordRepository.prototype.petHealthRecordsKey = function (petId) {
        return constants_1.RELATED_KEYS.PET_HEALTH_RECORDS(petId);
    };
    /**
     * Get all health records for a specific pet
     * @param petId Pet ID
     * @returns Array of health records for the pet
     */
    HealthRecordRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (record) { return record.petId === petId; })];
            });
        });
    };
    /**
     * Get health records for a pet by type
     * @param petId Pet ID
     * @param type Health record type
     * @returns Array of health records for the pet with the given type
     */
    HealthRecordRepository.prototype.getByPetIdAndType = function (petId, type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (record) { return record.petId === petId && record.type === type; })];
            });
        });
    };
    /**
     * Get health records for a date range
     * @param petId Pet ID
     * @param startDate Start date
     * @param endDate End date
     * @returns Array of health records within the date range
     */
    HealthRecordRepository.prototype.getByDateRange = function (petId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end;
            return __generator(this, function (_a) {
                start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return [2 /*return*/, this.find(function (record) {
                        // Check if the record is for the specified pet
                        if (record.petId !== petId)
                            return false;
                        // Check if the record is within the date range
                        var recordDate = new Date(record.date);
                        return recordDate >= start && recordDate <= end;
                    })];
            });
        });
    };
    /**
     * Get records that require follow-up
     * @param petId Pet ID
     * @returns Array of health records that need follow-up
     */
    HealthRecordRepository.prototype.getFollowUpNeeded = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (record) {
                        return record.petId === petId &&
                            record.followUpNeeded === true &&
                            record.status !== 'completed';
                    })];
            });
        });
    };
    /**
     * Get upcoming follow-up records
     * @param petId Pet ID
     * @param days Number of days in the future to look
     * @returns Array of health records with upcoming follow-ups
     */
    HealthRecordRepository.prototype.getUpcomingFollowUps = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, days) {
            var now, future;
            if (days === void 0) { days = 7; }
            return __generator(this, function (_a) {
                now = new Date();
                future = new Date();
                future.setDate(future.getDate() + days);
                return [2 /*return*/, this.find(function (record) {
                        // Check if the record is for the specified pet
                        if (record.petId !== petId)
                            return false;
                        // Check if follow-up is needed and not completed
                        if (!record.followUpNeeded || record.status === 'completed')
                            return false;
                        // Check if follow-up date is within the specified range
                        if (!record.followUpDate)
                            return false;
                        var followUpDate = new Date(record.followUpDate);
                        return followUpDate >= now && followUpDate <= future;
                    })];
            });
        });
    };
    /**
     * Mark a health record as completed
     * @param id Health record ID
     * @returns Updated health record if found, null otherwise
     */
    HealthRecordRepository.prototype.markAsCompleted = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.update(id, {
                        status: 'completed'
                    })];
            });
        });
    };
    /**
     * Get total cost of health records for a date range
     * @param petId Pet ID
     * @param startDate Start date
     * @param endDate End date
     * @returns Total cost of health records
     */
    HealthRecordRepository.prototype.getTotalCost = function (petId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getByDateRange(petId, startDate, endDate)];
                    case 1:
                        records = _a.sent();
                        return [2 /*return*/, records.reduce(function (total, record) { return total + record.cost; }, 0)];
                }
            });
        });
    };
    /**
     * Get latest health record for a pet
     * @param petId Pet ID
     * @returns Most recent health record
     */
    HealthRecordRepository.prototype.getLatest = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getByPetId(petId)];
                    case 1:
                        records = _a.sent();
                        if (records.length === 0) {
                            return [2 /*return*/, null];
                        }
                        // Sort by date in descending order
                        records.sort(function (a, b) {
                            var aDate = new Date(a.date).getTime();
                            var bDate = new Date(b.date).getTime();
                            return bDate - aDate;
                        });
                        return [2 /*return*/, records[0]];
                }
            });
        });
    };
    /**
     * Get health records by provider
     * @param provider Provider name
     * @returns Array of health records from the given provider
     */
    HealthRecordRepository.prototype.getByProvider = function (provider) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (record) {
                        return record.provider.name.toLowerCase().includes(provider.toLowerCase());
                    })];
            });
        });
    };
    return HealthRecordRepository;
}(repository_1.BaseRepository));
exports.HealthRecordRepository = HealthRecordRepository;
