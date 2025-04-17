import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Footer from '../components/layout/Footer';
import { databaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useActivePet } from '../hooks/useActivePet';
import { Pet } from '../types/components';
import { notificationService } from '../services/notifications';

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
  name: any; // Using any as a temporary workaround for the Ionicons name type
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState<string>('15'); // Default 15 minutes
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { colors, isDark } = useAppColors();
  const { user, logout } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [showPetModal, setShowPetModal] = useState(false);
  const { activePetId, setActivePetId } = useActivePet();
  
  // Load pets on component mount
  useEffect(() => {
    loadPets();
  }, []);
  
  // Load user preferences and notification permissions on component mount
  useEffect(() => {
    loadUserPreferences();
    checkNotificationPermissions();
  }, []);
  
  const loadPets = async () => {
    try {
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      // Only get pets that belong to the current user
      const userPets = await databaseManager.pets.findByUserId(user.id);
      setPets(userPets);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  // Load user preferences from database
  const loadUserPreferences = async () => {
    try {
      if (user && user.preferences) {
        setNotificationsEnabled(user.preferences.pushNotifications || false);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };
  
  // Check notification permissions using the notification service
  const checkNotificationPermissions = async () => {
    const hasPermission = await notificationService.hasPermission();
    if (!hasPermission) {
      setNotificationsEnabled(false);
    }
  };
  
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
        
        // Update user preferences in database
        const updatedUser = { ...user } as any;
        if (!updatedUser.preferences) {
          updatedUser.preferences = {};
        }
        updatedUser.preferences.pushNotifications = value;
        
        await databaseManager.users.update(user.id, updatedUser);
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
    if (!user) return '?';
    
    if (user.displayName && user.displayName.length > 0) {
      return user.displayName.charAt(0).toUpperCase();
    }
    
    if (user.email && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };
  
  // Get user's display name
  const getDisplayName = () => {
    if (!user) return 'Guest';
    
    if (user.displayName) {
      return user.displayName;
    }
    
    // If no display name, use the part of the email before @
    if (user.email) {
      const emailParts = user.email.split('@');
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
      await logout();
      // Navigation will automatically redirect to login via AppNavigator
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'There was an error logging out. Please try again.');
    }
  };

  const handleManagePets = () => {
    // @ts-ignore - Workaround for type mismatch in navigation
    navigation.navigate('AddPet');
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
              await databaseManager.pets.delete(pet.id);
              
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

        {/* Notifications Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>NOTIFICATIONS</Text>
        </View>
        
        <View style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="notifications-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Enable notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {notificationsEnabled && (
          <>
            <View style={[styles.optionItem, dynamicStyles.optionItem]}>
              <View style={styles.optionIconContainer}>
                <IconWrapper name="volume-high-outline" color={colors.text} />
              </View>
              <Text style={[styles.optionText, dynamicStyles.optionText]}>Enable sounds</Text>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.disabled, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.optionItem, dynamicStyles.optionItem]}
              onPress={() => {
                Alert.alert(
                  'Default Reminder Time',
                  'How many minutes before a task should we remind you?',
                  [
                    {
                      text: '5 minutes',
                      onPress: () => setReminderTimes('5')
                    },
                    {
                      text: '15 minutes',
                      onPress: () => setReminderTimes('15')
                    },
                    {
                      text: '30 minutes',
                      onPress: () => setReminderTimes('30')
                    },
                    {
                      text: '1 hour',
                      onPress: () => setReminderTimes('60')
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    }
                  ]
                );
              }}
            >
              <View style={styles.optionIconContainer}>
                <IconWrapper name="time-outline" color={colors.text} />
              </View>
              <Text style={[styles.optionText, dynamicStyles.optionText]}>Default reminder time</Text>
              <View style={styles.valueContainer}>
                <Text style={[styles.valueText, { color: colors.primary }]}>
                  {reminderTimes === '60' ? '1 hour before' : `${reminderTimes} min before`}
                </Text>
                <ForwardArrow color={colors.text + '80'} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Pet Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>PET MANAGEMENT</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.settingsItem, { borderBottomColor: colors.border }]}
          onPress={handleManagePets}
        >
          <View style={styles.settingsItemLeft}>
            <IconWrapper name="paw" color={colors.primary} />
            <Text style={[styles.settingsItemText, { color: colors.text }]}>Manage Pets</Text>
          </View>
          <ForwardArrow color={colors.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingsItem, { borderBottomColor: colors.border }]}
          onPress={handleOpenChatAssistant}
        >
          <View style={styles.settingsItemLeft}>
            <IconWrapper name="chatbubble-ellipses" color={colors.primary} />
            <Text style={[styles.settingsItemText, { color: colors.text }]}>Pet Assistant</Text>
          </View>
          <ForwardArrow color={colors.secondary} />
        </TouchableOpacity>

        {/* General Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, dynamicStyles.sectionHeaderText]}>GENERAL</Text>
        </View>
        
        <TouchableOpacity style={[styles.optionItem, dynamicStyles.optionItem]}>
          <View style={styles.optionIconContainer}>
            <IconWrapper name="bug-outline" color={colors.text} />
          </View>
          <Text style={[styles.optionText, dynamicStyles.optionText]}>Report A Bug</Text>
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
          <Text style={[styles.optionText, { color: '#F44336' }]}>Logout</Text>
          <ForwardArrow color="#F44336" />
        </TouchableOpacity>
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
                    navigation.navigate('AddPet' as never);
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
      
      <Footer />
    </View>
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
});

export default Settings; 