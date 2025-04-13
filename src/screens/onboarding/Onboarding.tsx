import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Button } from '../../components/Button';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Use a valid screen name that exists in RootStackParamList
type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const Onboarding: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();

  const handleNext = () => {
    // Navigate to OnboardingFeatures screen
    navigation.navigate('OnboardingFeatures');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="pets" size={120} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Welcome to PetCareTracker</Text>
        <Text style={styles.subtitle}>
          Your all-in-one solution for managing your pet's health, feeding schedule, and daily care.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={handleNext}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    width: '100%',
  },
}); 