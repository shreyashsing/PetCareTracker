// Simplified Pet interface
export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  birthDate?: string;
  weight?: number;
  gender?: string;
  color?: string;
  microchipped?: boolean;
  microchipId?: string;
  notes?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  [key: string]: any;
}

// Pet store type
export interface PetStoreType {
  pets: Pet[];
  activePet: Pet | null;
  setPets: (pets: Pet[]) => void;
  setActivePet: (pet: Pet | null) => void;
  addPet: (pet: Pet) => void;
  updatePet: (pet: Pet) => void;
  deletePet: (petId: string) => void;
  loadPets: () => Promise<void>;
}

// Stub implementation
export const usePetStore = (): PetStoreType => {
  return {
    pets: [],
    activePet: null,
    setPets: () => {},
    setActivePet: () => {},
    addPet: () => {},
    updatePet: () => {},
    deletePet: () => {},
    loadPets: async () => {}
  };
}; 