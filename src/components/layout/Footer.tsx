import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../types/navigation';
import { useAppColors } from '../../hooks/useAppColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Defining types for icon names to avoid TypeScript errors
type IconName = "home" | "home-outline" | "fitness" | "fitness-outline" | 
                "calendar" | "calendar-outline" | "restaurant" | "restaurant-outline";

// Defining screen names to match the navigation types
type ScreenName = "Home" | "Health" | "Schedule" | "Feeding";

function Footer() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { colors } = useAppColors();
  const insets = useSafeAreaInsets();
  
  // More efficient route active check with memoization
  const activeRouteName = useMemo(() => {
    try {
      const state = navigation.getState();
      if (state.routes.length > 0) {
        // Check if we're in a nested navigator (MainStack)
        const currentRoute = state.routes[state.index];
        if (currentRoute.state) {
          const childState = currentRoute.state;
          const childRouteIndex = childState.index || 0;
          const childRoute = childState.routes[childRouteIndex];
          return childRoute?.name;
        }
        return route.name;
      }
    } catch (error) {
      console.log('Error checking route:', error);
    }
    return '';
  }, [navigation, route.name]);
  
  // Create optimized navigation handlers
  const navigateToScreen = useCallback((screenName: ScreenName, params?: any) => {
    return () => {
      // Only navigate if not already on that screen
      if (activeRouteName !== screenName) {
        navigation.navigate('MainStack', { 
          screen: screenName,
          params
        });
      }
    };
  }, [navigation, activeRouteName]);
  
  // Memoize the footer style to prevent recalculations
  const footerStyle = useMemo(() => ([
    styles.footer, 
    { 
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      paddingBottom: Math.max(10, insets.bottom) 
    }
  ]), [colors.background, colors.border, insets.bottom]);
  
  // Helper to get the right props for each tab item
  const getTabProps = useCallback((routeName: ScreenName) => {
    const isActive = activeRouteName === routeName;
    return {
      name: isActive ? getFilledIconName(routeName) : getOutlineIconName(routeName),
      color: isActive ? colors.primary : "#9ca3af",
      textStyle: [
        styles.navText, 
        { color: isActive ? colors.primary : "#9ca3af" }
      ]
    };
  }, [activeRouteName, colors.primary]);
  
  // Helper functions to get icon names
  const getFilledIconName = (routeName: ScreenName): IconName => {
    switch (routeName) {
      case 'Home': return "home";
      case 'Health': return "fitness";
      case 'Schedule': return "calendar";
      case 'Feeding': return "restaurant";
      default: return "home";
    }
  };
  
  const getOutlineIconName = (routeName: ScreenName): IconName => {
    switch (routeName) {
      case 'Home': return "home-outline";
      case 'Health': return "fitness-outline";
      case 'Schedule': return "calendar-outline";
      case 'Feeding': return "restaurant-outline";
      default: return "home-outline";
    }
  };
  
  // Get tab props for better performance
  const homeProps = getTabProps('Home');
  const healthProps = getTabProps('Health');
  const scheduleProps = getTabProps('Schedule');
  const feedingProps = getTabProps('Feeding');
  
  return (
    <View style={footerStyle}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={navigateToScreen('Home')}
        activeOpacity={0.7}
      >
        <Ionicons name={homeProps.name} size={24} color={homeProps.color} />
        <Text style={homeProps.textStyle}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={navigateToScreen('Health')}
        activeOpacity={0.7}
      >
        <Ionicons name={healthProps.name} size={24} color={healthProps.color} />
        <Text style={healthProps.textStyle}>Health</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={navigateToScreen('Schedule')}
        activeOpacity={0.7}
      >
        <Ionicons name={scheduleProps.name} size={24} color={scheduleProps.color} />
        <Text style={scheduleProps.textStyle}>Schedule</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={navigateToScreen('Feeding', { refresh: false })}
        activeOpacity={0.7}
      >
        <Ionicons name={feedingProps.name} size={24} color={feedingProps.color} />
        <Text style={feedingProps.textStyle}>Feeding</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  navItem: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontWeight: '500',
    fontSize: 12,
    marginTop: 4,
  },
});

export default React.memo(Footer); 