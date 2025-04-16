import React, { ComponentType, useEffect } from 'react';
import { useIsMounted, trackAsyncOperation, completeAsyncOperation } from '../utils/memoryLeakDetection';

/**
 * Type for components that are protected by the withMemoryLeakProtection HOC
 */
export interface WithMemoryLeakProtectionProps {
  isMounted: () => boolean;
}

/**
 * Higher-Order Component (HOC) that adds memory leak protection to a component
 * 
 * Features:
 * - Tracks component mount/unmount state
 * - Registers component in leak detection system
 * - Provides an isMounted function to check component state
 * - Ensures async operations are properly tracked
 * 
 * @param Component The component to wrap with memory leak protection
 * @param componentName Optional name for debugging (defaults to Component.displayName)
 * @returns A new component with memory leak protection
 */
export const withMemoryLeakProtection = <P extends object>(
  Component: ComponentType<P & WithMemoryLeakProtectionProps>,
  componentName?: string
) => {
  const displayName = componentName || Component.displayName || Component.name || 'AnonymousComponent';
  
  // Create a new component that forwards the ref and adds the isMounted prop
  function MemoryLeakProtectedComponent(props: P) {
    // Use the isMounted hook to track component lifecycle
    const isMounted = useIsMounted({ debug: __DEV__, componentName: displayName });
    
    // Track this component instance in the memory leak detection system
    const operationId = React.useRef<string | null>(null);
    
    useEffect(() => {
      // Register this component instance
      operationId.current = trackAsyncOperation(`Component:${displayName}`);
      
      return () => {
        // Cleanup when component unmounts
        if (operationId.current) {
          completeAsyncOperation(operationId.current);
          operationId.current = null;
        }
      };
    }, []);
    
    // Pass the isMounted function to the wrapped component
    return <Component {...props} isMounted={isMounted} />;
  }
  
  // Set display name for debugging
  MemoryLeakProtectedComponent.displayName = `withMemoryLeakProtection(${displayName})`;
  
  return MemoryLeakProtectedComponent;
};

export default withMemoryLeakProtection; 