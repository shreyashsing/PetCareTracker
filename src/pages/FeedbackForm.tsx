import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAppColors } from '../hooks/useAppColors';
import { FeedbackType, FeedbackSeverity, appFeedbackRepository, AppFeedback } from '../services/db/appFeedbackRepository';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../hooks/use-toast';
import { useFormStatePersistence } from '../hooks/useFormStatePersistence';
import { useAppStore } from '../store/AppStore';
import { AppState } from 'react-native';

type FeedbackFormProps = {
  route?: {
    params?: {
      initialFeedbackType?: FeedbackType;
    }
  }
};

// Define the form state type for better type safety
interface FeedbackFormState {
  title: string;
  description: string;
  feedbackType: FeedbackType;
  severity: FeedbackSeverity;
  isAnonymous: boolean;
  contactEmail: string;
  deviceInfo: string;
  screenshot: string | null;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ route }) => {
  const initialType = route?.params?.initialFeedbackType || 'general_feedback';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors, isDark } = useAppColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  
  // Get navigation state from app store
  const { navigationState, updateCurrentRoute, saveStateToStorage } = useAppStore();

  // Form state
  const [formState, setFormState] = useState<FeedbackFormState>({
    title: '',
    description: '',
    feedbackType: initialType,
    severity: 'medium',
    isAnonymous: false,
    contactEmail: user?.email || '',
    deviceInfo: '',
    screenshot: null
  });

  // Destructure form state for easier access
  const { 
    title, 
    description, 
    feedbackType, 
    severity, 
    isAnonymous, 
    contactEmail, 
    deviceInfo, 
    screenshot 
  } = formState;

  // Use form state persistence hook
  const { clearSavedState, forceSave } = useFormStatePersistence({
    routeName: 'FeedbackForm',
    formState,
    setFormState,
    enabled: true
  });

  const [submitting, setSubmitting] = useState(false);

  // Debug logging on mount and unmount
  useEffect(() => {
    console.log('[FeedbackForm] Component mounted');
    console.log('[FeedbackForm] Current navigation state:', navigationState);
    
    // Force update the current route to ensure it's tracked correctly
    updateCurrentRoute('FeedbackForm');
    
    // Force save state to storage
    saveStateToStorage();
    
    return () => {
      console.log('[FeedbackForm] Component unmounting');
    };
  }, []);
  
  // Log when app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[FeedbackForm] App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[FeedbackForm] App going to background, forcing save of form state');
        forceSave();
        
        // Force update current route before going to background
        updateCurrentRoute('FeedbackForm');
        saveStateToStorage();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [forceSave, updateCurrentRoute, saveStateToStorage]);
  
  // Log focus events
  useFocusEffect(
    React.useCallback(() => {
      console.log('[FeedbackForm] Screen focused');
      
      // Force update the current route when screen gains focus
      updateCurrentRoute('FeedbackForm');
      
      return () => {
        console.log('[FeedbackForm] Screen lost focus');
      };
    }, [updateCurrentRoute])
  );

  const handleTypeSelection = (type: FeedbackType) => {
    setFormState(prev => ({
      ...prev,
      feedbackType: type,
      // Set default severity based on type
      severity: type === 'bug_report' ? 'medium' : null
    }));
  };

  const handlePickScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to include screenshots.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormState(prev => ({
          ...prev,
          screenshot: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error picking screenshot:', error);
      Alert.alert('Error', 'Failed to select a screenshot. Please try again.');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a title for your feedback.');
        return;
      }

      if (!description.trim()) {
        Alert.alert('Error', 'Please provide a description.');
        return;
      }

      setSubmitting(true);

      // Prepare feedback object
      const feedbackData: Partial<AppFeedback> = {
        title: title.trim(),
        description: description.trim(),
        feedback_type: feedbackType,
        severity: feedbackType === 'bug_report' ? severity : null,
        contact_email: isAnonymous ? null : contactEmail,
        is_anonymous: isAnonymous,
        device_info: deviceInfo.trim(),
      };

      // Upload screenshot if provided
      if (screenshot) {
        const screenshotUrl = await appFeedbackRepository.uploadScreenshot(
          screenshot, 
          isAnonymous ? undefined : user?.id
        );
        feedbackData.screenshot_url = screenshotUrl;
      }

      // Submit feedback based on anonymity preference
      if (isAnonymous) {
        await appFeedbackRepository.submitAnonymousFeedback(feedbackData as any);
      } else {
        if (!user) {
          throw new Error('User must be logged in to submit non-anonymous feedback');
        }
        feedbackData.user_id = user.id;
        await appFeedbackRepository.submitFeedback(feedbackData as any);
      }

      // Clear saved form state after successful submission
      clearSavedState();

      // Show success message
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for helping us improve the app!',
        type: 'success',
        duration: 3000
      });

      // Navigate back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeverityOptions = () => {
    if (feedbackType !== 'bug_report') return null;

    const options: { label: string; value: FeedbackSeverity; color: string }[] = [
      { label: 'Low', value: 'low', color: '#4CAF50' },
      { label: 'Medium', value: 'medium', color: '#FF9800' },
      { label: 'High', value: 'high', color: '#F44336' },
      { label: 'Critical', value: 'critical', color: '#9C27B0' },
    ];

    return (
      <View style={styles.severityContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>How severe is this issue?</Text>
        <View style={styles.severityOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.severityOption,
                { 
                  backgroundColor: severity === option.value 
                    ? option.color + '30' 
                    : 'transparent',
                  borderColor: option.color,
                },
              ]}
              onPress={() => setFormState(prev => ({ ...prev, severity: option.value }))}
            >
              <Text
                style={{
                  color: severity === option.value ? option.color : colors.text + '80',
                  fontWeight: severity === option.value ? 'bold' : 'normal',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Help us improve</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Feedback Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What would you like to share?</Text>
            <View style={styles.feedbackTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: feedbackType === 'bug_report' ? colors.primary + '30' : 'transparent',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleTypeSelection('bug_report')}
              >
                <Ionicons
                  name="bug-outline"
                  size={24}
                  color={feedbackType === 'bug_report' ? colors.primary : colors.text + '80'}
                />
                <Text
                  style={{
                    color: feedbackType === 'bug_report' ? colors.primary : colors.text + '80',
                    marginTop: 4,
                  }}
                >
                  Bug Report
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: feedbackType === 'feature_request' ? colors.primary + '30' : 'transparent',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleTypeSelection('feature_request')}
              >
                <Ionicons
                  name="bulb-outline"
                  size={24}
                  color={feedbackType === 'feature_request' ? colors.primary : colors.text + '80'}
                />
                <Text
                  style={{
                    color: feedbackType === 'feature_request' ? colors.primary : colors.text + '80',
                    marginTop: 4,
                  }}
                >
                  Feature Request
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: feedbackType === 'general_feedback' ? colors.primary + '30' : 'transparent',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleTypeSelection('general_feedback')}
              >
                <Ionicons
                  name="chatbox-outline"
                  size={24}
                  color={feedbackType === 'general_feedback' ? colors.primary : colors.text + '80'}
                />
                <Text
                  style={{
                    color: feedbackType === 'general_feedback' ? colors.primary : colors.text + '80',
                    marginTop: 4,
                  }}
                >
                  Feedback
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: feedbackType === 'issue_report' ? colors.primary + '30' : 'transparent',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleTypeSelection('issue_report')}
              >
                <Ionicons
                  name="warning-outline"
                  size={24}
                  color={feedbackType === 'issue_report' ? colors.primary : colors.text + '80'}
                />
                <Text
                  style={{
                    color: feedbackType === 'issue_report' ? colors.primary : colors.text + '80',
                    marginTop: 4,
                  }}
                >
                  Issue Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Severity selection (only for bug reports) */}
          {renderSeverityOptions()}

          {/* Title and Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Provide a brief title"
              placeholderTextColor={colors.text + '70'}
              value={title}
              onChangeText={(text) => setFormState(prev => ({ ...prev, title: text }))}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Please provide details about your feedback"
              placeholderTextColor={colors.text + '70'}
              value={description}
              onChangeText={(text) => setFormState(prev => ({ ...prev, description: text }))}
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Device Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Information (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. iPhone 13, Samsung Galaxy S22, etc."
              placeholderTextColor={colors.text + '70'}
              value={deviceInfo}
              onChangeText={(text) => setFormState(prev => ({ ...prev, deviceInfo: text }))}
            />
            <Text style={{ color: colors.text + '70', marginTop: 5, fontSize: 12 }}>
              Knowing your device helps us address issues more effectively
            </Text>
          </View>

          {/* Screenshot */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Attach a screenshot (optional)</Text>
            <TouchableOpacity
              style={[
                styles.screenshotButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={handlePickScreenshot}
            >
              {screenshot ? (
                <View style={styles.screenshotPreviewContainer}>
                  <Text style={{ color: colors.primary }}>
                    Screenshot selected
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </Text>
                  <TouchableOpacity onPress={() => setFormState(prev => ({ ...prev, screenshot: null }))}>
                    <Text style={{ color: '#F44336' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.screenshotUploadContainer}>
                  <Ionicons name="image-outline" size={24} color={colors.text + '80'} />
                  <Text style={{ color: colors.text + '80', marginTop: 8 }}>
                    Tap to select a screenshot
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.anonymousContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormState(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isAnonymous ? colors.primary : 'transparent',
                      borderColor: isAnonymous ? colors.primary : colors.text,
                    },
                  ]}
                >
                  {isAnonymous && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  Submit anonymously
                </Text>
              </TouchableOpacity>
            </View>

            {!isAnonymous && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact email (optional)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Your email address for follow-up"
                  placeholderTextColor={colors.text + '70'}
                  value={contactEmail}
                  onChangeText={(text) => setFormState(prev => ({ ...prev, contactEmail: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: submitting ? colors.primary + '80' : colors.primary,
                marginBottom: 20 + insets.bottom
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeOption: {
    width: '48%',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  severityContainer: {
    marginBottom: 20,
  },
  severityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
  },
  screenshotButton: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotUploadContainer: {
    alignItems: 'center',
  },
  screenshotPreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  anonymousContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  submitButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FeedbackForm; 