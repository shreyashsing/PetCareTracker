import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  StatusBar,
  Image,
  Alert,
  Platform,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AppUser } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Footer from '../components/layout/Footer';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { Pet } from '../types/components';
import { notificationService } from '../services/notifications';
import { MainStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../hooks/use-toast';

// Simple button components
const BackButton = ({ color }: { color: string }) => (
  <View style={styles.iconPlaceholder}>
    <Text>
      <Ionicons name="arrow-back" size={24} color={color} />
    </Text>
  </View>
);

const MoreButton = ({ color }: { color: string }) => (
  <View style={styles.iconPlaceholder}>
    <Text>
      <Ionicons name="ellipsis-vertical" size={24} color={color} />
    </Text>
  </View>
);

const ForwardArrow = ({ color }: { color: string }) => (
  <Text style={[styles.arrowText, { color }]}>
    <Ionicons name="chevron-forward" size={18} color={color} />
  </Text>
);

// Icon wrapper to handle text rendering issues
const IconWrapper = ({ 
  name, 
  size = 20, 
  color = "#666" 
}: { 
  name: keyof typeof Ionicons.glyphMap; // Fix any type to proper Ionicons type
  size?: number; 
  color?: string;
}) => (
  <View style={styles.iconWrapper}>
    <Text>
      <Ionicons name={name} size={size} color={color} />
    </Text>
  </View>
);

const Settings = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState<string>('15'); // Default 15 minutes
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { colors, isDark } = useAppColors();
  const { user, signOut } = useAuth();
  const appUser = user as AppUser; // Cast to AppUser type for TypeScript
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [showPetModal, setShowPetModal] = useState(false);
  const { activePetId, setActivePetId } = useActivePet();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'profile' | 'apiKey'>('profile');
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();
  
  // Check notification permissions using the notification service
  const checkNotificationPermissions = async () => {
    const hasPermission = await notificationService.hasPermission();
    if (!hasPermission) {
      setNotificationsEnabled(false);
    }
  };

  // Load pets from database
  const loadPets = useCallback(async () => {
    try {
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      // Get all pets and filter by current user's ID
      const allPets = await unifiedDatabaseManager.pets.getAll();
      const userPets = allPets.filter(pet => pet.userId === user.id);
      setPets(userPets);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  }, [user]);

  // Load user preferences from database
  const loadUserPreferences = useCallback(async () => {
    try {
      if (appUser?.preferences) {
        // Use optional chaining with our appUser
        const pushNotifications = appUser.preferences.pushNotifications;
        setNotificationsEnabled(pushNotifications !== undefined ? pushNotifications : false);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, [appUser]);
  
  // Load data on component mount
  useEffect(() => {
    loadPets();
  }, [loadPets]); 
  
  // Load user preferences and notification permissions on component mount
  useEffect(() => {
    loadUserPreferences();
    checkNotificationPermissions();
  }, [loadUserPreferences]);
  
  // Toggle notifications and request permission if needed
  const toggleNotifications = async (value: boolean) => {
    try {
      if (value) {
        // If enabling notifications, make sure we have permission
        const hasPermission = await notificationService.hasPermission();
        
        if (!hasPermission) {
          // Request permission
          const granted = await notificationService.requestPermission();
          
          if (!granted) {
            Alert.alert(
              'Permission Required',
              'Notification permission is required to receive reminders for your pet care tasks.',
              [{ text: 'OK' }]
            );
            return;
          }
        }
        
        // If we get here, permission was granted
        // Schedule notifications for all pending tasks
        await notificationService.rescheduleAllNotifications();
      } else {
        // If disabling notifications, cancel all scheduled notifications
        await notificationService.cancelTaskNotifications('all');
      }
      
      // Update user preferences in database
      if (user) {
        // Update local state
        setNotificationsEnabled(value);
        
        // Update user preferences in database using the appUser
        const updatedPrefs = {
          ...(appUser.preferences || {}),
          pushNotifications: value
        };
        
        // We only update the preferences part to avoid type issues with other User fields
        await unifiedDatabaseManager.users.update(user.id, {
          preferences: updatedPrefs
        });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Get the user's initial for the avatar
  const getUserInitial = () => {
    if (!appUser) return '?';
    
    if (appUser.displayName && appUser.displayName.length > 0) {
      return appUser.displayName.charAt(0).toUpperCase();
    }
    
    if (appUser.email && appUser.email.length > 0) {
      return appUser.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };
  
  // Get user's display name
  const getDisplayName = () => {
    if (!appUser) return 'Guest';
    
    if (appUser.displayName) {
      return appUser.displayName;
    }
    
    // If no display name, use the part of the email before @
    if (appUser.email) {
      const emailParts = appUser.email.split('@');
      if (emailParts.length > 0) {
        // Capitalize the first letter
        const name = emailParts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    
    return 'Guest';
  };
  
  // Show image selection options
  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: chooseFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    try {
      // Ask for camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take a photo.'
        );
        return;
      }

      // Take a photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'There was an error taking a photo.');
    }
  };

  // Choose from gallery
  const chooseFromGallery = async () => {
    try {
      // Ask for permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need photo library permissions to access your photos.'
        );
        return;
      }

      // Just use the most basic configuration possible
      const result = await ImagePicker.launchImageLibraryAsync();

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'There was an error selecting an image.');
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      
      // Using direct component replacement approach
      // This approach relies on the AuthContext to handle navigation
      // When user is set to null, AppNavigator automatically shows AuthStack
      
      // We don't need any explicit navigation - just let the AuthProvider handle it
      // The app's root navigator will detect the user is null and show the auth screens
      
      // If needed, we can add a message to show the logout was successful
      Alert.alert("Logged Out", "You have been successfully logged out.");
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert("Error", "There was a problem logging out. Please try again.");
    }
  };

  const handleManagePets = () => {
    // Navigate to the dedicated ManagePets screen
    navigation.navigate('ManagePets');
  };
  
  const handleOpenChatAssistant = () => {
    // @ts-ignore - Workaround for type mismatch in navigation
    navigation.navigate('ChatAssistant', { petId: activePetId });
  };
  
  const handleDeletePet = (pet: Pet) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to delete ${pet.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete pet from database
              await unifiedDatabaseManager.pets.delete(pet.id);
              
              // If this was the active pet, clear the active pet
              if (activePetId === pet.id) {
                await AsyncStorageService.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
                setActivePetId(null);
              }
              
              // Refresh the pet list
              loadPets();
              
              // Show success message
              Alert.alert('Success', `${pet.name} has been deleted.`);
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'There was an error deleting the pet. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const handleSetActivePet = async (pet: Pet) => {
    try {
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, pet.id);
      setActivePetId(pet.id);
      Alert.alert('Success', `${pet.name} is now your active pet.`);
      setShowPetModal(false);
    } catch (error) {
      console.error('Error setting active pet:', error);
      Alert.alert('Error', 'There was an error setting the active pet. Please try again.');
    }
  };
  
  const renderPetItem = ({ item }: { item: Pet }) => {
    return (
      <View style={[styles.petItem, { borderBottomColor: colors.border }]}>
        <View style={styles.petInfo}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.petImage} />
          ) : (
            <View style={[styles.petImagePlaceholder, { backgroundColor: colors.primary + '50' }]}>
              <Text style={[styles.petImageText, { color: colors.primary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.petDetails}>
            <Text style={[styles.petName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.petBreed, { color: colors.text + '80' }]}>{item.breed}</Text>
          </View>
        </View>
        <View style={styles.petActions}>
          {activePetId !== item.id && (
            <TouchableOpacity 
              style={[styles.activateButton, { backgroundColor: colors.primary + '20' }]} 
              onPress={() => handleSetActivePet(item)}
            >
              <Text style={{ color: colors.primary }}>Activate</Text>
            </TouchableOpacity>
          )}
          {activePetId === item.id && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ color: colors.primary }}>Active</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => handleDeletePet(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleOpenChatDebug = () => {
    // navigation.navigate('ChatDebug');
    Alert.alert('Chat Debug', 'Chat debug functionality not yet implemented');
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    },
    headerTitle: {
      color: colors.text,
    },
    profileName: {
      color: colors.text,
    },
    profileEmail: {
      color: colors.text + '99', // Add transparency for secondary text
    },
    optionText: {
      color: colors.text,
    },
    sectionHeaderText: {
      color: colors.text + '99', // Add transparency for secondary text
    },
    optionItem: {
      borderBottomColor: colors.border,
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      <ScrollView style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <BackButton color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Account</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarTouchable}
            onPress={showImageOptions}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{getUserInitial()}</Text>
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={14} color="white" />
          </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, dynamicStyles.profileName]}>
              {getDisplayName()}
            </Text>
            <Text style={[styles.profileEmail, dynamicStyles.profileEmail]}>
              {user?.email || 'Not signed in'}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MoreButton color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* App Improvement Section */}
        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="document-text-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Help us improve the app</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>
        
        {/* Share App Section */}
        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="gift-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Share the app</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        {/* Pet Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>PET MANAGEMENT</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={handleManagePets}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="paw-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Manage pets</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={() => setShowPetModal(true)}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="swap-horizontal-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Switch active pet</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        {/* Assistant & Features Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>FEATURES</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={() => {
            setModalType('apiKey');
            setModalVisible(true);
          }}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="key-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Configure Pet Assistant</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={handleOpenChatAssistant}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="chatbubbles-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Open Chat Assistant</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        {/* Debug Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>DEBUG & SUPPORT</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={() => {
            Alert.alert('Debug Menu', 'Debug menu functionality not yet implemented');
          }}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="bug-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Debug Menu</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={handleOpenChatDebug}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="terminal-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Chat Debug</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={() => {
            Alert.alert('Storage Diagnostic', 'Storage diagnostic functionality not yet implemented');
          }}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="folder-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Storage Diagnostic</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        {/* App Info Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>APP INFO</Text>
        </View>
        
        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="information-circle-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>App version</Text>
          <View style={styles.valueContainer}>
            <Text style={[styles.valueText, { color: colors.primary }]}>1.0.0</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="shield-checkmark-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Privacy Policy</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="document-text-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Terms of Service</Text>
          <ForwardArrow color={colors.text + '80'} />
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>ACCOUNT</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={handleLogout}
        >
          <View style={styles.optionIconContainer}>
            <IconWrapper name="log-out-outline" color="#F44336" />
          </View>
          <Text style={[styles.optionText, { color: '#F44336' }]}>Sign out</Text>
          <ForwardArrow color="#F44336" />
        </TouchableOpacity>

        {/* Notifications Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>NOTIFICATIONS</Text>
        </View>
      </ScrollView>
      
      {/* Pet Management Modal */}
      <Modal
        visible={showPetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPetModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Your Pets</Text>
              <TouchableOpacity onPress={() => setShowPetModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {pets.length === 0 ? (
              <View style={styles.noPetsContainer}>
                <Ionicons name="paw" size={60} color={colors.primary + '50'} />
                <Text style={[styles.noPetsText, { color: colors.text + '80' }]}>
                  You don't have any pets yet
                </Text>
                <TouchableOpacity 
                  style={[styles.addPetButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowPetModal(false);
                    navigation.navigate('AddPet');
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Add a Pet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={pets}
                renderItem={renderPetItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.petList}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* API Key Input Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible && modalType === 'apiKey'}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Configure Gemini API Key</Text>
            <Text style={[styles.modalDescription, { color: colors.text + '99' }]}>
              Enter your Gemini API key to enable the Pet Assistant. You can get one from Google MakerSuite.
            </Text>
            
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: colors.background, 
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter Gemini API key"
              placeholderTextColor={colors.text + '80'}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    if (!apiKey.trim()) {
                      Alert.alert('Error', 'Please enter a valid API key');
                      return;
                    }
                    
                    console.log('Settings: Attempting to set Gemini API key...');
                    
                    // Import the pet assistant service
                    const { petAssistantService } = await import('../services/petAssistant');
                    
                    // Save the API key
                    console.log('Settings: Calling petAssistantService.setApiKey()...');
                    await petAssistantService.setApiKey(apiKey.trim());
                    
                    // Check if it's valid
                    console.log('Settings: Calling petAssistantService.hasApiKey()...');
                    const isValid = await petAssistantService.hasApiKey();
                    console.log('Settings: API key validation result:', isValid);
                    
                    if (isValid) {
                      console.log('Settings: API key configured successfully');
                      Alert.alert('Success', 'API key configured successfully. You can now use the Pet Assistant.');
                      setModalVisible(false);
                      setApiKey('');
                    } else {
                      console.error('Settings: API key validation failed');
                      Alert.alert('Error', 'Failed to validate API key. Please check and try again.');
                    }
                  } catch (error) {
                    console.error('Settings: Error saving API key:', error);
                    Alert.alert('Error', 'Failed to save API key. Please try again.');
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Footer />
    </View>
  );
};

// Define styles
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 16,
    marginTop: 4,
  },
  moreButton: {
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionIconContainer: {
    width: 28,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  iconPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    marginLeft: 8,
  },
  iconWrapper: {
    alignItems: 'center',
  },
  // Pet management styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  petList: {
    paddingHorizontal: 20,
  },
  petItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImageText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  petDetails: {
    marginLeft: 15,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  petBreed: {
    fontSize: 14,
    marginTop: 3,
  },
  petActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activateButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  activeIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  noPetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPetsText: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 20,
  },
  addPetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    marginRight: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    fontSize: 16,
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
  },
  menuItemValue: {
    fontSize: 14,
    marginLeft: 8,
  },
  appInfo: {
    padding: 20,
    alignItems: 'center',
  },
  appVersion: {
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 14,
  },
  // API Key Modal styles
  modalInput: {
    width: '90%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 10,
    alignSelf: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    alignSelf: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: 16,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButtonDescription: {
    fontSize: 14,
  },
});

export default Settings;