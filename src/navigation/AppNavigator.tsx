import React, { useRef, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { ThemedStatusBar } from './ThemedStatusBar';
import AddFirstPetScreen from '../pages/AddFirstPet';
import { initializeDeepLinks } from '../utils/deepLinks';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    if (navigationRef.current) {
      // Initialize deep links handling with the navigation reference
      initializeDeepLinks(navigationRef.current);
    }
  }, [navigationRef.current]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <ThemedStatusBar />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          animationTypeForReplace: 'pop'
        }}
      >
        {user ? (
          user.isNewUser ? (
            <Stack.Screen name="AddFirstPet" component={AddFirstPetScreen} />
          ) : (
            <Stack.Screen name="MainStack" component={MainStack} />
          )
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;