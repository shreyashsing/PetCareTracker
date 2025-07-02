import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { AuthStackParamList } from '../types/navigation';
import type { ComponentType } from 'react';
import OnboardingManager from '../utils/onboardingManager';

// Import auth screens
import LoginScreen from '../pages/auth/LoginScreen';
import RegisterScreen from '../pages/auth/RegisterScreen';
import ForgotPasswordScreen from '../pages/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../pages/auth/ResetPassword';
// Import onboarding screens
import { Onboarding } from '../pages/onboarding/Onboarding';
import { OnboardingFeatures } from '../pages/onboarding/OnboardingFeatures';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStackContent = ({ showOnboarding }: { showOnboarding: boolean }) => {
  const initialRoute = showOnboarding ? "Onboarding" : "Login";
  
  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationTypeForReplace: 'push'
      }}
    >
      {/* Onboarding Screens - Only included if user needs onboarding */}
      {showOnboarding && (
        <>
          <Stack.Screen 
            name="Onboarding" 
            component={Onboarding}
            options={{
              animation: 'fade'
      }}
          />
          <Stack.Screen 
            name="OnboardingFeatures" 
            component={OnboardingFeatures}
            options={{
              animation: 'slide_from_right'
            }}
          />
        </>
      )}
      
      {/* Auth Screens */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen as ComponentType<any>}
        options={{
          animation: showOnboarding ? 'slide_from_bottom' : 'fade'
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen as ComponentType<any>}
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen as ComponentType<any>}
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen as ComponentType<any>}
        options={{
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
};

const AuthStack = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Check if user has completed onboarding or is a returning user
        const hasCompleted = await OnboardingManager.hasCompletedOnboarding();
        const isFirstTime = await OnboardingManager.isFirstTimeUser();
        
        // Show onboarding if it's a first-time user who hasn't completed onboarding
        const shouldShowOnboarding = isFirstTime && !hasCompleted;
        
        console.log('AuthStack: Onboarding check:', {
          hasCompleted,
          isFirstTime,
          shouldShowOnboarding
        });
        
        setShowOnboarding(shouldShowOnboarding);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to showing onboarding on error
        setShowOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return <AuthStackContent showOnboarding={showOnboarding} />;
};

export default AuthStack; 