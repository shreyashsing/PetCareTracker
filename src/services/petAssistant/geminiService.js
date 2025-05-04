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
exports.geminiService = exports.GeminiService = void 0;
var axios_1 = require("axios");
var react_native_1 = require("react-native");
var security_1 = require("../security");
var apiErrorHandler_1 = require("../../utils/apiErrorHandler");
// API key handling
var GEMINI_API_KEY_STORAGE = 'gemini_api_key';
var GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
var MAX_RETRIES = 3;
var MAX_TOKEN_LIMIT = 8192; // Gemini 1.5 Pro supports 8k tokens per request
var SANITIZED_PHRASES = ['hack', 'exploit', 'harmful', 'illegal', 'dangerous'];
// Enhanced pet-specific prompt for more specialized knowledge
var PET_CARE_SYSTEM_PROMPT = "You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, training, and behavior. \n\nYour expertise includes:\n- Pet health: common illnesses, preventative care, emergency symptoms, medication information\n- Nutrition: dietary needs for different species/breeds, food allergies, weight management\n- Training: positive reinforcement techniques, behavior modification, age-appropriate training\n- Care routines: grooming, exercise requirements, environmental enrichment\n- Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish\n\nWhen giving advice:\n- Prioritize animal welfare and evidence-based information\n- Recognize serious health issues that require veterinary attention\n- Provide practical, actionable advice for pet owners\n- Consider the pet's age, breed, and health condition when relevant\n- Be clear about the limitations of remote advice\n\nOnly answer questions related to pets and pet care. If asked about non-pet topics, kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.";
var GeminiService = /** @class */ (function () {
    function GeminiService() {
        this.apiKey = null;
        // Always load from storage
        this.loadApiKey();
    }
    GeminiService.prototype.loadApiKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        console.log('GeminiService: Loading API key from secure storage...');
                        if (!!this.apiKey) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, security_1.securityService.getItem(GEMINI_API_KEY_STORAGE, security_1.DataSensitivity.HIGH)];
                    case 1:
                        _a.apiKey = _b.sent();
                        console.log('GeminiService: API key from storage:', this.apiKey ? 'Found' : 'Not found');
                        return [3 /*break*/, 3];
                    case 2:
                        console.log('GeminiService: Using API key from environment variables');
                        _b.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        console.error('GeminiService: Failed to load Gemini API key:', error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    GeminiService.prototype.setApiKey = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('GeminiService: Saving API key to secure storage...');
                        return [4 /*yield*/, security_1.securityService.setItem(GEMINI_API_KEY_STORAGE, key, security_1.DataSensitivity.HIGH)];
                    case 1:
                        _a.sent();
                        this.apiKey = key;
                        console.log('GeminiService: API key saved successfully');
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('GeminiService: Failed to save Gemini API key:', error_2);
                        throw new Error('Failed to save API key securely');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GeminiService.prototype.hasApiKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var key, hasKey, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('GeminiService: Checking for API key...');
                        // Check if we have the API key from env or storage
                        if (this.apiKey) {
                            console.log('GeminiService: API key already loaded in memory');
                            return [2 /*return*/, true];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log('GeminiService: Trying to load API key from secure storage...');
                        return [4 /*yield*/, security_1.securityService.getItem(GEMINI_API_KEY_STORAGE, security_1.DataSensitivity.HIGH)];
                    case 2:
                        key = _a.sent();
                        hasKey = !!key;
                        console.log('GeminiService: API key in storage:', hasKey ? 'Found' : 'Not found');
                        if (hasKey) {
                            // If found in storage, keep it in memory for next time
                            this.apiKey = key;
                        }
                        return [2 /*return*/, hasKey];
                    case 3:
                        error_3 = _a.sent();
                        console.error('GeminiService: Error checking for API key:', error_3);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Sanitizes user input to prevent inappropriate content
    GeminiService.prototype.sanitizeInput = function (text) {
        var sanitized = text;
        SANITIZED_PHRASES.forEach(function (phrase) {
            var regex = new RegExp(phrase, 'gi');
            sanitized = sanitized.replace(regex, '***');
        });
        return sanitized;
    };
    // Checks if the input might contain inappropriate content
    GeminiService.prototype.isInappropriate = function (text) {
        return SANITIZED_PHRASES.some(function (phrase) {
            return text.toLowerCase().includes(phrase.toLowerCase());
        });
    };
    // Manage context length to fit within token limits
    GeminiService.prototype.manageContext = function (messages) {
        // Rough estimate: 1 token ≈ 4 characters
        var estimateTokens = function (text) { return Math.ceil(text.length / 4); };
        // Extract system messages and user/assistant messages
        var systemMessages = messages.filter(function (msg) { return msg.role === 'system'; });
        var nonSystemMessages = messages.filter(function (msg) { return msg.role !== 'system'; });
        // Create or use existing system prompt
        var systemPrompt;
        if (systemMessages.length === 0) {
            // No system message, use our default
            systemPrompt = {
                role: 'system',
                content: PET_CARE_SYSTEM_PROMPT
            };
        }
        else {
            // Combine existing system messages
            var combinedContent = systemMessages.map(function (msg) { return msg.content; }).join('\n\n');
            // Append our default prompt if it's not already included
            var fullContent = combinedContent.includes(PET_CARE_SYSTEM_PROMPT)
                ? combinedContent
                : "".concat(PET_CARE_SYSTEM_PROMPT, "\n\n").concat(combinedContent);
            systemPrompt = {
                role: 'system',
                content: fullContent
            };
        }
        // Calculate tokens for system prompt
        var totalTokens = estimateTokens(systemPrompt.content);
        // Always keep the latest user message
        var latestUserMessage = nonSystemMessages.length > 0
            ? nonSystemMessages[nonSystemMessages.length - 1]
            : null;
        // Add tokens for the latest message if it exists
        if (latestUserMessage) {
            totalTokens += estimateTokens(latestUserMessage.content);
        }
        // Start with the system prompt
        var filteredMessages = [systemPrompt];
        // Work backwards from second-to-last non-system message to preserve conversation flow
        if (nonSystemMessages.length > 1) {
            for (var i = nonSystemMessages.length - 2; i >= 0; i--) {
                var msg = nonSystemMessages[i];
                var msgTokens = estimateTokens(msg.content);
                if (totalTokens + msgTokens <= MAX_TOKEN_LIMIT - 500) { // Leave buffer for response
                    filteredMessages.push(msg);
                    totalTokens += msgTokens;
                }
                else {
                    break;
                }
            }
        }
        // Add the latest user message at the end if it exists
        if (latestUserMessage) {
            filteredMessages.push(latestUserMessage);
        }
        return filteredMessages;
    };
    // Format messages for Gemini API
    GeminiService.prototype.formatMessagesForGemini = function (messages) {
        // Extract system messages
        var systemMessages = messages.filter(function (msg) { return msg.role === 'system'; });
        var nonSystemMessages = messages.filter(function (msg) { return msg.role !== 'system'; });
        // Combine all system messages into one if there are multiple
        var combinedSystemContent = '';
        if (systemMessages.length > 0) {
            combinedSystemContent = systemMessages.map(function (msg) { return msg.content; }).join('\n\n');
        }
        // Format the contents array for the API request
        var contents = [];
        // Add the combined system message as a user message if it exists
        // (Gemini doesn't support system role, so we'll use user role instead)
        if (combinedSystemContent) {
            // Prepend [SYSTEM INSTRUCTIONS]: to clearly mark this as system content
            contents.push({
                role: 'user',
                parts: [{ text: "[SYSTEM INSTRUCTIONS]:\n".concat(combinedSystemContent) }]
            });
            // Add a dummy model response to maintain the conversation flow
            contents.push({
                role: 'model',
                parts: [{ text: "I'll follow these instructions for our conversation." }]
            });
        }
        // Add the rest of the messages
        nonSystemMessages.forEach(function (msg) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        });
        return { contents: contents };
    };
    // Post chat completion request with retry logic
    GeminiService.prototype.generateChatResponse = function (messages, petInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var lastMessageIndex, lastMessage, processedMessages, systemIndex, petContext, managedMessages, formattedMessages, modelConfig;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('GeminiService: generateChatResponse called with', messages.length, 'messages');
                        if (!!this.apiKey) return [3 /*break*/, 2];
                        console.log('GeminiService: No API key in memory, attempting to load...');
                        return [4 /*yield*/, this.loadApiKey()];
                    case 1:
                        _a.sent();
                        if (!this.apiKey) {
                            console.error('GeminiService: API key not configured');
                            return [2 /*return*/, [null, { message: 'API key not configured', status: 401 }]];
                        }
                        _a.label = 2;
                    case 2:
                        lastMessageIndex = messages.length - 1;
                        lastMessage = messages[lastMessageIndex];
                        if (lastMessage.role === 'user') {
                            console.log('GeminiService: Sanitizing user input...');
                            // Check for inappropriate content
                            if (this.isInappropriate(lastMessage.content)) {
                                console.warn('GeminiService: Inappropriate content detected in user message');
                                return [2 /*return*/, [null, {
                                            message: 'Your message contains inappropriate content that cannot be processed',
                                            status: 400
                                        }]];
                            }
                            // Sanitize input
                            messages[lastMessageIndex] = __assign(__assign({}, lastMessage), { content: this.sanitizeInput(lastMessage.content) });
                        }
                        processedMessages = __spreadArray([], messages, true);
                        // Handle pet info by enhancing the system prompt rather than adding a new system message
                        if (petInfo) {
                            console.log('GeminiService: Adding pet context to system message');
                            systemIndex = processedMessages.findIndex(function (msg) { return msg.role === 'system'; });
                            petContext = "Current pet information: ".concat(petInfo);
                            if (systemIndex >= 0) {
                                // Append to existing system message
                                processedMessages[systemIndex] = __assign(__assign({}, processedMessages[systemIndex]), { content: "".concat(processedMessages[systemIndex].content, "\n\n").concat(petContext) });
                            }
                            else {
                                // Create new system message with default prompt and pet info
                                processedMessages.unshift({
                                    role: 'system',
                                    content: "".concat(PET_CARE_SYSTEM_PROMPT, "\n\n").concat(petContext)
                                });
                            }
                        }
                        // Manage context to fit token limits
                        console.log('GeminiService: Managing context to fit token limits...');
                        managedMessages = this.manageContext(processedMessages);
                        console.log('GeminiService: Formatted messages for API call, count:', managedMessages.length);
                        formattedMessages = this.formatMessagesForGemini(managedMessages);
                        modelConfig = {
                            model: 'models/gemini-1.5-pro',
                            generationConfig: {
                                temperature: 0.7,
                                topP: 0.9,
                                topK: 40,
                                maxOutputTokens: 2048,
                            },
                            safetySettings: [
                                {
                                    category: 'HARM_CATEGORY_HARASSMENT',
                                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                                },
                                {
                                    category: 'HARM_CATEGORY_HATE_SPEECH',
                                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                                },
                                {
                                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                                },
                                {
                                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                                }
                            ]
                        };
                        return [2 /*return*/, (0, apiErrorHandler_1.tryCatchRequest)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var lastError, _loop_1, this_1, attempt, state_1;
                                var _a, _b, _c, _d, _e, _f, _g;
                                return __generator(this, function (_h) {
                                    switch (_h.label) {
                                        case 0:
                                            lastError = null;
                                            _loop_1 = function (attempt) {
                                                var url, response, responseText, error_4, status_1, isRateLimitError, isServerError, isNetworkError, delay_1;
                                                return __generator(this, function (_j) {
                                                    switch (_j.label) {
                                                        case 0:
                                                            _j.trys.push([0, 2, , 5]);
                                                            console.log("GeminiService: Attempt ".concat(attempt + 1, "/").concat(MAX_RETRIES, " to call Gemini API"));
                                                            url = "".concat(GEMINI_BASE_URL, "/models/gemini-1.5-pro:generateContent?key=").concat(this_1.apiKey);
                                                            console.log('GeminiService: Sending request to Gemini API...');
                                                            return [4 /*yield*/, axios_1.default.post(url, __assign(__assign({}, modelConfig), formattedMessages), {
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'x-goog-api-key': this_1.apiKey,
                                                                        'User-Agent': "PetCareTracker/".concat(react_native_1.Platform.OS)
                                                                    },
                                                                    timeout: 30000, // 30 seconds timeout
                                                                })];
                                                        case 1:
                                                            response = _j.sent();
                                                            console.log('GeminiService: Response received from Gemini API');
                                                            if ((_f = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) {
                                                                responseText = response.data.candidates[0].content.parts[0].text;
                                                                console.log('GeminiService: Successfully extracted response text, length:', responseText.length);
                                                                return [2 /*return*/, { value: responseText }];
                                                            }
                                                            else {
                                                                console.error('GeminiService: Invalid response format from API');
                                                                throw new Error('Invalid response format from Gemini API');
                                                            }
                                                            return [3 /*break*/, 5];
                                                        case 2:
                                                            error_4 = _j.sent();
                                                            lastError = error_4;
                                                            console.error("GeminiService: API call error on attempt ".concat(attempt + 1, ":"), error_4.message);
                                                            // Log more details about the error
                                                            if (error_4.response) {
                                                                console.error('GeminiService: Error status:', error_4.response.status);
                                                                console.error('GeminiService: Error data:', JSON.stringify(error_4.response.data));
                                                            }
                                                            status_1 = (_g = error_4.response) === null || _g === void 0 ? void 0 : _g.status;
                                                            isRateLimitError = status_1 === 429;
                                                            isServerError = status_1 >= 500;
                                                            isNetworkError = !status_1 && error_4.code === 'ECONNABORTED';
                                                            if (!(isRateLimitError || isServerError || isNetworkError)) return [3 /*break*/, 4];
                                                            delay_1 = Math.pow(2, attempt) * 1000;
                                                            console.log("GeminiService: Retrying after ".concat(delay_1, "ms delay..."));
                                                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                                        case 3:
                                                            _j.sent();
                                                            return [2 /*return*/, "continue"];
                                                        case 4:
                                                            // Non-retriable error, break out of retry loop
                                                            console.error('GeminiService: Non-retriable error, giving up');
                                                            return [2 /*return*/, "break"];
                                                        case 5: return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            this_1 = this;
                                            attempt = 0;
                                            _h.label = 1;
                                        case 1:
                                            if (!(attempt < MAX_RETRIES)) return [3 /*break*/, 4];
                                            return [5 /*yield**/, _loop_1(attempt)];
                                        case 2:
                                            state_1 = _h.sent();
                                            if (typeof state_1 === "object")
                                                return [2 /*return*/, state_1.value];
                                            if (state_1 === "break")
                                                return [3 /*break*/, 4];
                                            _h.label = 3;
                                        case 3:
                                            attempt++;
                                            return [3 /*break*/, 1];
                                        case 4:
                                            // If we get here, all retries failed
                                            console.error('GeminiService: All retry attempts failed');
                                            throw lastError || new Error('Failed to generate response after multiple attempts');
                                    }
                                });
                            }); })];
                }
            });
        });
    };
    return GeminiService;
}());
exports.GeminiService = GeminiService;
// Export singleton instance
exports.geminiService = new GeminiService();
