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
/// <reference types="../types/declarations.d.ts" />
/// <reference types="../types/module-declarations.d.ts" />
/// <reference types="../types/ambient.d.ts" />
var react_1 = require("react");
var react_native_1 = require("react-native");
var native_1 = require("@react-navigation/native");
var vector_icons_1 = require("@expo/vector-icons");
var petAssistant_1 = require("../services/petAssistant");
var supabase_1 = require("../services/supabase");
var runSqlFix_1 = require("../utils/runSqlFix");
var chatDiagnostics_1 = require("../utils/chatDiagnostics");
var ThemeContext_1 = require("../contexts/ThemeContext");
var PetStore_1 = require("../store/PetStore");
var error_reporting_1 = require("../utils/error-reporting");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
// ChatUtils helper functions
var ChatUtils = {
    append: function (currentMessages, newMessages) {
        return __spreadArray(__spreadArray([], newMessages, true), currentMessages, true);
    },
    prepend: function (currentMessages, newMessages) {
        return __spreadArray(__spreadArray([], currentMessages, true), newMessages, true);
    },
};
// Simple chat implementation
var SimpleChatUI = function (_a) {
    var messages = _a.messages, onSend = _a.onSend, colors = _a.colors, isLoading = _a.isLoading;
    var _b = (0, react_1.useState)(''), text = _b[0], setText = _b[1];
    // Define styles locally to avoid the reference error
    var uiStyles = react_native_1.StyleSheet.create({
        messageBubble: {
            padding: 12,
            borderRadius: 16,
            marginVertical: 5,
            maxWidth: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 1,
        },
        userBubble: {
            alignSelf: 'flex-end',
            marginLeft: 50,
            marginRight: 10,
            borderBottomRightRadius: 4,
        },
        assistantBubble: {
            alignSelf: 'flex-start',
            marginRight: 50,
            marginLeft: 10,
            borderBottomLeftRadius: 4,
        },
        messageText: {
            fontSize: 16,
            lineHeight: 22,
        },
        inputContainer: {
            flexDirection: 'row',
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
        },
        textInput: {
            flex: 1,
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            minHeight: 40,
            maxHeight: 100,
            marginRight: 10,
            fontSize: 16,
        },
        sendButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        emptyText: {
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 20,
        }
    });
    var handleSend = function () {
        if (text.trim() && !isLoading) {
            onSend(text);
            setText('');
        }
    };
    return (<react_native_1.View style={{ flex: 1, backgroundColor: colors.background }}>
      {messages.length > 0 ? (<react_native_1.FlatList data={messages} keyExtractor={function (item) { return item._id.toString(); }} renderItem={function (_a) {
                var item = _a.item;
                var isUser = item.user._id !== 'assistant';
                return (<react_native_1.View style={[
                        uiStyles.messageBubble,
                        isUser ? [uiStyles.userBubble, { backgroundColor: colors.primary }] : [uiStyles.assistantBubble, { backgroundColor: colors.card }]
                    ]}>
                <react_native_1.Text style={[
                        uiStyles.messageText,
                        { color: isUser ? '#fff' : colors.text }
                    ]}>
                  {item.text}
                </react_native_1.Text>
              </react_native_1.View>);
            }} inverted={true} contentContainerStyle={{ padding: 10 }}/>) : (<react_native_1.View style={uiStyles.emptyContainer}>
          <react_native_1.Text style={[uiStyles.emptyText, { color: colors.text }]}>
            No messages yet. Start a conversation with your Pet Assistant.
          </react_native_1.Text>
        </react_native_1.View>)}
      
      <react_native_1.View style={[uiStyles.inputContainer, {
                backgroundColor: colors.card,
                borderTopColor: colors.border || '#e0e0e0'
            }]}>
        <react_native_1.TextInput style={[
            uiStyles.textInput,
            {
                backgroundColor: colors.inputBackground,
                color: colors.text
            }
        ]} value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor={colors.placeholderText} multiline returnKeyType="send" onSubmitEditing={handleSend} blurOnSubmit={false}/>
        <react_native_1.TouchableOpacity disabled={isLoading || !text.trim()} style={[
            uiStyles.sendButton,
            { backgroundColor: colors.primary },
            (!text.trim() || isLoading) && { opacity: 0.5 }
        ]} onPress={handleSend}>
          {isLoading ? (<react_native_1.ActivityIndicator color="#fff" size="small"/>) : (<vector_icons_1.Ionicons name="send" size={24} color="#fff"/>)}
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
};
// Add a safer haptics implementation with no reliance on imported types
var SafeHaptics = {
    impactAsync: function () { return __awaiter(void 0, void 0, void 0, function () {
        var haptics, e_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('expo-haptics'); }).catch(function () { return null; })];
                case 2:
                    haptics = _a.sent();
                    if (!(haptics && typeof haptics.impactAsync === 'function')) return [3 /*break*/, 4];
                    // Call the function without specifying the enum value
                    // This avoids type errors with ImpactFeedbackStyle
                    return [4 /*yield*/, haptics.impactAsync()];
                case 3:
                    // Call the function without specifying the enum value
                    // This avoids type errors with ImpactFeedbackStyle
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    console.log('Haptics module not available');
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.log('Haptics feedback failed:', error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); }
};
// Update the module check function
var checkModuleLoading = function () {
    // Test dynamic module imports
    var testModule = function (name, importFn) { return __awaiter(void 0, void 0, void 0, function () {
        var module_1, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, importFn()];
                case 1:
                    module_1 = _a.sent();
                    return [2 /*return*/, !!module_1];
                case 2:
                    e_2 = _a.sent();
                    console.log("Failed to import ".concat(name, ":"), e_2);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // Check basic modules that should always be available
    var moduleStatus = {
        react_native_core: typeof react_native_1.View !== 'undefined',
        react: typeof react_1.default !== 'undefined',
        async_storage: typeof async_storage_1.default !== 'undefined',
        supabase: typeof supabase_1.supabase !== 'undefined',
        gifted_chat: typeof SimpleChatUI !== 'undefined'
    };
    console.log('Basic module status:', moduleStatus);
    // Show alert with module status
    react_native_1.Alert.alert('Module Loading Status', Object.entries(moduleStatus)
        .map(function (_a) {
        var name = _a[0], loaded = _a[1];
        return "".concat(name, ": ").concat(loaded ? '✓' : '✗');
    })
        .join('\n'), [{ text: 'OK' }]);
    // Also try to dynamically load optional modules
    Promise.all([
        testModule('expo-haptics', function () { return Promise.resolve().then(function () { return require('expo-haptics'); }); }),
        testModule('expo-clipboard', function () { return Promise.resolve().then(function () { return require('expo-clipboard'); }); })
    ]).then(function (results) {
        console.log('Dynamic module loading results:', {
            'expo-haptics': results[0],
            'expo-clipboard': results[1]
        });
    });
    return moduleStatus;
};
// Main ChatAssistant Component
var ChatAssistant = function () {
    var _a;
    var colorScheme = (0, react_native_1.useColorScheme)();
    var isDark = colorScheme === 'dark';
    var navigation = (0, native_1.useNavigation)();
    var route = (0, native_1.useRoute)();
    var flatListRef = (0, react_1.useRef)(null);
    // Get user ID from supabase with error handling
    var _b = (0, react_1.useState)(null), user = _b[0], setUser = _b[1];
    var _c = (0, react_1.useState)(null), authError = _c[0], setAuthError = _c[1];
    // Replace the problematic useAuth hook with a direct Supabase call
    (0, react_1.useEffect)(function () {
        var getAuthUser = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, data, error_2, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        console.log('ChatAssistant: Getting user directly from Supabase');
                        return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error_2 = _a.error;
                        if (error_2) {
                            console.error('Error accessing Supabase auth:', error_2);
                            setAuthError('Authentication not available: ' + error_2.message);
                            return [2 /*return*/];
                        }
                        if (data && data.user) {
                            console.log('ChatAssistant: User found in Supabase auth');
                            setUser(data.user);
                            setAuthVerified(true);
                            setAuthError(null);
                        }
                        else {
                            console.error('ChatAssistant: No user found in Supabase auth');
                            setAuthError('No authenticated user found');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _b.sent();
                        console.error('Error accessing Supabase auth:', err_1);
                        setAuthError('Authentication not available');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        getAuthUser();
    }, []);
    // Get pet ID if provided through route params
    var petId = (_a = route.params) === null || _a === void 0 ? void 0 : _a.petId;
    // Component state
    var _d = (0, react_1.useState)([]), messages = _d[0], setMessages = _d[1];
    var _e = (0, react_1.useState)(''), inputText = _e[0], setInputText = _e[1];
    var _f = (0, react_1.useState)(false), isLoading = _f[0], setIsLoading = _f[1];
    var _g = (0, react_1.useState)(null), sessionId = _g[0], setSessionId = _g[1];
    var _h = (0, react_1.useState)(false), apiKeySet = _h[0], setApiKeySet = _h[1];
    var _j = (0, react_1.useState)(null), error = _j[0], setError = _j[1];
    var _k = (0, react_1.useState)(true), initializing = _k[0], setInitializing = _k[1];
    var _l = (0, react_1.useState)(true), isReady = _l[0], setIsReady = _l[1];
    var _m = (0, react_1.useState)(false), authVerified = _m[0], setAuthVerified = _m[1];
    var _o = (0, react_1.useState)(false), showApiKeyInput = _o[0], setShowApiKeyInput = _o[1];
    var _p = (0, react_1.useState)(''), apiKey = _p[0], setApiKey = _p[1];
    var _q = (0, react_1.useState)(''), apiKeyError = _q[0], setApiKeyError = _q[1];
    var _r = (0, react_1.useState)(false), apiKeySaving = _r[0], setApiKeySaving = _r[1];
    var _s = (0, react_1.useState)(true), inputVisible = _s[0], setInputVisible = _s[1];
    var _t = (0, ThemeContext_1.useTheme)(), themeColors = _t.colors, themeIsDark = _t.isDark;
    var reportError = (0, error_reporting_1.useErrorReporting)().reportError;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var activePet = (0, PetStore_1.usePetStore)().activePet;
    // Define fixDatabaseIssues at the beginning to avoid circular reference
    var fixDatabaseIssues = function () { return __awaiter(void 0, void 0, void 0, function () {
        var diagnosis, titleFixed, tablesCreated, _a, data, error_4, finalCheck, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('ChatAssistant: Attempting to fix database issues...');
                    setIsLoading(true);
                    setError('Diagnosing database issues...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, 13, 14]);
                    return [4 /*yield*/, (0, chatDiagnostics_1.diagnoseChatTables)()];
                case 2:
                    diagnosis = _b.sent();
                    if (!(!diagnosis.tablesExist || diagnosis.foreignKeyIssue || diagnosis.titleColumnIssue)) return [3 /*break*/, 10];
                    console.log('ChatAssistant: Database issues found:', diagnosis);
                    if (!diagnosis.titleColumnIssue) return [3 /*break*/, 4];
                    console.log('ChatAssistant: Fixing title column issue...');
                    return [4 /*yield*/, (0, chatDiagnostics_1.fixTitleColumnIssue)()];
                case 3:
                    titleFixed = _b.sent();
                    if (!titleFixed) {
                        setError('Failed to fix title column issue.');
                        return [2 /*return*/, false];
                    }
                    _b.label = 4;
                case 4:
                    if (!!diagnosis.tablesExist) return [3 /*break*/, 6];
                    console.log('ChatAssistant: Tables missing, creating them...');
                    return [4 /*yield*/, (0, runSqlFix_1.runFixedSqlScript)()];
                case 5:
                    tablesCreated = _b.sent();
                    if (!tablesCreated.success) {
                        setError("Failed to create tables: ".concat(tablesCreated.message));
                        return [2 /*return*/, false];
                    }
                    _b.label = 6;
                case 6:
                    if (!diagnosis.foreignKeyIssue) return [3 /*break*/, 8];
                    console.log('ChatAssistant: Fixing foreign key issue...');
                    return [4 /*yield*/, supabase_1.supabase.rpc('fix_chat_foreign_keys')];
                case 7:
                    _a = _b.sent(), data = _a.data, error_4 = _a.error;
                    if (error_4 || !data || !data.success) {
                        console.error('ChatAssistant: Failed to fix foreign keys:', error_4 || (data ? data.message : 'Unknown error'));
                        setError('Failed to fix foreign key issue. Please try again.');
                        return [2 /*return*/, false];
                    }
                    _b.label = 8;
                case 8: return [4 /*yield*/, (0, chatDiagnostics_1.diagnoseChatTables)()];
                case 9:
                    finalCheck = _b.sent();
                    if (finalCheck.foreignKeyIssue || finalCheck.titleColumnIssue || !finalCheck.tablesExist) {
                        console.error('ChatAssistant: Database issues persist after repair attempts:', finalCheck);
                        setError('Some database issues could not be fixed automatically. Please contact support.');
                        return [2 /*return*/, false];
                    }
                    console.log('ChatAssistant: Database issues fixed successfully');
                    setError('Database issues fixed. Initializing chat...');
                    // Wait a moment before reinitializing
                    setTimeout(function () { return initializeChat(); }, 1500);
                    return [2 /*return*/, true];
                case 10:
                    console.log('ChatAssistant: No database issues found, chat tables are valid');
                    setError('No database issues found. Initializing chat...');
                    setTimeout(function () { return initializeChat(); }, 1500);
                    return [2 /*return*/, true];
                case 11: return [3 /*break*/, 14];
                case 12:
                    error_3 = _b.sent();
                    console.error('ChatAssistant: Error fixing database issues:', error_3);
                    if (reportError) {
                        reportError(error_3, 'ChatAssistant.fixDatabaseIssues');
                    }
                    setError("Failed to fix database: ".concat(error_3 instanceof Error ? error_3.message : String(error_3)));
                    return [2 /*return*/, false];
                case 13:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    }); };
    // API key handling
    var checkApiKey = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var storedKey, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    if (!apiKey) return [3 /*break*/, 2];
                    console.log('ChatAssistant: Using API key from environment');
                    return [4 /*yield*/, petAssistant_1.petAssistantService.setApiKey(apiKey)];
                case 1:
                    _a.sent();
                    setApiKeySet(true);
                    return [2 /*return*/, true];
                case 2: return [4 /*yield*/, async_storage_1.default.getItem('gemini_api_key')];
                case 3:
                    storedKey = _a.sent();
                    if (!storedKey) return [3 /*break*/, 5];
                    console.log('ChatAssistant: Using API key from storage');
                    return [4 /*yield*/, petAssistant_1.petAssistantService.setApiKey(storedKey)];
                case 4:
                    _a.sent();
                    setApiKeySet(true);
                    return [2 /*return*/, true];
                case 5:
                    // No API key found, prompt user to enter one
                    console.log('ChatAssistant: No API key found, showing prompt');
                    setShowApiKeyInput(true);
                    setApiKeySet(false);
                    setError('API key required. Please configure it in settings or enter below.');
                    return [2 /*return*/, false];
                case 6:
                    error_5 = _a.sent();
                    console.error('Error checking API key:', error_5);
                    if (reportError) {
                        reportError(error_5, 'ChatAssistant.checkApiKey');
                    }
                    setError("Error with API key: ".concat(error_5.message || 'Unknown error'));
                    setShowApiKeyInput(true);
                    setApiKeySet(false);
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [reportError, apiKey]);
    // Initialize chat with proper dependencies and better error handling
    var initializeChat = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var hasApiKey, keyError_1, session, sessionError_1, chatMessages, messagesError_1, giftedChatMessages, welcomeMessage, error_6, repairError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user || initializing)
                        return [2 /*return*/];
                    setInitializing(true);
                    setError(null);
                    console.log('ChatAssistant: Initializing chat session...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 14, 19, 20]);
                    // Verify we have a valid authenticated user
                    if (!user.id) {
                        console.error('ChatAssistant: User has no ID, cannot initialize chat');
                        setError('Authentication issue: No user ID available. Please try logging out and back in.');
                        setInitializing(false);
                        return [2 /*return*/];
                    }
                    hasApiKey = false;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, checkApiKey()];
                case 3:
                    hasApiKey = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    keyError_1 = _a.sent();
                    console.error('ChatAssistant: Error checking API key:', keyError_1);
                    setError("API key check failed: ".concat(keyError_1 instanceof Error ? keyError_1.message : String(keyError_1)));
                    setInitializing(false);
                    return [2 /*return*/];
                case 5:
                    if (!hasApiKey) {
                        console.error('ChatAssistant: API key not set');
                        setInitializing(false);
                        return [2 /*return*/]; // checkApiKey handles setting the appropriate error
                    }
                    // Log the user ID being used for initialization
                    console.log('ChatAssistant: Initializing with user ID:', user.id);
                    session = void 0;
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    console.log('ChatAssistant: Getting or creating chat session...');
                    return [4 /*yield*/, petAssistant_1.petAssistantService.getOrCreateSession(user.id)];
                case 7:
                    session = _a.sent();
                    console.log('ChatAssistant: Session ID:', session.id);
                    return [3 /*break*/, 9];
                case 8:
                    sessionError_1 = _a.sent();
                    console.error('ChatAssistant: Error creating/getting session:', sessionError_1);
                    setError("Session creation failed: ".concat(sessionError_1 instanceof Error ? sessionError_1.message : String(sessionError_1)));
                    setInitializing(false);
                    return [2 /*return*/];
                case 9:
                    // Explicitly set local sessionId
                    setSessionId(session.id);
                    chatMessages = [];
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 12, , 13]);
                    console.log('ChatAssistant: Loading messages for session...');
                    return [4 /*yield*/, petAssistant_1.petAssistantService.getChatMessages(session.id)];
                case 11:
                    chatMessages = _a.sent();
                    console.log('ChatAssistant: Loaded messages count:', chatMessages.length);
                    return [3 /*break*/, 13];
                case 12:
                    messagesError_1 = _a.sent();
                    console.error('ChatAssistant: Error loading messages:', messagesError_1);
                    setError("Failed to load messages: ".concat(messagesError_1 instanceof Error ? messagesError_1.message : String(messagesError_1)));
                    // Continue with empty messages instead of failing
                    chatMessages = [];
                    return [3 /*break*/, 13];
                case 13:
                    try {
                        giftedChatMessages = chatMessages.map(function (msg, i) { return ({
                            _id: i.toString(),
                            text: msg.content,
                            createdAt: new Date(),
                            user: {
                                _id: msg.role === 'user' ? user.id : 'assistant',
                                name: msg.role === 'user' ? 'You' : 'Assistant',
                            },
                        }); });
                        // Update our local state
                        setMessages(giftedChatMessages);
                        // Add welcome message if no messages exist
                        if (giftedChatMessages.length === 0) {
                            welcomeMessage = {
                                _id: 'welcome',
                                text: 'Hello! I\'m your Pet Care Assistant. How can I help with your pet care questions today?',
                                createdAt: new Date(),
                                user: {
                                    _id: 'assistant',
                                    name: 'Assistant',
                                },
                            };
                            setMessages([welcomeMessage]);
                        }
                    }
                    catch (mappingError) {
                        console.error('ChatAssistant: Error mapping messages:', mappingError);
                        // Show an error but continue with empty messages
                        setError("Error preparing messages: ".concat(mappingError instanceof Error ? mappingError.message : String(mappingError)));
                        setMessages([]);
                    }
                    console.log('ChatAssistant: Chat initialized successfully');
                    setError(null);
                    return [3 /*break*/, 20];
                case 14:
                    error_6 = _a.sent();
                    console.error('ChatAssistant: Error initializing chat:', error_6);
                    if (reportError) {
                        reportError(error_6, 'ChatAssistant.initializeChat');
                    }
                    // Handle known error types with friendly messages
                    if (error_6.message && error_6.message.includes('foreign key constraint')) {
                        setError('Database issue: There may be an issue with the chat tables. Please try repairing them using the diagnostic tools.');
                    }
                    else if (error_6.message && error_6.message.includes('not found')) {
                        setError('Database issue: Some required tables may be missing. Please try repairing them using the diagnostic tools.');
                    }
                    else {
                        setError("Error initializing chat: ".concat(error_6.message || 'Unknown error'));
                    }
                    if (!(error_6.message && (error_6.message.includes('database') ||
                        error_6.message.includes('table') ||
                        error_6.message.includes('foreign key') ||
                        error_6.message.includes('constraint')))) return [3 /*break*/, 18];
                    _a.label = 15;
                case 15:
                    _a.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, fixDatabaseIssues()];
                case 16:
                    _a.sent();
                    return [3 /*break*/, 18];
                case 17:
                    repairError_1 = _a.sent();
                    console.error('ChatAssistant: Error during database repair:', repairError_1);
                    return [3 /*break*/, 18];
                case 18: return [3 /*break*/, 20];
                case 19:
                    setInitializing(false);
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    }); }, [user, initializing, checkApiKey, reportError, fixDatabaseIssues]);
    // Show error toast
    var showErrorToast = function (message) {
        try {
            // Replace Toast with Alert
            react_native_1.Alert.alert('Error', message, [{ text: 'OK' }], { cancelable: true });
        }
        catch (error) {
            console.error('ChatAssistant: Error showing alert:', error);
        }
    };
    // Simplified handleSendMessage
    var handleSendMessage = function (messageText) {
        if (!messageText.trim())
            return;
        try {
            // Create a new message object
            var newMessage_1 = {
                _id: Date.now().toString(),
                text: messageText.trim(),
                createdAt: new Date(),
                user: {
                    _id: (user === null || user === void 0 ? void 0 : user.id) || 'user',
                    name: 'You'
                }
            };
            // Add haptic feedback safely
            SafeHaptics.impactAsync().catch(function () { });
            // Add user message to the chat immediately
            setMessages(function (previousMessages) {
                return ChatUtils.append(previousMessages, [newMessage_1]);
            });
            // Process message directly without checking session initially
            processSendMessage({
                role: 'user',
                content: messageText.trim()
            });
        }
        catch (error) {
            if (reportError)
                reportError(error);
            console.error('Error in handleSendMessage:', error);
            showErrorToast('Failed to send message');
        }
    };
    // Track when the screen gains focus to refresh data
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(function () {
        console.log('ChatAssistant: Screen focused');
        // Create a state variable to track if this component is mounted
        var isMounted = true;
        // We won't automatically reinitialize on focus, just make sure
        // we have the latest data without causing redirects
        var updateScreenState = function () { return __awaiter(void 0, void 0, void 0, function () {
            var welcomeMessage;
            return __generator(this, function (_a) {
                if (!isMounted)
                    return [2 /*return*/];
                // If we already have a session, just make sure UI elements are visible
                if (sessionId) {
                    setInputVisible(true);
                    console.log('ChatAssistant: Session already exists:', sessionId);
                    return [2 /*return*/];
                }
                // If we have a user but no session, add a welcome message
                // but don't automatically initialize which can cause navigation issues
                if (user && !initializing && messages.length === 0) {
                    console.log('ChatAssistant: Adding welcome message');
                    welcomeMessage = {
                        _id: 'welcome',
                        text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                        createdAt: new Date(),
                        user: {
                            _id: 'assistant',
                            name: 'Assistant',
                        },
                    };
                    setMessages([welcomeMessage]);
                }
                return [2 /*return*/];
            });
        }); };
        updateScreenState();
        return function () {
            console.log('ChatAssistant: Screen losing focus');
            isMounted = false;
        };
    }, [user, sessionId, initializing, messages.length]));
    // Create a separate function for the message sending process
    var processSendMessage = function (userMessage) { return __awaiter(void 0, void 0, void 0, function () {
        var errorMsg_1, newSession, response, assistantMessage_1, errorMsg_2, messageError_1, errorMsg_3, error_7, errorMsg_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user || !user.id) {
                        console.error('ChatAssistant: No valid user in processSendMessage');
                        errorMsg_1 = {
                            _id: new Date().getTime().toString(),
                            text: 'You must be logged in to use the chat assistant.',
                            createdAt: new Date(),
                            user: {
                                _id: 'assistant',
                                name: 'Pet Assistant'
                            }
                        };
                        setMessages(function (previousMessages) { return ChatUtils.append(previousMessages, [errorMsg_1]); });
                        return [2 /*return*/];
                    }
                    setIsLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, 9, 10]);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    console.log('ChatAssistant: Sending message with user ID:', user.id);
                    if (!!sessionId) return [3 /*break*/, 4];
                    console.log('No session ID, creating one first');
                    return [4 /*yield*/, petAssistant_1.petAssistantService.startNewSession(user.id, petId)];
                case 3:
                    newSession = _a.sent();
                    if (newSession) {
                        console.log('Created new session:', newSession);
                        setSessionId(newSession);
                    }
                    else {
                        throw new Error('Failed to create chat session');
                    }
                    _a.label = 4;
                case 4: return [4 /*yield*/, petAssistant_1.petAssistantService.sendMessage(user.id, userMessage.content)];
                case 5:
                    response = _a.sent();
                    // Check if response is an error message or valid response
                    if (response) {
                        assistantMessage_1 = {
                            _id: new Date().getTime().toString(),
                            text: response,
                            createdAt: new Date(),
                            user: {
                                _id: 'assistant',
                                name: 'Pet Assistant'
                            }
                        };
                        // Update messages in state to show the response
                        setMessages(function (previousMessages) { return ChatUtils.append(previousMessages, [assistantMessage_1]); });
                    }
                    else {
                        errorMsg_2 = {
                            _id: new Date().getTime().toString(),
                            text: 'Sorry, I encountered an error processing your message. Please try again.',
                            createdAt: new Date(),
                            user: {
                                _id: 'assistant',
                                name: 'Pet Assistant'
                            }
                        };
                        setMessages(function (previousMessages) { return ChatUtils.append(previousMessages, [errorMsg_2]); });
                    }
                    return [3 /*break*/, 7];
                case 6:
                    messageError_1 = _a.sent();
                    console.error('Error in message processing:', messageError_1);
                    errorMsg_3 = {
                        _id: new Date().getTime().toString(),
                        text: "Error: ".concat((messageError_1 === null || messageError_1 === void 0 ? void 0 : messageError_1.message) || 'Unknown error occurred', ". Please try again."),
                        createdAt: new Date(),
                        user: {
                            _id: 'assistant',
                            name: 'Pet Assistant'
                        }
                    };
                    setMessages(function (previousMessages) { return ChatUtils.append(previousMessages, [errorMsg_3]); });
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 10];
                case 8:
                    error_7 = _a.sent();
                    console.error('ChatAssistant: Error sending message:', error_7);
                    errorMsg_4 = {
                        _id: new Date().getTime().toString(),
                        text: "Error: ".concat((error_7 === null || error_7 === void 0 ? void 0 : error_7.message) || 'Unknown error occurred', ". Please try again."),
                        createdAt: new Date(),
                        user: {
                            _id: 'assistant',
                            name: 'Pet Assistant'
                        }
                    };
                    setMessages(function (previousMessages) { return ChatUtils.append(previousMessages, [errorMsg_4]); });
                    return [3 /*break*/, 10];
                case 9:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    }); };
    // Replace with theme-based colors
    var uiColors = {
        background: isDark ? '#121212' : '#f5f5f5',
        card: isDark ? '#1e1e1e' : '#ffffff',
        userBubble: isDark ? '#2e7d32' : '#4caf50',
        assistantBubble: isDark ? '#1e1e1e' : '#e0e0e0',
        userText: '#ffffff',
        assistantText: isDark ? '#e0e0e0' : '#000000',
        inputBackground: isDark ? '#333333' : '#ffffff',
        inputText: isDark ? '#ffffff' : '#000000',
        border: isDark ? '#333333' : '#e0e0e0',
        placeholderText: isDark ? '#aaaaaa' : '#888888',
        sendButton: isDark ? '#2e7d32' : '#4caf50',
        error: isDark ? '#ff6b6b' : '#ff6b6b',
        primary: isDark ? '#2e7d32' : '#4caf50',
    };
    // Add function to configure API key from settings (for use in error state)
    var configureApiKey = function () {
        // React Native doesn't have Alert.prompt on Android, so we'll just navigate to settings
        react_native_1.Alert.alert('API Key Required', 'You need to configure a Gemini API key to use the Pet Assistant. Would you like to set it now?', [
            {
                text: 'Cancel',
                style: 'cancel'
            },
            {
                text: 'Configure',
                onPress: function () {
                    // Use any to bypass TypeScript navigation typing issues
                    navigation.navigate('Settings');
                }
            }
        ]);
    };
    /**
     * Saves the API key and initializes the chat with the new key
     */
    var saveApiKey = function (key) { return __awaiter(void 0, void 0, void 0, function () {
        var isValid, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, 7, 8]);
                    if (!key || !key.trim()) {
                        react_native_1.Alert.alert('Error', 'Please enter a valid API key');
                        return [2 /*return*/, false];
                    }
                    setIsLoading(true);
                    console.log('Chat: Setting Gemini API key...');
                    // Use petAssistantService to securely store the API key
                    // This uses securityService internally with HIGH sensitivity
                    return [4 /*yield*/, petAssistant_1.petAssistantService.setApiKey(key.trim())];
                case 1:
                    // Use petAssistantService to securely store the API key
                    // This uses securityService internally with HIGH sensitivity
                    _a.sent();
                    return [4 /*yield*/, petAssistant_1.petAssistantService.hasApiKey()];
                case 2:
                    isValid = _a.sent();
                    if (!isValid) return [3 /*break*/, 4];
                    console.log('Chat: API key validation successful');
                    // Initialize the chat with the new key
                    return [4 /*yield*/, initializeChat()];
                case 3:
                    // Initialize the chat with the new key
                    _a.sent();
                    return [2 /*return*/, true];
                case 4:
                    console.error('Chat: API key validation failed');
                    react_native_1.Alert.alert('Invalid API Key', 'The API key you entered appears to be invalid. Please check and try again.', [
                        {
                            text: 'Try Again',
                            style: 'cancel',
                        },
                        {
                            text: 'Go to Settings',
                            onPress: function () { return navigation.navigate('Settings'); },
                        },
                    ]);
                    return [2 /*return*/, false];
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_8 = _a.sent();
                    console.error('Chat: Error saving API key:', error_8);
                    react_native_1.Alert.alert('Error', 'There was a problem saving the API key. Please try again.');
                    return [2 /*return*/, false];
                case 7:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    // Fix the startNewSession function to properly convert GeminiChatMessage to IMessage
    var startNewSession = function () { return __awaiter(void 0, void 0, void 0, function () {
        var newSessionId, chatMessages, giftedChatMessages, welcomeMessage, error_9, recoveryError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user) {
                        // Don't use Alert here as it might interrupt the flow
                        console.error('ChatAssistant: Cannot start new session without user');
                        setError('You must be logged in to use the chat assistant.');
                        return [2 /*return*/];
                    }
                    // Show we're working on it
                    setIsLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 8, 9]);
                    console.log('ChatAssistant: Starting new session for user:', user.id);
                    return [4 /*yield*/, petAssistant_1.petAssistantService.startNewSession(user.id, petId)];
                case 2:
                    newSessionId = _a.sent();
                    if (newSessionId) {
                        console.log('ChatAssistant: New session created successfully:', newSessionId);
                        setSessionId(newSessionId);
                        chatMessages = petAssistant_1.petAssistantService.getCurrentSessionMessages();
                        giftedChatMessages = chatMessages.map(function (msg, i) { return ({
                            _id: i.toString(),
                            text: msg.content,
                            createdAt: new Date(),
                            user: {
                                _id: msg.role === 'user' ? user.id : 'assistant',
                                name: msg.role === 'user' ? 'You' : 'Assistant',
                            },
                        }); });
                        setMessages(giftedChatMessages);
                        // Always ensure there's at least a welcome message
                        if (giftedChatMessages.length === 0) {
                            welcomeMessage = {
                                _id: 'welcome',
                                text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                                createdAt: new Date(),
                                user: {
                                    _id: 'assistant',
                                    name: 'Assistant',
                                },
                            };
                            setMessages([welcomeMessage]);
                        }
                        // Clear any previous errors
                        setError(null);
                    }
                    else {
                        console.error('ChatAssistant: Failed to create new session');
                        // Use setError here instead of Alert to avoid navigation issues
                        setError('Failed to create a new chat session. Please try again.');
                    }
                    return [3 /*break*/, 9];
                case 3:
                    error_9 = _a.sent();
                    console.error('ChatAssistant: Error starting new session:', error_9);
                    // Use setError here instead of Alert to avoid navigation issues
                    setError('Failed to start a new chat session. Please try again.');
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    console.log('ChatAssistant: Attempting to recover with initializeChat');
                    return [4 /*yield*/, initializeChat()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    recoveryError_1 = _a.sent();
                    console.error('ChatAssistant: Recovery attempt failed:', recoveryError_1);
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    // Fix to ensure welcome message is always shown if no messages
    (0, react_1.useEffect)(function () {
        if (!isLoading && !initializing && messages.length === 0 && !error) {
            var welcomeMessage = {
                _id: 'welcome',
                text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                createdAt: new Date(),
                user: {
                    _id: 'assistant',
                    name: 'Assistant',
                },
            };
            setMessages([welcomeMessage]);
        }
    }, [isLoading, initializing, messages.length, error]);
    // Show a hint about the refresh button when the component mounts
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () {
            react_native_1.Alert.alert('Welcome to Pet Assistant', 'You can ask any questions about pet care. If the chat has any issues, tap the refresh button in the bottom right corner.', [{ text: 'Got it!' }]);
        }, 1000);
        return function () { return clearTimeout(timer); };
    }, []);
    // Function to check and fix display issues
    var checkInputDisplay = function () {
        console.log('ChatAssistant: Checking input display and session state');
        // If we still have no messages, add a welcome message
        if (messages.length === 0) {
            var welcomeMessage = {
                _id: 'welcome',
                text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                createdAt: new Date(),
                user: {
                    _id: 'assistant',
                    name: 'Assistant',
                },
            };
            setMessages([welcomeMessage]);
        }
        // Restart session if needed, but do it properly
        if (!sessionId && user) {
            console.log('ChatAssistant: No session found, initializing');
            // Use the more robust startNewSession which has been fixed to prevent navigation
            startNewSession();
        }
        else if (sessionId) {
            console.log('ChatAssistant: Session exists, refreshing UI only:', sessionId);
            // Otherwise just refresh the UI without changing the session
            setInputVisible(false);
            setTimeout(function () { return setInputVisible(true); }, 100);
            // Also make sure any errors are cleared
            setError(null);
        }
        // Use a more controlled approach instead of Alert which can interrupt flow
        var message = sessionId
            ? 'Chat refreshed. You can continue your conversation.'
            : 'Creating a new chat session...';
        // Use a toast message or small UI indicator instead of Alert
        console.log('ChatAssistant: ' + message);
        // Set a temporary status message instead of showing an Alert
        var statusMessage = {
            _id: 'status-' + Date.now(),
            text: message,
            createdAt: new Date(),
            system: true,
            user: {
                _id: 'system',
                name: 'System',
            },
        };
        // Add status message that will disappear after a few seconds
        setMessages(function (prev) { return ChatUtils.append(prev, [statusMessage]); });
        setTimeout(function () {
            setMessages(function (prev) { return prev.filter(function (msg) { return msg._id !== statusMessage._id; }); });
        }, 3000);
    };
    // Add a safe effect to initialize the chat only once on mount
    (0, react_1.useEffect)(function () {
        // Only try to initialize once when the component is first mounted
        if (user && !sessionId && !initializing) {
            console.log('ChatAssistant: Component mounted, safely initializing session');
            // Use a timeout to ensure the component is fully mounted
            var initTimer_1 = setTimeout(function () {
                // Instead of using initializeChat which can cause navigation,
                // use a simpler approach to just get a session ID
                if (user.id) {
                    petAssistant_1.petAssistantService.getOrCreateSession(user.id, petId)
                        .then(function (session) {
                        if (session && session.id) {
                            console.log('ChatAssistant: Got session ID on mount:', session.id);
                            setSessionId(session.id);
                            // Only load messages if we don't already have them
                            if (messages.length === 0) {
                                petAssistant_1.petAssistantService.getChatMessages(session.id)
                                    .then(function (chatMessages) {
                                    if (chatMessages && chatMessages.length > 0) {
                                        // Convert to our chat format
                                        var formattedMessages = chatMessages.map(function (msg, i) { return ({
                                            _id: i.toString(),
                                            text: msg.content,
                                            createdAt: new Date(),
                                            user: {
                                                _id: msg.role === 'user' ? user.id : 'assistant',
                                                name: msg.role === 'user' ? 'You' : 'Assistant',
                                            },
                                        }); });
                                        setMessages(formattedMessages);
                                    }
                                    else {
                                        // Add a welcome message if no messages
                                        var welcomeMessage = {
                                            _id: 'welcome',
                                            text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                                            createdAt: new Date(),
                                            user: {
                                                _id: 'assistant',
                                                name: 'Assistant',
                                            },
                                        };
                                        setMessages([welcomeMessage]);
                                    }
                                })
                                    .catch(function (err) {
                                    console.error('Error loading messages:', err);
                                    // Add a welcome message as fallback
                                    var welcomeMessage = {
                                        _id: 'welcome',
                                        text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                                        createdAt: new Date(),
                                        user: {
                                            _id: 'assistant',
                                            name: 'Assistant',
                                        },
                                    };
                                    setMessages([welcomeMessage]);
                                });
                            }
                        }
                    })
                        .catch(function (error) {
                        console.error('Error getting session on mount:', error);
                        // Don't show error to user, just log it
                    });
                }
            }, 500);
            return function () { return clearTimeout(initTimer_1); };
        }
    }, [user, sessionId, initializing, petId, messages.length]);
    // Render content based on state
    var renderContent = function () {
        if (isLoading && !messages.length) {
            return (<react_native_1.View style={styles.loadingContainer}>
          <react_native_1.ActivityIndicator size="large" color={themeColors.primary}/>
          <react_native_1.Text style={styles.loadingText}>Loading...</react_native_1.Text>
        </react_native_1.View>);
        }
        if (error) {
            return (<react_native_1.View style={styles.centeredContainer}>
          <react_native_1.View style={styles.errorBoxContainer}>
            <react_native_1.Text style={styles.errorText}>{error}</react_native_1.Text>
            {error.includes('database') ? (<react_native_1.TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={diagnoseChatSchema}>
                <react_native_1.Text style={styles.buttonText}>Run Diagnostics</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : error.includes('API key') ? (<react_native_1.TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary, marginTop: 20 }]} onPress={configureApiKey}>
                <react_native_1.Text style={styles.buttonText}>Configure API Key</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary, marginTop: 20 }]} onPress={function () { return initializeChat(); }} disabled={isLoading}>
                <react_native_1.Text style={styles.buttonText}>{isLoading ? "Trying..." : "Try Again"}</react_native_1.Text>
              </react_native_1.TouchableOpacity>)}
          </react_native_1.View>
        </react_native_1.View>);
        }
        // Make sure we have at least a welcome message
        var displayMessages = messages.length === 0 ? [{
                _id: 'welcome',
                text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
                createdAt: new Date(),
                user: {
                    _id: 'assistant',
                    name: 'Assistant',
                },
            }] : messages;
        // Use our simplified chat UI
        return (<react_native_1.KeyboardAvoidingView style={{ flex: 1 }} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={react_native_1.Platform.OS === 'ios' ? 60 : 0}>
        <SimpleChatUI messages={displayMessages} onSend={handleSendMessage} isLoading={isLoading} colors={{
                primary: themeColors.primary,
                background: themeColors.background,
                card: themeColors.card,
                text: themeColors.text,
                inputBackground: themeColors.inputBackground || uiColors.inputBackground,
                placeholderText: themeColors.placeholderText || uiColors.placeholderText,
            }}/>
      </react_native_1.KeyboardAvoidingView>);
    };
    // Define styles for the component using theme colors
    var styles = react_native_1.StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.background,
        },
        loadingText: {
            marginTop: 10,
            fontSize: 16,
            color: themeColors.text,
        },
        centeredContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: themeColors.background,
        },
        errorBoxContainer: {
            backgroundColor: themeColors.card,
            padding: 20,
            borderRadius: 8,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        errorText: {
            color: themeColors.error,
            textAlign: 'center',
            marginBottom: 20,
            fontSize: 16,
        },
        button: {
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
        },
        messageText: {
            fontSize: 16,
        },
        messagesContainer: {
            flexGrow: 1,
            padding: 10,
            paddingBottom: 15,
        },
        inputContainer: {
            flexDirection: 'row',
            padding: 10,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
            backgroundColor: themeColors.card,
        },
        input: {
            flex: 1,
            backgroundColor: themeColors.inputBackground || '#f0f0f0',
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginRight: 10,
            color: themeColors.inputText || '#000',
            maxHeight: 100,
        },
        sendButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: themeColors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        messageBubble: {
            padding: 12,
            borderRadius: 16,
            marginVertical: 5,
            maxWidth: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 1,
        },
        userBubble: {
            backgroundColor: themeColors.primary || '#4caf50',
            alignSelf: 'flex-end',
            marginLeft: 50,
            marginRight: 10,
            borderBottomRightRadius: 4,
        },
        assistantBubble: {
            backgroundColor: themeColors.card || '#e0e0e0',
            alignSelf: 'flex-start',
            marginRight: 50,
            marginLeft: 10,
            borderBottomLeftRadius: 4,
        },
        userText: {
            color: '#ffffff',
        },
        assistantBubbleText: {
            color: themeColors.text || '#000000',
        },
        floatingButton: {
            position: 'absolute',
            bottom: 85, // Position above the chat input
            right: 20,
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            zIndex: 999,
        },
        fallbackInputContainer: {
            flexDirection: 'row',
            padding: 10,
            backgroundColor: themeColors.card || '#ffffff',
            borderTopWidth: 1,
            borderTopColor: themeColors.border || '#e0e0e0',
        },
        fallbackInput: {
            flex: 1,
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            maxHeight: 100,
            marginRight: 10,
        },
        fallbackSendButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
    // Fix for line 875 - Implement diagnoseChatSchema function
    var diagnoseChatSchema = function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, sessions, sessionsError, _b, columns, columnsError, analyzeError, diagnosticResult_1, error_10;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    setIsLoading(true);
                    setError('Running schema diagnostics...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('chat_sessions')
                            .select('id')
                            .limit(1)];
                case 2:
                    _a = _c.sent(), sessions = _a.data, sessionsError = _a.error;
                    return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                            sql: "\n          SELECT column_name, data_type, is_nullable \n          FROM information_schema.columns \n          WHERE table_schema = 'public' \n          AND table_name = 'chat_sessions'\n          ORDER BY ordinal_position;\n        "
                        })];
                case 3:
                    _b = _c.sent(), columns = _b.data, columnsError = _b.error;
                    return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                            sql: "\n          ANALYZE chat_sessions;\n          ANALYZE chat_messages;\n        "
                        })];
                case 4:
                    analyzeError = (_c.sent()).error;
                    diagnosticResult_1 = '';
                    if (sessionsError) {
                        diagnosticResult_1 += "Table error: ".concat(sessionsError.message, "\n\n");
                    }
                    else {
                        diagnosticResult_1 += "chat_sessions table exists.\n";
                    }
                    if (columnsError) {
                        diagnosticResult_1 += "Column error: ".concat(columnsError.message, "\n\n");
                    }
                    else if (columns) {
                        diagnosticResult_1 += "chat_sessions columns:\n";
                        columns.forEach(function (col) {
                            diagnosticResult_1 += "- ".concat(col.column_name, ": ").concat(col.data_type, " (").concat(col.is_nullable === 'YES' ? 'nullable' : 'not nullable', ")\n");
                        });
                    }
                    if (analyzeError) {
                        diagnosticResult_1 += "\nAnalyze error: ".concat(analyzeError.message);
                    }
                    else {
                        diagnosticResult_1 += "\nTable analysis complete.";
                    }
                    // Show the diagnostic results to the user
                    react_native_1.Alert.alert('Database Diagnosis Results', diagnosticResult_1, [
                        {
                            text: 'Run Repair',
                            onPress: fixDatabaseIssues
                        },
                        {
                            text: 'OK',
                            style: 'cancel'
                        }
                    ]);
                    return [3 /*break*/, 7];
                case 5:
                    error_10 = _c.sent();
                    console.error('Error during chat schema diagnosis:', error_10);
                    react_native_1.Alert.alert('Diagnosis Error', "Failed to diagnose database: ".concat(error_10.message || 'Unknown error'));
                    return [3 /*break*/, 7];
                case 6:
                    setIsLoading(false);
                    setError(null);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      {renderContent()}
      
      {/* Floating action button for refreshing the chat UI */}
      <react_native_1.TouchableOpacity style={[
            styles.floatingButton,
            { backgroundColor: themeColors.primary || '#4caf50' }
        ]} onPress={function () {
            // Simpler, safer refresh that won't cause navigation issues
            console.log('ChatAssistant: Manual refresh requested');
            if (!user) {
                // Show a message directly in the chat
                var errorMsg_5 = {
                    _id: 'error-' + Date.now(),
                    text: 'You need to be logged in to use the chat assistant.',
                    createdAt: new Date(),
                    user: {
                        _id: 'assistant',
                        name: 'System',
                    },
                };
                setMessages(function (prev) { return ChatUtils.append(prev, [errorMsg_5]); });
                return;
            }
            // If we don't have a session, try to get one but don't reset UI
            if (!sessionId && user.id) {
                setIsLoading(true);
                petAssistant_1.petAssistantService.getOrCreateSession(user.id, petId)
                    .then(function (session) {
                    if (session && session.id) {
                        console.log('ChatAssistant: Got new session ID on refresh:', session.id);
                        setSessionId(session.id);
                        // Status message
                        var statusMsg_1 = {
                            _id: 'status-' + Date.now(),
                            text: 'Chat session refreshed.',
                            createdAt: new Date(),
                            system: true,
                            user: {
                                _id: 'system',
                                name: 'System',
                            },
                        };
                        setMessages(function (prev) { return ChatUtils.append(prev, [statusMsg_1]); });
                        // Auto-remove status message after 3 seconds
                        setTimeout(function () {
                            setMessages(function (prev) { return prev.filter(function (m) { return m._id !== statusMsg_1._id; }); });
                        }, 3000);
                    }
                    setIsLoading(false);
                })
                    .catch(function (error) {
                    console.error('Error getting session on refresh:', error);
                    setIsLoading(false);
                    // Show error in chat
                    var errorMsg = {
                        _id: 'error-' + Date.now(),
                        text: 'Could not refresh the chat session. Please try again.',
                        createdAt: new Date(),
                        user: {
                            _id: 'assistant',
                            name: 'System',
                        },
                    };
                    setMessages(function (prev) { return ChatUtils.append(prev, [errorMsg]); });
                });
            }
            else {
                // We have a session, just show a status message
                var statusMsg_2 = {
                    _id: 'status-' + Date.now(),
                    text: 'Chat ready.',
                    createdAt: new Date(),
                    system: true,
                    user: {
                        _id: 'system',
                        name: 'System',
                    },
                };
                setMessages(function (prev) { return ChatUtils.append(prev, [statusMsg_2]); });
                // Auto-remove status message after 3 seconds
                setTimeout(function () {
                    setMessages(function (prev) { return prev.filter(function (m) { return m._id !== statusMsg_2._id; }); });
                }, 3000);
            }
        }}>
        <vector_icons_1.Ionicons name="refresh" size={24} color="#fff"/>
      </react_native_1.TouchableOpacity>
    </react_native_1.SafeAreaView>);
};
exports.default = ChatAssistant;
