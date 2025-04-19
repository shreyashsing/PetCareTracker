/// <reference types="../types/declarations.d.ts" />
/// <reference types="../types/module-declarations.d.ts" />
/// <reference types="../types/ambient.d.ts" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  useColorScheme,
  ScrollView,
  Keyboard,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { petAssistantService } from '../services/petAssistant';
import { ChatMessage as GeminiChatMessage } from '../services/petAssistant/geminiService';
import { supabase } from '../services/supabase';
import { MainStackParamList } from '../types/navigation';
import { useAuth } from '../providers/AuthProvider';
import { runFixedSqlScript } from '../utils/runSqlFix';
import { getChatTablesSQLFix, diagnoseChatTables, fixTitleColumnIssue } from '../utils/chatDiagnostics';
import { debugAuth, refreshAuth } from '../utils/authDebug';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/AppStore';
import { usePetStore } from '../store/PetStore';
import { useErrorReporting } from '../utils/error-reporting';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEMINI_API_KEY } from '@env';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

// Define our simple ChatMessage interface
interface ChatMessage {
  _id: string | number;
  text: string;
  createdAt: Date | number;
  user: {
    _id: string | number;
    name?: string;
    avatar?: string;
  };
  image?: string;
  system?: boolean;
}

// ChatUtils helper functions
const ChatUtils = {
  append: (currentMessages: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] => {
    return [...newMessages, ...currentMessages];
  },
  prepend: (currentMessages: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] => {
    return [...currentMessages, ...newMessages];
  },
};

// Simple chat implementation
const SimpleChatUI = ({ 
  messages, 
  onSend, 
  colors, 
  isLoading 
}: { 
  messages: ChatMessage[]; 
  onSend: (message: string) => void; 
  colors: any;
  isLoading: boolean;
}) => {
  const [text, setText] = useState('');
  
  // Define styles locally to avoid the reference error
  const uiStyles = StyleSheet.create({
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
  
  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text);
      setText('');
    }
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {messages.length > 0 ? (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id.toString()}
          renderItem={({ item }) => {
            const isUser = item.user._id !== 'assistant';
            return (
              <View style={[
                uiStyles.messageBubble,
                isUser ? [uiStyles.userBubble, { backgroundColor: colors.primary }] : [uiStyles.assistantBubble, { backgroundColor: colors.card }]
              ]}>
                <Text style={[
                  uiStyles.messageText,
                  { color: isUser ? '#fff' : colors.text }
                ]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          inverted={true}
          contentContainerStyle={{ padding: 10 }}
        />
      ) : (
        <View style={uiStyles.emptyContainer}>
          <Text style={[uiStyles.emptyText, { color: colors.text }]}>
            No messages yet. Start a conversation with your Pet Assistant.
          </Text>
        </View>
      )}
      
      <View style={[uiStyles.inputContainer, { 
        backgroundColor: colors.card,
        borderTopColor: colors.border || '#e0e0e0'
      }]}>
        <TextInput
          style={[
            uiStyles.textInput, 
            { 
              backgroundColor: colors.inputBackground,
              color: colors.text
            }
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.placeholderText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          disabled={isLoading || !text.trim()}
          style={[
            uiStyles.sendButton,
            { backgroundColor: colors.primary },
            (!text.trim() || isLoading) && { opacity: 0.5 }
          ]}
          onPress={handleSend}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Add a safer haptics implementation with no reliance on imported types
const SafeHaptics = {
  impactAsync: async () => {
    try {
      // Try to dynamically import haptics
      try {
        const haptics = await import('expo-haptics').catch(() => null);
        if (haptics && typeof haptics.impactAsync === 'function') {
          // Call the function without specifying the enum value
          // This avoids type errors with ImpactFeedbackStyle
          await haptics.impactAsync();
        }
      } catch (e) {
        console.log('Haptics module not available');
      }
    } catch (error) {
      console.log('Haptics feedback failed:', error);
    }
  }
};

// Update the module check function
const checkModuleLoading = () => {
  // Test dynamic module imports
  const testModule = async (name: string, importFn: () => Promise<any>) => {
    try {
      const module = await importFn();
      return !!module;
    } catch (e) {
      console.log(`Failed to import ${name}:`, e);
      return false;
    }
  };

  // Check basic modules that should always be available
  const moduleStatus = {
    react_native_core: typeof View !== 'undefined',
    react: typeof React !== 'undefined',
    async_storage: typeof AsyncStorage !== 'undefined',
    supabase: typeof supabase !== 'undefined',
    gifted_chat: typeof SimpleChatUI !== 'undefined'
  };
  
  console.log('Basic module status:', moduleStatus);
  
  // Show alert with module status
  Alert.alert(
    'Module Loading Status',
    Object.entries(moduleStatus)
      .map(([name, loaded]) => `${name}: ${loaded ? '✓' : '✗'}`)
      .join('\n'),
    [{ text: 'OK' }]
  );
  
  // Also try to dynamically load optional modules
  Promise.all([
    testModule('expo-haptics', () => import('expo-haptics')),
    testModule('expo-clipboard', () => import('expo-clipboard'))
  ]).then(results => {
    console.log('Dynamic module loading results:', {
      'expo-haptics': results[0],
      'expo-clipboard': results[1]
    });
  });
  
  return moduleStatus;
};

// Define the route params type
type ChatAssistantScreenRouteProp = RouteProp<MainStackParamList, 'ChatAssistant'>;

// Define proper navigation type without the dependency
type ChatAssistantNavigationProp = any; // Use any as a fallback

// Main ChatAssistant Component
const ChatAssistant = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<ChatAssistantNavigationProp>();
  const route = useRoute<ChatAssistantScreenRouteProp>();
  const flatListRef = useRef<FlatList>(null);
  
  // Get user ID from supabase with error handling
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Replace the problematic useAuth hook with a direct Supabase call
  useEffect(() => {
    const getAuthUser = async () => {
      try {
        console.log('ChatAssistant: Getting user directly from Supabase');
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error accessing Supabase auth:', error);
          setAuthError('Authentication not available: ' + error.message);
          return;
        }
        
        if (data && data.user) {
          console.log('ChatAssistant: User found in Supabase auth');
          setUser(data.user);
          setAuthVerified(true);
          setAuthError(null);
        } else {
          console.error('ChatAssistant: No user found in Supabase auth');
          setAuthError('No authenticated user found');
        }
      } catch (err) {
        console.error('Error accessing Supabase auth:', err);
        setAuthError('Authentication not available');
      }
    };
    
    getAuthUser();
  }, []);
  
  // Get pet ID if provided through route params
  const petId = route.params?.petId;
  
  // Component state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isReady, setIsReady] = useState(true);
  const [authVerified, setAuthVerified] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [inputVisible, setInputVisible] = useState(true);
  
  const { colors: themeColors, isDark: themeIsDark } = useTheme();
  const { reportError } = useErrorReporting();
  const insets = useSafeAreaInsets();
  const { activePet } = usePetStore();
  
  // Define fixDatabaseIssues at the beginning to avoid circular reference
  const fixDatabaseIssues = async () => {
    console.log('ChatAssistant: Attempting to fix database issues...');
    setIsLoading(true);
    setError('Diagnosing database issues...');
    
    try {
      // First, check if tables exist and have proper schema
      const diagnosis = await diagnoseChatTables();
      
      // If diagnosis shows issues, fix them
      if (!diagnosis.tablesExist || diagnosis.foreignKeyIssue || diagnosis.titleColumnIssue) {
        console.log('ChatAssistant: Database issues found:', diagnosis);
        
        // Check for title column issue
        if (diagnosis.titleColumnIssue) {
          console.log('ChatAssistant: Fixing title column issue...');
          const titleFixed = await fixTitleColumnIssue();
          if (!titleFixed) {
            setError('Failed to fix title column issue.');
            return false;
          }
        }
        
        // Check for missing tables
        if (!diagnosis.tablesExist) {
          console.log('ChatAssistant: Tables missing, creating them...');
          const tablesCreated = await runFixedSqlScript();
          
          if (!tablesCreated.success) {
            setError(`Failed to create tables: ${tablesCreated.message}`);
            return false;
          }
        }
        
        // Check for foreign key issue
        if (diagnosis.foreignKeyIssue) {
          console.log('ChatAssistant: Fixing foreign key issue...');
          
          interface FixResult {
            success: boolean;
            message: string;
          }
          
          const { data, error } = await supabase.rpc('fix_chat_foreign_keys') as { 
            data: FixResult | null, 
            error: any 
          };
          
          if (error || !data || !data.success) {
            console.error('ChatAssistant: Failed to fix foreign keys:', error || (data ? data.message : 'Unknown error'));
            setError('Failed to fix foreign key issue. Please try again.');
            return false;
          }
        }
        
        // Run a final check to see if everything is fixed
        const finalCheck = await diagnoseChatTables();
        
        if (finalCheck.foreignKeyIssue || finalCheck.titleColumnIssue || !finalCheck.tablesExist) {
          console.error('ChatAssistant: Database issues persist after repair attempts:', finalCheck);
          setError('Some database issues could not be fixed automatically. Please contact support.');
          return false;
        }
        
        console.log('ChatAssistant: Database issues fixed successfully');
        setError('Database issues fixed. Initializing chat...');
        
        // Wait a moment before reinitializing
        setTimeout(() => initializeChat(), 1500);
        return true;
      } else {
        console.log('ChatAssistant: No database issues found, chat tables are valid');
        setError('No database issues found. Initializing chat...');
        setTimeout(() => initializeChat(), 1500);
        return true;
      }
    } catch (error) {
      console.error('ChatAssistant: Error fixing database issues:', error);
      if (reportError) {
        reportError(error, 'ChatAssistant.fixDatabaseIssues');
      }
      setError(`Failed to fix database: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // API key handling
  const checkApiKey = useCallback(async () => {
    try {
      // First try the env variable
      if (GEMINI_API_KEY) {
        console.log('ChatAssistant: Using API key from environment');
        await petAssistantService.setApiKey(GEMINI_API_KEY);
        setApiKeySet(true);
        return true;
      }
      
      // Then try to get from storage
      const storedKey = await AsyncStorage.getItem('gemini_api_key');
      if (storedKey) {
        console.log('ChatAssistant: Using API key from storage');
        await petAssistantService.setApiKey(storedKey);
        setApiKeySet(true);
        return true;
      }
      
      // No API key found, prompt user to enter one
      console.log('ChatAssistant: No API key found, showing prompt');
      setShowApiKeyInput(true);
      setApiKeySet(false);
      setError('API key required. Please configure it in settings or enter below.');
      return false;
    } catch (error: any) {
      console.error('Error checking API key:', error);
      if (reportError) {
        reportError(error, 'ChatAssistant.checkApiKey');
      }
      setError(`Error with API key: ${error.message || 'Unknown error'}`);
      setShowApiKeyInput(true);
      setApiKeySet(false);
      return false;
    }
  }, [reportError]);
  
  // Initialize chat with proper dependencies and better error handling
  const initializeChat = useCallback(async () => {
    if (!user || initializing) return;
    
    setInitializing(true);
    setError(null);
    console.log('ChatAssistant: Initializing chat session...');
    
    try {
      // Verify we have a valid authenticated user
      if (!user.id) {
        console.error('ChatAssistant: User has no ID, cannot initialize chat');
        setError('Authentication issue: No user ID available. Please try logging out and back in.');
        setInitializing(false);
        return;
      }
      
      // Verify API key is set before proceeding
      let hasApiKey = false;
      try {
        hasApiKey = await checkApiKey();
      } catch (keyError) {
        console.error('ChatAssistant: Error checking API key:', keyError);
        setError(`API key check failed: ${keyError instanceof Error ? keyError.message : String(keyError)}`);
        setInitializing(false);
        return;
      }
      
      if (!hasApiKey) {
        console.error('ChatAssistant: API key not set');
        setInitializing(false);
        return; // checkApiKey handles setting the appropriate error
      }
      
      // Log the user ID being used for initialization
      console.log('ChatAssistant: Initializing with user ID:', user.id);
      
      // Try to load existing session or start a new one
      let session;
      try {
        console.log('ChatAssistant: Getting or creating chat session...');
        session = await petAssistantService.getOrCreateSession(user.id);
        console.log('ChatAssistant: Session ID:', session.id);
      } catch (sessionError) {
        console.error('ChatAssistant: Error creating/getting session:', sessionError);
        setError(`Session creation failed: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
        setInitializing(false);
        return;
      }
      
      // Explicitly set local sessionId
      setSessionId(session.id);
      
      // Load messages for this session
      let chatMessages = [];
      try {
        console.log('ChatAssistant: Loading messages for session...');
        chatMessages = await petAssistantService.getChatMessages(session.id);
        console.log('ChatAssistant: Loaded messages count:', chatMessages.length);
      } catch (messagesError) {
        console.error('ChatAssistant: Error loading messages:', messagesError);
        setError(`Failed to load messages: ${messagesError instanceof Error ? messagesError.message : String(messagesError)}`);
        // Continue with empty messages instead of failing
        chatMessages = [];
      }
      
      try {
        // Convert from GeminiChatMessage to IMessage format for GiftedChat
        const giftedChatMessages: ChatMessage[] = chatMessages.map((msg, i) => ({
          _id: i.toString(),
          text: msg.content,
          createdAt: new Date(),
          user: {
            _id: msg.role === 'user' ? user.id : 'assistant',
            name: msg.role === 'user' ? 'You' : 'Assistant',
          },
        }));
        
        // Update our local state
        setMessages(giftedChatMessages);
        
        // Add welcome message if no messages exist
        if (giftedChatMessages.length === 0) {
          const welcomeMessage: ChatMessage = {
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
      } catch (mappingError) {
        console.error('ChatAssistant: Error mapping messages:', mappingError);
        // Show an error but continue with empty messages
        setError(`Error preparing messages: ${mappingError instanceof Error ? mappingError.message : String(mappingError)}`);
        setMessages([]);
      }
      
      console.log('ChatAssistant: Chat initialized successfully');
      setError(null);
    } catch (error: any) {
      console.error('ChatAssistant: Error initializing chat:', error);
      if (reportError) {
        reportError(error, 'ChatAssistant.initializeChat');
      }
      
      // Handle known error types with friendly messages
      if (error.message && error.message.includes('foreign key constraint')) {
        setError('Database issue: There may be an issue with the chat tables. Please try repairing them using the diagnostic tools.');
      } else if (error.message && error.message.includes('not found')) {
        setError('Database issue: Some required tables may be missing. Please try repairing them using the diagnostic tools.');
      } else {
        setError(`Error initializing chat: ${error.message || 'Unknown error'}`);
      }
      
      // Attempt to fix database issues if appropriate
      if (error.message && (
        error.message.includes('database') || 
        error.message.includes('table') || 
        error.message.includes('foreign key') || 
        error.message.includes('constraint')
      )) {
        try {
          await fixDatabaseIssues();
        } catch (repairError) {
          console.error('ChatAssistant: Error during database repair:', repairError);
        }
      }
    } finally {
      setInitializing(false);
    }
  }, [user, initializing, checkApiKey, reportError, fixDatabaseIssues]);
  
  // Show error toast
  const showErrorToast = (message: string) => {
    try {
      // Replace Toast with Alert
      Alert.alert(
        'Error',
        message,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error) {
      console.error('ChatAssistant: Error showing alert:', error);
    }
  };
  
  // Simplified handleSendMessage
  const handleSendMessage = (messageText: string) => {
    if (!messageText.trim()) return;
    
    try {
      // Create a new message object
      const newMessage: ChatMessage = {
        _id: Date.now().toString(),
        text: messageText.trim(),
        createdAt: new Date(),
        user: {
          _id: user?.id || 'user',
          name: 'You'
        }
      };
      
      // Add haptic feedback safely
      SafeHaptics.impactAsync().catch(() => {});
      
      // Add user message to the chat immediately
      setMessages(previousMessages => 
        ChatUtils.append(previousMessages, [newMessage])
      );
      
      // Process message directly without checking session initially
      processSendMessage({
        role: 'user',
        content: messageText.trim()
      });
    } catch (error: any) {
      if (reportError) reportError(error);
      console.error('Error in handleSendMessage:', error);
      showErrorToast('Failed to send message');
    }
  };
  
  // Track when the screen gains focus to refresh data
  useFocusEffect(
    useCallback(() => {
      console.log('ChatAssistant: Screen focused');
      
      // Create a state variable to track if this component is mounted
      let isMounted = true;
      
      // We won't automatically reinitialize on focus, just make sure
      // we have the latest data without causing redirects
      const updateScreenState = async () => {
        if (!isMounted) return;
        
        // If we already have a session, just make sure UI elements are visible
        if (sessionId) {
          setInputVisible(true);
          console.log('ChatAssistant: Session already exists:', sessionId);
          return;
        }
        
        // If we have a user but no session, add a welcome message
        // but don't automatically initialize which can cause navigation issues
        if (user && !initializing && messages.length === 0) {
          console.log('ChatAssistant: Adding welcome message');
          const welcomeMessage: ChatMessage = {
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
      };
      
      updateScreenState();
      
      return () => {
        console.log('ChatAssistant: Screen losing focus');
        isMounted = false;
      };
    }, [user, sessionId, initializing, messages.length])
  );
  
  // Create a separate function for the message sending process
  const processSendMessage = async (userMessage: GeminiChatMessage) => {
    if (!user || !user.id) {
      console.error('ChatAssistant: No valid user in processSendMessage');
      
      // Add error message to chat instead of navigating away
      const errorMsg: ChatMessage = {
        _id: new Date().getTime().toString(),
        text: 'You must be logged in to use the chat assistant.',
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Pet Assistant'
        }
      };
      setMessages(previousMessages => ChatUtils.append(previousMessages, [errorMsg]));
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use a simple try/catch to prevent navigation from authentication errors
      try {
        console.log('ChatAssistant: Sending message with user ID:', user.id);
        
        // If no session exists, create one first
        if (!sessionId) {
          console.log('No session ID, creating one first');
          const newSession = await petAssistantService.startNewSession(user.id, petId);
          
          if (newSession) {
            console.log('Created new session:', newSession);
            setSessionId(newSession);
          } else {
            throw new Error('Failed to create chat session');
          }
        }
        
        // Now send the actual message
        const response = await petAssistantService.sendMessage(user.id, userMessage.content);
        
        // Check if response is an error message or valid response
        if (response) {
          // Add AI response to the chat
          const assistantMessage: ChatMessage = {
            _id: new Date().getTime().toString(),
            text: response,
            createdAt: new Date(),
            user: {
              _id: 'assistant',
              name: 'Pet Assistant'
            }
          };
          
          // Update messages in state to show the response
          setMessages(previousMessages => ChatUtils.append(previousMessages, [assistantMessage]));
        } else {
          // Handle case where no response was returned
          const errorMsg: ChatMessage = {
            _id: new Date().getTime().toString(),
            text: 'Sorry, I encountered an error processing your message. Please try again.',
            createdAt: new Date(),
            user: {
              _id: 'assistant',
              name: 'Pet Assistant'
            }
          };
          setMessages(previousMessages => ChatUtils.append(previousMessages, [errorMsg]));
        }
      } catch (messageError: any) {
        console.error('Error in message processing:', messageError);
        
        // Add error message to chat
        const errorMsg: ChatMessage = {
          _id: new Date().getTime().toString(),
          text: `Error: ${messageError?.message || 'Unknown error occurred'}. Please try again.`,
          createdAt: new Date(),
          user: {
            _id: 'assistant',
            name: 'Pet Assistant'
          }
        };
        
        setMessages(previousMessages => ChatUtils.append(previousMessages, [errorMsg]));
      }
    } catch (error: any) {
      console.error('ChatAssistant: Error sending message:', error);
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        _id: new Date().getTime().toString(),
        text: `Error: ${error?.message || 'Unknown error occurred'}. Please try again.`,
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Pet Assistant'
        }
      };
      
      setMessages(previousMessages => ChatUtils.append(previousMessages, [errorMsg]));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Replace with theme-based colors
  const uiColors = {
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
  const configureApiKey = () => {
    // React Native doesn't have Alert.prompt on Android, so we'll just navigate to settings
    Alert.alert(
      'API Key Required',
      'You need to configure a Gemini API key to use the Pet Assistant. Would you like to set it now?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Configure',
          onPress: () => {
            // Use any to bypass TypeScript navigation typing issues
            (navigation as any).navigate('Settings');
          }
        }
      ]
    );
  };
  
  // Add saveApiKey function
  const saveApiKey = async () => {
    if (!apiKey || apiKey.trim().length < 10) {
      setApiKeyError('Please enter a valid API key');
      return;
    }
    
    setApiKeySaving(true);
    setApiKeyError('');
    
    try {
      // Save to storage
      await AsyncStorage.setItem('gemini_api_key', apiKey);
      
      // Set in service
      await petAssistantService.setApiKey(apiKey);
      
      // Update state
      setApiKeySet(true);
      setShowApiKeyInput(false);
      
      // Reinitialize chat
      initializeChat();
    } catch (error) {
      console.error('Error saving API key:', error);
      setApiKeyError('Failed to save API key. Please try again.');
    } finally {
      setApiKeySaving(false);
    }
  };
  
  // Fix the startNewSession function to properly convert GeminiChatMessage to IMessage
  const startNewSession = async () => {
    if (!user) {
      // Don't use Alert here as it might interrupt the flow
      console.error('ChatAssistant: Cannot start new session without user');
      setError('You must be logged in to use the chat assistant.');
      return;
    }
    
    // Show we're working on it
    setIsLoading(true);
    
    try {
      console.log('ChatAssistant: Starting new session for user:', user.id);
      const newSessionId = await petAssistantService.startNewSession(user.id, petId);
      
      if (newSessionId) {
        console.log('ChatAssistant: New session created successfully:', newSessionId);
        setSessionId(newSessionId);
        
        // Get the messages and convert them to IMessage format
        const chatMessages = petAssistantService.getCurrentSessionMessages();
        const giftedChatMessages: ChatMessage[] = chatMessages.map((msg, i) => ({
          _id: i.toString(),
          text: msg.content,
          createdAt: new Date(),
          user: {
            _id: msg.role === 'user' ? user.id : 'assistant',
            name: msg.role === 'user' ? 'You' : 'Assistant',
          },
        }));
        
        setMessages(giftedChatMessages);
        
        // Always ensure there's at least a welcome message
        if (giftedChatMessages.length === 0) {
          const welcomeMessage: ChatMessage = {
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
      } else {
        console.error('ChatAssistant: Failed to create new session');
        // Use setError here instead of Alert to avoid navigation issues
        setError('Failed to create a new chat session. Please try again.');
      }
    } catch (error) {
      console.error('ChatAssistant: Error starting new session:', error);
      // Use setError here instead of Alert to avoid navigation issues
      setError('Failed to start a new chat session. Please try again.');
      
      // Try to recover by using initializeChat as a fallback
      try {
        console.log('ChatAssistant: Attempting to recover with initializeChat');
        await initializeChat();
      } catch (recoveryError) {
        console.error('ChatAssistant: Recovery attempt failed:', recoveryError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fix to ensure welcome message is always shown if no messages
  useEffect(() => {
    if (!isLoading && !initializing && messages.length === 0 && !error) {
      const welcomeMessage: ChatMessage = {
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
  useEffect(() => {
    const timer = setTimeout(() => {
      Alert.alert(
        'Welcome to Pet Assistant',
        'You can ask any questions about pet care. If the chat has any issues, tap the refresh button in the bottom right corner.',
        [{ text: 'Got it!' }]
      );
    }, 1000); 
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to check and fix display issues
  const checkInputDisplay = () => {
    console.log('ChatAssistant: Checking input display and session state');
    
    // If we still have no messages, add a welcome message
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
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
    } else if (sessionId) {
      console.log('ChatAssistant: Session exists, refreshing UI only:', sessionId);
      
      // Otherwise just refresh the UI without changing the session
      setInputVisible(false);
      setTimeout(() => setInputVisible(true), 100);
      
      // Also make sure any errors are cleared
      setError(null);
    }
    
    // Use a more controlled approach instead of Alert which can interrupt flow
    const message = sessionId 
      ? 'Chat refreshed. You can continue your conversation.'
      : 'Creating a new chat session...';
      
    // Use a toast message or small UI indicator instead of Alert
    console.log('ChatAssistant: ' + message);
    
    // Set a temporary status message instead of showing an Alert
    const statusMessage: ChatMessage = {
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
    setMessages(prev => ChatUtils.append(prev, [statusMessage]));
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg._id !== statusMessage._id));
    }, 3000);
  };
  
  // Add a safe effect to initialize the chat only once on mount
  useEffect(() => {
    // Only try to initialize once when the component is first mounted
    if (user && !sessionId && !initializing) {
      console.log('ChatAssistant: Component mounted, safely initializing session');
      
      // Use a timeout to ensure the component is fully mounted
      const initTimer = setTimeout(() => {
        // Instead of using initializeChat which can cause navigation,
        // use a simpler approach to just get a session ID
        if (user.id) {
          petAssistantService.getOrCreateSession(user.id, petId)
            .then(session => {
              if (session && session.id) {
                console.log('ChatAssistant: Got session ID on mount:', session.id);
                setSessionId(session.id);
                
                // Only load messages if we don't already have them
                if (messages.length === 0) {
                  petAssistantService.getChatMessages(session.id)
                    .then(chatMessages => {
                      if (chatMessages && chatMessages.length > 0) {
                        // Convert to our chat format
                        const formattedMessages = chatMessages.map((msg, i) => ({
                          _id: i.toString(),
                          text: msg.content,
                          createdAt: new Date(),
                          user: {
                            _id: msg.role === 'user' ? user.id : 'assistant',
                            name: msg.role === 'user' ? 'You' : 'Assistant',
                          },
                        }));
                        
                        setMessages(formattedMessages);
                      } else {
                        // Add a welcome message if no messages
                        const welcomeMessage = {
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
                    .catch(err => {
                      console.error('Error loading messages:', err);
                      // Add a welcome message as fallback
                      const welcomeMessage = {
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
            .catch(error => {
              console.error('Error getting session on mount:', error);
              // Don't show error to user, just log it
            });
        }
      }, 500);
      
      return () => clearTimeout(initTimer);
    }
  }, [user, sessionId, initializing, petId, messages.length]);
  
  // Render content based on state
  const renderContent = () => {
    if (isLoading && !messages.length) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <View style={styles.errorBoxContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('database') ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: themeColors.primary }]}
                onPress={diagnoseChatSchema}
              >
                <Text style={styles.buttonText}>Run Diagnostics</Text>
              </TouchableOpacity>
            ) : error.includes('API key') ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: themeColors.primary, marginTop: 20 }]}
                onPress={configureApiKey}
              >
                <Text style={styles.buttonText}>Configure API Key</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: themeColors.primary, marginTop: 20 }]}
                onPress={() => initializeChat()}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>{isLoading ? "Trying..." : "Try Again"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // Make sure we have at least a welcome message
    const displayMessages = messages.length === 0 ? [{
      _id: 'welcome',
      text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
      createdAt: new Date(),
      user: {
        _id: 'assistant',
        name: 'Assistant',
      },
    }] : messages;

    // Use our simplified chat UI
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <SimpleChatUI
          messages={displayMessages}
          onSend={handleSendMessage}
          isLoading={isLoading}
          colors={{
            primary: themeColors.primary,
            background: themeColors.background,
            card: themeColors.card,
            text: themeColors.text,
            inputBackground: themeColors.inputBackground || uiColors.inputBackground,
            placeholderText: themeColors.placeholderText || uiColors.placeholderText,
          }}
        />
      </KeyboardAvoidingView>
    );
  };
  
  // Define styles for the component using theme colors
  const styles = StyleSheet.create({
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
  const diagnoseChatSchema = async () => {
    setIsLoading(true);
    setError('Running schema diagnostics...');
    
    try {
      // Check for chat_sessions table
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id')
        .limit(1);
      
      // Examine the columns in chat_sessions table
      const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'chat_sessions'
          ORDER BY ordinal_position;
        `
      });
      
      // Try to analyze tables to reset the schema cache
      const { error: analyzeError } = await supabase.rpc('exec_sql', {
        sql: `
          ANALYZE chat_sessions;
          ANALYZE chat_messages;
        `
      });
      
      // Show diagnostic results
      let diagnosticResult = '';
      
      if (sessionsError) {
        diagnosticResult += `Table error: ${sessionsError.message}\n\n`;
      } else {
        diagnosticResult += `chat_sessions table exists.\n`;
      }
      
      if (columnsError) {
        diagnosticResult += `Column error: ${columnsError.message}\n\n`;
      } else if (columns) {
        diagnosticResult += `chat_sessions columns:\n`;
        columns.forEach((col: any) => {
          diagnosticResult += `- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})\n`;
        });
      }
      
      if (analyzeError) {
        diagnosticResult += `\nAnalyze error: ${analyzeError.message}`;
      } else {
        diagnosticResult += `\nTable analysis complete.`;
      }
      
      // Show the diagnostic results to the user
      Alert.alert(
        'Database Diagnosis Results',
        diagnosticResult,
        [
          {
            text: 'Run Repair',
            onPress: fixDatabaseIssues
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } catch (error: any) {
      console.error('Error during chat schema diagnosis:', error);
      Alert.alert('Diagnosis Error', `Failed to diagnose database: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setError(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      {renderContent()}
      
      {/* Floating action button for refreshing the chat UI */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          { backgroundColor: themeColors.primary || '#4caf50' }
        ]}
        onPress={() => {
          // Simpler, safer refresh that won't cause navigation issues
          console.log('ChatAssistant: Manual refresh requested');
          
          if (!user) {
            // Show a message directly in the chat
            const errorMsg = {
              _id: 'error-' + Date.now(),
              text: 'You need to be logged in to use the chat assistant.',
              createdAt: new Date(),
              user: {
                _id: 'assistant',
                name: 'System',
              },
            };
            setMessages(prev => ChatUtils.append(prev, [errorMsg]));
            return;
          }
          
          // If we don't have a session, try to get one but don't reset UI
          if (!sessionId && user.id) {
            setIsLoading(true);
            
            petAssistantService.getOrCreateSession(user.id, petId)
              .then(session => {
                if (session && session.id) {
                  console.log('ChatAssistant: Got new session ID on refresh:', session.id);
                  setSessionId(session.id);
                  
                  // Status message
                  const statusMsg = {
                    _id: 'status-' + Date.now(),
                    text: 'Chat session refreshed.',
                    createdAt: new Date(),
                    system: true,
                    user: {
                      _id: 'system',
                      name: 'System',
                    },
                  };
                  setMessages(prev => ChatUtils.append(prev, [statusMsg]));
                  
                  // Auto-remove status message after 3 seconds
                  setTimeout(() => {
                    setMessages(prev => prev.filter(m => m._id !== statusMsg._id));
                  }, 3000);
                }
                setIsLoading(false);
              })
              .catch(error => {
                console.error('Error getting session on refresh:', error);
                setIsLoading(false);
                
                // Show error in chat
                const errorMsg = {
                  _id: 'error-' + Date.now(),
                  text: 'Could not refresh the chat session. Please try again.',
                  createdAt: new Date(),
                  user: {
                    _id: 'assistant',
                    name: 'System',
                  },
                };
                setMessages(prev => ChatUtils.append(prev, [errorMsg]));
              });
          } else {
            // We have a session, just show a status message
            const statusMsg = {
              _id: 'status-' + Date.now(),
              text: 'Chat ready.',
              createdAt: new Date(),
              system: true,
              user: {
                _id: 'system',
                name: 'System',
              },
            };
            setMessages(prev => ChatUtils.append(prev, [statusMsg]));
            
            // Auto-remove status message after 3 seconds
            setTimeout(() => {
              setMessages(prev => prev.filter(m => m._id !== statusMsg._id));
            }, 3000);
          }
        }}
      >
        <Ionicons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ChatAssistant;