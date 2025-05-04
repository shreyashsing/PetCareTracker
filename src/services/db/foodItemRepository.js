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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodItemRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
var notifications_1 = require("../notifications");
/**
 * Repository for managing FoodItem entities
 */
var FoodItemRepository = /** @class */ (function (_super) {
    __extends(FoodItemRepository, _super);
    function FoodItemRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.FOOD_ITEMS) || this;
    }
    /**
     * Get all food items for a specific pet
     * @param petId Pet ID
     * @returns Array of food items for the pet
     */
    FoodItemRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (item) { return item.petId === petId; })];
            });
        });
    };
    /**
     * Get food items by category
     * @param petId Pet ID
     * @param category Food category
     * @returns Array of food items in the given category
     */
    FoodItemRepository.prototype.getByCategory = function (petId, category) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (item) { return item.petId === petId && item.category === category; })];
            });
        });
    };
    /**
     * Get food items that are low in stock
     * @param petId Pet ID
     * @returns Array of food items that are low in stock
     */
    FoodItemRepository.prototype.getLowStock = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (item) {
                        var inventory = item.inventory;
                        return (item.petId === petId &&
                            inventory.currentAmount <= inventory.lowStockThreshold);
                    })];
            });
        });
    };
    /**
     * Get food items by pet preference
     * @param petId Pet ID
     * @param preference Pet preference
     * @returns Array of food items with the given preference
     */
    FoodItemRepository.prototype.getByPreference = function (petId, preference) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (item) {
                        return item.petId === petId &&
                            item.petPreference === preference;
                    })];
            });
        });
    };
    /**
     * Get food items that are expiring soon
     * @param petId Pet ID
     * @param daysThreshold Number of days to check for expiry
     * @returns Array of food items expiring within the threshold
     */
    FoodItemRepository.prototype.getExpiringSoon = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, daysThreshold) {
            var now, future;
            if (daysThreshold === void 0) { daysThreshold = 30; }
            return __generator(this, function (_a) {
                now = new Date();
                future = new Date();
                future.setDate(future.getDate() + daysThreshold);
                return [2 /*return*/, this.find(function (item) {
                        // Check if the item is for the specified pet
                        if (item.petId !== petId)
                            return false;
                        // Check if there's an expiry date
                        if (!item.purchaseDetails.expiryDate)
                            return false;
                        // Check if the expiry date is within the threshold
                        var expiryDate = new Date(item.purchaseDetails.expiryDate);
                        return expiryDate >= now && expiryDate <= future;
                    })];
            });
        });
    };
    /**
     * Get food items sorted by rating
     * @param petId Pet ID
     * @param ascending Whether to sort in ascending order
     * @returns Array of food items sorted by rating
     */
    FoodItemRepository.prototype.getSortedByRating = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, ascending) {
            var items;
            if (ascending === void 0) { ascending = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getByPetId(petId)];
                    case 1:
                        items = _a.sent();
                        return [2 /*return*/, items.sort(function (a, b) {
                                var comparison = a.rating - b.rating;
                                return ascending ? comparison : -comparison;
                            })];
                }
            });
        });
    };
    /**
     * Update inventory amount
     * @param id Food item ID
     * @param newAmount New amount
     * @returns Updated food item if found, null otherwise
     */
    FoodItemRepository.prototype.updateInventory = function (id, newAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var foodItem, daysRemaining, updatedInventory, isLowStock, wasLowStock, updatedFoodItem;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getById(id)];
                    case 1:
                        foodItem = _a.sent();
                        if (!foodItem) {
                            return [2 /*return*/, null];
                        }
                        daysRemaining = Math.floor(newAmount / foodItem.inventory.dailyFeedingAmount);
                        updatedInventory = __assign(__assign({}, foodItem.inventory), { currentAmount: newAmount, daysRemaining: daysRemaining, reorderAlert: daysRemaining <= foodItem.inventory.lowStockThreshold });
                        isLowStock = daysRemaining <= foodItem.inventory.lowStockThreshold;
                        wasLowStock = foodItem.inventory.currentAmount <= foodItem.inventory.lowStockThreshold;
                        return [4 /*yield*/, this.update(id, __assign(__assign({}, foodItem), { inventory: updatedInventory, lowStock: isLowStock }))];
                    case 2:
                        updatedFoodItem = _a.sent();
                        if (!(isLowStock && !wasLowStock && updatedFoodItem)) return [3 /*break*/, 4];
                        return [4 /*yield*/, notifications_1.notificationService.scheduleInventoryAlert(updatedFoodItem)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, updatedFoodItem];
                }
            });
        });
    };
    /**
     * Get food items with specific allergens
     * @param petId Pet ID
     * @param allergen Allergen to search for
     * @returns Array of food items containing the allergen
     * @throws Error if allergen parameter is empty
     */
    FoodItemRepository.prototype.getWithAllergen = function (petId, allergen) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!allergen.trim()) {
                    throw new Error('Allergen parameter cannot be empty');
                }
                return [2 /*return*/, this.find(function (item) {
                        // Check if the item is for the specified pet
                        if (item.petId !== petId)
                            return false;
                        // Check if the item has allergens
                        if (!item.nutritionalInfo.allergens || item.nutritionalInfo.allergens.length === 0) {
                            return false;
                        }
                        // Check if any of the allergens match (case-insensitive)
                        var searchAllergen = allergen.toLowerCase().trim();
                        return item.nutritionalInfo.allergens.some(function (a) {
                            return a.toLowerCase().trim() === searchAllergen;
                        });
                    })];
            });
        });
    };
    /**
     * Get all veterinarian approved food items
     * @param petId Pet ID
     * @returns Array of veterinarian approved food items
     */
    FoodItemRepository.prototype.getVeterinarianApproved = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (item) {
                        return item.petId === petId &&
                            item.veterinarianApproved === true;
                    })];
            });
        });
    };
    return FoodItemRepository;
}(repository_1.BaseRepository));
exports.FoodItemRepository = FoodItemRepository;
