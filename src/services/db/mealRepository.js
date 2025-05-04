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
exports.MealRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
/**
 * Repository for managing Meal entities
 */
var MealRepository = /** @class */ (function (_super) {
    __extends(MealRepository, _super);
    function MealRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.MEALS) || this;
    }
    MealRepository.prototype.petMealsKey = function (petId) {
        return constants_1.RELATED_KEYS.PET_MEALS(petId);
    };
    /**
     * Get all meals for a specific pet
     * @param petId Pet ID
     * @returns Array of meals for the pet
     */
    MealRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (meal) { return meal.petId === petId; })];
            });
        });
    };
    /**
     * Get meals for a specific date
     * @param date Date to get meals for
     * @returns Array of meals for the date
     */
    MealRepository.prototype.getByDate = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate;
            return __generator(this, function (_a) {
                targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                return [2 /*return*/, this.find(function (meal) {
                        var mealDate = new Date(meal.date);
                        mealDate.setHours(0, 0, 0, 0);
                        return mealDate.getTime() === targetDate.getTime();
                    })];
            });
        });
    };
    /**
     * Get meals for a pet on a specific date
     * @param petId Pet ID
     * @param date Date to get meals for
     * @returns Array of meals for the pet on the date
     */
    MealRepository.prototype.getByPetIdAndDate = function (petId, date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate;
            return __generator(this, function (_a) {
                targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                return [2 /*return*/, this.find(function (meal) {
                        var mealDate = new Date(meal.date);
                        mealDate.setHours(0, 0, 0, 0);
                        return meal.petId === petId && mealDate.getTime() === targetDate.getTime();
                    })];
            });
        });
    };
    /**
     * Mark a meal as completed
     * @param id Meal ID
     * @returns Updated meal if found, null otherwise
     */
    MealRepository.prototype.markAsCompleted = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.update(id, {
                        completed: true,
                        skipped: false
                    })];
            });
        });
    };
    /**
     * Mark a meal as skipped
     * @param id Meal ID
     * @returns Updated meal if found, null otherwise
     */
    MealRepository.prototype.markAsSkipped = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.update(id, {
                        completed: false,
                        skipped: true
                    })];
            });
        });
    };
    /**
     * Get meals by type
     * @param type Meal type
     * @returns Array of meals with the given type
     */
    MealRepository.prototype.getByType = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (meal) { return meal.type === type; })];
            });
        });
    };
    /**
     * Get upcoming meals for a pet
     * @param petId Pet ID
     * @param limit Maximum number of meals to return
     * @returns Array of upcoming meals for the pet
     */
    MealRepository.prototype.getUpcomingByPetId = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, limit) {
            var now, meals;
            if (limit === void 0) { limit = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        return [4 /*yield*/, this.find(function (meal) {
                                // Check if the meal is for the specified pet
                                if (meal.petId !== petId)
                                    return false;
                                // Check if the meal is not completed or skipped
                                if (meal.completed || meal.skipped)
                                    return false;
                                // Check if the meal is in the future or current
                                var mealDate = new Date(meal.date);
                                var mealTime = new Date(meal.time);
                                var mealDateTime = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate(), mealTime.getHours(), mealTime.getMinutes());
                                return mealDateTime >= now;
                            })];
                    case 1:
                        meals = _a.sent();
                        // Sort by date and time
                        meals.sort(function (a, b) {
                            var aDate = new Date(a.date);
                            var aTime = new Date(a.time);
                            var aDateTime = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate(), aTime.getHours(), aTime.getMinutes());
                            var bDate = new Date(b.date);
                            var bTime = new Date(b.time);
                            var bDateTime = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate(), bTime.getHours(), bTime.getMinutes());
                            return aDateTime.getTime() - bDateTime.getTime();
                        });
                        return [2 /*return*/, meals.slice(0, limit)];
                }
            });
        });
    };
    /**
     * Get total calories consumed by a pet for a date range
     * @param petId Pet ID
     * @param startDate Start date
     * @param endDate End date
     * @returns Total calories consumed
     */
    MealRepository.prototype.getTotalCaloriesByDateRange = function (petId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end, meals;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        return [4 /*yield*/, this.find(function (meal) {
                                // Check if the meal is for the specified pet
                                if (meal.petId !== petId)
                                    return false;
                                // Check if the meal is completed
                                if (!meal.completed)
                                    return false;
                                // Check if the meal is within the date range
                                var mealDate = new Date(meal.date);
                                return mealDate >= start && mealDate <= end;
                            })];
                    case 1:
                        meals = _a.sent();
                        // Sum up the calories
                        return [2 /*return*/, meals.reduce(function (total, meal) { return total + meal.totalCalories; }, 0)];
                }
            });
        });
    };
    /**
     * Get meals completed count by date range
     * @param petId Pet ID
     * @param startDate Start date
     * @param endDate End date
     * @returns Number of completed meals
     */
    MealRepository.prototype.getCompletedCountByDateRange = function (petId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end, meals;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        return [4 /*yield*/, this.find(function (meal) {
                                // Check if the meal is for the specified pet
                                if (meal.petId !== petId)
                                    return false;
                                // Check if the meal is completed
                                if (!meal.completed)
                                    return false;
                                // Check if the meal is within the date range
                                var mealDate = new Date(meal.date);
                                return mealDate >= start && mealDate <= end;
                            })];
                    case 1:
                        meals = _a.sent();
                        return [2 /*return*/, meals.length];
                }
            });
        });
    };
    return MealRepository;
}(repository_1.BaseRepository));
exports.MealRepository = MealRepository;
