import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { testFirebaseNotifications } from '../../test-firebase-notifications';

/**
 * Firebase Notification Tester Component
 * 
 * Add this component to your app to test Firebase notifications
 * from within the app UI after building.
 */
const FirebaseNotificationTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const runTest = async () => {
    setTesting(true);
    setLogs(['Starting Firebase notification test...']);
    
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.join(' ')]);
    };
    
    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      setLogs(prev => [...prev, `WARNING: ${args.join(' ')}`]);
    };
    
    try {
      await testFirebaseNotifications();
    } catch (error: any) {
      setLogs(prev => [...prev, `TEST FAILED: ${error.message || String(error)}`]);
    } finally {
      // Restore console methods
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Notification Tester</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={runTest}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Firebase Notifications'}
        </Text>
        {testing && <ActivityIndicator color="#fff" style={styles.loader} />}
      </TouchableOpacity>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
      
      <Text style={styles.note}>
        Note: For accurate testing, build the app and run it on a physical device.
        Notifications may not work properly on emulators.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#4285F4', // Google blue
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A4C2F4', // Lighter blue
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginLeft: 8,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  logText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default FirebaseNotificationTester; 