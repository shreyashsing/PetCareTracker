import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Check initial connection status
    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      const offline = !(netInfo.isConnected && netInfo.isInternetReachable);
      setIsOffline(offline);
      
      if (offline) {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      }
    };
    
    checkConnection();

    // Subscribe to connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable);
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
      <Text style={styles.text}>You are offline. Some features may be limited.</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8d7da',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f5c6cb',
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 1000
  },
  text: {
    color: '#721c24',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default OfflineBanner; 