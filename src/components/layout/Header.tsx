import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

export default function Header() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>Pet Care Tracker</Text>
      <View style={styles.navContainer}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Health')}
        >
          <Text style={styles.navText}>Health</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Schedule')}
        >
          <Text style={styles.navText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Feeding', {})}
        >
          <Text style={styles.navText}>Feeding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logo: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navItem: {
    paddingVertical: 6,
  },
  navText: {
    color: 'white',
    fontWeight: '500',
  },
}); 