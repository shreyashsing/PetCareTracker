import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { useNavigation } from '@react-navigation/native';

type ScreenErrorBoundaryProps = {
  children: React.ReactNode;
  screenName: string;
};

// Define a type for the fallback component props to match what ErrorBoundary expects
type FallbackProps = {
  error: Error | null;
  resetError: () => void;
};

/**
 * A specialized error boundary for screens that provides
 * navigation options to go back or retry when an error occurs
 */
export const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({ 
  children, 
  screenName 
}) => {
  const navigation = useNavigation();

  // Custom fallback UI for screen errors
  const ScreenErrorFallback: React.FC<FallbackProps> = ({ error, resetError }) => {
    const handleGoBack = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Screen Error</Text>
        
        <Text style={styles.screenName}>
          {screenName}
        </Text>
        
        <Text style={styles.message}>
          {error?.message || 'An unexpected error occurred on this screen'}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={resetError}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoBack}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Track screen errors
  const handleScreenError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error with the screen name for better tracking
    console.error(`Error in screen "${screenName}":`, error, errorInfo);
    
    // In production, you would send this to your error tracking service
    // Example:
    // if (__DEV__ === false) {
    //   Sentry.captureException(error, {
    //     extra: {
    //       componentStack: errorInfo.componentStack,
    //       screen: screenName
    //     }
    //   });
    // }
  };

  // Render the error boundary with our custom fallback
  return (
    <ErrorBoundary
      onError={handleScreenError}
      resetOnPropsChange={true}
      fallback={<ScreenErrorFallback error={null} resetError={() => {}} />}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Higher-order component that wraps a screen component with ScreenErrorBoundary
 */
export function withScreenErrorBoundary<P extends object>(
  ScreenComponent: React.ComponentType<P>,
  screenName?: string
): React.FC<P> {
  const displayName = 
    screenName || 
    ScreenComponent.displayName || 
    ScreenComponent.name || 
    'UnknownScreen';
  
  const WrappedComponent = (props: P) => (
    <ScreenErrorBoundary screenName={displayName}>
      <ScreenComponent {...props} />
    </ScreenErrorBoundary>
  );
  
  WrappedComponent.displayName = `withScreenErrorBoundary(${displayName})`;
  
  return WrappedComponent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e53935',
    marginBottom: 10
  },
  screenName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 20
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%'
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8
  },
  primaryButton: {
    backgroundColor: '#2196F3'
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16
  }
}); 