import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AppUser } from '../contexts/AuthContext';
import Footer from '../components/layout/Footer';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { Pet } from '../types/components';
import { notificationService } from '../services/notifications';
import { MainStackParamList, AppStackParamList } from '../types/navigation';
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
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState<string>('15'); // Default 15 minutes
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { colors, isDark } = useAppColors();
  const { user, signOut } = useAuth();
  const appUser = user as AppUser; // Cast to AppUser type for TypeScript
  const [pets, setPets] = useState<Pet[]>([]);
  const { activePetId } = useActivePet();
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
  
  const handleLogout = async () => {
    try {
      await signOut();
      
      // Using direct component replacement approach
      // This approach relies on the AuthContext to handle navigation
      // When user is set to null, AppNavigator automatically shows AuthStack
      
      // We don't need any explicit navigation - just let the AuthProvider handle it
      // The app's root navigator will detect the user is null and show the auth screens
      
      // Add direct toast notification here to ensure it appears
      toast({
        title: 'Successfully Logged Out',
        description: 'You have been securely logged out of your account',
        type: 'success',
        duration: 4000
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert("Error", "There was a problem logging out. Please try again.");
    }
  };

  const handleManagePets = () => {
    // Navigate to the dedicated ManagePets screen
    navigation.navigate('ManagePets' as never);
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
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{getUserInitial()}</Text>
              </View>
          
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
        <TouchableOpacity 
          style={[styles.optionItem, dynamicStyles.optionItem]}
          onPress={() => navigation.navigate('FeedbackForm' as never)}
        >
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
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});

export default Settings;