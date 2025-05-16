import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
  const navigationRef = useRef<any>(null);
  const [needsFirstPet, setNeedsFirstPet] = useState(false);
  const [checkingPets, setCheckingPets] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-render
  
  // Check if user has any pets
  const checkUserPets = useCallback(async () => {
    if (!user) {
      setCheckingPets(false);
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
    checkUserPets();
  }, [checkUserPets, refreshKey]);

  // Listen for app state changes to re-check pets when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Force re-check when app comes to foreground
        console.log('[AppNavigator] App became active, re-checking pets');
        setRefreshKey(prev => prev + 1);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (navigationRef.current) {
      // Initialize deep links handling with the navigation reference
      initializeDeepLinks(navigationRef.current);
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
    <NavigationContainer ref={navigationRef}>
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
                  console.log('[AppNavigator] AddFirstPet focused, scheduling re-check');
                  // Add a slight delay to ensure the DB operation has completed
                  setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
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