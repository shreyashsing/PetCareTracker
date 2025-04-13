/**
 * Storage keys for different data entities
 */
export const STORAGE_KEYS = {
  PETS: 'pets',
  TASKS: 'tasks',
  MEALS: 'meals',
  FOOD_ITEMS: 'foodItems',
  MEDICATIONS: 'medications',
  HEALTH_RECORDS: 'healthRecords',
  WEIGHT_RECORDS: 'weightRecords',
  ACTIVITY_SESSIONS: 'activitySessions',
  SETTINGS: 'settings',
  USER: 'user',
  ACTIVE_PET_ID: 'activePetId',
  USERS: 'users',
  CURRENT_USER: 'currentUser',
  AUTH_TOKEN: 'authToken',
};

/**
 * Prefix for storing related items with a parent ID
 * e.g. RELATED_KEYS.PET_TASKS('123') returns 'pet_123_tasks'
 */
export const RELATED_KEYS = {
  PET_TASKS: (petId: string) => `pet_${petId}_tasks`,
  PET_MEALS: (petId: string) => `pet_${petId}_meals`,
  PET_MEDICATIONS: (petId: string) => `pet_${petId}_medications`,
  PET_HEALTH_RECORDS: (petId: string) => `pet_${petId}_health_records`,
  PET_WEIGHT_RECORDS: (petId: string) => `pet_${petId}_weight_records`,
  PET_ACTIVITY_SESSIONS: (petId: string) => `pet_${petId}_activity_sessions`,
}; 