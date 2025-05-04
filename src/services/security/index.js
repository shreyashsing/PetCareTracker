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
exports.securityService = exports.SecurityService = exports.DataSensitivity = exports.SecurityMode = void 0;
var SecureStore = require("expo-secure-store");
var Crypto = require("expo-crypto");
var react_native_1 = require("react-native");
var async_storage_1 = require("@react-native-async-storage/async-storage");
// Security status keys
var SECURITY_STATUS_KEY = 'security_status';
var ENCRYPTION_CHECK_KEY = 'encryption_initialized';
var FALLBACK_STORAGE_PREFIX = 'secure_fallback_';
/**
 * Security modes for the app
 */
var SecurityMode;
(function (SecurityMode) {
    SecurityMode["SECURE"] = "secure";
    SecurityMode["FALLBACK"] = "fallback";
    SecurityMode["DISABLED"] = "disabled";
})(SecurityMode || (exports.SecurityMode = SecurityMode = {}));
/**
 * Enum for different levels of data sensitivity
 */
var DataSensitivity;
(function (DataSensitivity) {
    DataSensitivity["HIGH"] = "high";
    DataSensitivity["MEDIUM"] = "medium";
    DataSensitivity["LOW"] = "low";
})(DataSensitivity || (exports.DataSensitivity = DataSensitivity = {}));
/**
 * Manages security features and provides secure storage capabilities
 */
var SecurityService = /** @class */ (function () {
    function SecurityService() {
        this.securityMode = SecurityMode.DISABLED;
        this.encryptionKey = null;
        this.initialized = false;
    }
    /**
     * Get the singleton instance of SecurityService
     */
    SecurityService.getInstance = function () {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    };
    /**
     * Initialize security features
     * @returns Promise resolving to true if security is properly initialized
     */
    SecurityService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isSecureStoreAvailable, testValue, secureStoreError_1, success, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 18, , 19]);
                        // Skip if already initialized
                        if (this.initialized) {
                            return [2 /*return*/, this.securityMode !== SecurityMode.DISABLED];
                        }
                        console.log('Initializing security service...');
                        return [4 /*yield*/, SecureStore.isAvailableAsync()];
                    case 1:
                        isSecureStoreAvailable = _a.sent();
                        if (!isSecureStoreAvailable) return [3 /*break*/, 11];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 9, , 10]);
                        // Set a test value
                        return [4 /*yield*/, SecureStore.setItemAsync(ENCRYPTION_CHECK_KEY, 'true')];
                    case 3:
                        // Set a test value
                        _a.sent();
                        return [4 /*yield*/, SecureStore.getItemAsync(ENCRYPTION_CHECK_KEY)];
                    case 4:
                        testValue = _a.sent();
                        if (!(testValue === 'true')) return [3 /*break*/, 7];
                        // Secure storage works
                        this.securityMode = SecurityMode.SECURE;
                        console.log('Security initialized in SECURE mode');
                        // Generate or retrieve encryption key
                        return [4 /*yield*/, this.setupEncryptionKey()];
                    case 5:
                        // Generate or retrieve encryption key
                        _a.sent();
                        // Save the security status
                        return [4 /*yield*/, async_storage_1.default.setItem(SECURITY_STATUS_KEY, SecurityMode.SECURE)];
                    case 6:
                        // Save the security status
                        _a.sent();
                        this.initialized = true;
                        return [2 /*return*/, true];
                    case 7: throw new Error('Secure storage verification failed');
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        secureStoreError_1 = _a.sent();
                        console.error('Secure storage failed despite being available:', secureStoreError_1);
                        // Fall back to encrypted AsyncStorage
                        this.securityMode = SecurityMode.FALLBACK;
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        console.warn('Secure storage is not available on this device');
                        this.securityMode = SecurityMode.FALLBACK;
                        _a.label = 12;
                    case 12:
                        if (!(this.securityMode === SecurityMode.FALLBACK)) return [3 /*break*/, 16];
                        console.log('Initializing fallback security...');
                        return [4 /*yield*/, this.setupFallbackEncryption()];
                    case 13:
                        success = _a.sent();
                        if (!success) return [3 /*break*/, 15];
                        console.log('Security initialized in FALLBACK mode');
                        return [4 /*yield*/, async_storage_1.default.setItem(SECURITY_STATUS_KEY, SecurityMode.FALLBACK)];
                    case 14:
                        _a.sent();
                        this.initialized = true;
                        return [2 /*return*/, true];
                    case 15:
                        console.error('Failed to initialize fallback security');
                        this.securityMode = SecurityMode.DISABLED;
                        _a.label = 16;
                    case 16:
                        // If we reach here, security is disabled
                        console.warn('Security is DISABLED. Data will not be securely stored.');
                        return [4 /*yield*/, async_storage_1.default.setItem(SECURITY_STATUS_KEY, SecurityMode.DISABLED)];
                    case 17:
                        _a.sent();
                        this.initialized = true;
                        // Show critical security warning to user
                        this.showSecurityWarning();
                        return [2 /*return*/, false];
                    case 18:
                        error_1 = _a.sent();
                        console.error('Security initialization error:', error_1);
                        this.securityMode = SecurityMode.DISABLED;
                        this.initialized = true;
                        // Show critical security warning to user
                        this.showSecurityWarning();
                        return [2 /*return*/, false];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get current security mode
     */
    SecurityService.prototype.getSecurityMode = function () {
        return this.securityMode;
    };
    /**
     * Check if the security service is initialized
     */
    SecurityService.prototype.isInitialized = function () {
        return this.initialized;
    };
    /**
     * Securely store a value
     * @param key Storage key
     * @param value Value to store
     * @param sensitivity Data sensitivity level
     */
    SecurityService.prototype.setItem = function (key_1, value_1) {
        return __awaiter(this, arguments, void 0, function (key, value, sensitivity) {
            var _a, encryptedValue_1, encryptedValue, error_2;
            if (sensitivity === void 0) { sensitivity = DataSensitivity.MEDIUM; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 15, , 16]);
                        _a = this.securityMode;
                        switch (_a) {
                            case SecurityMode.SECURE: return [3 /*break*/, 3];
                            case SecurityMode.FALLBACK: return [3 /*break*/, 9];
                            case SecurityMode.DISABLED: return [3 /*break*/, 12];
                        }
                        return [3 /*break*/, 14];
                    case 3:
                        if (!(sensitivity === DataSensitivity.HIGH)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.encrypt(value)];
                    case 4:
                        encryptedValue_1 = _b.sent();
                        return [4 /*yield*/, SecureStore.setItemAsync(key, encryptedValue_1)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 6: 
                    // Medium/low sensitivity can go directly to secure store
                    return [4 /*yield*/, SecureStore.setItemAsync(key, value)];
                    case 7:
                        // Medium/low sensitivity can go directly to secure store
                        _b.sent();
                        _b.label = 8;
                    case 8: return [3 /*break*/, 14];
                    case 9: return [4 /*yield*/, this.encrypt(value)];
                    case 10:
                        encryptedValue = _b.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem("".concat(FALLBACK_STORAGE_PREFIX).concat(key), encryptedValue)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 12:
                        // In disabled mode, store directly in AsyncStorage
                        if (sensitivity === DataSensitivity.HIGH) {
                            console.warn("Storing HIGH sensitivity data with disabled security: ".concat(key));
                        }
                        return [4 /*yield*/, async_storage_1.default.setItem(key, value)];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        error_2 = _b.sent();
                        console.error("Error storing secure item ".concat(key, ":"), error_2);
                        throw error_2;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieve a securely stored value
     * @param key Storage key
     * @param sensitivity Data sensitivity level
     */
    SecurityService.prototype.getItem = function (key_1) {
        return __awaiter(this, arguments, void 0, function (key, sensitivity) {
            var _a, secureValue, encryptedValue, error_3;
            if (sensitivity === void 0) { sensitivity = DataSensitivity.MEDIUM; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 15, , 16]);
                        _a = this.securityMode;
                        switch (_a) {
                            case SecurityMode.SECURE: return [3 /*break*/, 3];
                            case SecurityMode.FALLBACK: return [3 /*break*/, 7];
                            case SecurityMode.DISABLED: return [3 /*break*/, 11];
                        }
                        return [3 /*break*/, 13];
                    case 3: return [4 /*yield*/, SecureStore.getItemAsync(key)];
                    case 4:
                        secureValue = _b.sent();
                        if (!(secureValue && sensitivity === DataSensitivity.HIGH)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.decrypt(secureValue)];
                    case 5: 
                    // Decrypt high sensitivity data
                    return [2 /*return*/, _b.sent()];
                    case 6: return [2 /*return*/, secureValue];
                    case 7: return [4 /*yield*/, async_storage_1.default.getItem("".concat(FALLBACK_STORAGE_PREFIX).concat(key))];
                    case 8:
                        encryptedValue = _b.sent();
                        if (!encryptedValue) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.decrypt(encryptedValue)];
                    case 9: return [2 /*return*/, _b.sent()];
                    case 10: return [2 /*return*/, null];
                    case 11: return [4 /*yield*/, async_storage_1.default.getItem(key)];
                    case 12: return [2 /*return*/, _b.sent()];
                    case 13: return [2 /*return*/, null];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        error_3 = _b.sent();
                        console.error("Error getting secure item ".concat(key, ":"), error_3);
                        return [2 /*return*/, null];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a securely stored value
     * @param key Storage key
     */
    SecurityService.prototype.removeItem = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 10, , 11]);
                        _a = this.securityMode;
                        switch (_a) {
                            case SecurityMode.SECURE: return [3 /*break*/, 3];
                            case SecurityMode.FALLBACK: return [3 /*break*/, 5];
                            case SecurityMode.DISABLED: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, SecureStore.deleteItemAsync(key)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 5: return [4 /*yield*/, async_storage_1.default.removeItem("".concat(FALLBACK_STORAGE_PREFIX).concat(key))];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, async_storage_1.default.removeItem(key)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_4 = _b.sent();
                        console.error("Error removing secure item ".concat(key, ":"), error_4);
                        throw error_4;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate a secure random string for use as keys, etc.
     * @param length Desired length of the random string
     */
    SecurityService.prototype.generateSecureRandomString = function () {
        return __awaiter(this, arguments, void 0, function (length) {
            var randomBytes, error_5, chars, result, i;
            if (length === void 0) { length = 32; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Crypto.getRandomBytesAsync(length)];
                    case 1:
                        randomBytes = _a.sent();
                        return [2 /*return*/, Array.from(new Uint8Array(randomBytes))
                                .map(function (b) { return b.toString(16).padStart(2, '0'); })
                                .join('')];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error generating secure random string:', error_5);
                        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        result = '';
                        for (i = 0; i < length; i++) {
                            result += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        return [2 /*return*/, result];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate a secure hash of the provided data
     * @param data Data to hash
     */
    SecurityService.prototype.hash = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error generating hash:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if the app's security mode is appropriate for the given sensitivity level
     * @param requiredSensitivity Minimum required sensitivity level
     */
    SecurityService.prototype.isSecurityAdequate = function (requiredSensitivity) {
        switch (requiredSensitivity) {
            case DataSensitivity.HIGH:
                return this.securityMode === SecurityMode.SECURE;
            case DataSensitivity.MEDIUM:
                return this.securityMode === SecurityMode.SECURE ||
                    this.securityMode === SecurityMode.FALLBACK;
            case DataSensitivity.LOW:
                return true; // All security modes are adequate for low sensitivity
            default:
                return false;
        }
    };
    // Private methods
    /**
     * Set up encryption key for secure operation
     */
    SecurityService.prototype.setupEncryptionKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var key, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, SecureStore.getItemAsync('encryption_key')];
                    case 1:
                        key = _a.sent();
                        if (!!key) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.generateSecureRandomString(32)];
                    case 2:
                        // Generate new key
                        key = _a.sent();
                        return [4 /*yield*/, SecureStore.setItemAsync('encryption_key', key)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        this.encryptionKey = key;
                        return [3 /*break*/, 6];
                    case 5:
                        error_7 = _a.sent();
                        console.error('Error setting up encryption key:', error_7);
                        throw error_7;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up fallback encryption when secure storage is unavailable
     */
    SecurityService.prototype.setupFallbackEncryption = function () {
        return __awaiter(this, void 0, void 0, function () {
            var key, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, async_storage_1.default.getItem('fallback_encryption_key')];
                    case 1:
                        key = _a.sent();
                        if (!!key) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.generateSecureRandomString(32)];
                    case 2:
                        // Generate new key
                        key = _a.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem('fallback_encryption_key', key)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        this.encryptionKey = key;
                        return [2 /*return*/, true];
                    case 5:
                        error_8 = _a.sent();
                        console.error('Error setting up fallback encryption:', error_8);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Show security warning to user
     */
    SecurityService.prototype.showSecurityWarning = function () {
        react_native_1.Alert.alert("Security Warning", "Your device does not support secure storage. Sensitive data like passwords and health records may not be fully protected. Consider using this app for non-sensitive data only.", [
            {
                text: "I Understand",
                style: "default"
            }
        ], { cancelable: false });
    };
    /**
     * Encrypt a string value using a simple XOR cipher
     * @param value Value to encrypt
     */
    SecurityService.prototype.encrypt = function (value) {
        return __awaiter(this, void 0, void 0, function () {
            var keyChars, valueChars, result, i, char, keyChar, encrypted;
            return __generator(this, function (_a) {
                if (!this.encryptionKey) {
                    throw new Error('Encryption key not available');
                }
                try {
                    keyChars = this.encryptionKey.split('');
                    valueChars = value.split('');
                    result = '';
                    for (i = 0; i < valueChars.length; i++) {
                        char = valueChars[i];
                        keyChar = keyChars[i % keyChars.length];
                        encrypted = char.charCodeAt(0) ^ keyChar.charCodeAt(0);
                        result += encrypted.toString(16).padStart(4, '0');
                    }
                    return [2 /*return*/, result];
                }
                catch (error) {
                    console.error('Error encrypting data:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Decrypt an encrypted string value
     * @param encryptedValue Encrypted value to decrypt
     */
    SecurityService.prototype.decrypt = function (encryptedValue) {
        return __awaiter(this, void 0, void 0, function () {
            var keyChars, result, i, hexGroup, charCode, keyChar, originalChar;
            return __generator(this, function (_a) {
                if (!this.encryptionKey) {
                    throw new Error('Encryption key not available');
                }
                try {
                    keyChars = this.encryptionKey.split('');
                    result = '';
                    // Process each 4-character hex group
                    for (i = 0; i < encryptedValue.length; i += 4) {
                        if (i + 4 <= encryptedValue.length) {
                            hexGroup = encryptedValue.substring(i, i + 4);
                            charCode = parseInt(hexGroup, 16);
                            keyChar = keyChars[(i / 4) % keyChars.length];
                            originalChar = String.fromCharCode(charCode ^ keyChar.charCodeAt(0));
                            result += originalChar;
                        }
                    }
                    return [2 /*return*/, result];
                }
                catch (error) {
                    console.error('Error decrypting data:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    return SecurityService;
}());
exports.SecurityService = SecurityService;
// Export singleton instance
exports.securityService = SecurityService.getInstance();
