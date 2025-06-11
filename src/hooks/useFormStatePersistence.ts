import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore } from '../store/AppStore';
import { useFocusEffect } from '@react-navigation/native';

interface UseFormStatePersistenceOptions<T> {
  routeName: string;
  formState: T;
  setFormState: (state: T) => void;
  enabled?: boolean;
  debounceMs?: number;
}

export function useFormStatePersistence<T extends Record<string, any>>({
  routeName,
  formState,
  setFormState,
  enabled = true,
  debounceMs = 1000
}: UseFormStatePersistenceOptions<T>) {
  const { 
    saveFormState, 
    getFormState, 
    clearFormState, 
    hasFormState 
  } = useAppStore();
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasRestoredRef = useRef(false);
  const initialFormStateRef = useRef<T>();
  const [wasRestored, setWasRestored] = useState(false);
  const isUnmountingRef = useRef(false);

  // Store initial form state for comparison
  useEffect(() => {
    if (!initialFormStateRef.current) {
      initialFormStateRef.current = { ...formState };
    }
  }, []);

  // Save form state with debouncing
  const debouncedSave = useCallback(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Only save if form has meaningful data (not just initial state)
      if (hasSignificantData(formState, initialFormStateRef.current)) {
        // Serialize form state, handling Date objects
        const serializedState = serializeFormState(formState);
        saveFormState(routeName, serializedState);
      }
    }, debounceMs);
  }, [formState, routeName, enabled, debounceMs, saveFormState]);

  // Save form state whenever it changes
  useEffect(() => {
    if (hasRestoredRef.current) {
      debouncedSave();
    }
  }, [formState, debouncedSave]);

  // Restore form state when component gains focus
  useFocusEffect(
    useCallback(() => {
      if (!enabled || hasRestoredRef.current || isUnmountingRef.current) return;

      const savedState = getFormState(routeName);
      if (savedState) {
        console.log(`[FormPersistence] Restoring form state for ${routeName}`);
        
        try {
          // Deserialize form state, converting date strings back to Date objects
          const deserializedState = deserializeFormState(savedState);
          setFormState({ ...formState, ...deserializedState });
          setWasRestored(true);
        } catch (error) {
          console.error(`[FormPersistence] Error deserializing form state for ${routeName}:`, error);
          // Clear corrupted state
          clearFormState(routeName);
        }
      }
      
      hasRestoredRef.current = true;
    }, [routeName, enabled, getFormState, setFormState, clearFormState])
  );

  // Clear form state when component unmounts or form is submitted
  const clearSavedState = useCallback(() => {
    clearFormState(routeName);
    setWasRestored(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [routeName, clearFormState]);

  // Force save immediately (useful for going to background)
  const forceSave = useCallback(() => {
    if (!enabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (hasSignificantData(formState, initialFormStateRef.current)) {
      const serializedState = serializeFormState(formState);
      saveFormState(routeName, serializedState);
    }
  }, [formState, routeName, enabled, saveFormState]);

  // Check if form has saved state
  const hasSavedState = useCallback(() => {
    return hasFormState(routeName);
  }, [routeName, hasFormState]);

  // Dismiss restoration notification
  const dismissRestoreNotification = useCallback(() => {
    setWasRestored(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`[AddActivity] Component unmounting, saving form state`);
      isUnmountingRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    clearSavedState,
    forceSave,
    hasSavedState,
    isRestored: hasRestoredRef.current,
    wasRestored,
    dismissRestoreNotification
  };
}

// Helper function to serialize form state, handling Date objects
function serializeFormState<T extends Record<string, any>>(formState: T): Record<string, any> {
  const serialized: Record<string, any> = {};
  
  Object.entries(formState).forEach(([key, value]) => {
    if (value instanceof Date) {
      // Store dates as ISO strings with a special marker
      serialized[key] = {
        __isDate: true,
        value: value.toISOString()
      };
    } else if (Array.isArray(value)) {
      // Handle arrays (like reminderTimes)
      serialized[key] = value;
    } else {
      // Handle all other values normally
      serialized[key] = value;
    }
  });
  
  return serialized;
}

// Helper function to deserialize form state, converting date strings back to Date objects
function deserializeFormState(savedState: Record<string, any>): Record<string, any> {
  const deserialized: Record<string, any> = {};
  
  Object.entries(savedState).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.__isDate) {
      // Convert ISO string back to Date object
      deserialized[key] = new Date(value.value);
    } else {
      // Handle all other values normally
      deserialized[key] = value;
    }
  });
  
  return deserialized;
}

// Helper function to check if form has significant data worth saving
function hasSignificantData<T extends Record<string, any>>(
  currentState: T, 
  initialState: T | undefined
): boolean {
  if (!initialState) return true;

  // Check for meaningful changes from initial state
  const significantFields = [
    // Common form fields
    'name', 'title', 'vaccineName', 'breed', 'type', 
    'dosageAmount', 'weight', 'veterinarian', 'clinic', 'notes',
    // Task form fields
    'description', 'category', 'priority',
    // Meal form fields
    'foodName', 'amount',
    // Food item form fields
    'brand', 'quantity', 'dailyFeedingQuantity',
    // Activity form fields
    'activityType', 'duration', 'distance'
  ];

  return significantFields.some(field => {
    const current = currentState[field];
    const initial = initialState[field];
    
    if (typeof current === 'string') {
      return current.trim() !== (initial || '').trim() && current.trim().length > 0;
    }
    
    return current !== initial && current !== undefined && current !== null;
  });
} 