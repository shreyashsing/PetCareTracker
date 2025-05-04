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
exports.petAssistantService = void 0;
var geminiService_1 = require("./geminiService");
var chatRepository_1 = require("./chatRepository");
var security_1 = require("../security");
var api_1 = require("../api");
var db_1 = require("../db");
var supabase_1 = require("../supabase");
// API key storage key
var GEMINI_API_KEY_STORAGE = 'gemini_api_key';
/**
 * Service for handling pet assistant chat functionality
 */
var PetAssistantService = /** @class */ (function () {
    function PetAssistantService() {
        this.currentSessionId = null;
        this.currentMessages = [];
        this.currentSession = null;
        this.geminiService = new geminiService_1.GeminiService();
    }
    /**
     * Initialize the chat service and ensure API key is set
     */
    PetAssistantService.prototype.initialize = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tablesCreated, error_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, (0, db_1.createChatTables)()];
                    case 1:
                        tablesCreated = _a.sent();
                        if (!tablesCreated) {
                            console.error('Failed to create chat tables. The Pet Assistant cannot work without them.');
                            return [2 /*return*/, false];
                        }
                        if (!GEMINI_API_KEY_STORAGE) return [3 /*break*/, 5];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.setApiKey(GEMINI_API_KEY_STORAGE)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 4:
                        error_1 = _a.sent();
                        console.error('Error setting API key from environment:', error_1);
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, this.hasApiKey()];
                    case 6: 
                    // Otherwise fall back to checking if it's already stored
                    return [2 /*return*/, _a.sent()];
                    case 7:
                        error_2 = _a.sent();
                        console.error('Error initializing Pet Assistant:', error_2);
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set the API key for the assistant
     * @param apiKey The Gemini API key
     */
    PetAssistantService.prototype.setApiKey = function (apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Store API key securely
                    return [4 /*yield*/, security_1.securityService.setItem(GEMINI_API_KEY_STORAGE, apiKey, security_1.DataSensitivity.HIGH)];
                    case 1:
                        // Store API key securely
                        _a.sent();
                        return [4 /*yield*/, this.geminiService.setApiKey(apiKey)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if we have a valid API key
     * @returns True if API key is valid
     */
    PetAssistantService.prototype.hasApiKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.geminiService.hasApiKey()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get or create a session for a user
     * @param userId User ID
     * @param petId Optional pet ID
     * @returns Session ID
     */
    PetAssistantService.prototype.getOrCreateSession = function (userId, petId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, sessionData, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!!this.currentSessionId) return [3 /*break*/, 2];
                        return [4 /*yield*/, api_1.chatApi.createSession(petId)];
                    case 1:
                        response = _a.sent();
                        if (!response.success || !response.data) {
                            throw new Error(response.error || 'Failed to create session');
                        }
                        sessionData = response.data;
                        this.currentSessionId = sessionData.sessionId;
                        _a.label = 2;
                    case 2: return [2 /*return*/, { id: this.currentSessionId }];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Error in getOrCreateSession:', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start a new chat session
     * @param userId User ID
     * @param petId Optional pet ID
     * @returns New session ID
     */
    PetAssistantService.prototype.startNewSession = function (userId, petId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, sessionData, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, api_1.chatApi.createSession(petId)];
                    case 1:
                        response = _a.sent();
                        if (!response.success || !response.data) {
                            throw new Error(response.error || 'Failed to create session');
                        }
                        sessionData = response.data;
                        this.currentSessionId = sessionData.sessionId;
                        this.currentMessages = [
                            {
                                role: 'assistant',
                                content: sessionData.welcomeMessage
                            }
                        ];
                        // Initialize current session object
                        this.currentSession = {
                            id: this.currentSessionId,
                            messages: this.currentMessages
                        };
                        return [2 /*return*/, this.currentSessionId];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Error in startNewSession:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get chat messages for a session
     * @param sessionId Session ID
     * @returns Array of chat messages
     */
    PetAssistantService.prototype.getChatMessages = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // If we have cached messages and it's the current session, return them
                        if (this.currentSessionId === sessionId && this.currentMessages.length > 0) {
                            return [2 /*return*/, this.currentMessages];
                        }
                        return [4 /*yield*/, api_1.chatApi.getMessages(sessionId)];
                    case 1:
                        response = _a.sent();
                        if (!response.success || !response.data) {
                            throw new Error(response.error || 'Failed to get messages');
                        }
                        // Update cache
                        this.currentSessionId = sessionId;
                        this.currentMessages = response.data;
                        return [2 /*return*/, this.currentMessages];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Error in getChatMessages:', error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send a message to the chat assistant
     * @param userId User ID
     * @param message Message text
     * @param petId Optional pet ID for context
     * @returns AI response
     */
    PetAssistantService.prototype.sendMessage = function (userId, message, petId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, responseData, messages, petInfo, directResponse, aiMessage, error_6, isNetworkError, petObject, directInfo, geminiResponse, aiContent, fallbackResponse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 10]);
                        if (!!this.currentSessionId) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getOrCreateSession(userId, petId)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, api_1.chatApi.sendMessage(this.currentSessionId, message, petId)];
                    case 3:
                        response = _a.sent();
                        if (!response.success || !response.data) {
                            throw new Error(response.error || 'Failed to send message');
                        }
                        responseData = response.data;
                        // Update local cache
                        this.currentMessages.push({ role: 'user', content: message }, { role: 'assistant', content: responseData.message });
                        return [2 /*return*/, responseData.message];
                    case 4:
                        error_6 = _a.sent();
                        console.error('Error in sendMessage:', error_6);
                        isNetworkError = error_6.message && (
                            error_6.message.includes('Network request failed') || 
                            error_6.message.includes('Failed to fetch') ||
                            error_6.message.includes('Network error') ||
                            error_6.message.includes('ECONNREFUSED') ||
                            error_6.message.includes('ENOTFOUND')
                        );
                        
                        // Use direct Gemini API as fallback if it's a network error
                        if (isNetworkError) {
                            console.log('Network error detected, falling back to direct Gemini API');
                            _a.label = 5;
                        } else {
                            return [3 /*break*/, 9];
                        }
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        // Add user message to cache
                        this.currentMessages.push({ role: 'user', content: message });
                        
                        // Get info about the pet if petId is provided
                        petObject = null;
                        directInfo = "";
                        if (petId) {
                            try {
                                // Try to get the pet info from the local DB
                                petObject = db_1.databaseManager.pets.findById(petId);
                                if (petObject) {
                                    directInfo = `This conversation is about my pet: ${petObject.name}, a ${petObject.type} (${petObject.breed}), ${petObject.gender}, ${petObject.age || 'unknown age'}.`;
                                }
                            } catch (err) {
                                console.log('Error getting pet info for fallback:', err);
                            }
                        }
                        
                        messages = [
                            {
                                role: 'system',
                                content: `You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, 
                                training, and behavior. ${directInfo}
                                
                                Your expertise includes:
                                - Pet health: common illnesses, preventative care, emergency symptoms, medication information
                                - Nutrition: dietary needs for different species/breeds, food allergies, weight management
                                - Training: positive reinforcement techniques, behavior modification, age-appropriate training
                                - Care routines: grooming, exercise requirements, environmental enrichment
                                - Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish
                                
                                When giving advice:
                                - Prioritize animal welfare and evidence-based information
                                - Recognize serious health issues that require veterinary attention
                                - Provide practical, actionable advice for pet owners
                                - Consider the pet's age, breed, and health condition when relevant
                                - Be clear about the limitations of remote advice
                                
                                Only answer questions related to pets and pet care. Be concise and direct in your responses.`
                            }
                        ];
                        
                        // Add conversation history
                        this.currentMessages.slice(-10).forEach(function(msg) {
                            messages.push(msg);
                        });
                        
                        return [4 /*yield*/, this.geminiService.generateChatResponse(messages, null)];
                    case 6:
                        geminiResponse = _a.sent();
                        
                        if (geminiResponse && geminiResponse[0]) {
                            aiContent = geminiResponse[0];
                            // Update local cache with AI response
                            this.currentMessages.push({ 
                                role: 'assistant', 
                                content: aiContent 
                            });
                            return [2 /*return*/, aiContent];
                        }
                        
                        return [4 /*yield*/, this.generateFallbackResponse(message)];
                    case 7:
                        fallbackResponse = _a.sent();
                        // Add fallback response to conversation
                        this.currentMessages.push({ role: 'assistant', content: fallbackResponse });
                        return [2 /*return*/, fallbackResponse];
                    case 8:
                        directResponse = _a.sent();
                        console.error('Error in direct Gemini fallback:', directResponse);
                        
                        // Add a friendly error message when both API and fallback fail
                        aiMessage = "I'm sorry, but I'm having trouble connecting to my knowledge base right now. Please check your internet connection and try again in a few moments.";
                        this.currentMessages.push({ role: 'assistant', content: aiMessage });
                        return [2 /*return*/, aiMessage];
                    case 9: 
                        // If it's not a network error, throw the original error
                        throw new Error(error_6 instanceof Error ? error_6.message : 'Unknown error');
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    
    /**
     * Generate a simple fallback response when all else fails
     */
    PetAssistantService.prototype.generateFallbackResponse = function (userMessage) {
        return __awaiter(this, void 0, void 0, function() {
            var lowercaseMessage = userMessage.toLowerCase();
            
            // Simple pattern matching for common pet questions
            if (lowercaseMessage.includes('food') || lowercaseMessage.includes('feed') || lowercaseMessage.includes('diet')) {
                return "Proper nutrition is essential for your pet's health. Make sure to feed them a balanced diet appropriate for their species, age, and any specific health needs. If you're concerned about your pet's diet, consulting with a veterinarian is always the best approach.";
            }
            
            if (lowercaseMessage.includes('vet') || lowercaseMessage.includes('doctor') || lowercaseMessage.includes('sick')) {
                return "If your pet is showing signs of illness, it's important to consult with a veterinarian as soon as possible. Common signs that require attention include changes in eating habits, lethargy, unusual behavior, or visible physical symptoms.";
            }
            
            if (lowercaseMessage.includes('train') || lowercaseMessage.includes('behavior')) {
                return "Training pets requires patience and consistency. Positive reinforcement techniques are generally the most effective and strengthen your bond with your pet. For specific behavioral issues, consider working with a professional animal behaviorist.";
            }
            
            // Default response
            return "I'm here to help with any pet care questions you have. While I'm currently experiencing connection issues, I'd be happy to assist you when my services are back online. In the meantime, for urgent concerns about your pet's health, please consult with your veterinarian.";
        });
    };
    /**
     * Get messages from the current session
     * @returns Current session messages
     */
    PetAssistantService.prototype.getCurrentSessionMessages = function () {
        return this.currentMessages;
    };
    /**
     * Load a previous chat session
     */
    PetAssistantService.prototype.loadSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, geminiMessages, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, chatRepository_1.chatRepository.getSessionMessages(sessionId)];
                    case 1:
                        messages = _a.sent();
                        if (!messages || messages.length === 0) {
                            console.error('No messages found for session:', sessionId);
                            return [2 /*return*/, false];
                        }
                        geminiMessages = messages.map(function (msg) { return ({
                            role: msg.role,
                            content: msg.content
                        }); });
                        // Set current session
                        this.currentSession = {
                            id: sessionId,
                            messages: geminiMessages
                        };
                        return [2 /*return*/, true];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Error loading session:', error_7);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Load pet information to provide context for AI responses
     */
    PetAssistantService.prototype.loadPetContext = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, pet, error, healthRecords, _b, records, recordsError, healthError_1, medications, _c, meds, medsError, medsError_1, petInfo, birthDate, today, age, petContextMessage, error_8;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 13, , 14]);
                        console.log("Loading pet context for petId: ".concat(petId));
                        // Refresh auth if needed before database operations
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 1:
                        // Refresh auth if needed before database operations
                        _d.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('pets')
                                .select('*')
                                .eq('id', petId)
                                .single()];
                    case 2:
                        _a = _d.sent(), pet = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === 'PGRST116') {
                                // This is the "no rows returned" error
                                console.log("No pet found with ID ".concat(petId, " - continuing without pet context"));
                                // Still create a session, just without pet info
                                return [2 /*return*/];
                            }
                            else {
                                // Some other error
                                console.error('Error loading pet info:', error);
                                return [2 /*return*/];
                            }
                        }
                        if (!pet) {
                            console.log("Pet with ID ".concat(petId, " not found - continuing without pet context"));
                            return [2 /*return*/];
                        }
                        healthRecords = [];
                        _d.label = 3;
                    case 3:
                        _d.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 4:
                        _d.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('health_records')
                                .select('type, title, symptoms, diagnosis')
                                .eq('pet_id', petId)
                                .order('date', { ascending: false })
                                .limit(5)];
                    case 5:
                        _b = _d.sent(), records = _b.data, recordsError = _b.error;
                        if (!recordsError && records) {
                            healthRecords = records;
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        healthError_1 = _d.sent();
                        console.log('Could not load health records, continuing without them');
                        return [3 /*break*/, 7];
                    case 7:
                        medications = [];
                        _d.label = 8;
                    case 8:
                        _d.trys.push([8, 11, , 12]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 9:
                        _d.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('medications')
                                .select('name, dosage, frequency')
                                .eq('pet_id', petId)
                                .eq('status', 'active')];
                    case 10:
                        _c = _d.sent(), meds = _c.data, medsError = _c.error;
                        if (!medsError && meds) {
                            medications = meds;
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        medsError_1 = _d.sent();
                        console.log('Could not load medications, continuing without them');
                        return [3 /*break*/, 12];
                    case 12:
                        petInfo = {
                            id: pet.id,
                            name: pet.name,
                            type: pet.type || 'pet', // Default if missing
                            breed: pet.breed || 'unknown breed', // Default if missing
                            gender: pet.gender || 'unknown gender', // Default if missing
                            weight: pet.weight,
                            weightUnit: pet.weight_unit,
                            medicalConditions: pet.medical_conditions || [],
                            allergies: pet.allergies || [],
                            medications: (medications === null || medications === void 0 ? void 0 : medications.map(function (m) { return "".concat(m.name, " (").concat(m.dosage, ", ").concat(m.frequency, ")"); })) || []
                        };
                        // Calculate age from birth_date if available
                        if (pet.birth_date) {
                            try {
                                birthDate = new Date(pet.birth_date);
                                today = new Date();
                                age = today.getFullYear() - birthDate.getFullYear();
                                // Adjust age if birthday hasn't occurred yet this year
                                if (today.getMonth() < birthDate.getMonth() ||
                                    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                                    age--;
                                }
                                petInfo.age = age;
                            }
                            catch (dateError) {
                                console.log('Could not calculate pet age, continuing without it');
                            }
                        }
                        // Add pet context to current session
                        if (this.currentSession) {
                            this.currentSession.petInfo = petInfo;
                            petContextMessage = this.formatPetContext(petInfo, healthRecords || []);
                            // Add as system message
                            this.currentSession.messages.push({
                                role: 'system',
                                content: petContextMessage
                            });
                            console.log('Pet context loaded successfully');
                        }
                        return [3 /*break*/, 14];
                    case 13:
                        error_8 = _d.sent();
                        console.error('Error in loadPetContext:', error_8);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Format pet information into a context message for the AI
     */
    PetAssistantService.prototype.formatPetContext = function (petInfo, healthRecords) {
        var context = "Pet information: ".concat(petInfo.name, " is a ").concat(petInfo.gender, " ").concat(petInfo.breed, " ").concat(petInfo.type.toLowerCase());
        if (petInfo.age !== undefined) {
            context += ", ".concat(petInfo.age, " years old");
        }
        if (petInfo.weight !== undefined && petInfo.weightUnit) {
            context += ", weighing ".concat(petInfo.weight, " ").concat(petInfo.weightUnit);
        }
        // Add some breed-specific information if available
        var breedInfo = this.getBreedSpecificInfo(petInfo.type, petInfo.breed);
        if (breedInfo) {
            context += "\n\nBreed characteristics: ".concat(breedInfo);
        }
        if (petInfo.medicalConditions && petInfo.medicalConditions.length > 0) {
            context += "\n\nMedical conditions: ".concat(petInfo.medicalConditions.join(', '));
        }
        if (petInfo.allergies && petInfo.allergies.length > 0) {
            context += "\nAllergies: ".concat(petInfo.allergies.join(', '));
        }
        if (petInfo.medications && petInfo.medications.length > 0) {
            context += "\nCurrent medications: ".concat(petInfo.medications.join(', '));
        }
        if (healthRecords && healthRecords.length > 0) {
            context += '\n\nRecent health issues:';
            healthRecords.forEach(function (record) {
                context += "\n- ".concat(record.type, ": ").concat(record.title);
                if (record.diagnosis)
                    context += " (Diagnosis: ".concat(record.diagnosis, ")");
            });
        }
        // Add age-specific guidance
        if (petInfo.age !== undefined) {
            context += "\n\nAge-specific considerations: ".concat(this.getAgeSpecificInfo(petInfo.type, petInfo.age));
        }
        return context;
    };
    /**
     * Get breed-specific information to enhance AI response
     */
    PetAssistantService.prototype.getBreedSpecificInfo = function (petType, breed) {
        // Convert to lowercase for easier comparison
        var type = petType.toLowerCase();
        var breedName = breed.toLowerCase();
        // Common dog breeds
        if (type === 'dog') {
            if (breedName.includes('golden retriever')) {
                return 'Golden Retrievers are known for their friendly temperament, intelligence, and trainability. They typically need regular exercise and are prone to certain health issues like hip dysplasia and skin conditions.';
            }
            else if (breedName.includes('labrador')) {
                return 'Labrador Retrievers are energetic, friendly, and excellent family dogs. They need lots of exercise and are prone to obesity, hip/elbow dysplasia, and eye conditions.';
            }
            else if (breedName.includes('german shepherd')) {
                return 'German Shepherds are intelligent, loyal working dogs with high energy needs. They are prone to hip/elbow dysplasia, degenerative myelopathy, and digestive issues.';
            }
            else if (breedName.includes('bulldog') || breedName.includes('french bulldog')) {
                return 'Bulldogs are brachycephalic breeds with breathing challenges, especially in hot weather. They need moderate exercise, are prone to skin issues, and require special attention to weight management.';
            }
            else if (breedName.includes('poodle')) {
                return 'Poodles are highly intelligent, hypoallergenic dogs that require regular grooming. They are generally healthy but can be prone to hip dysplasia, eye disorders, and skin conditions.';
            }
        }
        // Common cat breeds
        if (type === 'cat') {
            if (breedName.includes('persian')) {
                return 'Persian cats have long coats requiring daily grooming, are typically quiet and sweet-natured. They are prone to breathing issues, eye conditions, and kidney disease.';
            }
            else if (breedName.includes('siamese')) {
                return 'Siamese cats are vocal, intelligent, and social. They typically live longer than many breeds but are prone to respiratory issues, heart problems, and certain cancers.';
            }
            else if (breedName.includes('maine coon')) {
                return 'Maine Coons are large, friendly cats with thick water-resistant coats. They are prone to hip dysplasia, hypertrophic cardiomyopathy, and spinal muscular atrophy.';
            }
            else if (breedName.includes('bengal')) {
                return 'Bengal cats are energetic, playful, and require plenty of stimulation. They can be prone to heart disease, eye issues, and joint problems.';
            }
            else if (breedName.includes('ragdoll')) {
                return 'Ragdolls are docile, affectionate cats known for going limp when held. They can be prone to hypertrophic cardiomyopathy, bladder stones, and kidney issues.';
            }
        }
        return null;
    };
    /**
     * Get age-specific information based on pet type and age
     */
    PetAssistantService.prototype.getAgeSpecificInfo = function (petType, age) {
        var type = petType.toLowerCase();
        if (type === 'dog') {
            if (age < 1) {
                return 'Puppies need frequent feeding, vaccinations, socialization, and basic training. Monitor for signs of parasites and provide appropriate chew toys for teething.';
            }
            else if (age >= 1 && age <= 3) {
                return 'Young adult dogs need consistent training, regular exercise, and preventative healthcare. Establish good routines now for lifelong health.';
            }
            else if (age > 3 && age <= 7) {
                return 'Adult dogs need regular exercise, dental care, and annual health checkups. Monitor weight to prevent obesity.';
            }
            else if (age > 7) {
                return 'Senior dogs may need more frequent health checkups, joint support, special diets, and accommodation for decreasing mobility or sensory changes.';
            }
        }
        else if (type === 'cat') {
            if (age < 1) {
                return 'Kittens need frequent feeding, vaccinations, litterbox training, and socialization. Provide appropriate scratching posts and toys.';
            }
            else if (age >= 1 && age <= 3) {
                return 'Young adult cats need consistent routine, environmental enrichment, and preventative healthcare. Monitor dental health and weight.';
            }
            else if (age > 3 && age <= 10) {
                return 'Adult cats need regular checkups, dental care, and environmental enrichment. Watch for changes in behavior or appetite that might indicate health issues.';
            }
            else if (age > 10) {
                return 'Senior cats may need more frequent health monitoring, specialized diets, and accommodations for joint health or sensory changes.';
            }
        }
        return 'Regular veterinary checkups are important at all life stages.';
    };
    /**
     * Clear the current session
     */
    PetAssistantService.prototype.clearCurrentSession = function () {
        this.currentSession = null;
        this.currentSessionId = null;
        this.currentMessages = [];
    };
    /**
     * Delete a chat session
     */
    PetAssistantService.prototype.deleteSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var success;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, chatRepository_1.chatRepository.deleteSession(sessionId)];
                    case 1:
                        success = _b.sent();
                        // If deleting current session, clear it
                        if (success && ((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.id) === sessionId) {
                            this.clearCurrentSession();
                        }
                        return [2 /*return*/, success];
                }
            });
        });
    };
    /**
     * Get recent chat sessions for a user
     */
    PetAssistantService.prototype.getUserSessions = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                return [2 /*return*/, chatRepository_1.chatRepository.getUserSessions(userId, limit)];
            });
        });
    };
    /**
     * Helper method to refresh auth token if needed
     */
    PetAssistantService.prototype.refreshAuthIfNeeded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, tokenExpiry, fiveMinutesFromNow, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, supabase_1.supabase.auth.getSession()];
                    case 1:
                        session = (_a.sent()).data.session;
                        if (!!session) return [3 /*break*/, 3];
                        console.log('PetAssistantService: No active session, attempting to refresh');
                        return [4 /*yield*/, supabase_1.supabase.auth.refreshSession()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3:
                        tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
                        fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
                        if (!(tokenExpiry && tokenExpiry < fiveMinutesFromNow)) return [3 /*break*/, 5];
                        console.log('PetAssistantService: Token expiring soon, refreshing session');
                        return [4 /*yield*/, supabase_1.supabase.auth.refreshSession()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_9 = _a.sent();
                        console.error('PetAssistantService: Error refreshing auth:', error_9);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return PetAssistantService;
}());
exports.petAssistantService = new PetAssistantService();
