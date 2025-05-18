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
    // Pre-sanitize known problematic fields before conversion
    // This catches fields that cause issues in their camelCase form
    const sanitizedEntity = {...entity};
    
    // Remove known problematic camelCase fields before conversion
    const problematicFields = ['adoptionDate', 'microchipId', 'birthDate', 'createdAt'];
    for (const field of problematicFields) {
      if (field in sanitizedEntity) {
        console.log(`Pre-sanitizing problematic field: ${field}`);
        delete (sanitizedEntity as any)[field];
      }
    }
    
    // Use a deep snake case conversion instead of just top-level
    const snakeCaseEntity = this.deepCamelToSnake(sanitizedEntity);
    
    // Special handling for createdAt field - ensure it's only represented as created_at
    if ((entity as any).createdAt) {
      // Add snake_case version if missing
      if (!snakeCaseEntity['created_at']) {
      snakeCaseEntity['created_at'] = (entity as any).createdAt instanceof Date 
        ? formatDateForSupabase((entity as any).createdAt)
        : (entity as any).createdAt;
      }
      
      // Make sure to remove camelCase version if it somehow got in
      if ('createdAt' in snakeCaseEntity) {
        delete snakeCaseEntity['createdAt'];
        console.log('Removed duplicate camelCase createdAt field after conversion');
      }
    }
    
    // Handle date fields
    this.convertDatesToISOStrings(entity, snakeCaseEntity);
    
    // Handle userId field if it exists
    if (entity.userId && !snakeCaseEntity['user_id']) {
      snakeCaseEntity['user_id'] = entity.userId;
    }
    
    // Special handling for arrays (before sanitization)
    if (this.tableName === 'pets') {
      // Properly format known array fields for PostgreSQL
      const arrayFields = ['medical_conditions', 'allergies'];
      
      arrayFields.forEach(field => {
        if (field in snakeCaseEntity && Array.isArray(snakeCaseEntity[field])) {
          snakeCaseEntity[field] = this.formatSupabaseArray(snakeCaseEntity[field]);
          console.log(`Formatted ${field} as PostgreSQL array: ${snakeCaseEntity[field]}`);
        }
      });
    }
    
    // Sanitize fields that might not exist in the Supabase schema
    this.sanitizeFieldsForSupabase(snakeCaseEntity);
    
    // Final safety check - ensure no camelCase fields remain that should be snake_case
    const camelCaseFields = Object.keys(snakeCaseEntity).filter(key => 
      key.match(/[A-Z]/) && !key.startsWith('_')
    );
    
    if (camelCaseFields.length > 0) {
      console.warn(`Warning: Found ${camelCaseFields.length} camelCase keys after conversion: `, camelCaseFields);
      // Remove any remaining camelCase keys and convert them
      camelCaseFields.forEach(camelKey => {
        const snakeKey = camelToSnake(camelKey);
        if (!(snakeKey in snakeCaseEntity) && snakeCaseEntity[camelKey] !== undefined) {
          // Transfer value to snake_case key if it doesn't exist
          snakeCaseEntity[snakeKey] = snakeCaseEntity[camelKey];
          console.log(`Last-minute conversion: ${camelKey} → ${snakeKey}`);
        }
        // Remove the camelCase key
        delete snakeCaseEntity[camelKey];
        console.log(`Removed unexpected camelCase key: ${camelKey}`);
      });
    }
    
    console.log(`DataManager: Converted entity for ${this.tableName}:`, 
      JSON.stringify({
        original: Object.keys(entity),
        converted: Object.keys(snakeCaseEntity)
      }, null, 2)
    );
    
    return snakeCaseEntity;
  }
  
  /**
   * Sanitize fields that might not exist in the Supabase schema
   * This prevents errors when sending data to Supabase with fields that don't exist in the table
   * @param entity The entity to sanitize
   */
  private sanitizeFieldsForSupabase(entity: Record<string, any>): void {
    // Add table-specific field sanitization
    if (this.tableName === 'pets') {
      // Handle known schema mismatches for the pets table
      
      // Fields that might not exist in the Supabase pets table schema (snake_case format)
      const fieldsToCheck = [
        'adoption_date',   // adoptionDate in local model
        'birth_date',      // birthDate in local model
        'neutered',        // Check if this exists in schema
        'microchipped',    // Check if this exists in schema
        'microchip_id',    // Check if this exists in schema
        'veterinarian',    // This might be a nested object in local but not in Supabase
        'medical_conditions', // This might be stored differently in Supabase
        'allergies',       // This might be stored differently in Supabase
        'status'           // This might not exist in older schemas
      ];
      
      // Check for camelCase version of the fields too (in case they weren't properly converted)
      const camelCaseFieldsToCheck = [
        'adoptionDate',
        'microchipId',
        'birthDate',
        'createdAt'
      ];
      
      // Log all entity keys for debugging
      console.log(`Entity keys for ${this.tableName}:`, Object.keys(entity));
      
      // Log fields being sanitized for debugging
      console.log(`Sanitizing fields for Supabase (${this.tableName}):`, 
        Object.keys(entity).filter(k => fieldsToCheck.includes(k) || camelCaseFieldsToCheck.includes(k)));
      
      // Remove fields that might cause issues with the schema (snake_case version)
      fieldsToCheck.forEach(field => {
        if (field in entity) {
          // Special case for veterinarian field which might be a nested object
          if (field === 'veterinarian' && typeof entity[field] === 'object') {
            // Create flattened veterinarian fields that match the schema
            if (entity[field]) {
              try {
                // Try to extract and format veterinarian data if the schema supports it
                if (entity[field].name) entity['vet_name'] = entity[field].name;
                if (entity[field].phone) entity['vet_phone'] = entity[field].phone;
                if (entity[field].clinic) entity['vet_clinic'] = entity[field].clinic;
              } catch (e) {
                console.log(`Error processing veterinarian data:`, e);
              }
            }
            // Remove the nested object
            delete entity[field];
            console.log(`Transformed 'veterinarian' field to flat fields for Supabase compatibility`);
          }
          // Special handling for array fields that might be stored differently
          else if ((field === 'medical_conditions' || field === 'allergies') && Array.isArray(entity[field])) {
            // Handle arrays properly for PostgreSQL compatibility
            try {
              // Check if array is empty
              if (entity[field].length === 0) {
                // Format as PostgreSQL empty array - Use '{}' syntax instead of '[]'
                entity[field] = '{}';
                console.log(`Formatted empty ${field} array as '{}' for PostgreSQL compatibility`);
              } else {
                // For non-empty arrays, convert to proper PostgreSQL array literal format
                // Creates a string like '{value1,value2,value3}' instead of JSON '[value1,value2,value3]'
                const arrayItems = entity[field].map((item: any) => {
                  // Escape any quotes or special characters in array items
                  if (typeof item === 'string') {
                    return `"${item.replace(/"/g, '\\"')}"`;
                  }
                  return item;
                });
                entity[field] = `{${arrayItems.join(',')}}`;
                console.log(`Formatted ${field} array as PostgreSQL array literal: ${entity[field]}`);
              }
            } catch (e) {
              console.log(`Error formatting ${field} as PostgreSQL array:`, e);
              // Default to empty array if conversion fails
              entity[field] = '{}';
            }
          }
          // Standard field that might not exist in schema - remove it to prevent errors
          else {
            delete entity[field];
            console.log(`Removed '${field}' field from ${this.tableName} entity for Supabase compatibility`);
          }
        }
      });
      
      // Also check and remove camelCase versions that might have slipped through conversion
      camelCaseFieldsToCheck.forEach(field => {
        if (field in entity) {
          delete entity[field];
          console.log(`Removed camelCase field '${field}' from ${this.tableName} entity for Supabase compatibility`);
        }
      });
    }
    
    // Special handling for tasks table
    if (this.tableName === 'tasks') {
      // Ensure pet_id is properly set from petId if it exists
      if (!entity['pet_id'] && (entity['petId'] || (entity as any).petId)) {
        entity['pet_id'] = entity['petId'] || (entity as any).petId;
        console.log(`Added missing pet_id field from petId for tasks table`);
      }
      
      // Ensure schedule_info is properly handled
      if (!entity['schedule_info'] && (entity['scheduleInfo'] || (entity as any).scheduleInfo)) {
        // Create new object to avoid reference issues
        entity['schedule_info'] = {...(entity['scheduleInfo'] || (entity as any).scheduleInfo)};
        
        // Handle nested date fields
        if (entity['schedule_info'].date) {
          if (entity['schedule_info'].date instanceof Date) {
            entity['schedule_info'].date = formatDateForSupabase(entity['schedule_info'].date);
          }
        }
        
        if (entity['schedule_info'].time) {
          if (entity['schedule_info'].time instanceof Date) {
            entity['schedule_info'].time = formatDateForSupabase(entity['schedule_info'].time);
          }
        }
        
        // Handle any nested camelCase keys
        if (entity['schedule_info'].recurringPattern) {
          entity['schedule_info'].recurring_pattern = entity['schedule_info'].recurringPattern;
          delete entity['schedule_info'].recurringPattern;
        }
        
        if (entity['schedule_info'].recurringDays) {
          entity['schedule_info'].recurring_days = entity['schedule_info'].recurringDays;
          delete entity['schedule_info'].recurringDays;
        }
        
        if (entity['schedule_info'].endRecurrence) {
          entity['schedule_info'].end_recurrence = entity['schedule_info'].endRecurrence;
          delete entity['schedule_info'].endRecurrence;
        }
        
        console.log(`Added missing schedule_info field from scheduleInfo for tasks table`);
      }
      
      // Ensure reminder_settings is properly handled
      if (!entity['reminder_settings'] && (entity['reminderSettings'] || (entity as any).reminderSettings)) {
        // Create new object to avoid reference issues
        entity['reminder_settings'] = {...(entity['reminderSettings'] || (entity as any).reminderSettings)};
        
        // Handle nested camelCase keys
        if (entity['reminder_settings'].notificationType) {
          entity['reminder_settings'].notification_type = entity['reminder_settings'].notificationType;
          delete entity['reminder_settings'].notificationType;
        }
        
        console.log(`Added missing reminder_settings field from reminderSettings for tasks table`);
      }
      
      // Remove any remaining camelCase fields related to tasks
      const taskCamelCaseFields = ['petId', 'scheduleInfo', 'reminderSettings', 'completionDetails'];
      taskCamelCaseFields.forEach(field => {
        if (field in entity) {
          delete entity[field];
          console.log(`Removed camelCase field '${field}' from tasks entity`);
        }
      });
    }
        
    // Add sanitization for other tables as needed
    // if (this.tableName === 'other_table') { ... }
  }
  
  /**
   * Deep convert camelCase keys to snake_case with special handling for arrays
   */
  private deepCamelToSnake(obj: any): any {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      const processedArray = obj.map(item => this.deepCamelToSnake(item));
      
      // Special handling for known array fields that need to be formatted for PostgreSQL
      // Note: We'll still do final formatting in sanitizeFieldsForSupabase, but this helps with type detection
      if (this.tableName === 'pets' && (
          obj === (obj as any).medical_conditions || 
          obj === (obj as any).allergies ||
          obj === (obj as any).medicalConditions || 
          obj === (obj as any).allergies)
      ) {
        console.log(`Pre-processing array field for Supabase compatibility in deepCamelToSnake`);
      }
      
      return processedArray;
    }
    
    const result: Record<string, any> = {};
    
    Object.keys(obj).forEach(key => {
      const snakeKey = camelToSnake(key);
      const value = obj[key];
      
      // Special handling for task-specific fields
      if (this.tableName === 'tasks') {
        // Critical fields that need to be properly converted
        if (key === 'petId') {
          result['pet_id'] = value;
          console.log(`Converting critical field petId → pet_id in tasks`);
        }
        else if (key === 'scheduleInfo') {
          result['schedule_info'] = this.deepCamelToSnake(value);
          console.log(`Converting nested field scheduleInfo → schedule_info in tasks`);
        }
        else if (key === 'reminderSettings') {
          result['reminder_settings'] = this.deepCamelToSnake(value);
          console.log(`Converting nested field reminderSettings → reminder_settings in tasks`);
        }
        else {
          result[snakeKey] = this.deepCamelToSnake(value);
        }
      }
      // Special handling for arrays in pet fields that need PostgreSQL formatting
      else if (this.tableName === 'pets' && 
              (key === 'medicalConditions' || key === 'allergies') && 
              Array.isArray(value)) {
        // Mark that we found these arrays for later processing
        console.log(`Found array field ${key} in pet object during conversion`);
        result[snakeKey] = this.deepCamelToSnake(value);
      } 
      else {
        result[snakeKey] = this.deepCamelToSnake(value);
      }
    });
    
    return result;
  }
  
  /**
   * Convert Date objects to ISO strings in both original and snake_case objects
   */
  private convertDatesToISOStrings(original: any, converted: any, prefix: string = ''): void {
    if (original === null || typeof original !== 'object' || !converted) {
      return;
    }
    
    if (original instanceof Date) {
      // If it's directly a Date, convert the corresponding path in the converted object
      const path = prefix.length > 0 ? prefix.substring(1) : ''; // Remove leading dot
      if (path) {
        let target = converted;
        const parts = path.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) {
            // If any part of the path doesn't exist, create it
            target[parts[i]] = {};
          }
          target = target[parts[i]];
        }
        const lastPart = parts[parts.length - 1];
        target[lastPart] = formatDateForSupabase(original);
      }
      return;
    }
    
    if (Array.isArray(original)) {
      if (!Array.isArray(converted)) {
        // If converted isn't an array (but original is), make it an array
        converted = [];
      }
      for (let i = 0; i < original.length; i++) {
        if (!converted[i]) {
          converted[i] = {};
        }
        this.convertDatesToISOStrings(original[i], converted[i], `${prefix}.${i}`);
      }
      return;
    }
    
    // Process object properties
    Object.keys(original).forEach(key => {
      const value = original[key];
      const snakeKey = camelToSnake(key);
      
      // Special handling for task-specific fields
      if (this.tableName === 'tasks') {
        // Ensure nested objects exist for schedule_info and reminder_settings
        if ((key === 'scheduleInfo' || key === 'schedule_info') && typeof value === 'object') {
          if (!converted[snakeKey]) converted[snakeKey] = {};
        }
        if ((key === 'reminderSettings' || key === 'reminder_settings') && typeof value === 'object') {
          if (!converted[snakeKey]) converted[snakeKey] = {};
        }
      }
      
      if (value instanceof Date) {
        converted[snakeKey] = formatDateForSupabase(value);
      } else if (typeof value === 'object' && value !== null) {
        if (!converted[snakeKey]) {
          converted[snakeKey] = Array.isArray(value) ? [] : {};
        }
        this.convertDatesToISOStrings(value, converted[snakeKey], `${prefix}.${key}`);
      }
    });
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
          
          console.log(`DataManager: Creating entity in ${this.tableName}:`, 
            JSON.stringify({
              entityKeys: Object.keys(supabaseEntity),
              nestedKeys: supabaseEntity.schedule_info ? Object.keys(supabaseEntity.schedule_info) : 'N/A'
            }, null, 2)
          );
          
          const { data, error } = await supabase
            .from(this.tableName)
            .insert([supabaseEntity])
            .select()
            .single();
          
          if (error) {
            console.error(`Error creating ${this.tableName} in Supabase:`, error);
            console.error(`Error details - code: ${error.code}, message: ${error.message}`);
            console.error(`Entity being created:`, JSON.stringify(supabaseEntity, null, 2));
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
      // Get the current data
      const currentData = await AsyncStorageService.getItem<T[]>(this.storageKey) || [];
      
      // Find the entity by ID
      const index = currentData.findIndex(e => e.id === id);
      
      // If not found, return null
      if (index === -1) {
        return null;
      }
      
      // Get the current entity
      const currentEntity = currentData[index];
      
      // Merge the update with the current entity
      const updatedEntity = { ...currentEntity, ...update };
      
      // Validate the updated entity
      try {
        this.validateEntity(updatedEntity as T);
      } catch (validationError) {
        console.error(`Validation error updating ${this.tableName}:`, validationError);
        throw validationError;
      }
      
      // Update the entity in the local data
      currentData[index] = updatedEntity as T;
      
      // Save the updated data to AsyncStorage
      await AsyncStorageService.setItem(this.storageKey, currentData);
      
      // If sync is enabled and the table exists, update in Supabase
      if (this.syncEnabled && await this.tableExists()) {
        try {
          // Convert to Supabase format
          const supabaseEntity = this.toSupabaseFormat(updatedEntity as T);
          
          // Update in Supabase
          const { error } = await supabase
            .from(this.tableName)
            .update(supabaseEntity)
            .eq('id', id);
          
          if (error) {
            // Enhanced error reporting with more details
            console.error(`Error updating ${this.tableName} in Supabase:`, error);
            
            // Detailed error logging with the specific field causing the problem
            if (error.code === 'PGRST204' && error.message?.includes('column')) {
              // Extract column name from error message
              const match = error.message.match(/Could not find the '(.+?)' column/);
              const columnName = match ? match[1] : 'unknown column';
              
              console.error(`[SCHEMA MISMATCH] Supabase schema doesn't have the '${columnName}' column in the '${this.tableName}' table`);
              console.log(`Data keys that were sent: ${Object.keys(supabaseEntity).join(', ')}`);
              
              // Log this as a critical error that needs schema update
              console.error(`[CRITICAL] Schema mismatch detected in Supabase. The ${this.tableName} table needs to be updated to include the '${columnName}' column.`);
            } else {
              // Standard error logging for other types of errors
              console.log(`[ERROR TRACKING] REGULAR: Error updating ${this.tableName} in Supabase:`);
              console.error(`Error updating ${this.tableName} in Supabase:`, error);
            }
          }
        } catch (supabaseError) {
          // Handle specific Supabase errors here
          console.error(`Exception during Supabase update for ${this.tableName}:`, supabaseError);
          
          // Continue since we've already updated the local storage successfully
          // This ensures our app works offline or when there are Supabase issues
        }
      }
      
      return updatedEntity as T;
    } catch (error) {
      console.error(`Error in update operation for ${this.tableName}:`, error);
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

  /**
   * Format an array for Supabase/PostgreSQL compatibility
   * @param arr The array to format
   * @returns A string in PostgreSQL array format
   */
  private formatSupabaseArray(arr: any[]): string {
    if (!arr || !Array.isArray(arr)) {
      return '{}';
    }
    
    if (arr.length === 0) {
      return '{}';
    }
    
    try {
      const formattedItems = arr.map(item => {
        if (item === null || item === undefined) {
          return 'NULL';
        }
        
        if (typeof item === 'string') {
          // Escape quotes and special characters for PostgreSQL
          return `"${item.replace(/"/g, '\\"')}"`;
        }
        
        if (typeof item === 'object') {
          // For objects, convert to JSON string and escape
          return `"${JSON.stringify(item).replace(/"/g, '\\"')}"`;
        }
        
        // For numbers, booleans, etc.
        return item.toString();
      });
      
      return `{${formattedItems.join(',')}}`;
    } catch (error) {
      console.error('Error formatting array for Supabase:', error);
      return '{}';
    }
  }
} 