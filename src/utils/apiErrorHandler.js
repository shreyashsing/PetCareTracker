"use strict";
/**
 * API Error Handler
 *
 * Standardized error handling for API requests with proper error messages and logging
 */
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
exports.ErrorType = void 0;
exports.handleAPIError = handleAPIError;
exports.getUserFriendlyErrorMessage = getUserFriendlyErrorMessage;
exports.isErrorType = isErrorType;
exports.tryCatchRequest = tryCatchRequest;
var axios_1 = require("axios");
// Define possible error types
var ErrorType;
(function (ErrorType) {
    ErrorType["NETWORK"] = "network";
    ErrorType["SERVER"] = "server";
    ErrorType["TIMEOUT"] = "timeout";
    ErrorType["UNAUTHORIZED"] = "unauthorized";
    ErrorType["NOT_FOUND"] = "not_found";
    ErrorType["VALIDATION"] = "validation";
    ErrorType["UNKNOWN"] = "unknown";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
// Helper function to determine error type from status code
function getErrorTypeFromStatus(status) {
    switch (status) {
        case 401:
        case 403:
            return ErrorType.UNAUTHORIZED;
        case 404:
            return ErrorType.NOT_FOUND;
        case 422:
            return ErrorType.VALIDATION;
        case 500:
        case 502:
        case 503:
        case 504:
            return ErrorType.SERVER;
        default:
            return ErrorType.UNKNOWN;
    }
}
// Convert any error to a standardized APIError
function handleAPIError(error) {
    // Default error response
    var apiError = {
        message: 'An unexpected error occurred',
        type: ErrorType.UNKNOWN
    };
    // Handle Axios errors
    if (axios_1.default.isAxiosError(error)) {
        var axiosError = error;
        // Network errors
        if (axiosError.code === 'ECONNABORTED') {
            apiError.type = ErrorType.TIMEOUT;
            apiError.message = 'Request timed out. Please try again.';
        }
        else if (!axiosError.response) {
            apiError.type = ErrorType.NETWORK;
            apiError.message = 'Network error. Please check your connection.';
        }
        // Server response errors
        else {
            var status_1 = axiosError.response.status;
            apiError.statusCode = status_1;
            apiError.type = getErrorTypeFromStatus(status_1);
            // Try to get message from response data
            var responseData = axiosError.response.data;
            if (responseData) {
                if (typeof responseData === 'string') {
                    apiError.message = responseData;
                }
                else if (responseData.message) {
                    apiError.message = responseData.message;
                }
                else if (responseData.error) {
                    apiError.message = typeof responseData.error === 'string'
                        ? responseData.error
                        : 'Server error occurred';
                }
                // Add validation details if available
                if (responseData.errors || responseData.details || responseData.validationErrors) {
                    apiError.details = responseData.errors || responseData.details || responseData.validationErrors;
                }
            }
            // If no message was extracted, provide a default one based on status
            if (apiError.message === 'An unexpected error occurred') {
                switch (apiError.type) {
                    case ErrorType.UNAUTHORIZED:
                        apiError.message = 'You are not authorized to perform this action';
                        break;
                    case ErrorType.NOT_FOUND:
                        apiError.message = 'The requested resource was not found';
                        break;
                    case ErrorType.VALIDATION:
                        apiError.message = 'The submitted data is invalid';
                        break;
                    case ErrorType.SERVER:
                        apiError.message = 'Server error occurred. Please try again later.';
                        break;
                    default:
                        apiError.message = "Error: ".concat(status_1);
                }
            }
        }
        // Store original error for debugging
        apiError.originalError = axiosError;
    }
    // Handle Supabase errors
    else if (error && error.code && typeof error.message === 'string') {
        apiError.message = error.message;
        // Map Supabase error codes to our error types
        if (error.code === 'PGRST301' || error.code === 'PGRST204') {
            apiError.type = ErrorType.NOT_FOUND;
        }
        else if (error.code.startsWith('PGRST4')) {
            apiError.type = ErrorType.VALIDATION;
        }
        else if (error.code.startsWith('PGRST5')) {
            apiError.type = ErrorType.SERVER;
        }
        else if (error.code === 'UNAUTHENTICATED' || error.code === 'UNAUTHORIZED') {
            apiError.type = ErrorType.UNAUTHORIZED;
        }
        apiError.originalError = error;
    }
    // Handle regular errors
    else if (error instanceof Error) {
        apiError.message = error.message;
        apiError.originalError = error;
    }
    // Log the error for debugging (in development)
    if (__DEV__) {
        console.error("API Error [".concat(apiError.type, "]: ").concat(apiError.message), apiError.originalError);
    }
    return apiError;
}
// Helper function to extract user-friendly message
function getUserFriendlyErrorMessage(error) {
    if (!error) {
        return 'An unknown error occurred';
    }
    // If already processed as APIError
    if ('type' in error && 'message' in error) {
        return error.message;
    }
    // Process and return user-friendly message
    return handleAPIError(error).message;
}
// Helper to check if error is a specific type
function isErrorType(error, type) {
    return error.type === type;
}
// Wrapper for try/catch blocks to standardize error handling
function tryCatchRequest(requestFn_1) {
    return __awaiter(this, arguments, void 0, function (requestFn, errorMessage) {
        var data, error_1, apiError;
        if (errorMessage === void 0) { errorMessage = 'Request failed'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, requestFn()];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, [data, null]];
                case 2:
                    error_1 = _a.sent();
                    apiError = handleAPIError(error_1);
                    // Override with custom message if provided
                    if (errorMessage !== 'Request failed') {
                        apiError.message = errorMessage;
                    }
                    return [2 /*return*/, [null, apiError]];
                case 3: return [2 /*return*/];
            }
        });
    });
}
