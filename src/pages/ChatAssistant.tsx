import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { petAssistantService } from '../services/petAssistant';
import { ChatMessage as GeminiChatMessage } from '../services/petAssistant/geminiService';
import { supabase } from '../services/supabase';
import { MainStackParamList } from '../types/navigation';

// Define the route params type
type ChatAssistantScreenRouteProp = RouteProp<MainStackParamList, 'ChatAssistant'>;

// Main ChatAssistant Component
const ChatAssistant = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();
  const route = useRoute<ChatAssistantScreenRouteProp>();
  const flatListRef = useRef<FlatList>(null);
  
  // Get user ID from supabase
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get pet ID if provided through route params
  const petId = route.params?.petId;
  
  // Component state
  const [messages, setMessages] = useState<GeminiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Colors based on theme
  const colors = {
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
  
  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        Alert.alert('Error', 'You must be logged in to use the chat assistant.');
        navigation.goBack();
      }
    };
    
    getCurrentUser();
  }, []);
  
  // Initialize chat
  useEffect(() => {
    if (!userId) return; // Wait for user ID
    
    async function initializeChat() {
      try {
        setIsLoading(true);
        // Check if API key is set
        const hasKey = await petAssistantService.initialize();
        setApiKeySet(hasKey);
        
        if (!hasKey) {
          // Instead of prompting user, we'll show an error that admin needs to set the API key
          setError('The AI Assistant is not properly configured. Please contact the administrator.');
          setIsLoading(false);
          return;
        }
        
        // Start or load session
        const sessionIdParam = route.params?.sessionId;
        
        if (sessionIdParam) {
          // Load existing session
          const success = await petAssistantService.loadSession(sessionIdParam);
          if (success) {
            setSessionId(sessionIdParam);
            setMessages(petAssistantService.getCurrentSessionMessages());
          } else {
            // Fallback to new session if loading fails
            startNewSession();
          }
        } else {
          // Start new session
          startNewSession();
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError('Failed to initialize chat. Database tables might be missing.');
        setIsLoading(false);
      }
    }
    
    initializeChat();
    
  }, [userId]);
  
  // Start a new chat session
  const startNewSession = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to use the chat assistant.');
      return;
    }
    
    try {
      const newSessionId = await petAssistantService.startNewSession(userId, petId);
      
      if (newSessionId) {
        setSessionId(newSessionId);
        setMessages(petAssistantService.getCurrentSessionMessages());
      } else {
        Alert.alert('Error', 'Failed to create a new chat session. Please try again.');
      }
    } catch (error) {
      console.error('Error starting new session:', error);
      Alert.alert('Error', 'Failed to start a new chat session. Please try again.');
    }
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !userId) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);
    
    // Add user message immediately to UI
    const updatedMessages: GeminiChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(updatedMessages);
    
    try {
      // Send to service and get response
      const response = await petAssistantService.sendMessage(userId, userMessage);
      
      if (response) {
        // Update messages from service to ensure consistency
        setMessages(petAssistantService.getCurrentSessionMessages());
      } else {
        // Handle error
        Alert.alert('Error', 'Failed to get a response. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start a new conversation
  const startNewConversation = () => {
    Alert.alert(
      'New Conversation',
      'Are you sure you want to start a new conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => {
            petAssistantService.clearCurrentSession();
            startNewSession();
          }
        }
      ]
    );
  };
  
  // Render each message bubble
  const renderMessageItem = ({ item, index }: { item: GeminiChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? [styles.userBubble, { backgroundColor: colors.userBubble }] : [styles.assistantBubble, { backgroundColor: colors.assistantBubble }],
        ]}
      >
        <Text style={[styles.messageText, { color: isUser ? colors.userText : colors.assistantText }]}>
          {item.content}
        </Text>
      </View>
    );
  };

  // Add a function to create tables directly
  const createTablesDirectly = async () => {
    try {
      setIsLoading(true);
      setError('Attempting to create database tables...');
      
      // Check if the function exists first
      const { error: checkError } = await supabase.rpc('create_chat_tables');
      
      if (checkError && checkError.message && checkError.message.includes('function "create_chat_tables" does not exist')) {
        // Function doesn't exist, provide instructions
        setError(`The database function "create_chat_tables" doesn't exist yet. Please run the SQL script from src/services/sql/create_tables_function.sql in your Supabase SQL Editor first.`);
        return;
      }
      
      // Function exists, but may have other errors
      if (checkError) {
        console.error('Error creating tables:', checkError);
        setError(`Could not create tables: ${checkError.message}`);
        return;
      }
      
      // Tables created successfully, retry initialization
      setError(null);
      const hasKey = await petAssistantService.initialize();
      setApiKeySet(hasKey);
      
      if (hasKey) {
        startNewSession();
      } else {
        setError('Tables created, but API key is missing.');
      }
    } catch (err) {
      console.error('Failed to create tables:', err);
      setError('Could not create tables. Please contact the administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render content based on state
  const renderContent = () => {
    if (!apiKeySet) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={[styles.messageText, { color: colors.assistantText }]}>
            The AI Assistant is not configured properly. Please contact the administrator.
          </Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error || '#ff6b6b'} />
          <Text style={[styles.messageText, { color: colors.assistantText, marginTop: 16, textAlign: 'center' }]}>
            {error}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, marginTop: 20, marginRight: 10 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={createTablesDirectly}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? "Creating..." : "Create Tables"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <>
        {messages.length === 0 ? (
          <View style={styles.centeredContainer}>
            <Text style={[styles.messageText, { color: colors.assistantText }]}>
              Welcome to Pet Assistant! Ask me anything about pet care.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item, index) => `msg-${index}`}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}
      </>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.assistantText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.assistantText }]}>Pet Assistant</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={startNewConversation}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.assistantText} />
        </TouchableOpacity>
      </View>
      
      {/* Chat Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
          placeholder="Ask a question..."
          placeholderTextColor={colors.placeholderText}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          editable={!isLoading && apiKeySet}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.sendButton }]}
          onPress={sendMessage}
          disabled={isLoading || !inputText.trim() || !apiKeySet}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
  },
  newChatButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    maxWidth: '80%',
    minWidth: 120,
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
    minHeight: 40,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default ChatAssistant; 