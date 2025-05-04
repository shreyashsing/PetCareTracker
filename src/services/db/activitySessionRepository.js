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
exports.ActivitySessionRepository = void 0;
var asyncStorage_1 = require("./asyncStorage");
var constants_1 = require("./constants");
var helpers_1 = require("../../utils/helpers");
var supabase_1 = require("../supabase");
/**
 * Repository for managing Activity Sessions
 */
var ActivitySessionRepository = /** @class */ (function () {
    function ActivitySessionRepository() {
    }
    /**
     * Create a new activity session
     * @param session Activity session to create
     * @returns Created activity session
     */
    ActivitySessionRepository.prototype.create = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, error_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        // Generate ID if not provided
                        if (!session.id) {
                            session.id = (0, helpers_1.generateUUID)();
                        }
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        sessions = _a.sent();
                        // Add new session
                        sessions.push(session);
                        // Save to storage
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS, sessions)];
                    case 2:
                        // Save to storage
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.saveToSupabase(session)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        console.error('Error saving activity session to Supabase:', error_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/, session];
                    case 7:
                        error_2 = _a.sent();
                        console.error('Error creating activity session:', error_2);
                        throw error_2;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all activity sessions
     * @returns Array of all activity sessions
     */
    ActivitySessionRepository.prototype.getAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS)];
                    case 1:
                        sessions = (_a.sent()) || [];
                        return [2 /*return*/, sessions];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error getting all activity sessions:', error_3);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get activity sessions for a specific pet
     * @param petId Pet ID
     * @returns Array of activity sessions for the pet
     */
    ActivitySessionRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        sessions = _a.sent();
                        return [2 /*return*/, sessions.filter(function (session) { return session.petId === petId; })];
                    case 2:
                        error_4 = _a.sent();
                        console.error("Error getting activity sessions for pet ".concat(petId, ":"), error_4);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get activity session by ID
     * @param id Activity session ID
     * @returns Activity session or null if not found
     */
    ActivitySessionRepository.prototype.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        sessions = _a.sent();
                        return [2 /*return*/, sessions.find(function (session) { return session.id === id; }) || null];
                    case 2:
                        error_5 = _a.sent();
                        console.error("Error getting activity session with id ".concat(id, ":"), error_5);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an activity session
     * @param session Updated activity session
     * @returns Updated activity session or null if not found
     */
    ActivitySessionRepository.prototype.update = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, index, error_6, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        sessions = _a.sent();
                        index = sessions.findIndex(function (s) { return s.id === session.id; });
                        if (index === -1) {
                            return [2 /*return*/, null];
                        }
                        sessions[index] = session;
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS, sessions)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.saveToSupabase(session)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_6 = _a.sent();
                        console.error('Error updating activity session in Supabase:', error_6);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/, session];
                    case 7:
                        error_7 = _a.sent();
                        console.error("Error updating activity session ".concat(session.id, ":"), error_7);
                        throw error_7;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete an activity session
     * @param id Activity session ID to delete
     * @returns True if deleted, false if not found
     */
    ActivitySessionRepository.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions, filteredSessions, error, error_8, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.getAll()];
                    case 1:
                        sessions = _a.sent();
                        filteredSessions = sessions.filter(function (session) { return session.id !== id; });
                        if (filteredSessions.length === sessions.length) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS, filteredSessions)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('activity_sessions')
                                .delete()
                                .eq('id', id)];
                    case 4:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error('Error deleting activity session from Supabase:', error);
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_8 = _a.sent();
                        console.error('Exception deleting activity session from Supabase:', error_8);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/, true];
                    case 7:
                        error_9 = _a.sent();
                        console.error("Error deleting activity session ".concat(id, ":"), error_9);
                        throw error_9;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get recent activity sessions for a pet
     * @param petId Pet ID
     * @param limit Maximum number of sessions to return (default 10)
     * @returns Array of recent activity sessions
     */
    ActivitySessionRepository.prototype.getRecentByPetId = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, limit) {
            var sessions, error_10;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getByPetId(petId)];
                    case 1:
                        sessions = _a.sent();
                        // Sort by date descending (most recent first)
                        return [2 /*return*/, sessions
                                .sort(function (a, b) {
                                var dateA = new Date(a.date).getTime();
                                var dateB = new Date(b.date).getTime();
                                return dateB - dateA;
                            })
                                .slice(0, limit)];
                    case 2:
                        error_10 = _a.sent();
                        console.error("Error getting recent activity sessions for pet ".concat(petId, ":"), error_10);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save activity session to Supabase
     * @param session Activity session to save
     * @returns True if saved successfully
     */
    ActivitySessionRepository.prototype.saveToSupabase = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var supabaseSession, error, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Make sure Supabase is available
                        if (!supabase_1.supabase) {
                            return [2 /*return*/, false];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        supabaseSession = __assign(__assign({}, session), { date: session.date instanceof Date ? session.date.toISOString() : session.date, startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime, endTime: session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime, 
                            // Convert nested objects to JSON strings
                            location: session.location ? JSON.stringify(session.location) : null, weatherConditions: session.weatherConditions ? JSON.stringify(session.weatherConditions) : null, companions: session.companions ? JSON.stringify(session.companions) : null, images: session.images ? JSON.stringify(session.images) : null });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('activity_sessions')
                                .upsert(supabaseSession, { onConflict: 'id' })];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error('Error upserting activity session to Supabase:', error);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 3:
                        error_11 = _a.sent();
                        console.error('Exception saving activity session to Supabase:', error_11);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync activity sessions with Supabase
     * @param userId User ID to sync
     * @returns Number of synced records
     */
    ActivitySessionRepository.prototype.syncWithSupabase = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var localSessions, syncCount, _i, localSessions_1, session, _a, remoteSessions, error, localSessionIds, newSessions, _b, remoteSessions_1, remoteSession, session, error_12;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Make sure Supabase is available
                        if (!supabase_1.supabase) {
                            return [2 /*return*/, 0];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, this.getAll()];
                    case 2:
                        localSessions = _c.sent();
                        syncCount = 0;
                        _i = 0, localSessions_1 = localSessions;
                        _c.label = 3;
                    case 3:
                        if (!(_i < localSessions_1.length)) return [3 /*break*/, 6];
                        session = localSessions_1[_i];
                        return [4 /*yield*/, this.saveToSupabase(session)];
                    case 4:
                        if (_c.sent()) {
                            syncCount++;
                        }
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [4 /*yield*/, supabase_1.supabase
                            .from('activity_sessions')
                            .select('*')];
                    case 7:
                        _a = _c.sent(), remoteSessions = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error fetching activity sessions from Supabase:', error);
                            return [2 /*return*/, syncCount];
                        }
                        if (!(remoteSessions && remoteSessions.length > 0)) return [3 /*break*/, 9];
                        localSessionIds = new Set(localSessions.map(function (s) { return s.id; }));
                        newSessions = [];
                        for (_b = 0, remoteSessions_1 = remoteSessions; _b < remoteSessions_1.length; _b++) {
                            remoteSession = remoteSessions_1[_b];
                            // Skip if already exists locally
                            if (localSessionIds.has(remoteSession.id)) {
                                continue;
                            }
                            session = __assign(__assign({}, remoteSession), { date: new Date(remoteSession.date), startTime: new Date(remoteSession.startTime), endTime: new Date(remoteSession.endTime), location: remoteSession.location ? JSON.parse(remoteSession.location) : undefined, weatherConditions: remoteSession.weatherConditions ?
                                    JSON.parse(remoteSession.weatherConditions) : undefined, companions: remoteSession.companions ? JSON.parse(remoteSession.companions) : undefined, images: remoteSession.images ? JSON.parse(remoteSession.images) : undefined });
                            newSessions.push(session);
                            syncCount++;
                        }
                        if (!(newSessions.length > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(constants_1.STORAGE_KEYS.ACTIVITY_SESSIONS, __spreadArray(__spreadArray([], localSessions, true), newSessions, true))];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/, syncCount];
                    case 10:
                        error_12 = _c.sent();
                        console.error('Error syncing activity sessions with Supabase:', error_12);
                        return [2 /*return*/, 0];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    return ActivitySessionRepository;
}());
exports.ActivitySessionRepository = ActivitySessionRepository;
