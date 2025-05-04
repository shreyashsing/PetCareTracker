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
exports.clearAuthData = exports.getUserId = exports.saveUserId = exports.getAuthToken = exports.saveAuthToken = exports.generateAuthToken = exports.compareUserPassword = exports.hashUserPassword = exports.SECURE_STORE_KEYS = void 0;
var SecureStore = require("expo-secure-store");
var helpers_1 = require("../../utils/helpers");
var passwordService_1 = require("./passwordService");
var Crypto = require("expo-crypto");
// Constants for SecureStore keys
exports.SECURE_STORE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_ID: 'user_id',
};
/**
 * Hash a password
 * @param password Plain text password
 * @returns Hashed password
 */
var hashUserPassword = function (password) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, passwordService_1.hashPassword)(password)];
    });
}); };
exports.hashUserPassword = hashUserPassword;
/**
 * Compare a plain text password with a hashed password
 * @param password Plain text password
 * @param hashedPassword Hashed password
 * @returns True if password matches
 */
var compareUserPassword = function (password, hashedPassword) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, passwordService_1.verifyPassword)(password, hashedPassword)];
    });
}); };
exports.compareUserPassword = compareUserPassword;
/**
 * Generate an authentication token
 * @returns Authentication token
 */
var generateAuthToken = function () { return __awaiter(void 0, void 0, void 0, function () {
    var randomBytes, randomStr;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Crypto.getRandomBytesAsync(16)];
            case 1:
                randomBytes = _a.sent();
                randomStr = Array.from(randomBytes)
                    .map(function (byte) { return byte.toString(16).padStart(2, '0'); })
                    .join('');
                // Return a token with timestamp and UUID
                return [2 /*return*/, "token_".concat((0, helpers_1.generateUUID)(), "_").concat(Date.now(), "_").concat(randomStr)];
        }
    });
}); };
exports.generateAuthToken = generateAuthToken;
/**
 * Save authentication token to SecureStore
 * @param token Token to save
 */
var saveAuthToken = function (token) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, SecureStore.setItemAsync(exports.SECURE_STORE_KEYS.AUTH_TOKEN, token)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.saveAuthToken = saveAuthToken;
/**
 * Get authentication token from SecureStore
 * @returns Authentication token or null if not found
 */
var getAuthToken = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, SecureStore.getItemAsync(exports.SECURE_STORE_KEYS.AUTH_TOKEN)];
    });
}); };
exports.getAuthToken = getAuthToken;
/**
 * Save user ID to SecureStore
 * @param userId User ID to save
 */
var saveUserId = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, SecureStore.setItemAsync(exports.SECURE_STORE_KEYS.USER_ID, userId)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.saveUserId = saveUserId;
/**
 * Get user ID from SecureStore
 * @returns User ID or null if not found
 */
var getUserId = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, SecureStore.getItemAsync(exports.SECURE_STORE_KEYS.USER_ID)];
    });
}); };
exports.getUserId = getUserId;
/**
 * Clear all authentication data from SecureStore
 */
var clearAuthData = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, SecureStore.deleteItemAsync(exports.SECURE_STORE_KEYS.AUTH_TOKEN)];
            case 1:
                _a.sent();
                return [4 /*yield*/, SecureStore.deleteItemAsync(exports.SECURE_STORE_KEYS.REFRESH_TOKEN)];
            case 2:
                _a.sent();
                return [4 /*yield*/, SecureStore.deleteItemAsync(exports.SECURE_STORE_KEYS.USER_ID)];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.clearAuthData = clearAuthData;
