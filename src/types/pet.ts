// Models
import { Pet as ComponentPet } from './components';

// Type definition for a Pet in Supabase database
export interface PetTable {
  id: string;
  user_id: string;
  name: string;
  type: string;
  breed: string;
  birth_date: string | null;
  gender: string;
  weight: number | null;
  weight_unit: string | null;
  microchipped: boolean | null;
  microchip_id: string | null;
  neutered: boolean | null;
  adoption_date: string | null;
  color: string | null;
  image: string | null;
  medical_conditions: string[] | null;
  allergies: string[] | null;
  veterinarian_name: string | null;
  veterinarian_phone: string | null;
  veterinarian_clinic: string | null;
  status: string | null;
  food_type: string | null;
  daily_target: string | null;
  special_notes: string | null;
  protein_percentage: number | null;
  fat_percentage: number | null;
  fiber_percentage: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Re-export the Pet from components for convenience
export type Pet = ComponentPet;

// Convert a Pet to a PetTable for database operations
export function petToDbFormat(pet: Pet): PetTable {
  return {
    id: pet.id,
    user_id: pet.userId,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    birth_date: pet.birthDate ? new Date(pet.birthDate).toISOString() : null,
    gender: pet.gender,
    weight: pet.weight || null,
    weight_unit: pet.weightUnit || null,
    microchipped: pet.microchipped || null,
    microchip_id: pet.microchipId || null,
    neutered: pet.neutered || null,
    adoption_date: pet.adoptionDate ? new Date(pet.adoptionDate).toISOString() : null,
    color: pet.color || null,
    image: pet.image || null,
    medical_conditions: pet.medicalConditions || null,
    allergies: pet.allergies || null,
    veterinarian_name: pet.veterinarian?.name || null,
    veterinarian_phone: pet.veterinarian?.phone || null,
    veterinarian_clinic: pet.veterinarian?.clinic || null,
    status: pet.status || null,
    food_type: pet.foodType || null,
    daily_target: pet.dailyTarget || null,
    special_notes: pet.specialNotes || null,
    protein_percentage: pet.proteinPercentage || null,
    fat_percentage: pet.fatPercentage || null,
    fiber_percentage: pet.fiberPercentage || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Convert a PetTable from the database to a Pet object
export function dbFormatToPet(petTable: PetTable): Pet {
  return {
    id: petTable.id,
    userId: petTable.user_id,
    name: petTable.name,
    type: petTable.type as Pet['type'],
    breed: petTable.breed,
    birthDate: petTable.birth_date ? new Date(petTable.birth_date) : new Date(),
    gender: petTable.gender as Pet['gender'],
    weight: petTable.weight || 0,
    weightUnit: petTable.weight_unit as 'kg' | 'lb' || 'kg',
    microchipped: petTable.microchipped || false,
    microchipId: petTable.microchip_id || undefined,
    neutered: petTable.neutered || false,
    adoptionDate: petTable.adoption_date ? new Date(petTable.adoption_date) : undefined,
    color: petTable.color || '',
    image: petTable.image || undefined,
    medicalConditions: petTable.medical_conditions || [],
    allergies: petTable.allergies || [],
    veterinarian: petTable.veterinarian_name ? {
      name: petTable.veterinarian_name || '',
      phone: petTable.veterinarian_phone || '',
      clinic: petTable.veterinarian_clinic || '',
    } : undefined,
    status: petTable.status as Pet['status'] || 'unknown',
    foodType: petTable.food_type || undefined,
    dailyTarget: petTable.daily_target || undefined,
    specialNotes: petTable.special_notes || undefined,
    proteinPercentage: petTable.protein_percentage || undefined,
    fatPercentage: petTable.fat_percentage || undefined,
    fiberPercentage: petTable.fiber_percentage || undefined,
  };
} 