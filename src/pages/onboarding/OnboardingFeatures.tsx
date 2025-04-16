import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

interface Feature {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

type OnboardingFeaturesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const features: Feature[] = [
  {
    title: 'Health Records',
    description: 'Track vaccinations, medications, and vet visits',
    icon: 'healing',
  },
  {
    title: 'Feeding Schedule',
    description: 'Manage meal times and food inventory',
    icon: 'pets',
  },
  {
    title: 'Activity Tracking',
    description: 'Monitor exercise and daily activities',
    icon: 'directions-run',
  },
  {
    title: 'Reminders',
    description: 'Get notified about important pet care tasks',
    icon: 'notifications',
  },
];

export const OnboardingFeatures: React.FC = () => {
  const navigation = useNavigation<OnboardingFeaturesNavigationProp>();

  const handleComplete = () => {
    navigation.navigate('AddFirstPet');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PetCare</Text>
      <Text style={styles.subtitle}>Your all-in-one pet care companion</Text>
      
      <ScrollView style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <MaterialIcons name={feature.icon} size={32} color="#4CAF50" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Get Started"
          onPress={handleComplete}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    color: '#666666',
  },
  featuresContainer: {
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    width: '100%',
  },
}); 