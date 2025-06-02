import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../providers/AuthProvider';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { ThemedStatusBar } from './ThemedStatusBar';
import AddFirstPetScreen from '../pages/AddFirstPet';
import { initializeDeepLinks } from '../utils/deepLinks';
import { supabase } from '../services/supabase';
import {unifiedDatabaseManager} from "../services/db";
import type { ComponentType } from 'react';
import StorageDiagnostic from '../pages/debug/StorageDiagnostic';
import DebugMenu from '../pages/debug/DebugMenu';
import { isImagePickerActive } from '../utils/imageUpload';
import { notificationService } from '../services/notifications';

// Create a type specifically for the App root navigator
type AppRootStackParamList = {
  AuthStack: undefined;
  MainStack: undefined;
  AddFirstPet: undefined;
};

const RootStack = createNativeStackNavigator<AppRootStackParamList>();

// Safe component that handles the auth context
const NavigationContent = () => {
  const { user, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<AppRootStackParamList>>(null);
  const [needsFirstPet, setNeedsFirstPet] = useState(false);
  const [checkingPets, setCheckingPets] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-render
  const [lastRoute, setLastRoute] = useState<string | null>(null);
  
  // Check if user has any pets
  const checkUserPets = useCallback(async () => {
    if (!user) {
      setCheckingPets(false);
      return;
    }
    
    // Prevent pet check if image picker is active to avoid navigation issues
    if (isImagePickerActive) {
      console.log('[AppNavigator] Image picker active, skipping pet check');
      return;
    }
    
    setCheckingPets(true);
    try {
      // Get all pets and filter by current user's ID
      const allPets = await unifiedDatabaseManager.pets.getAll();
      const userPets = allPets.filter(pet => pet.userId === user.id);
      console.log(`[AppNavigator] Checking pets for user ${user.id}: Found ${userPets.length} pets`);
      setNeedsFirstPet(userPets.length === 0);
    } catch (error) {
      console.error('Error checking user pets:', error);
      setNeedsFirstPet(false);
    } finally {
      setCheckingPets(false);
    }
  }, [user]);
  
  // Run the pet check when user changes or refresh key changes
  useEffect(() => {
    if (!isImagePickerActive) {
    checkUserPets();
    }
  }, [checkUserPets, refreshKey, isImagePickerActive]);

  // Listen for app state changes to re-check pets when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Force re-check when app comes to foreground, but only if image picker isn't active
        console.log('[AppNavigator] App became active, checking if re-check is needed');
        
        if (isImagePickerActive) {
          console.log('[AppNavigator] Image picker active, skipping re-check');
        } else {
          console.log('[AppNavigator] Re-checking pets');
        setRefreshKey(prev => prev + 1);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Track changes in navigation state
  const handleNavigationStateChange = useCallback((state: any) => {
    if (!state) return;
    
    try {
      const currentRouteName = state.routes[state.index]?.name;
      
      if (currentRouteName && lastRoute !== currentRouteName) {
        console.log(`[AppNavigator] Navigation changed: ${lastRoute || 'none'} -> ${currentRouteName}`);
        
        // If image picker is active, prevent certain navigation changes
        if (isImagePickerActive && 
            (currentRouteName === 'MainStack' || currentRouteName === 'AuthStack')) {
          console.log('[AppNavigator] Preventing navigation during active image picker');
          
          // Don't update lastRoute to allow navigation back to correct screen
          return;
        }
        
        setLastRoute(currentRouteName);
      }
    } catch (error) {
      console.error('[AppNavigator] Error handling navigation state change:', error);
    }
  }, [lastRoute]);

  useEffect(() => {
    if (navigationRef.current) {
      // Initialize deep links handling with the navigation reference
      initializeDeepLinks(navigationRef.current);
      
      // Set navigation reference for notification service
      notificationService.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

  if (isLoading || checkingPets) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onStateChange={handleNavigationStateChange}
    >
      <ThemedStatusBar />
      <RootStack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          animationTypeForReplace: 'pop'
        }}
      >
        {user ? (
          needsFirstPet ? (
            <RootStack.Screen 
              name="AddFirstPet" 
              component={AddFirstPetScreen} 
              listeners={{
                focus: () => {
                  // When AddFirstPet screen comes into focus, re-check for pets
                  // This handles the case where a pet was just added
                  // But only if image picker isn't active
                  if (!isImagePickerActive) {
                  console.log('[AppNavigator] AddFirstPet focused, scheduling re-check');
                  // Add a slight delay to ensure the DB operation has completed
                  setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
                  } else {
                    console.log('[AppNavigator] Ignoring focus event during image picker');
                  }
                }
              }}
            />
          ) : (
            <RootStack.Screen name="MainStack" component={MainStack} />
          )
        ) : (
          <RootStack.Screen name="AuthStack" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// Main AppNavigator component now just returns the NavigationContent
const AppNavigator = () => {
  return <NavigationContent />;
};

export default AppNavigator;

// Separate navigator type for the debug stack
type DebugStackParamList = {
  DebugMenu: undefined;
  StorageDiagnostic: undefined;
};

const DebugStack = createNativeStackNavigator<DebugStackParamList>();

export const DebugStackNavigator = () => {
  return (
    <DebugStack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <DebugStack.Screen 
        name="DebugMenu" 
        component={DebugMenu} 
        options={{ title: 'Debug Menu' }} 
      />
      <DebugStack.Screen 
        name="StorageDiagnostic" 
        component={StorageDiagnostic} 
        options={{ title: 'Storage Diagnostic' }} 
      />
      {/* Other debug screens */}
    </DebugStack.Navigator>
  );
};