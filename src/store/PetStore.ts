// import create from 'zustand';
import { createWithEqualityFn } from 'zustand/traditional';
import {unifiedDatabaseManager} from "../services/db";
import { supabase } from '../services/supabase';
import { snakeToCamel } from '../services/supabase';
import { createPetForSupabase, loadPetsForUser, syncPetsWithSupabase } from '../utils/petSync';

// Use the Pet type from components.ts
import { Pet } from '../types/components';

// Pet store type
export interface PetStoreType {
  pets: Pet[];
  activePet: Pet | null;
  isLoading: boolean;
  setPets: (pets: Pet[]) => void;
  setActivePet: (pet: Pet | null) => void;
  addPet: (pet: Pet) => void;
  updatePet: (pet: Pet) => void;
  deletePet: (petId: string) => void;
  loadPets: (userId?: string) => Promise<void>;
  syncPets: (userId: string) => Promise<void>;
}

// Create a proper Zustand store
export const usePetStore = createWithEqualityFn<PetStoreType>((set, get) => ({
  pets: [],
  activePet: null,
  isLoading: false,
  
  setPets: (pets: Pet[]) => set({ pets }),
  
  setActivePet: (pet: Pet | null) => set({ activePet: pet }),
  
  addPet: (pet: Pet) => {
    const { pets } = get();
    set({ pets: [...pets, pet] });
  },
  
  updatePet: (pet: Pet) => {
    const { pets } = get();
    const updatedPets = pets.map((p: Pet) => p.id === pet.id ? pet : p);
    set({ pets: updatedPets });
    
    // If this is the active pet, update it too
    const { activePet } = get();
    if (activePet && activePet.id === pet.id) {
      set({ activePet: pet });
    }
  },
  
  deletePet: (petId: string) => {
    const { pets, activePet } = get();
    set({ 
      pets: pets.filter((p: Pet) => p.id !== petId),
      activePet: activePet?.id === petId ? null : activePet
    });
  },
  
  loadPets: async (userId?: string) => {
    try {
      set({ isLoading: true });
      
      // Get the current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data } = await supabase.auth.getUser();
        currentUserId = data?.user?.id;
      }
      
      if (!currentUserId) {
        console.error('No authenticated user found');
        set({ pets: [], isLoading: false });
        return;
      }
      
      // Use our utility function to load pets
      const petData = await loadPetsForUser(currentUserId);
      
      // Convert PetData to Pet with all required properties
      const pets = petData.map(p => ({
        ...p,
        // Ensure required properties are set with defaults if missing
        type: p.type as Pet['type'] || 'other',
        // Ensure birthDate is a valid Date object
        birthDate: p.birthDate ? new Date(p.birthDate) : new Date(),
        gender: p.gender as Pet['gender'] || 'unknown',
        weight: p.weight || 0,
        weightUnit: 'kg',
        microchipped: p.microchipped || false,
        microchipId: p.microchipId || '',
        neutered: false,
        color: p.color || '',
        medicalConditions: [],
        allergies: [],
        status: 'healthy' as Pet['status'],
        // Ensure adoptionDate is a valid Date object or undefined
        adoptionDate: p.adoptionDate ? new Date(p.adoptionDate) : new Date(),
        // Ensure userId is always a string
        userId: p.userId || currentUserId || ''
      })) as Pet[];
      
      set({ pets, isLoading: false });
      
    } catch (error) {
      console.error('Error loading pets:', error);
      set({ isLoading: false });
    }
  },
  
  syncPets: async (userId: string) => {
    try {
      set({ isLoading: true });
      
      if (!userId) {
        console.error('No user ID provided for pet sync');
        set({ isLoading: false });
        return;
      }
      
      // Use our utility function to sync pets
      await syncPetsWithSupabase(userId);
      
      // Reload pets after sync
      const petData = await loadPetsForUser(userId);
      
      // Convert PetData to Pet with all required properties
      const pets = petData.map(p => ({
        ...p,
        // Ensure required properties are set with defaults if missing
        type: p.type as Pet['type'] || 'other',
        // Ensure birthDate is a valid Date object
        birthDate: p.birthDate ? new Date(p.birthDate) : new Date(),
        gender: p.gender as Pet['gender'] || 'unknown',
        weight: p.weight || 0,
        weightUnit: 'kg',
        microchipped: p.microchipped || false,
        microchipId: p.microchipId || '',
        neutered: false,
        color: p.color || '',
        medicalConditions: [],
        allergies: [],
        status: 'healthy' as Pet['status'],
        // Ensure adoptionDate is a valid Date object or undefined
        adoptionDate: p.adoptionDate ? new Date(p.adoptionDate) : new Date(),
        // Ensure userId is always a string
        userId: p.userId || userId || ''
      })) as Pet[];
      
      set({ pets, isLoading: false });
      
    } catch (error) {
      console.error('Error synchronizing pets:', error);
      set({ isLoading: false });
    }
  }
}), Object.is); 