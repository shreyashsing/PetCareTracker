"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.petToDbFormat = petToDbFormat;
exports.dbFormatToPet = dbFormatToPet;
// Convert a Pet to a PetTable for database operations
function petToDbFormat(pet) {
    var _a, _b, _c;
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
        veterinarian_name: ((_a = pet.veterinarian) === null || _a === void 0 ? void 0 : _a.name) || null,
        veterinarian_phone: ((_b = pet.veterinarian) === null || _b === void 0 ? void 0 : _b.phone) || null,
        veterinarian_clinic: ((_c = pet.veterinarian) === null || _c === void 0 ? void 0 : _c.clinic) || null,
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
function dbFormatToPet(petTable) {
    return {
        id: petTable.id,
        userId: petTable.user_id,
        name: petTable.name,
        type: petTable.type,
        breed: petTable.breed,
        birthDate: petTable.birth_date ? new Date(petTable.birth_date) : new Date(),
        gender: petTable.gender,
        weight: petTable.weight || 0,
        weightUnit: petTable.weight_unit || 'kg',
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
        status: petTable.status || 'unknown',
        foodType: petTable.food_type || undefined,
        dailyTarget: petTable.daily_target || undefined,
        specialNotes: petTable.special_notes || undefined,
        proteinPercentage: petTable.protein_percentage || undefined,
        fatPercentage: petTable.fat_percentage || undefined,
        fiberPercentage: petTable.fiber_percentage || undefined,
    };
}
