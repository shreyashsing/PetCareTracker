"use strict";
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
exports.BaseRepository = void 0;
var asyncStorage_1 = require("./asyncStorage");
var validation_1 = require("../validation");
var react_native_1 = require("react-native");
/**
 * Base repository class for managing entities in AsyncStorage
 */
var BaseRepository = /** @class */ (function () {
    function BaseRepository(storageKey) {
        this.storageKey = storageKey;
    }
    /**
     * Get all entities
     * @returns Array of entities
     */
    BaseRepository.prototype.getAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem(this.storageKey)];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data || []];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Error getting all ".concat(this.storageKey, ":"), error_1);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get entity by ID
     * @param id Entity ID
     * @returns Entity if found, null otherwise
     */
    BaseRepository.prototype.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        return [2 /*return*/, entities.find(function (entity) { return entity.id === id; }) || null];
                    case 2:
                        error_2 = _a.sent();
                        console.error("Error getting ".concat(this.storageKey, " by id:"), error_2);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a new entity
     * @param entity Entity to create
     * @returns Created entity
     */
    BaseRepository.prototype.create = function (entity) {
        return __awaiter(this, void 0, void 0, function () {
            var schema, validation, errorMessage, entities, exists, updatedEntities, verifyEntities, savedEntity, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log('CREATE DEBUG: Creating entity in', this.storageKey);
                        // Validate the entity data using Zod schema if available
                        if (this.storageKey in validation_1.validationSchemas) {
                            schema = validation_1.validationSchemas[this.storageKey];
                            if (schema) {
                                validation = (0, validation_1.validateData)(entity, schema);
                                if (!validation.valid && validation.errors) {
                                    errorMessage = (0, validation_1.formatValidationErrors)(validation.errors);
                                    console.error("Validation failed for ".concat(this.storageKey, ":"), errorMessage);
                                    react_native_1.Alert.alert('Validation Error', errorMessage);
                                    throw new Error("Validation failed: ".concat(errorMessage));
                                }
                            }
                        }
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        exists = entities.some(function (e) { return e.id === entity.id; });
                        if (exists) {
                            console.error("CREATE DEBUG: Entity with id ".concat(entity.id, " already exists"));
                            throw new Error("".concat(this.storageKey, " with id ").concat(entity.id, " already exists"));
                        }
                        updatedEntities = __spreadArray(__spreadArray([], entities, true), [entity], false);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(this.storageKey, updatedEntities)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.getAll()];
                    case 3:
                        verifyEntities = _a.sent();
                        savedEntity = verifyEntities.find(function (e) { return e.id === entity.id; });
                        console.log('CREATE DEBUG: Entity saved successfully?', !!savedEntity);
                        return [2 /*return*/, entity];
                    case 4:
                        error_3 = _a.sent();
                        console.error("Error creating ".concat(this.storageKey, ":"), error_3);
                        throw error_3;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an existing entity
     * @param id Entity ID
     * @param update Updates to apply
     * @returns Updated entity if found, null otherwise
     */
    BaseRepository.prototype.update = function (id, update) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, entityIndex, updatedEntity, schema, validation, errorMessage, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        entityIndex = entities.findIndex(function (entity) { return entity.id === id; });
                        if (entityIndex === -1) {
                            return [2 /*return*/, null];
                        }
                        updatedEntity = __assign(__assign({}, entities[entityIndex]), update);
                        // Validate the updated entity data using Zod schema if available
                        if (this.storageKey in validation_1.validationSchemas) {
                            schema = validation_1.validationSchemas[this.storageKey];
                            if (schema) {
                                validation = (0, validation_1.validateData)(updatedEntity, schema);
                                if (!validation.valid && validation.errors) {
                                    errorMessage = (0, validation_1.formatValidationErrors)(validation.errors);
                                    console.error("Validation failed for ".concat(this.storageKey, " update:"), errorMessage);
                                    react_native_1.Alert.alert('Validation Error', errorMessage);
                                    throw new Error("Validation failed: ".concat(errorMessage));
                                }
                            }
                        }
                        entities[entityIndex] = updatedEntity;
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(this.storageKey, entities)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, updatedEntity];
                    case 3:
                        error_4 = _a.sent();
                        console.error("Error updating ".concat(this.storageKey, ":"), error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete an entity by ID
     * @param id Entity ID
     * @returns true if deleted, false if not found
     */
    BaseRepository.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, filteredEntities, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        filteredEntities = entities.filter(function (entity) { return entity.id !== id; });
                        if (filteredEntities.length === entities.length) {
                            // Entity not found
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(this.storageKey, filteredEntities)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_5 = _a.sent();
                        console.error("Error deleting ".concat(this.storageKey, ":"), error_5);
                        throw error_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete all entities
     */
    BaseRepository.prototype.deleteAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(this.storageKey, [])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        console.error("Error deleting all ".concat(this.storageKey, ":"), error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Count total entities
     * @returns Number of entities
     */
    BaseRepository.prototype.count = function () {
        return __awaiter(this, void 0, void 0, function () {
            var entities, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        return [2 /*return*/, entities.length];
                    case 2:
                        error_7 = _a.sent();
                        console.error("Error counting ".concat(this.storageKey, ":"), error_7);
                        return [2 /*return*/, 0];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if an entity with the given ID exists
     * @param id Entity ID
     * @returns true if exists, false otherwise
     */
    BaseRepository.prototype.exists = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var entity, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getById(id)];
                    case 1:
                        entity = _a.sent();
                        return [2 /*return*/, entity !== null];
                    case 2:
                        error_8 = _a.sent();
                        console.error("Error checking if ".concat(this.storageKey, " exists:"), error_8);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create multiple entities at once
     * @param entities Array of entities to create
     * @returns Created entities
     */
    BaseRepository.prototype.createMany = function (entities) {
        return __awaiter(this, void 0, void 0, function () {
            var existingEntities, existingIds_1, duplicates, schema, _i, entities_1, entity, validation, errorMessage, updatedEntities, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        existingEntities = _a.sent();
                        existingIds_1 = existingEntities.map(function (e) { return e.id; });
                        duplicates = entities.filter(function (e) { return existingIds_1.includes(e.id); });
                        if (duplicates.length > 0) {
                            throw new Error("Some ".concat(this.storageKey, " already exist: ").concat(duplicates.map(function (e) { return e.id; }).join(', ')));
                        }
                        // Validate all entities
                        if (this.storageKey in validation_1.validationSchemas) {
                            schema = validation_1.validationSchemas[this.storageKey];
                            if (schema) {
                                // Validate each entity
                                for (_i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
                                    entity = entities_1[_i];
                                    validation = (0, validation_1.validateData)(entity, schema);
                                    if (!validation.valid && validation.errors) {
                                        errorMessage = (0, validation_1.formatValidationErrors)(validation.errors);
                                        console.error("Validation failed for ".concat(this.storageKey, " in createMany:"), errorMessage);
                                        react_native_1.Alert.alert('Validation Error', errorMessage);
                                        throw new Error("Validation failed: ".concat(errorMessage));
                                    }
                                }
                            }
                        }
                        updatedEntities = __spreadArray(__spreadArray([], existingEntities, true), entities, true);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(this.storageKey, updatedEntities)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, entities];
                    case 3:
                        error_9 = _a.sent();
                        console.error("Error creating multiple ".concat(this.storageKey, ":"), error_9);
                        throw error_9;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find entities that match the given predicate
     * @param predicate Function that returns true for entities to include
     * @returns Array of matching entities
     */
    BaseRepository.prototype.find = function (predicate) {
        return __awaiter(this, void 0, void 0, function () {
            var entities, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        entities = _a.sent();
                        return [2 /*return*/, entities.filter(predicate)];
                    case 2:
                        error_10 = _a.sent();
                        console.error("Error finding ".concat(this.storageKey, ":"), error_10);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return BaseRepository;
}());
exports.BaseRepository = BaseRepository;
