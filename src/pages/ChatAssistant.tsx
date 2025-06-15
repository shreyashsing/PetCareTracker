/// <reference types="../types/declarations.d.ts" />
/// <reference types="../types/module-declarations.d.ts" />
/// <reference types="../types/ambient.d.ts" />
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Button,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { petAssistantService } from '../services/petAssistant';
import { ChatMessage as GeminiChatMessage } from '../services/petAssistant/geminiService';
import { supabase } from '../services/supabase';
import { MainStackParamList } from '../types/navigation';
import { runFixedSqlScript } from '../utils/runSqlFix';
import { getChatTablesSQLFix, diagnoseChatTables, fixTitleColumnIssue } from '../utils/chatDiagnostics';
import { debugAuth, refreshAuth } from '../utils/authDebug';
import { createChatTables } from '../services/db';
import { ensureChatTablesExist } from '../services/db/migrations';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/AppStore';
import { usePetStore } from '../store/PetStore';
import { useErrorReporting } from '../utils/error-reporting';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { NetworkUtils } from '../config/network';

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
    return [...currentMessages, ...newMessages];
  },
  prepend: (currentMessages: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] => {
    return [...newMessages, ...currentMessages];
  },
};

// Simple chat implementation
const SimpleChatUI = React.memo(({ 
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
  
  const handleSend = useCallback(() => {
    if (text.trim() && !isLoading) {
      onSend(text);
      setText('');
    }
  }, [text, isLoading, onSend]);

  // Memoize the message rendering function to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
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
  }, [colors, uiStyles]);
  
  // Memoize the empty component
  const EmptyComponent = useCallback(() => (
    <View style={uiStyles.emptyContainer}>
      <Text style={[uiStyles.emptyText, { color: colors.text }]}>
        No messages yet. Start a conversation with your Pet Assistant.
      </Text>
    </View>
  ), [colors.text, uiStyles]);
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {messages.length > 0 ? (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderItem}
          inverted={true}
          contentContainerStyle={{ padding: 10 }}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        <EmptyComponent />
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
});

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
  // Force light mode - always use light theme
  const isDark = false; // Changed from: colorScheme === 'dark'
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
  
  // State to track online/offline status
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  const { reportError } = useErrorReporting();
  const insets = useSafeAreaInsets();
  const { activePet } = usePetStore();
  
  // State to track pet info
  const [petInfo, setPetInfo] = useState<string | null>(null);
  
  // Create a proper theme colors object with systemMessage
  const theme = useTheme();
  const themeColors = useMemo(() => ({
    ...theme.colors,
    systemMessage: isDark ? '#555555' : '#e0e0e0',
    inputBackground: theme.colors.card,
    placeholderText: theme.colors.text + '80',
  }), [theme.colors, isDark]);
  
  // Ensure we have valid insets even if SafeAreaContext fails
  const safeInsets = useMemo(() => ({
    top: insets?.top || 30, // Default to reasonable status bar height if insets not available
    bottom: insets?.bottom || 0,
    left: insets?.left || 0,
    right: insets?.right || 0,
  }), [insets]);
  
  // Add function to check API health - moved to top
  const checkApiHealth = useCallback(async () => {
    try {
      console.log('Checking API health...');
      // Use a simple check instead of the robust connectivity check
      const isApiHealthy = await NetworkUtils.isNetworkAvailable();
      console.log('API health check result:', isApiHealthy);
      
      setIsOnline(isApiHealthy);
      
      if (!isApiHealthy) {
        setIsOnline(false);
        // Don't show toast to avoid interrupting the user
      } else {
        setIsOnline(true);
      }
      
      return isApiHealthy;
    } catch (error) {
      console.error('Error checking API health:', error);
      setIsOnline(false);
      return false;
    }
  }, []);
  
  // Check network status on mount only, not periodically
  useEffect(() => {
    // Check on component mount
    checkApiHealth();
    
    // No interval to avoid constant network requests
    
    // No cleanup needed
  }, [checkApiHealth]);
  
  // Initialize chat only once when component mounts
  useEffect(() => {
    if (user && initializing) {
      console.log('ChatAssistant: Starting single initialization process');
      
      // Set a single timeout for initialization to prevent rapid re-renders
      const timer = setTimeout(async () => {
        try {
          // Directly set loading state to prevent flickering
          setInitializing(true);
          setError(null);
          
          // Check for API key
          console.log('ChatAssistant: Checking API key...');
          const apiKeyResult = await petAssistantService.hasApiKey();
          setApiKeySet(apiKeyResult);
          console.log('ChatAssistant: API key check result:', apiKeyResult);
          
          // Try to get or create a session
          if (!sessionId) {
            console.log('ChatAssistant: No session ID, getting or creating session');
            try {
              const session = await petAssistantService.getOrCreateSession(user.id, petId);
              if (session && session.id) {
                console.log('ChatAssistant: Session established:', session.id);
                setSessionId(session.id);
                
                // Load messages if needed
                const chatMessages = await petAssistantService.getChatMessages(session.id);
                if (chatMessages && chatMessages.length > 0) {
                  // Convert to our chat format
                  const formattedMessages = chatMessages.map((msg, i) => ({
                    _id: msg.id || i.toString(),
                    text: msg.content,
                    createdAt: new Date(msg.timestamp || Date.now()),
                    user: {
                      _id: msg.role === 'user' ? user.id : 'assistant',
                      name: msg.role === 'user' ? 'You' : 'Assistant',
                    },
                  }));
                  
                  setMessages(formattedMessages);
                } else {
                  // Add a welcome message
                  setMessages([{
                    _id: 'welcome',
                    text: 'Hello! I\'m your Pet Assistant. How can I help with your pet care questions today?',
                    createdAt: new Date(),
                    user: {
                      _id: 'assistant',
                      name: 'Assistant',
                    },
                  }]);
                }
              }
            } catch (sessionError) {
              console.error('ChatAssistant: Error establishing session:', sessionError);
              // Show a simple welcome message rather than an error
              setMessages([{
                _id: 'welcome',
                text: 'Hello! I\'m your Pet Assistant. How can I help with your pet care questions today?',
                createdAt: new Date(),
                user: {
                  _id: 'assistant',
                  name: 'Assistant',
                },
              }]);
            }
          }
        } catch (error) {
          console.error('ChatAssistant: Error during initialization:', error);
          // Don't show error to user, just show welcome message
          setMessages([{
            _id: 'welcome',
            text: 'Hello! I\'m your Pet Assistant. How can I help with your pet care questions today?',
            createdAt: new Date(),
            user: {
              _id: 'assistant',
              name: 'Assistant',
            },
          }]);
        } finally {
          // Always complete initialization
          console.log('ChatAssistant: Initialization process complete');
          setInitializing(false);
        }
      }, 100); // Shorter delay for faster UI appearance
      
      return () => clearTimeout(timer);
    }
  }, [user, sessionId, petId]); // Include sessionId and petId to handle changes
  
  // Replace the multiple welcome message useEffects with a single one
  useEffect(() => {
    // Only add welcome message when needed and not already present
    if (!initializing && !isLoading && messages.length === 0 && !error) {
      console.log('ChatAssistant: Adding welcome message');
      
      // Check if we already have a session with messages
      if (sessionId) {
        // Don't add a welcome message here - the service will handle it
        console.log('ChatAssistant: Session exists, not adding welcome message from UI');
        return;
      }
      
      // Only add a welcome message if we don't have a session yet
      setMessages([{
        _id: 'welcome',
        text: 'Welcome to Pet Assistant! Ask me anything about pet care.',
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Assistant',
        },
      }]);
    }
  }, [initializing, isLoading, messages.length, error, sessionId]);
  
  // Function to load pet info for display - optimize to prevent unnecessary re-renders
  const loadPetInfo = useCallback(async () => {
    if (petId && !petInfo) {
      try {
        const { data: pet, error } = await supabase
          .from('pets')
          .select('name, type, breed')
          .eq('id', petId)
          .single();
          
        if (pet && !error) {
          setPetInfo(`${pet.name} (${pet.type}, ${pet.breed})`);
        }
      } catch (error) {
        console.error('Error loading pet info:', error);
      }
    }
  }, [petId, petInfo]);
  
  // Load pet info when petId changes - with debounce to prevent rapid state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPetInfo();
    }, 100);
    return () => clearTimeout(timer);
  }, [petId, loadPetInfo]);
  
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
  const checkApiKey = async () => {
    try {
      // Check if the backend API is available
      const hasApiKey = await petAssistantService.hasApiKey();
      
      if (hasApiKey) {
        setApiKey('server-managed');
        setApiKeySet(true);
        return true;
      } else {
        setApiKeySet(false);
        setApiKeyError('The chat assistant is not available. Please contact support.');
        return false;
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setApiKeySet(false);
      setApiKeyError('Unable to connect to the chat assistant. Please try again later.');
      return false;
    }
  };
  
  // Function to initialize chat
  const initializeChat = async () => {
    try {
      console.log('ChatAssistant: Starting initialization process');
      setInitializing(true);
      setError(null);
      
      // First check if API key is set up
      console.log('ChatAssistant: Checking API key...');
      const apiKeyResult = await checkApiKey();
      console.log('ChatAssistant: API key check result:', apiKeyResult);
      
      // Check if we should load messages or create a new session
      if (sessionId) {
        // If we have an existing session ID, try to load messages
        console.log('ChatAssistant: Loading existing chat session', sessionId);
        
        try {
          await loadChatMessages(sessionId);
          console.log('ChatAssistant: Successfully loaded messages for session', sessionId);
        } catch (msgError) {
          console.error('ChatAssistant: Error loading messages:', msgError);
          // If we can't load messages, try creating a new session as fallback
          console.log('ChatAssistant: Falling back to creating a new session');
          await startNewSession();
        }
      } else {
        // Otherwise create a new session
        console.log('ChatAssistant: Creating new chat session');
        try {
          await startNewSession();
          console.log('ChatAssistant: Successfully created new session');
        } catch (sessionError) {
          console.error('ChatAssistant: Failed to create new session:', sessionError);
          // Show error to the user
          setError('Could not start a new chat session. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error initializing chat:', error);
      reportError(error, 'Initialize chat failed');
      setError(`Failed to initialize chat: ${error.message}`);
    } finally {
      console.log('ChatAssistant: Initialization process complete');
      setInitializing(false);
    }
  };
  
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
  
  // New function to send message to AI with useCallback
  const sendMessageToAI = useCallback(async (message: string) => {
    if (!user || !user.id) {
      console.error('No valid user for sending message');
      
      // Add error message
      const errorMsg: ChatMessage = {
        _id: new Date().getTime().toString(),
        text: 'You must be logged in to use the chat assistant.',
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Pet Assistant'
        }
      };
      
      setMessages(previousMessages => 
        ChatUtils.append(previousMessages, [errorMsg])
      );
      return;
    }
    
    setIsLoading(true);
    
    try {
      // If we're offline, use a fallback response
      if (!isOnline) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const offlineResponse: ChatMessage = {
          _id: 'offline-' + Date.now(),
          text: "I'm currently in offline mode due to network connectivity issues. I can only provide limited responses until the connection is restored.",
          createdAt: new Date(),
          user: {
            _id: 'assistant',
            name: 'Pet Assistant (Offline)'
          }
        };
        
        setMessages(prevMessages => ChatUtils.append(prevMessages, [offlineResponse]));
        setIsLoading(false);
        
        // Check network again
        checkApiHealth();
        return;
      }
      
      // Ensure we have a session
      if (!sessionId) {
        console.log('No session ID, creating new session...');
        try {
          const newSession = await petAssistantService.startNewSession(user.id, petId);
          if (newSession) {
            console.log('Created new session:', newSession);
            setSessionId(newSession);
          }
        } catch (sessionError) {
          console.warn('Error creating session:', sessionError);
        }
      } else {
        // Make sure the session has pet context if petId is provided
        console.log('Using existing session with ID:', sessionId);
        if (petId) {
          console.log('Ensuring pet context is loaded for pet ID:', petId);
          try {
            // This will ensure the pet context is loaded for the current session
            await petAssistantService.getOrCreateSession(user.id, petId);
          } catch (contextError) {
            console.warn('Error ensuring pet context:', contextError);
          }
        }
      }
      
      // Set a timeout to prevent hanging
      const messagePromise = petAssistantService.sendMessage(user.id, message);
      const timeoutPromise = new Promise<string>(resolve => {
        setTimeout(() => {
          console.log('Message request timed out');
          resolve("I'm having trouble connecting to the server. Please try again later.");
        }, 20000); // 20 second timeout
      });
      
      // Race between the message and timeout
      const response = await Promise.race([messagePromise, timeoutPromise]);
      
      // Add AI response to chat
      const assistantMessage: ChatMessage = {
        _id: Date.now().toString(),
        text: response || "Sorry, I couldn't generate a response. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: isOnline ? 'Pet Assistant' : 'Pet Assistant (Offline)'
        }
      };
      
      setMessages(previousMessages => 
        ChatUtils.append(previousMessages, [assistantMessage])
      );
    } catch (error: any) {
      console.error('Error sending message to AI:', error);
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        _id: Date.now().toString(),
        text: "I'm having trouble connecting to my knowledge database. Please check your connection and try again.",
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Pet Assistant'
        }
      };
      
      setMessages(previousMessages => 
        ChatUtils.append(previousMessages, [errorMsg])
      );
      
      // Check network status
      checkApiHealth();
    } finally {
      setIsLoading(false);
    }
  }, [user, isOnline, sessionId, petId, checkApiHealth]);
  
  // Simplified handleSendMessage
  const handleSendMessage = useCallback((messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    
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
      
      // Add user message to the chat immediately
      setMessages(previousMessages => 
        ChatUtils.append(previousMessages, [newMessage])
      );
      
      // Send message to AI
      sendMessageToAI(messageText.trim());
    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      if (reportError) reportError(error);
    }
  }, [isLoading, user, sendMessageToAI, reportError]);
  
  // Function to load messages for an existing session
  const loadChatMessages = async (sessionId: string) => {
    try {
      console.log('Loading messages for session:', sessionId);
      const chatMessages = await petAssistantService.getChatMessages(sessionId);
      
      // Add welcome message if no messages exist
      if (!chatMessages || chatMessages.length === 0) {
        console.log('No messages found for session, adding welcome message');
        const welcomeMessage = {
          _id: 'welcome',
          text: 'Hello! I\'m your Pet Care Assistant. How can I help with your pet care questions today?',
          createdAt: new Date(),
          user: {
            _id: 'assistant',
            name: 'Assistant',
          },
        };
        setMessages([welcomeMessage]);
        return;
      }
      
      // Convert messages to the format expected by the UI
      const formattedMessages = chatMessages.map((msg, index) => ({
        _id: index.toString(),
        text: msg.content,
        createdAt: new Date(),
        user: {
          _id: msg.role === 'user' ? user?.id || '1' : 'assistant',
          name: msg.role === 'user' ? 'You' : 'Assistant',
        },
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      // Add welcome message as fallback instead of throwing error
      const welcomeMessage = {
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
  };

  // Function to start a new chat session
  const startNewSession = async () => {
    try {
      console.log('ChatAssistant: Starting new chat session');
      console.log('ChatAssistant: User ID:', user?.id);
      console.log('ChatAssistant: Pet ID:', petId);
      
      if (!user?.id) {
        console.error('ChatAssistant: Cannot start session - No user ID');
        setError('You must be logged in to use the chat assistant');
        return;
      }
      
      // Add a safety timeout to prevent hanging
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout: Failed to create session after 15 seconds'));
        }, 15000);
      });
      
      // Race between the actual request and the timeout
      const newSessionId = await Promise.race([
        petAssistantService.startNewSession(user.id, petId),
        timeoutPromise
      ]);
      
      console.log('ChatAssistant: New session created:', newSessionId);
      setSessionId(newSessionId);
      
      // Set welcome message
      const welcomeMessage = {
        _id: 'welcome',
        text: 'Hello! I\'m your Pet Care Assistant. How can I help with your pet care questions today?',
        createdAt: new Date(),
        user: {
          _id: 'assistant',
          name: 'Assistant',
        },
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error starting new session:', error);
      setError(`Failed to start chat: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
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
  const checkInputDisplay = useCallback(() => {
    console.log('ChatAssistant: Checking input display and session state');
    
    // If we still have no messages, add a welcome message
    if (messages.length === 0) {
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
    
    // Restart session if needed, but do it properly
    if (!sessionId && user) {
      console.log('ChatAssistant: No session found, initializing');
      
      // Use the more robust startNewSession which has been fixed to prevent navigation
      startNewSession().catch(err => {
        console.error('Failed to start new session:', err);
        // Add error message if needed
      });
    } else if (sessionId) {
      console.log('ChatAssistant: Session exists, refreshing UI only:', sessionId);
      
      // Refresh UI state
      setError(null);
      setInitializing(false);
      setIsLoading(false);
      
      // Show a temporary status message
      const statusMessage: ChatMessage = {
        _id: 'status-' + Date.now(),
        text: 'Chat refreshed successfully. You can continue your conversation.',
        createdAt: new Date(),
        system: true,
        user: {
          _id: 'system',
          name: 'System',
        },
      };
      
      // Add status message that will disappear after a few seconds
      setMessages(prev => [...prev, statusMessage]);
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg._id !== statusMessage._id));
      }, 3000);
    }
  }, [messages.length, sessionId, user, startNewSession]);
  
  // Add a function to check if the tables exist
  const diagnoseChatSchema = async () => {
    setIsLoading(true);
    setError('Checking database tables...');
    
    try {
      // First check if tables exist using the utility directly
      const tablesExist = await ensureChatTablesExist();
      
      if (!tablesExist) {
        console.log('ChatAssistant: Tables do not exist, attempting to create them');
        setError('Chat tables do not exist. Creating tables...');
        
        // Try to create the tables using the utility directly
        const success = await createChatTables();
        
        if (success) {
          console.log('ChatAssistant: Tables created successfully');
          setError('Tables created successfully. Initializing chat...');
          setTimeout(() => {
            setError(null);
            initializeChat();
          }, 1000);
        } else {
          console.error('ChatAssistant: Failed to create tables');
          setError(`Failed to create chat tables. Please try again later.`);
        }
      } else {
        console.log('ChatAssistant: Tables exist, continuing with initialization');
        setError(null);
        initializeChat();
      }
    } catch (error: any) {
      console.error('ChatAssistant: Error diagnosing chat schema:', error);
      setError(`Error checking database: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Use the effect hook to diagnose chat tables on mount
  useEffect(() => {
    if (user && !sessionId && authVerified) {
      console.log('ChatAssistant: User is authenticated, diagnosing chat schema');
      diagnoseChatSchema();
    }
  }, [user, sessionId, authVerified]);
  
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
      paddingBottom: 80, // Add padding to prevent messages from being hidden behind input
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: themeColors.border || '#e0e0e0',
      backgroundColor: themeColors.card || '#ffffff',
      width: '100%',
    },
    input: {
      flex: 1,
      backgroundColor: themeColors.inputBackground || '#f0f0f0',
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginRight: 10,
      color: themeColors.text || '#000000',
      maxHeight: 100,
      minHeight: 40,
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
      marginVertical: 4,
      maxWidth: '80%',
      alignSelf: 'flex-start',
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    userBubble: {
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      borderBottomLeftRadius: 4,
    },
    systemBubble: {
      alignSelf: 'center',
      borderRadius: 8,
      padding: 8,
      marginVertical: 8,
      opacity: 0.8,
    },
    systemText: {
      fontSize: 14,
      fontStyle: 'italic',
      textAlign: 'center',
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
  
  // Update the renderMessage function to use a safe fallback for systemMessage
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.user._id !== 'assistant' && item.user._id !== 'system';
    const isSystem = item.user._id === 'system' || item.system === true;
    
    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        isSystem ? styles.systemBubble : {},
        { 
          backgroundColor: isUser 
            ? themeColors.primary 
            : (isSystem ? themeColors.systemMessage : themeColors.card) 
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: isUser ? '#ffffff' : themeColors.text },
          isSystem ? styles.systemText : {}
        ]}>
          {item.text}
        </Text>
      </View>
    );
  }, [themeColors]);
  
  // Render content based on state - optimize with memoization
  const renderContent = useCallback(() => {
    // If we have messages, always show them regardless of other states
    // This prevents the UI from flickering between different states
    if (messages.length > 0) {
      return (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          inverted={false}
          onContentSizeChange={() => {
            // Scroll to bottom when content changes
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />
      );
    }
    
    // Show loading state only when explicitly loading and no messages
    if (isLoading && !messages.length) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
    
    // Show error only when explicitly set and no messages
    if (error && !messages.length) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: themeColors.error }]}>
            {error}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 }}>
            <Button 
              title="Try Again" 
              onPress={() => {
                setError(null);
                setInitializing(true);
                setTimeout(() => {
                  if (user) {
                    petAssistantService.getOrCreateSession(user.id, petId)
                      .then(session => {
                        if (session && session.id) {
                          setSessionId(session.id);
                          setInitializing(false);
                        }
                      })
                      .catch(() => setInitializing(false));
                  } else {
                    setInitializing(false);
                  }
                }, 500);
              }} 
              disabled={isLoading || initializing}
            />
            <Button 
              title="Create Tables" 
              onPress={diagnoseChatSchema}
              disabled={isLoading || initializing}
            />
          </View>
        </View>
      );
    }

    // Show initializing state only when explicitly initializing and no messages
    if (initializing && !messages.length) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Initializing chat...
          </Text>
        </View>
      );
    }

    // Default case - show welcome message
    return (
      <FlatList
        ref={flatListRef}
        data={[{
          _id: 'welcome',
          text: 'Hello! I\'m your Pet Care Assistant. How can I help with your pet care questions today?',
          createdAt: new Date(),
          user: {
            _id: 'assistant',
            name: 'Assistant',
          },
        }]}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        inverted={false}
      />
    );
  }, [messages, isLoading, error, initializing, themeColors, safeInsets.bottom, user, petId, renderMessage]);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: safeInsets.bottom }]}>
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ 
          padding: 16, 
          paddingTop: 16 + safeInsets.top, // Add top inset to prevent overlap with status bar
          backgroundColor: themeColors.primary, 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center' 
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: '#fff', 
            textAlign: 'center' 
          }}>
            Pet Assistant
          </Text>
        </View>
        
        {/* Message content area */}
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
        
        {/* Fixed input area - always visible */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[styles.inputContainer, { 
            paddingBottom: Math.max(safeInsets.bottom, 10),
            borderTopWidth: 1,
            borderTopColor: themeColors.border || '#e0e0e0'
          }]}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: themeColors.inputBackground || '#f0f0f0',
                color: themeColors.text
              }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={themeColors.placeholderText}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => {
                if (inputText.trim() && !isLoading) {
                  handleSendMessage(inputText);
                  setInputText('');
                }
              }}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              disabled={isLoading || !inputText.trim()}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && { opacity: 0.5 }
              ]}
              onPress={() => {
                if (inputText.trim() && !isLoading) {
                  handleSendMessage(inputText);
                  setInputText('');
                }
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        
        {/* Refresh button */}
        <TouchableOpacity
          style={[
            styles.floatingButton,
            { backgroundColor: themeColors.primary }
          ]}
          onPress={checkInputDisplay}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ChatAssistant;