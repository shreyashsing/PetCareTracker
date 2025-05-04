"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATED_KEYS = exports.STORAGE_KEYS = void 0;
/**
 * Storage keys for different data entities
 */
exports.STORAGE_KEYS = {
    PETS: 'pets',
    TASKS: 'tasks',
    MEALS: 'meals',
    FOOD_ITEMS: 'foodItems',
    MEDICATIONS: 'medications',
    HEALTH_RECORDS: 'healthRecords',
    WEIGHT_RECORDS: 'weightRecords',
    ACTIVITY_SESSIONS: 'activitySessions',
    SETTINGS: 'settings',
    USER: 'user',
    ACTIVE_PET_ID: 'activePetId',
    USERS: 'users',
    CURRENT_USER: 'currentUser',
    AUTH_TOKEN: 'authToken',
};
/**
 * Prefix for storing related items with a parent ID
 * e.g. RELATED_KEYS.PET_TASKS('123') returns 'pet_123_tasks'
 */
exports.RELATED_KEYS = {
    PET_TASKS: function (petId) { return "pet_".concat(petId, "_tasks"); },
    PET_MEALS: function (petId) { return "pet_".concat(petId, "_meals"); },
    PET_MEDICATIONS: function (petId) { return "pet_".concat(petId, "_medications"); },
    PET_HEALTH_RECORDS: function (petId) { return "pet_".concat(petId, "_health_records"); },
    PET_WEIGHT_RECORDS: function (petId) { return "pet_".concat(petId, "_weight_records"); },
    PET_ACTIVITY_SESSIONS: function (petId) { return "pet_".concat(petId, "_activity_sessions"); },
};
