import { AsyncStorageService } from './asyncStorage';

/**
 * Base repository class for managing entities in AsyncStorage
 */
export class BaseRepository<T extends { id: string }> {
  constructor(private storageKey: string) {}

  /**
   * Get all entities
   * @returns Array of entities
   */
  async getAll(): Promise<T[]> {
    try {
      const data = await AsyncStorageService.getItem<T[]>(this.storageKey);
      return data || [];
    } catch (error) {
      console.error(`Error getting all ${this.storageKey}:`, error);
      return [];
    }
  }

  /**
   * Get entity by ID
   * @param id Entity ID
   * @returns Entity if found, null otherwise
   */
  async getById(id: string): Promise<T | null> {
    try {
      const entities = await this.getAll();
      return entities.find(entity => entity.id === id) || null;
    } catch (error) {
      console.error(`Error getting ${this.storageKey} by id:`, error);
      return null;
    }
  }

  /**
   * Create a new entity
   * @param entity Entity to create
   * @returns Created entity
   */
  async create(entity: T): Promise<T> {
    try {
      console.log('CREATE DEBUG: Creating entity in', this.storageKey);
      console.log('CREATE DEBUG: Entity data:', JSON.stringify(entity, null, 2));
      
      const entities = await this.getAll();
      
      // Check if entity with this ID already exists
      const exists = entities.some(e => e.id === entity.id);
      if (exists) {
        console.error(`CREATE DEBUG: Entity with id ${entity.id} already exists`);
        throw new Error(`${this.storageKey} with id ${entity.id} already exists`);
      }
      
      const updatedEntities = [...entities, entity];
      await AsyncStorageService.setItem(this.storageKey, updatedEntities);
      
      // Verify save
      const verifyEntities = await this.getAll();
      const savedEntity = verifyEntities.find(e => e.id === entity.id);
      console.log('CREATE DEBUG: Entity saved successfully?', !!savedEntity);
      if (savedEntity) {
        // Check if type property exists and shows expected vaccination value
        if ('type' in entity && entity.type === 'vaccination') {
          console.log('CREATE DEBUG: This is a vaccination record');
          console.log('CREATE DEBUG: Saved entity type:', (savedEntity as any).type);
        }
      }
      
      return entity;
    } catch (error) {
      console.error(`Error creating ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing entity
   * @param id Entity ID
   * @param update Updates to apply
   * @returns Updated entity if found, null otherwise
   */
  async update(id: string, update: Partial<T>): Promise<T | null> {
    try {
      const entities = await this.getAll();
      const entityIndex = entities.findIndex(entity => entity.id === id);
      
      if (entityIndex === -1) {
        return null;
      }
      
      const updatedEntity = { ...entities[entityIndex], ...update } as T;
      entities[entityIndex] = updatedEntity;
      
      await AsyncStorageService.setItem(this.storageKey, entities);
      return updatedEntity;
    } catch (error) {
      console.error(`Error updating ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete an entity by ID
   * @param id Entity ID
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      const entities = await this.getAll();
      const filteredEntities = entities.filter(entity => entity.id !== id);
      
      if (filteredEntities.length === entities.length) {
        // Entity not found
        return false;
      }
      
      await AsyncStorageService.setItem(this.storageKey, filteredEntities);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete all entities
   */
  async deleteAll(): Promise<void> {
    try {
      await AsyncStorageService.setItem(this.storageKey, []);
    } catch (error) {
      console.error(`Error deleting all ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Count total entities
   * @returns Number of entities
   */
  async count(): Promise<number> {
    try {
      const entities = await this.getAll();
      return entities.length;
    } catch (error) {
      console.error(`Error counting ${this.storageKey}:`, error);
      return 0;
    }
  }

  /**
   * Check if an entity with the given ID exists
   * @param id Entity ID
   * @returns true if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.getById(id);
      return entity !== null;
    } catch (error) {
      console.error(`Error checking if ${this.storageKey} exists:`, error);
      return false;
    }
  }

  /**
   * Create multiple entities at once
   * @param entities Array of entities to create
   * @returns Created entities
   */
  async createMany(entities: T[]): Promise<T[]> {
    try {
      const existingEntities = await this.getAll();
      
      // Check for duplicates
      const existingIds = existingEntities.map(e => e.id);
      const duplicates = entities.filter(e => existingIds.includes(e.id));
      
      if (duplicates.length > 0) {
        throw new Error(`Some ${this.storageKey} already exist: ${duplicates.map(e => e.id).join(', ')}`);
      }
      
      const updatedEntities = [...existingEntities, ...entities];
      await AsyncStorageService.setItem(this.storageKey, updatedEntities);
      return entities;
    } catch (error) {
      console.error(`Error creating multiple ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Find entities that match the given predicate
   * @param predicate Function that returns true for entities to include
   * @returns Array of matching entities
   */
  async find(predicate: (entity: T) => boolean): Promise<T[]> {
    try {
      const entities = await this.getAll();
      return entities.filter(predicate);
    } catch (error) {
      console.error(`Error finding ${this.storageKey}:`, error);
      return [];
    }
  }
} 