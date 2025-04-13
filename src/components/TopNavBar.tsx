import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import { useActivePet } from '../hooks/useActivePet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationProps, MainStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
import { Pet } from '../types/components';
import { databaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useToast } from '../hooks/use-toast';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Icon wrapper to handle text rendering issues
const IconWrapper = ({ 
  name, 
  size = 22, 
  color = "#333" 
}: { 
  name: any; // Using any as a temporary workaround for the Ionicons name type
  size?: number; 
  color?: string;
}) => (
  <View style={styles.iconContainer}>
    <Text>
      <Ionicons name={name} size={size} color={color} />
    </Text>
  </View>
);

type TopNavBarProps = {
  title: string;
  showBackButton?: boolean;
  showSettingsButton?: boolean;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
};

type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const TopNavBar: React.FC<TopNavBarProps> = ({
  title = 'Pet Care',
  showBackButton = false,
  showSettingsButton = true,
  onBackPress,
  onSettingsPress,
}) => {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { activePetId, setActivePetId } = useActivePet();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppColors();
  const { toast } = useToast();
  const { user } = useAuth();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  
  // State for pets fetched from database
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load pets from database
  useEffect(() => {
    const loadPets = async () => {
      try {
        setIsLoading(true);
        
        // Get the current user ID
        const userId = user?.id;
        
        if (!userId) {
          console.error('No user ID available');
          setPets([]);
          setActivePet(null);
          return;
        }
        
        // Fetch only pets belonging to the current user using the repository method
        const userPets = await databaseManager.pets.findByUserId(userId);
        console.log(`Found ${userPets.length} pets for user ${userId}`);
        setPets(userPets);
        
        // Get active pet ID from context or storage
        let currentActivePetId = activePetId;
        
        if (!currentActivePetId) {
          // If no active pet in context, try to get from AsyncStorage
          currentActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
          
          // If we found an ID in storage and it's different from context, update context
          if (currentActivePetId && currentActivePetId !== activePetId) {
            setActivePetId(currentActivePetId);
          }
        }
        
        // If the active pet doesn't belong to the current user, reset it
        const activePetBelongsToUser = userPets.some(p => p.id === currentActivePetId);
        
        // If there's an active pet ID but no pets exist with that ID (or it doesn't belong to user),
        // or if there's no active pet ID but pets exist, set the first pet as active
        if ((!activePetBelongsToUser) || 
            (!currentActivePetId && userPets.length > 0)) {
          if (userPets.length > 0) {
            currentActivePetId = userPets[0].id;
            setActivePetId(currentActivePetId);
            await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, currentActivePetId);
          } else {
            // If user has no pets, clear the active pet
            setActivePetId('');
            await AsyncStorageService.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
          }
        }
        
        // Find and set the active pet
        if (currentActivePetId) {
          const pet = userPets.find(p => p.id === currentActivePetId) || null;
          setActivePet(pet);
        } else {
          setActivePet(null);
        }
      } catch (error) {
        console.error('Error loading pets in TopNavBar:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPets();
  }, [activePetId, setActivePetId, isFocused, user]);
  
  // Animation for dropdown
  useEffect(() => {
    if (dropdownVisible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -5,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dropdownVisible, translateY, opacity]);
  
  // Get first letters of user's name for the avatar
  // In a real app, this would come from user data
  const userInitials = 'AB';
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };
  
  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      navigation.navigate('Settings');
    }
  };
  
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };
  
  // Force refresh the current screen to update with new pet data
  const refreshCurrentScreen = () => {
    // Reset to Main screen or refresh current screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };
  
  const selectPet = async (pet: Pet) => {
    try {
      if (pet.id === activePetId) {
        // If the same pet is selected, just close the dropdown
        setDropdownVisible(false);
        return;
      }
      
      // Update active pet in AsyncStorage and context
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, pet.id);
      setActivePetId(pet.id);
      setActivePet(pet);
      setDropdownVisible(false);
      
      // Notify parent component if callback provided
      if (onSettingsPress) {
        onSettingsPress();
      }
      
      // Show a toast to indicate the pet was changed
      toast({
        title: 'Pet Changed',
        description: `Switched to ${pet.name}'s profile`,
        variant: 'default'
      });
      
      // Force refresh the current screen
      refreshCurrentScreen();
    } catch (error) {
      console.error('Error selecting pet:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch pet. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleAddPet = () => {
    setDropdownVisible(false);
    navigation.navigate('AddPet');
  };
  
  // Refresh pet list when dropdown opens
  const handleDropdownToggle = async () => {
    if (!dropdownVisible) {
      // If opening the dropdown, refresh the pet list
      try {
        const userId = user?.id;
        if (!userId) {
          console.error('No user ID available');
          setPets([]);
          return;
        }
        
        // Use repository method instead of manual filtering
        const userPets = await databaseManager.pets.findByUserId(userId);
        console.log(`Refreshed pet list: ${userPets.length} pets for user ${userId}`);
        setPets(userPets);
      } catch (error) {
        console.error('Error refreshing pets list:', error);
      }
    }
    toggleDropdown();
  };

  return (
    <View>
      <View 
        style={[
          styles.container, 
          { 
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }
        ]}
      >
        <View style={styles.leftContent}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        
        <View style={styles.rightContent}>
          {showSettingsButton && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.petButton, { borderColor: colors.border }]}
            onPress={handleDropdownToggle}
          >
            <View style={[styles.petAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.petAvatarText, { color: colors.primary }]}>
                {activePet ? activePet.name.charAt(0) : userInitials}
              </Text>
            </View>
            <Text style={[styles.petName, { color: colors.text }]}>
              {activePet ? activePet.name : 'Select Pet'}
            </Text>
            <Ionicons 
              name={dropdownVisible ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Pet Selector Dropdown */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <Animated.View 
              style={[
                styles.dropdownContainer,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  transform: [{ translateY }],
                  opacity,
                  top: insets.top + 60,
                  right: 16
                }
              ]}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={{ color: colors.text }}>Loading pets...</Text>
                </View>
              ) : pets.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ color: colors.text, textAlign: 'center' }}>
                    No pets added yet.
                  </Text>
                  <TouchableOpacity
                    style={[styles.addPetButton, { borderColor: colors.border }]}
                    onPress={handleAddPet}
                  >
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                    <Text style={[styles.addPetText, { color: colors.primary }]}>
                      Add Your First Pet
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={pets}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        activePetId === item.id && { backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => selectPet(item)}
                    >
                      <View style={[
                        styles.dropdownPetAvatar, 
                        { backgroundColor: colors.primary + '20' }
                      ]}>
                        <Text style={[
                          styles.dropdownPetAvatarText,
                          { color: colors.primary }
                        ]}>
                          {item.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.dropdownPetInfo}>
                        <Text style={[
                          styles.dropdownPetName,
                          { color: activePetId === item.id ? colors.primary : colors.text }
                        ]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.dropdownPetType, { color: colors.text + '80' }]}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Text>
                      </View>
                      {activePetId === item.id && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: colors.border + '30' }]} />
                  )}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[styles.addPetButton, { borderColor: colors.border }]}
                      onPress={handleAddPet}
                    >
                      <Ionicons name="add-circle" size={20} color={colors.primary} />
                      <Text style={[styles.addPetText, { color: colors.primary }]}>
                        Add New Pet
                      </Text>
                    </TouchableOpacity>
                  }
                />
              )}
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  petButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  petAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  petAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  petName: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownContainer: {
    position: 'absolute',
    borderRadius: 12,
    width: 240,
    maxHeight: 300,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dropdownPetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownPetAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownPetInfo: {
    flex: 1,
  },
  dropdownPetName: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownPetType: {
    fontSize: 12,
    marginTop: 2,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPetText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  separator: {
    height: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopNavBar; 