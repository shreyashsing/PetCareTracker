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
exports.refreshAuth = exports.debugAuth = void 0;
var supabase_1 = require("../services/supabase");
/**
 * Debug authentication status and test database connection
 * Call this before attempting chat operations to verify auth is working
 */
var debugAuth = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user, userError, _b, pets, queryError, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                console.log('Checking authentication status...');
                return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
            case 1:
                _a = _c.sent(), user = _a.data.user, userError = _a.error;
                if (userError) {
                    console.error('Auth error:', userError);
                    return [2 /*return*/, {
                            isAuthenticated: false,
                            userId: null,
                            message: "Auth error: ".concat(userError.message)
                        }];
                }
                if (!user) {
                    console.warn('No user found in auth state');
                    return [2 /*return*/, {
                            isAuthenticated: false,
                            userId: null,
                            message: 'No user authenticated'
                        }];
                }
                console.log('User authenticated:', user.id);
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('id, name')
                        .limit(1)];
            case 2:
                _b = _c.sent(), pets = _b.data, queryError = _b.error;
                if (queryError) {
                    console.error('Test query error:', queryError);
                    return [2 /*return*/, {
                            isAuthenticated: true,
                            userId: user.id,
                            message: "Authenticated but query failed: ".concat(queryError.message)
                        }];
                }
                console.log('Test query successful. Pets found:', (pets === null || pets === void 0 ? void 0 : pets.length) || 0);
                return [2 /*return*/, {
                        isAuthenticated: true,
                        userId: user.id,
                        message: "Authenticated as ".concat(user.id, ". Found ").concat((pets === null || pets === void 0 ? void 0 : pets.length) || 0, " pets.")
                    }];
            case 3:
                error_1 = _c.sent();
                console.error('Unexpected error in auth debug:', error_1);
                return [2 /*return*/, {
                        isAuthenticated: false,
                        userId: null,
                        message: "Unexpected error: ".concat(error_1 instanceof Error ? error_1.message : String(error_1))
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.debugAuth = debugAuth;
/**
 * Fix potential authentication issues by refreshing the session
 */
var refreshAuth = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                console.log('Attempting to refresh authentication...');
                return [4 /*yield*/, supabase_1.supabase.auth.refreshSession()];
            case 1:
                _a = _c.sent(), data = _a.data, error = _a.error;
                if (error) {
                    console.error('Session refresh error:', error);
                    return [2 /*return*/, false];
                }
                if (!data.session) {
                    console.warn('No session after refresh');
                    return [2 /*return*/, false];
                }
                console.log('Session refreshed successfully. User:', (_b = data.user) === null || _b === void 0 ? void 0 : _b.id);
                return [2 /*return*/, true];
            case 2:
                error_2 = _c.sent();
                console.error('Error refreshing auth:', error_2);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.refreshAuth = refreshAuth;
