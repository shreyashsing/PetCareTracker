import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Settings from '../pages/Settings';
import ManagePets from '../pages/ManagePets';
import DebugMenu from '../pages/debug/DebugMenu';
import StorageDiagnostic from '../pages/debug/StorageDiagnostic';

const RootStack = createNativeStackNavigator<RootStackParamList>();

const RootStackNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="Settings" component={Settings} />
      <RootStack.Screen name="ManagePets" component={ManagePets} />
      <RootStack.Screen name="DebugMenu" component={DebugMenu} />
      <RootStack.Screen name="StorageDiagnostic" component={StorageDiagnostic} />
    </RootStack.Navigator>
  );
};

export default RootStackNavigator; 