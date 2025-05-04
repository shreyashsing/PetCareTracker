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
exports.ensureAuthQuery = exports.checkSession = exports.supabase = void 0;
exports.snakeToCamel = snakeToCamel;
exports.camelToSnake = camelToSnake;
var supabase_js_1 = require("@supabase/supabase-js");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var react_native_1 = require("react-native");
var netinfo_1 = require("@react-native-community/netinfo");
// Use hardcoded public URL and anon key - this is safe to include in client code
// These are public values that only have access to public tables with RLS enabled
var supabaseUrl = "https://uirvbnrwsqksqigcxvun.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcnZibnJ3c3Frc3FpZ2N4dnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDU5MTEsImV4cCI6MjA2MDIyMTkxMX0.BouUuM9E8yKE1ybP8b-C-I_zSpeFmYrC7VC8wyDFmTc";
// Log Supabase connection info for debugging (redacting sensitive parts)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (first 10 chars):', (supabaseAnonKey === null || supabaseAnonKey === void 0 ? void 0 : supabaseAnonKey.substring(0, 10)) + '...');
// Check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    react_native_1.Alert.alert('Configuration Error', 'Missing Supabase credentials. Please check your .env file.');
}
// Create a custom storage implementation using AsyncStorage with enhanced error handling
var AsyncStorageWrapper = {
    getItem: function (key) { return __awaiter(void 0, void 0, void 0, function () {
        var value, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.getItem(key)];
                case 1:
                    value = _a.sent();
                    console.log("Supabase Storage: Retrieved key ".concat(key.substring(0, 15), "..."));
                    return [2 /*return*/, value];
                case 2:
                    error_1 = _a.sent();
                    console.error('Supabase Storage: Error getting item from AsyncStorage:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    setItem: function (key, value) { return __awaiter(void 0, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.setItem(key, value)];
                case 1:
                    _a.sent();
                    console.log("Supabase Storage: Stored key ".concat(key.substring(0, 15), "..."));
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Supabase Storage: Error setting item in AsyncStorage:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    removeItem: function (key) { return __awaiter(void 0, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.removeItem(key)];
                case 1:
                    _a.sent();
                    console.log("Supabase Storage: Removed key ".concat(key.substring(0, 15), "..."));
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('Supabase Storage: Error removing item from AsyncStorage:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
};
// Initialize the Supabase client with enhanced configuration
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorageWrapper,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        debug: __DEV__, // Enable debug mode in development
    },
    global: {
        headers: {
            'X-Client-Info': "pet-care-tracker-mobile/".concat(react_native_1.Platform.OS),
        },
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});
// Enhanced session checking utility
var checkSession = function () { return __awaiter(void 0, void 0, void 0, function () {
    var netInfo, _a, session, error, tokenExpiry, now, _b, refresh, refreshError, error_4;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 5, , 6]);
                console.log('Supabase: Checking session status...');
                return [4 /*yield*/, netinfo_1.default.fetch()];
            case 1:
                netInfo = _c.sent();
                if (!netInfo.isConnected) {
                    console.warn('Supabase: Network appears to be offline, session check may fail');
                }
                return [4 /*yield*/, exports.supabase.auth.getSession()];
            case 2:
                _a = _c.sent(), session = _a.data.session, error = _a.error;
                if (error) {
                    console.error('Supabase: Session check error:', error);
                    return [2 /*return*/, false];
                }
                if (!session) {
                    console.warn('Supabase: No active session found');
                    return [2 /*return*/, false];
                }
                tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
                now = new Date();
                if (!(tokenExpiry && tokenExpiry < now)) return [3 /*break*/, 4];
                console.warn('Supabase: Session has expired, needs refresh');
                return [4 /*yield*/, exports.supabase.auth.refreshSession()];
            case 3:
                _b = _c.sent(), refresh = _b.data, refreshError = _b.error;
                if (refreshError || !refresh.session) {
                    console.error('Supabase: Failed to refresh expired session:', refreshError);
                    return [2 /*return*/, false];
                }
                console.log('Supabase: Successfully refreshed expired session');
                return [2 /*return*/, true];
            case 4:
                console.log('Supabase: Valid session confirmed');
                return [2 /*return*/, true];
            case 5:
                error_4 = _c.sent();
                console.error('Supabase: Unexpected error checking session:', error_4);
                return [2 /*return*/, false];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.checkSession = checkSession;
// Function to ensure queries have authentication
var ensureAuthQuery = function (queryFn) { return __awaiter(void 0, void 0, void 0, function () {
    var isSessionValid, data, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, (0, exports.checkSession)()];
            case 1:
                isSessionValid = _a.sent();
                if (!!isSessionValid) return [3 /*break*/, 3];
                console.warn('Supabase: No valid session before query, attempting refresh');
                return [4 /*yield*/, exports.supabase.auth.refreshSession()];
            case 2:
                data = (_a.sent()).data;
                if (!data.session) {
                    return [2 /*return*/, {
                            data: null,
                            error: new Error('Authentication required. Please log in again.')
                        }];
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, queryFn()];
            case 4: 
            // Execute the query with the refreshed session
            return [2 /*return*/, _a.sent()];
            case 5:
                error_5 = _a.sent();
                console.error('Supabase: Error in ensureAuthQuery:', error_5);
                return [2 /*return*/, {
                        data: null,
                        error: error_5 instanceof Error ? error_5 : new Error('Unknown error in auth query')
                    }];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.ensureAuthQuery = ensureAuthQuery;
// Helper function to convert snake_case to camelCase 
function snakeToCamel(obj) {
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }
    else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce(function (result, key) {
            var camelKey = key.replace(/_([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
            result[camelKey] = snakeToCamel(obj[key]);
            return result;
        }, {});
    }
    return obj;
}
// Helper function to convert camelCase to snake_case
function camelToSnake(obj) {
    if (Array.isArray(obj)) {
        return obj.map(camelToSnake);
    }
    else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce(function (result, key) {
            var snakeKey = key.replace(/[A-Z]/g, function (letter) { return "_".concat(letter.toLowerCase()); });
            result[snakeKey] = camelToSnake(obj[key]);
            return result;
        }, {});
    }
    return obj;
}
