import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, SafeAreaView } from 'react-native';
import { API_URL, testApiConnection } from '../config/network';

/**
 * Debug component to display API connection information
 * Add this to any screen you want to test with:
 * 
 * import ApiDebugInfo from '../components/ApiDebugInfo';
 * ...
 * <ApiDebugInfo />
 */
const ApiDebugInfo: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('Testing...');
  const [expanded, setExpanded] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<any>(null);

  // Function to test the API connection
  const testApi = async () => {
    setTestResult('Testing connection...');
    try {
      const isConnected = await testApiConnection();
      setTestResult(isConnected ? 'Connected ✅' : 'Failed to connect ❌');

      // Try to get data from the health-check endpoint
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_URL}/health-check`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setResponseData(data);
        } else {
          setResponseData({ error: `HTTP error ${response.status}` });
        }
      } catch (error: any) {
        setResponseData({ error: error.message || 'Unknown error' });
      }
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
    }
  };

  // Test the connection when component mounts
  useEffect(() => {
    testApi();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>API Connection Debug</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Mode:</Text>
          <Text style={styles.value}>{__DEV__ ? 'Development' : 'Production'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>API URL:</Text>
          <Text style={styles.value}>{API_URL}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Connection:</Text>
          <Text style={[
            styles.value, 
            testResult.includes('✅') ? styles.success : 
            testResult.includes('❌') ? styles.error : styles.pending
          ]}>
            {testResult}
          </Text>
        </View>
        
        <Button 
          title={expanded ? "Hide Details" : "Show Details"} 
          onPress={() => setExpanded(!expanded)}
        />
        
        {expanded && responseData && (
          <ScrollView style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Response Details:</Text>
            <Text style={styles.detailsText}>
              {JSON.stringify(responseData, null, 2)}
            </Text>
          </ScrollView>
        )}
        
        <Button title="Test Again" onPress={testApi} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'transparent'
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  label: {
    fontWeight: 'bold',
    width: 100
  },
  value: {
    flex: 1,
    flexWrap: 'wrap'
  },
  success: {
    color: 'green',
    fontWeight: 'bold'
  },
  error: {
    color: 'red',
    fontWeight: 'bold'
  },
  pending: {
    color: 'orange',
    fontWeight: 'bold'
  },
  detailsContainer: {
    marginTop: 12,
    maxHeight: 200,
    backgroundColor: '#eaeaea',
    padding: 8,
    borderRadius: 4
  },
  detailsTitle: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  detailsText: {
    fontFamily: 'monospace'
  }
});

export default ApiDebugInfo; 