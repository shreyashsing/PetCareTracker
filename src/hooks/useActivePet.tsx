import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the context type
type ActivePetContextType = {
  activePetId: string | null;
  setActivePetId: (id: string | null) => void;
};

// Create the context with a default value
const ActivePetContext = createContext<ActivePetContextType>({
  activePetId: null,
  setActivePetId: () => {},
});

// Provider component
export const ActivePetProvider = ({ children }: { children: ReactNode }) => {
  const [activePetId, setActivePetId] = useState<string | null>(null);

  return (
    <ActivePetContext.Provider value={{ activePetId, setActivePetId }}>
      {children}
    </ActivePetContext.Provider>
  );
};

// Hook for using the ActivePet context
export const useActivePet = () => useContext(ActivePetContext); 