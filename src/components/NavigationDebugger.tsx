import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/AppStore';
import { useAppColors } from '../hooks/useAppColors';

interface NavigationDebuggerProps {
  visible?: boolean;
}

export const NavigationDebugger: React.FC<NavigationDebuggerProps> = ({ visible = false }) => {
  const { 
    navigationState, 
    shouldRestoreNavigation, 
    wasInBackground, 
    lastActiveTime,
    resetAppState 
  } = useAppStore();
  const { colors } = useAppColors();

  if (!visible) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Navigation Debug</Text>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Current Route:</Text>
        <Text style={[styles.value, { color: colors.primary }]}>{navigationState.currentRoute}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Should Restore:</Text>
        <Text style={[styles.value, { color: shouldRestoreNavigation ? '#4CAF50' : '#F44336' }]}>
          {shouldRestoreNavigation ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Was in Background:</Text>
        <Text style={[styles.value, { color: wasInBackground ? '#FF9800' : '#4CAF50' }]}>
          {wasInBackground ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Last Active:</Text>
        <Text style={[styles.value, { color: colors.text }]}>{formatTime(lastActiveTime)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Route History:</Text>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={2}>
          {navigationState.routeHistory.join(' → ')}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.resetButton, { backgroundColor: colors.primary }]}
        onPress={resetAppState}
      >
        <Text style={styles.resetButtonText}>Reset State</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  resetButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 