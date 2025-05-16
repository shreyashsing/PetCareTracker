import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { STORAGE_KEYS } from '../services/db/constants';

// Define the context type
type ActivePetContextType = {
  activePetId: string | null;
  setActivePetId: (id: string | null) => void;
  syncWithStorage: () => Promise<void>;
};

// Create the context with a default value
const ActivePetContext = createContext<ActivePetContextType>({
  activePetId: null,
  setActivePetId: () => {},
  syncWithStorage: async () => {},
});

// Provider component
export const ActivePetProvider = ({ children }: { children: ReactNode }) => {
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load active pet ID from AsyncStorage on mount
  useEffect(() => {
    const loadActivePetId = async () => {
      try {
        setIsLoading(true);
        const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        console.log('[ActivePetProvider] Loaded active pet ID from storage:', storedActivePetId);
        if (storedActivePetId) {
          setActivePetId(storedActivePetId);
        }
      } catch (error) {
        console.error('[ActivePetProvider] Error loading active pet ID:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivePetId();
  }, []);

  // Update AsyncStorage when activePetId changes
  useEffect(() => {
    const updateStorage = async () => {
      if (activePetId) {
        try {
          await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, activePetId);
          console.log('[ActivePetProvider] Stored active pet ID in storage:', activePetId);
        } catch (error) {
          console.error('[ActivePetProvider] Error storing active pet ID:', error);
        }
      } else if (activePetId === null) {
        // If activePetId is explicitly null (not undefined), remove from storage
        try {
          await AsyncStorageService.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
          console.log('[ActivePetProvider] Removed active pet ID from storage');
        } catch (error) {
          console.error('[ActivePetProvider] Error removing active pet ID:', error);
        }
      }
    };

    if (!isLoading) {
      updateStorage();
    }
  }, [activePetId, isLoading]);

  // Add a function to manually sync with storage
  const syncWithStorage = useCallback(async () => {
    try {
      const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
      console.log('[ActivePetProvider] Manual sync - Storage has active pet ID:', storedActivePetId);
      
      if (storedActivePetId !== activePetId) {
        console.log('[ActivePetProvider] Syncing active pet ID from storage:', storedActivePetId);
        setActivePetId(storedActivePetId);
      }
    } catch (error) {
      console.error('[ActivePetProvider] Error during manual sync:', error);
    }
  }, [activePetId]);

  return (
    <ActivePetContext.Provider value={{ activePetId, setActivePetId, syncWithStorage }}>
      {children}
    </ActivePetContext.Provider>
  );
};

// Hook for using the ActivePet context
export const useActivePet = () => {
  const context = useContext(ActivePetContext);
  if (context === undefined) {
    throw new Error('useActivePet must be used within an ActivePetProvider');
  }
  return context;
};