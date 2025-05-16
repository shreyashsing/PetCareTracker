import { AsyncStorageService } from './asyncStorage';
import { supabase, snakeToCamel, camelToSnake } from '../supabase';
import { generateUUID } from '../../utils/helpers';
import { formatDateForSupabase } from '../../utils/dateUtils';
import { validateData, validationSchemas, formatValidationErrors } from '../validation';

/**
 * Base entity interface with common properties
 */
export interface BaseEntity {
  id: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Unified Data Manager that handles both local storage and Supabase
 * This provides a consistent API for data operations regardless of storage location
 */
export class DataManager<T extends BaseEntity> {
  private storageKey: string;
  private tableName: string;
  private syncEnabled: boolean;
  private userIdField: string;
  private tableExistsCache: Map<string, boolean> = new Map();

  /**
   * Create a new DataManager instance
   * @param storageKey The key used in AsyncStorage
   * @param tableName The table name in Supabase
   * @param syncEnabled Whether to sync with Supabase
   * @param userIdField The field name for the user ID (default: 'userId' for local, 'user_id' for Supabase)
   */
  constructor(
    storageKey: string, 
    tableName: string, 
    syncEnabled = true,
    userIdField = 'userId'
  ) {
    this.storageKey = storageKey;
    this.tableName = tableName;
    this.syncEnabled = syncEnabled;
    this.userIdField = userIdField;
  }

  /**
   * Check if a table exists in Supabase
   * @returns true if the table exists, false otherwise
   */
  async tableExists(): Promise<boolean> {
    // Return cached result if available
    if (this.tableExistsCache.has(this.tableName)) {
      return this.tableExistsCache.get(this.tableName) || false;
    }
    
    try {
      // Set a timeout for the operation
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Table existence check timed out for ${this.tableName}`)), ms)
      );
      
      // Try to query the table with a 5-second timeout
      const result = await Promise.race([
        supabase.from(this.tableName).select('count').limit(1),
        timeout(5000) // 5 seconds timeout
      ]).catch((error: Error) => {
        console.warn(`Timeout checking table ${this.tableName}:`, error.message);
        return { error: { code: 'TIMEOUT' } };
      });
      
      // Use type assertion to access error property
      const { error } = result as { error?: { code: string } };
      
      // If error code is 42P01, table doesn't exist
      const exists = !(error && (error.code === '42P01' || error.code === 'TIMEOUT'));
      
      // Cache the result
      this.tableExistsCache.set(this.tableName, exists);
      
      if (!exists) {
        console.warn(`Table '${this.tableName}' does not exist in Supabase. Only local storage will be used.`);
      }
      
      return exists;
    } catch (error) {
      console.error(`Error checking if table '${this.tableName}' exists:`, error);
      this.tableExistsCache.set(this.tableName, false);
      return false;
    }
  }

  /**
   * Convert an entity to the format expected by Supabase
   * @param entity The entity to convert
   * @returns The entity in Supabase format
   */
  private toSupabaseFormat(entity: T): Record<string, any> {
    // Convert camelCase to snake_case
    const snakeCaseEntity = camelToSnake(entity);
    
    // Special handling for createdAt field which might be a column in the database
    if ((entity as any).createdAt && !snakeCaseEntity['created_at']) {
      snakeCaseEntity['createdAt'] = (entity as any).createdAt instanceof Date 
        ? formatDateForSupabase((entity as any).createdAt)
        : (entity as any).createdAt;
    }
    
    // Handle date fields
    for (const key in entity) {
      const value = entity[key];
      // Use type assertion to avoid TypeScript error
      if (typeof value === 'object' && value !== null && 'getMonth' in value) {
        snakeCaseEntity[camelToSnake(key)] = formatDateForSupabase(value as Date);
      }
    }
    
    // Handle userId field if it exists
    if (entity.userId && !snakeCaseEntity['user_id']) {
      snakeCaseEntity['user_id'] = entity.userId;
    }
    
    return snakeCaseEntity;
  }

  /**
   * Convert a Supabase entity to the local format
   * @param entity The entity from Supabase
   * @returns The entity in local format
   */
  private fromSupabaseFormat(entity: Record<string, any>): T {
    // Convert snake_case to camelCase
    const camelCaseEntity = snakeToCamel<T>(entity);
    
    // Special handling for createdAt field
    if (entity['createdAt'] && !(camelCaseEntity as any).createdAt) {
      (camelCaseEntity as any).createdAt = entity['createdAt'];
    }
    
    // Handle user_id field if it exists
    if (entity['user_id'] && !camelCaseEntity.userId) {
      camelCaseEntity.userId = entity['user_id'];
    }
    
    return camelCaseEntity;
  }

  /**
   * Validate an entity using the appropriate schema
   * @param entity The entity to validate
   * @throws Error if validation fails
   */
  private validateEntity(entity: T): void {
    if (this.storageKey in validationSchemas) {
      const schema = validationSchemas[this.storageKey];
      if (schema) {
        const validation = validateData(entity, schema);
        if (!validation.valid && validation.errors) {
          const errorMessage = formatValidationErrors(validation.errors);
          console.error(`Validation failed for ${this.storageKey}:`, errorMessage);
          throw new Error(`Validation failed: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Get all entities
   * @param userId Optional user ID to filter by
   * @returns Array of entities
   */
  async getAll(userId?: string): Promise<T[]> {
    try {
      // Get from local storage first
      const localData = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      
      // Filter by userId if provided
      const filteredLocalData = userId 
        ? localData.filter(item => item[this.userIdField as keyof T] === userId)
        : localData;
      
      // If sync is disabled, return local data only
      if (!this.syncEnabled) {
        return filteredLocalData;
      }
      
      try {
        // Check if table exists before attempting to sync
        const exists = await this.tableExists();
        if (!exists) {
          return filteredLocalData;
        }
        
        // Try to get from Supabase
        let query = supabase.from(this.tableName).select('*');
        
        // Add user filter if provided
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching from Supabase ${this.tableName}:`, error);
          return filteredLocalData;
        }
        
        // Convert Supabase data to local format
        const remoteData = (data || []).map(item => this.fromSupabaseFormat(item));
        
        // Merge local and remote data, preferring remote
        const mergedData = this.mergeData(filteredLocalData, remoteData);
        
        // Update local storage with merged data
        await this.updateLocalStorage(mergedData);
        
        return mergedData;
      } catch (supabaseError) {
        console.error(`Error syncing with Supabase for ${this.tableName}:`, supabaseError);
        return filteredLocalData;
      }
    } catch (error) {
      console.error(`Error in getAll for ${this.storageKey}:`, error);
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
      // Try local storage first
      const entities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      const localEntity = entities.find(entity => entity.id === id);
      
      // If sync is disabled or entity found locally, return it
      if (!this.syncEnabled || localEntity) {
        return localEntity || null;
      }
      
      try {
        // Try to get from Supabase
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error || !data) {
          return localEntity || null;
        }
        
        // Convert to local format
        const remoteEntity = this.fromSupabaseFormat(data);
        
        // Update local storage
        if (remoteEntity) {
          const updatedEntities = entities.filter(e => e.id !== id).concat(remoteEntity);
          await AsyncStorageService.setItem(this.storageKey, updatedEntities);
        }
        
        return remoteEntity;
      } catch (supabaseError) {
        console.error(`Error getting ${this.tableName} by ID from Supabase:`, supabaseError);
        return localEntity || null;
      }
    } catch (error) {
      console.error(`Error in getById for ${this.storageKey}:`, error);
      return null;
    }
  }

  /**
   * Create a new entity
   * @param entity Entity to create (without ID)
   * @returns Created entity
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    try {
      // Generate ID if not provided
      const fullEntity = {
        ...entity,
        id: (entity as any).id || generateUUID()
      } as T;
      
      // Validate entity
      this.validateEntity(fullEntity);
      
      // Save to local storage
      const entities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      const updatedEntities = [...entities, fullEntity];
      await AsyncStorageService.setItem(this.storageKey, updatedEntities);
      
      // If sync is enabled, save to Supabase
      if (this.syncEnabled) {
        try {
          const supabaseEntity = this.toSupabaseFormat(fullEntity);
          
          const { data, error } = await supabase
            .from(this.tableName)
            .insert([supabaseEntity])
            .select()
            .single();
          
          if (error) {
            console.error(`Error creating ${this.tableName} in Supabase:`, error);
          } else if (data) {
            // Update local entity with any server-generated fields
            const updatedEntity = this.fromSupabaseFormat(data);
            const finalEntities = entities.filter(e => e.id !== fullEntity.id).concat(updatedEntity);
            await AsyncStorageService.setItem(this.storageKey, finalEntities);
            return updatedEntity;
          }
        } catch (supabaseError) {
          console.error(`Error syncing new ${this.tableName} to Supabase:`, supabaseError);
        }
      }
      
      return fullEntity;
    } catch (error) {
      console.error(`Error in create for ${this.storageKey}:`, error);
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
      // Get current entities
      const entities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      const entityIndex = entities.findIndex(entity => entity.id === id);
      
      if (entityIndex === -1) {
        return null;
      }
      
      // Update entity
      const updatedEntity = { ...entities[entityIndex], ...update } as T;
      
      // Validate updated entity
      this.validateEntity(updatedEntity);
      
      // Update local storage
      entities[entityIndex] = updatedEntity;
      await AsyncStorageService.setItem(this.storageKey, entities);
      
      // If sync is enabled, update in Supabase
      if (this.syncEnabled) {
        try {
          const supabaseEntity = this.toSupabaseFormat(updatedEntity);
          
          const { data, error } = await supabase
            .from(this.tableName)
            .update(supabaseEntity)
            .eq('id', id)
            .select()
            .single();
          
          if (error) {
            console.error(`Error updating ${this.tableName} in Supabase:`, error);
            
            // Try insert if update fails (might not exist in Supabase yet)
            if (error.code === 'PGRST116') {
              const { data: insertData, error: insertError } = await supabase
                .from(this.tableName)
                .insert([supabaseEntity])
                .select()
                .single();
              
              if (insertError) {
                console.error(`Error inserting ${this.tableName} in Supabase:`, insertError);
              } else if (insertData) {
                // Update local entity with any server-generated fields
                const serverEntity = this.fromSupabaseFormat(insertData);
                entities[entityIndex] = { ...updatedEntity, ...serverEntity };
                await AsyncStorageService.setItem(this.storageKey, entities);
                return entities[entityIndex];
              }
            }
          } else if (data) {
            // Update local entity with any server-generated fields
            const serverEntity = this.fromSupabaseFormat(data);
            entities[entityIndex] = { ...updatedEntity, ...serverEntity };
            await AsyncStorageService.setItem(this.storageKey, entities);
            return entities[entityIndex];
          }
        } catch (supabaseError) {
          console.error(`Error syncing updated ${this.tableName} to Supabase:`, supabaseError);
        }
      }
      
      return updatedEntity;
    } catch (error) {
      console.error(`Error in update for ${this.storageKey}:`, error);
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
      // Delete from local storage
      const entities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      const filteredEntities = entities.filter(entity => entity.id !== id);
      
      if (filteredEntities.length === entities.length) {
        // Entity not found locally
        return false;
      }
      
      await AsyncStorageService.setItem(this.storageKey, filteredEntities);
      
      // If sync is enabled, delete from Supabase
      if (this.syncEnabled) {
        try {
          const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);
          
          if (error) {
            console.error(`Error deleting ${this.tableName} from Supabase:`, error);
          }
        } catch (supabaseError) {
          console.error(`Error syncing deletion of ${this.tableName} to Supabase:`, supabaseError);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error in delete for ${this.storageKey}:`, error);
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
      console.error(`Error in find for ${this.storageKey}:`, error);
      return [];
    }
  }

  /**
   * Count total entities
   * @param userId Optional user ID to filter by
   * @returns Number of entities
   */
  async count(userId?: string): Promise<number> {
    try {
      const entities = await this.getAll(userId);
      return entities.length;
    } catch (error) {
      console.error(`Error in count for ${this.storageKey}:`, error);
      return 0;
    }
  }

  /**
   * Force sync all local entities to Supabase
   * @returns Result of the sync operation
   */
  async syncToSupabase(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (!this.syncEnabled) {
      return { success: false, synced: 0, errors: 0 };
    }
    
    try {
      // Check if table exists before attempting to sync
      const exists = await this.tableExists();
      if (!exists) {
        return { success: false, synced: 0, errors: 0 };
      }
      
      const entities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      let synced = 0;
      let errors = 0;
      
      for (const entity of entities) {
        try {
          const supabaseEntity = this.toSupabaseFormat(entity);
          
          // Check if entity exists in Supabase
          const { data: existingData, error: checkError } = await supabase
            .from(this.tableName)
            .select('id')
            .eq('id', entity.id)
            .single();
          
          if (checkError && checkError.code !== 'PGRST116') {
            console.error(`Error checking ${this.tableName} existence in Supabase:`, checkError);
            errors++;
            continue;
          }
          
          if (existingData) {
            // Update existing entity
            const { error: updateError } = await supabase
              .from(this.tableName)
              .update(supabaseEntity)
              .eq('id', entity.id);
            
            if (updateError) {
              console.error(`Error updating ${this.tableName} in Supabase:`, updateError);
              errors++;
            } else {
              synced++;
            }
          } else {
            // Insert new entity
            const { error: insertError } = await supabase
              .from(this.tableName)
              .insert([supabaseEntity]);
            
            if (insertError) {
              console.error(`Error inserting ${this.tableName} in Supabase:`, insertError);
              errors++;
            } else {
              synced++;
            }
          }
        } catch (entityError) {
          console.error(`Error syncing ${this.tableName} to Supabase:`, entityError);
          errors++;
        }
      }
      
      return { success: errors === 0, synced, errors };
    } catch (error) {
      console.error(`Error in syncToSupabase for ${this.storageKey}:`, error);
      return { success: false, synced: 0, errors: 1 };
    }
  }

  /**
   * Force sync all Supabase entities to local storage
   * @param userId Optional user ID to filter by
   * @returns Result of the sync operation
   */
  async syncFromSupabase(userId?: string): Promise<{ success: boolean; synced: number }> {
    if (!this.syncEnabled) {
      return { success: false, synced: 0 };
    }
    
    try {
      // Check if table exists before attempting to sync
      const exists = await this.tableExists();
      if (!exists) {
        return { success: false, synced: 0 };
      }
      
      // Get local entities
      const localEntities = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      
      // Get remote entities
      let query = supabase.from(this.tableName).select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching ${this.tableName} from Supabase:`, error);
        return { success: false, synced: 0 };
      }
      
      // Convert remote entities to local format
      const remoteEntities = (data || []).map(item => this.fromSupabaseFormat(item));
      
      // Merge local and remote entities
      const mergedEntities = this.mergeData(localEntities, remoteEntities);
      
      // Update local storage
      await AsyncStorageService.setItem(this.storageKey, mergedEntities);
      
      return { success: true, synced: remoteEntities.length };
    } catch (error) {
      console.error(`Error in syncFromSupabase for ${this.storageKey}:`, error);
      return { success: false, synced: 0 };
    }
  }

  /**
   * Merge local and remote data, preferring remote for conflicts
   * @param localData Local entities
   * @param remoteData Remote entities
   * @returns Merged entities
   */
  private mergeData(localData: T[], remoteData: T[]): T[] {
    // Create a map of local entities by ID
    const localMap = new Map<string, T>();
    localData.forEach(item => localMap.set(item.id, item));
    
    // Create a map of remote entities by ID
    const remoteMap = new Map<string, T>();
    remoteData.forEach(item => remoteMap.set(item.id, item));
    
    // Merge, preferring remote data
    const result: T[] = [];
    
    // Add all remote entities
    remoteData.forEach(item => {
      result.push(item);
    });
    
    // Add local entities that don't exist in remote
    localData.forEach(item => {
      if (!remoteMap.has(item.id)) {
        result.push(item);
      }
    });
    
    return result;
  }

  /**
   * Update local storage with the given entities
   * @param entities Entities to store
   */
  private async updateLocalStorage(entities: T[]): Promise<void> {
    try {
      await AsyncStorageService.setItem(this.storageKey, entities);
    } catch (error) {
      console.error(`Error updating local storage for ${this.storageKey}:`, error);
      throw error;
    }
  }
} 