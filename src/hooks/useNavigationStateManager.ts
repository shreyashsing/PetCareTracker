import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainerRef, NavigationState as RNNavigationState, PartialState } from '@react-navigation/native';
import { useAppStore } from '../store/AppStore';

interface UseNavigationStateManagerProps {
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
}

export const useNavigationStateManager = ({ navigationRef }: UseNavigationStateManagerProps) => {
  const {
    navigationState,
    updateCurrentRoute,
    setAppState,
    shouldRestoreNavigation,
    setShouldRestoreNavigation,
    loadStateFromStorage,
    isInitializing,
    setIsInitializing
  } = useAppStore();

  const appStateRef = useRef(AppState.currentState);
  const hasRestoredRef = useRef(false);

  // Get current route name from navigation state
  const getCurrentRouteName = useCallback((state?: RNNavigationState | PartialState<RNNavigationState>): string | undefined => {
    if (!state || !state.routes || typeof state.index !== 'number') return undefined;
    
    const route = state.routes[state.index];
    if (!route) return undefined;
    
    // If this route has nested state (like tab navigators)
    if (route.state) {
      return getCurrentRouteName(route.state as RNNavigationState);
    }
    
    return route.name;
  }, []);

  // Handle navigation state changes
  const handleNavigationStateChange = useCallback((state?: RNNavigationState) => {
    if (!state) return;

    const currentRouteName = getCurrentRouteName(state);
    if (currentRouteName) {
      console.log('[NavigationStateManager] Route changed to:', currentRouteName);
      updateCurrentRoute(currentRouteName);
    }
  }, [getCurrentRouteName, updateCurrentRoute]);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const prevAppState = appStateRef.current;
    appStateRef.current = nextAppState;
    
    console.log('[NavigationStateManager] App state changed:', prevAppState, '->', nextAppState);
    setAppState(nextAppState);
  }, [setAppState]);

  // Restore navigation state when app becomes active
  const restoreNavigationState = useCallback(async () => {
    if (!navigationRef.current || hasRestoredRef.current) return;

    console.log('[NavigationStateManager] Attempting to restore navigation state...');
    
    try {
      // Load the latest state from storage
      await loadStateFromStorage();
      
      // Use the current state from the hook instead of trying to access getState
      if (shouldRestoreNavigation && navigationState.currentRoute !== 'Home') {
        const targetRoute = navigationState.currentRoute;
        const routeParams = navigationState.currentParams;
        
        console.log('[NavigationStateManager] Restoring to route:', targetRoute, routeParams);
        
        // Navigate to the restored route
        if (navigationRef.current.isReady()) {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            try {
              if (routeParams) {
                navigationRef.current?.navigate(targetRoute as any, routeParams);
              } else {
                navigationRef.current?.navigate(targetRoute as any);
              }
              console.log('[NavigationStateManager] Successfully restored navigation state');
            } catch (error) {
              console.error('[NavigationStateManager] Error navigating to restored route:', error);
              // Fallback to home if navigation fails
              navigationRef.current?.navigate('Home' as any);
            }
          }, 100);
        }
        
        // Mark restoration as complete
        setShouldRestoreNavigation(false);
        hasRestoredRef.current = true;
      }
    } catch (error) {
      console.error('[NavigationStateManager] Error restoring navigation state:', error);
    }
  }, [navigationRef, loadStateFromStorage, setShouldRestoreNavigation]);

  // Initialize navigation state management
  useEffect(() => {
    console.log('[NavigationStateManager] Initializing navigation state management');
    
    // Load saved state on app start
    const initializeState = async () => {
      if (isInitializing) {
        await loadStateFromStorage();
        setIsInitializing(false);
      }
    };
    
    initializeState();
  }, [loadStateFromStorage, isInitializing, setIsInitializing]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Handle navigation restoration when app becomes active
  useEffect(() => {
    if (shouldRestoreNavigation && AppState.currentState === 'active') {
      restoreNavigationState();
    }
  }, [shouldRestoreNavigation, restoreNavigationState]);

  // Reset restoration flag when navigation is ready
  useEffect(() => {
    if (navigationRef.current?.isReady()) {
      const currentRouteName = getCurrentRouteName(navigationRef.current.getRootState());
      if (currentRouteName) {
        updateCurrentRoute(currentRouteName);
      }
    }
  }, [navigationRef, getCurrentRouteName, updateCurrentRoute]);

  return {
    handleNavigationStateChange,
    currentRoute: navigationState.currentRoute,
    routeHistory: navigationState.routeHistory,
    shouldRestoreNavigation,
  };
}; 