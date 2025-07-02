import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAppColors } from '../../hooks/useAppColors';
import { AppStackParamList } from '../../types/navigation';
import OnboardingManager from '../../utils/onboardingManager';

type DebugOption = {
  title: string;
  description: string;
  onPress: () => void;
  highlight?: boolean;
};

const DebugMenu: React.FC = () => {
  const { colors } = useAppColors();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  
  const debugOptions: DebugOption[] = [
    {
      title: 'Storage Diagnostic',
      description: 'Test Supabase storage connectivity and image uploads',
      onPress: () => navigation.navigate('StorageDiagnostic'),
      highlight: true
    },
    // Add more debug options here
  ];
  
  const resetOnboarding = async () => {
    try {
      await OnboardingManager.resetOnboardingState();
      Alert.alert('Success', 'Onboarding state has been reset. Restart the app to see onboarding again.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset onboarding state');
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const state = await OnboardingManager.getOnboardingState();
      Alert.alert(
        'Onboarding Status',
        `Has Completed: ${state.hasCompleted}\nIs First Time: ${state.isFirstTime}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check onboarding status');
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.headerText, { color: colors.text }]}>Debug Menu</Text>
      <Text style={[styles.subText, { color: colors.text + 'AA' }]}>
        These tools are intended for troubleshooting purposes.
      </Text>
      
      <ScrollView style={styles.scrollView}>
        {debugOptions.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.debugOption, 
              { backgroundColor: colors.card },
              option.highlight && styles.highlightedOption
            ]}
            onPress={option.onPress}
          >
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {option.title}
            </Text>
            <Text style={[styles.optionDescription, { color: colors.text + '99' }]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.button} onPress={resetOnboarding}>
          <Text style={styles.buttonText}>Reset Onboarding</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={checkOnboardingStatus}>
          <Text style={styles.buttonText}>Check Onboarding Status</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  debugOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  highlightedOption: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});

export default DebugMenu; 