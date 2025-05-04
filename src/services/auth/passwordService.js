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
exports.verifyPassword = exports.hashPassword = void 0;
var Crypto = require("expo-crypto");
var cryptoFallback_1 = require("./cryptoFallback");
var security_1 = require("../security");
// Constants
var SALT_LENGTH = 16; // 16 bytes = 128 bits
var ITERATIONS = 10000; // Number of PBKDF2 iterations
var ALGORITHM = Crypto.CryptoDigestAlgorithm.SHA256;
/**
 * Generate a random salt
 * @returns Base64-encoded salt string
 */
var generateSalt = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, security_1.securityService.generateSecureRandomString(SALT_LENGTH)];
            case 1: 
            // Use security service to generate a secure random string
            // This will generate a hex string which is already safe for storage
            return [2 /*return*/, _a.sent()];
            case 2:
                error_1 = _a.sent();
                console.error('Error generating salt with security service, falling back to default method:', error_1);
                // Fall back to original method if security service fails
                return [2 /*return*/, (0, cryptoFallback_1.getRandomBytesBase64)(SALT_LENGTH)];
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Hash a password securely using PBKDF2-like approach with SHA-256
 * This is a React Native compatible implementation
 * @param password Plain text password
 * @returns Promise resolving to hashed password in format: $iterations$salt$hash
 */
var hashPassword = function (password) { return __awaiter(void 0, void 0, void 0, function () {
    var salt, hash, i, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, generateSalt()];
            case 1:
                salt = _a.sent();
                hash = password + salt;
                i = 0;
                _a.label = 2;
            case 2:
                if (!(i < ITERATIONS)) return [3 /*break*/, 5];
                return [4 /*yield*/, Crypto.digestStringAsync(ALGORITHM, hash)];
            case 3:
                hash = _a.sent();
                _a.label = 4;
            case 4:
                i++;
                return [3 /*break*/, 2];
            case 5: 
            // Format: $iterations$salt$hash
            return [2 /*return*/, "$".concat(ITERATIONS, "$").concat(salt, "$").concat(hash)];
            case 6:
                error_2 = _a.sent();
                console.error('Error hashing password:', error_2);
                throw error_2;
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.hashPassword = hashPassword;
/**
 * Verify a password against a hash
 * @param password Plain text password to check
 * @param hashedPassword Previously hashed password
 * @returns Promise resolving to boolean indicating if password matches
 */
var verifyPassword = function (password, hashedPassword) { return __awaiter(void 0, void 0, void 0, function () {
    var parts, iterations, salt, storedHash, hash, i, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                parts = hashedPassword.split('$');
                if (parts.length !== 4) {
                    console.error('Invalid hash format');
                    return [2 /*return*/, false];
                }
                iterations = parseInt(parts[1], 10);
                salt = parts[2];
                storedHash = parts[3];
                hash = password + salt;
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < iterations)) return [3 /*break*/, 4];
                return [4 /*yield*/, Crypto.digestStringAsync(ALGORITHM, hash)];
            case 2:
                hash = _a.sent();
                _a.label = 3;
            case 3:
                i++;
                return [3 /*break*/, 1];
            case 4: 
            // Compare the generated hash with the stored hash
            return [2 /*return*/, hash === storedHash];
            case 5:
                error_3 = _a.sent();
                console.error('Error verifying password:', error_3);
                return [2 /*return*/, false];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.verifyPassword = verifyPassword;
