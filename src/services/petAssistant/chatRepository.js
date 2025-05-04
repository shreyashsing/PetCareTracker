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
exports.chatRepository = void 0;
var supabase_1 = require("../supabase");
var ChatRepository = /** @class */ (function () {
    function ChatRepository() {
    }
    // Create a new chat session
    ChatRepository.prototype.createSession = function (userId, petId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, userCheck, userError, authError_1, sessionData, _b, pet, petError, petError_1, _c, data, error, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 11, , 12]);
                        if (!userId) {
                            console.error('Error: Cannot create chat session - no user ID provided');
                            throw new Error('User ID is required to create a chat session');
                        }
                        console.log("Creating chat session for user: ".concat(userId, ", pet: ").concat(petId || 'none'));
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, supabase_1.supabase.auth.admin.getUserById(userId)];
                    case 2:
                        _a = _d.sent(), userCheck = _a.data, userError = _a.error;
                        if (userError) {
                            console.log('Cannot verify user directly through auth admin API, continuing anyway');
                        }
                        else if (!(userCheck === null || userCheck === void 0 ? void 0 : userCheck.user)) {
                            console.warn("Warning: User ID ".concat(userId, " not found in auth.users, but continuing"));
                        }
                        else {
                            console.log("User ".concat(userId, " verified through auth API"));
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        authError_1 = _d.sent();
                        // This might fail if admin privileges aren't available
                        console.log('Auth verification skipped, continuing with session creation');
                        return [3 /*break*/, 4];
                    case 4:
                        sessionData = {
                            user_id: userId,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        if (!petId) return [3 /*break*/, 8];
                        _d.label = 5;
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('pets')
                                .select('id')
                                .eq('id', petId)
                                .eq('user_id', userId) // Ensure pet belongs to this user
                                .single()];
                    case 6:
                        _b = _d.sent(), pet = _b.data, petError = _b.error;
                        if (!petError && pet) {
                            // Pet found and belongs to user, include it in session
                            sessionData.pet_id = petId;
                            console.log("Pet ".concat(petId, " verified and added to session"));
                        }
                        else {
                            // Pet not found or doesn't belong to user
                            console.log("Warning: Pet ID ".concat(petId, " not found or doesn't belong to user, creating session without pet reference"));
                            // Continue without pet_id
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        petError_1 = _d.sent();
                        console.error('Error verifying pet:', petError_1);
                        return [3 /*break*/, 8];
                    case 8:
                        console.log('Creating chat session with data:', JSON.stringify(sessionData));
                        // Make sure auth is refreshed before creating the session
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 9:
                        // Make sure auth is refreshed before creating the session
                        _d.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_sessions')
                                .insert(sessionData)
                                .select('id')
                                .single()];
                    case 10:
                        _c = _d.sent(), data = _c.data, error = _c.error;
                        if (error) {
                            console.error('Error creating chat session:', error);
                            console.error('Error details:', JSON.stringify(error));
                            return [2 /*return*/, null];
                        }
                        console.log("Chat session created with ID: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.id) || null];
                    case 11:
                        error_1 = _d.sent();
                        console.error('Exception creating chat session:', error_1);
                        if (error_1 instanceof Error) {
                            console.error('Error details:', error_1.message);
                            if (error_1.stack)
                                console.error('Stack trace:', error_1.stack);
                        }
                        return [2 /*return*/, null];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    // Helper method to refresh auth token if needed
    ChatRepository.prototype.refreshAuthIfNeeded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, tokenExpiry, fiveMinutesFromNow, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, supabase_1.supabase.auth.getSession()];
                    case 1:
                        session = (_a.sent()).data.session;
                        if (!!session) return [3 /*break*/, 3];
                        console.log('ChatRepository: No active session, attempting to refresh');
                        return [4 /*yield*/, supabase_1.supabase.auth.refreshSession()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3:
                        tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
                        fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
                        if (!(tokenExpiry && tokenExpiry < fiveMinutesFromNow)) return [3 /*break*/, 5];
                        console.log('ChatRepository: Token expiring soon, refreshing session');
                        return [4 /*yield*/, supabase_1.supabase.auth.refreshSession()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        console.error('ChatRepository: Error refreshing auth:', error_2);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Update the session's last update time
    ChatRepository.prototype.updateSessionTimestamp = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_sessions')
                                .update({ updated_at: new Date().toISOString() })
                                .eq('id', sessionId)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error('Error updating chat session timestamp:', error);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Exception updating chat session timestamp:', error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Add a message to a chat session
    ChatRepository.prototype.addMessage = function (sessionId, content, role, tokens) {
        return __awaiter(this, void 0, void 0, function () {
            var messageData, _a, data, error, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        if (!sessionId) {
                            console.error('Error: Cannot add message - no session ID provided');
                            throw new Error('Session ID is required to add a message');
                        }
                        console.log("Adding message to session ".concat(sessionId, ", role: ").concat(role, ", content length: ").concat(content.length));
                        // Update the session timestamp
                        return [4 /*yield*/, this.updateSessionTimestamp(sessionId)];
                    case 1:
                        // Update the session timestamp
                        _b.sent();
                        messageData = {
                            session_id: sessionId,
                            content: content,
                            role: role,
                            timestamp: new Date().toISOString(),
                            tokens: tokens
                        };
                        console.log('Message data prepared:', JSON.stringify({
                            session_id: sessionId,
                            role: role,
                            content_length: content.length,
                            tokens: tokens
                        }));
                        // Ensure auth is refreshed before adding message
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 2:
                        // Ensure auth is refreshed before adding message
                        _b.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_messages')
                                .insert(messageData)
                                .select('id')
                                .single()];
                    case 3:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error adding chat message:', error);
                            console.error('Error details:', JSON.stringify(error));
                            return [2 /*return*/, null];
                        }
                        console.log("Message added successfully with ID: ".concat(data === null || data === void 0 ? void 0 : data.id));
                        return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.id) || null];
                    case 4:
                        error_4 = _b.sent();
                        console.error('Exception adding chat message:', error_4);
                        if (error_4 instanceof Error) {
                            console.error('Error details:', error_4.message);
                            if (error_4.stack)
                                console.error('Stack trace:', error_4.stack);
                        }
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Get all messages for a session
    ChatRepository.prototype.getSessionMessages = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_messages')
                                .select('*')
                                .eq('session_id', sessionId)
                                .order('timestamp', { ascending: true })];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error fetching chat messages:', error);
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data || []];
                    case 3:
                        error_5 = _b.sent();
                        console.error('Exception fetching chat messages:', error_5);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Get recent sessions for a user
    ChatRepository.prototype.getUserSessions = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            var _a, data, error, error_6;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_sessions')
                                .select('*')
                                .eq('user_id', userId)
                                .order('updated_at', { ascending: false })
                                .limit(limit)];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error('Error fetching user chat sessions:', error);
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data || []];
                    case 3:
                        error_6 = _b.sent();
                        console.error('Exception fetching user chat sessions:', error_6);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Delete a chat session and its messages
    ChatRepository.prototype.deleteSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var messagesError, sessionError, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.refreshAuthIfNeeded()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_messages')
                                .delete()
                                .eq('session_id', sessionId)];
                    case 2:
                        messagesError = (_a.sent()).error;
                        if (messagesError) {
                            console.error('Error deleting chat messages:', messagesError);
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from('chat_sessions')
                                .delete()
                                .eq('id', sessionId)];
                    case 3:
                        sessionError = (_a.sent()).error;
                        if (sessionError) {
                            console.error('Error deleting chat session:', sessionError);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 4:
                        error_7 = _a.sent();
                        console.error('Exception deleting chat session:', error_7);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return ChatRepository;
}());
exports.chatRepository = new ChatRepository();
