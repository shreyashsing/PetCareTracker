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
exports.getRandomBytesHex = exports.getRandomBytesBase64 = exports.getRandomBytes = void 0;
exports.bytesToHex = bytesToHex;
exports.bytesToBase64 = bytesToBase64;
var Crypto = require("expo-crypto");
/**
 * This is a minimal fallback implementation for secure random bytes
 * that works in React Native environment
 */
// Convert bytes to a hex string
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
}
// Convert bytes to a Base64-like string (React Native safe)
function bytesToBase64(bytes) {
    // Implement standard Base64 encoding without relying on Buffer or btoa
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var result = '';
    var len = bytes.length;
    var i = 0;
    while (i < len) {
        var b1 = bytes[i++] || 0;
        var b2 = i < len ? bytes[i++] : 0;
        var b3 = i < len ? bytes[i++] : 0;
        var enc1 = b1 >> 2;
        var enc2 = ((b1 & 3) << 4) | (b2 >> 4);
        var enc3 = ((b2 & 15) << 2) | (b3 >> 6);
        var enc4 = b3 & 63;
        result += chars.charAt(enc1) + chars.charAt(enc2) +
            (i - 2 < len ? chars.charAt(enc3) : '=') +
            (i - 1 < len ? chars.charAt(enc4) : '=');
    }
    return result;
}
/**
 * Get random bytes using expo-crypto or fallback
 * @param size Number of bytes
 * @returns Random bytes as Uint8Array
 */
var getRandomBytes = function (size) { return __awaiter(void 0, void 0, void 0, function () {
    var error_1, randomValues, i;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Crypto.getRandomBytesAsync(size)];
            case 1: 
            // Try to use expo-crypto for secure random bytes
            return [2 /*return*/, _a.sent()];
            case 2:
                error_1 = _a.sent();
                console.error('Error using expo-crypto for random bytes:', error_1);
                randomValues = new Uint8Array(size);
                for (i = 0; i < size; i++) {
                    randomValues[i] = Math.floor(Math.random() * 256);
                }
                return [2 /*return*/, randomValues];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRandomBytes = getRandomBytes;
/**
 * Get random bytes as Base64 string
 * @param size Number of bytes
 * @returns Base64 encoded random bytes
 */
var getRandomBytesBase64 = function (size) { return __awaiter(void 0, void 0, void 0, function () {
    var bytes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.getRandomBytes)(size)];
            case 1:
                bytes = _a.sent();
                return [2 /*return*/, bytesToBase64(bytes)];
        }
    });
}); };
exports.getRandomBytesBase64 = getRandomBytesBase64;
/**
 * Get random bytes as Hex string
 * @param size Number of bytes
 * @returns Hex encoded random bytes
 */
var getRandomBytesHex = function (size) { return __awaiter(void 0, void 0, void 0, function () {
    var bytes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.getRandomBytes)(size)];
            case 1:
                bytes = _a.sent();
                return [2 /*return*/, bytesToHex(bytes)];
        }
    });
}); };
exports.getRandomBytesHex = getRandomBytesHex;
