import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import type { ComponentType } from 'react';

// Import auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
// Import onboarding screens
import { Onboarding } from '../screens/onboarding/Onboarding';
import { OnboardingFeatures } from '../screens/onboarding/OnboardingFeatures';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen as ComponentType<any>} />
      <Stack.Screen name="Register" component={RegisterScreen as ComponentType<any>} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen as ComponentType<any>} />
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="OnboardingFeatures" component={OnboardingFeatures} />
    </Stack.Navigator>
  );
};

export default AuthStack; 