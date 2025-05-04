import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { petAssistantService } from '../services/petAssistant';

const PetAssistantStatusBar: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Check initial status
    const checkStatus = async () => {
      const netInfo = await NetInfo.fetch();
      const offline = !(netInfo.isConnected && netInfo.isInternetReachable) || petAssistantService.isOffline();
      setIsOffline(offline);
      
      if (offline) {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      }
    };
    
    checkStatus();

    // Subscribe to connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable) || petAssistantService.isOffline();
      setIsOffline(offline);
      
      Animated.timing(opacity, {
        toValue: offline ? 1 : 0,
        duration: 500,
        useNativeDriver: true
      }).start();
    });

    return () => {
      unsubscribe();
    };
  }, [opacity]);

  // Don't render anything if online
  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>
        Limited functionality mode - Using offline responses
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffeeba',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ffeeba',
    width: '100%',
    marginBottom: 8
  },
  text: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '500'
  }
});

export default PetAssistantStatusBar; 