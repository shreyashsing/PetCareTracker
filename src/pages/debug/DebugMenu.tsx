import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAppColors } from '../../hooks/useAppColors';
import { RootStackParamList } from '../../types/navigation';

type DebugOption = {
  title: string;
  description: string;
  onPress: () => void;
  highlight?: boolean;
};

const DebugMenu: React.FC = () => {
  const { colors } = useAppColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const debugOptions: DebugOption[] = [
    {
      title: 'Storage Diagnostic',
      description: 'Test Supabase storage connectivity and image uploads',
      onPress: () => navigation.navigate('StorageDiagnostic'),
      highlight: true
    },
    // Add more debug options here
  ];
  
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
});

export default DebugMenu; 