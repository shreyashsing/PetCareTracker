import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Default loading component shown while lazy-loaded screens are being loaded
 */
const DefaultLoadingComponent = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4CAF50" />
  </View>
);

/**
 * Type for the lazy loading options
 */
type LazyLoadOptions = {
  /** Minimum delay before showing the component (prevents flashes) */
  minDelay?: number;
  /** Loading component to show while the screen is loading */
  LoadingComponent?: React.ComponentType;
  /** Fallback component to show if the screen fails to load */
  ErrorComponent?: React.ComponentType<{error: Error; retry: () => void}>;
};

/**
 * Type for the factory function that creates a lazy loaded component
 */
type LazyScreenFactory = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyLoadOptions
) => React.ComponentType<React.ComponentProps<T>>;

/**
 * Creates a lazily loaded screen component with suspense handling
 * 
 * @param importFn Function that imports the screen component
 * @param options Options for lazy loading behavior
 * @returns Lazy loaded component with suspense fallback
 */
export const lazyScreen: LazyScreenFactory = (importFn, options = {}) => {
  // Apply min delay if specified
  const importWithDelay = async () => {
    const [module] = await Promise.all([
      importFn(),
      options.minDelay 
        ? new Promise(resolve => setTimeout(resolve, options.minDelay)) 
        : Promise.resolve()
    ]);
    return module;
  };

  // Create the lazy component
  const LazyComponent = lazy(importWithDelay);
  
  // Create the wrapper component that handles suspense
  return (props) => (
    <Suspense fallback={
      options.LoadingComponent 
        ? <options.LoadingComponent /> 
        : <DefaultLoadingComponent />
    }>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Factory function to create preloaders for screens
 */
export const createScreenPreloader = (screens: Record<string, () => Promise<any>>) => {
  // Track which screens are already preloaded
  const preloadedScreens = new Set<string>();
  
  /**
   * Preload a specific screen by name
   */
  const preloadScreen = (screenName: string): Promise<void> => {
    if (preloadedScreens.has(screenName) || !screens[screenName]) {
      return Promise.resolve();
    }
    
    return screens[screenName]()
      .then(() => {
        preloadedScreens.add(screenName);
      })
      .catch(error => {
        console.error(`Error preloading screen ${screenName}:`, error);
      });
  };

  /**
   * Preload a list of screens
   */
  const preloadScreens = (screenNames: string[]): Promise<void[]> => {
    return Promise.all(screenNames.map(preloadScreen));
  };

  return {
    preloadScreen,
    preloadScreens
  };
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  }
}); 