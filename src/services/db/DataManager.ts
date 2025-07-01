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
   * Initialize the data manager and load data from local storage
   * @returns Promise that resolves when data is ready to be used
   */
  async ready(): Promise<T[]> {
    try {
      // Load data from local storage
      const data = await this.getAll();
      return data;
    } catch (error) {
      console.error(`Error initializing ${this.tableName} data:`, error);
      return [];
    }
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
    
    // Add detailed logging for the meals table
    if (this.tableName === 'meals') {
      console.log(`[MEAL DEBUG] Original entity keys: ${Object.keys(entity).join(', ')}`);
      console.log(`[MEAL DEBUG] Original petId: ${(entity as any).petId}`);
    }
    
    // Remove known problematic camelCase fields before conversion
    // Note: microchipId should NOT be removed as it's a valid field that needs conversion to microchip_id
    const problematicFields = ['adoptionDate', 'birthDate', 'createdAt'];
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
    
    // Handle petId field if it exists (for meals, tasks, etc.)
    if ((entity as any).petId && !snakeCaseEntity['pet_id']) {
      snakeCaseEntity['pet_id'] = (entity as any).petId;
      console.log(`Added missing pet_id from petId in toSupabaseFormat`);
    }
    
    // Additional logging for meals table after conversion
    if (this.tableName === 'meals') {
      console.log(`[MEAL DEBUG] After conversion, snake_case entity keys: ${Object.keys(snakeCaseEntity).join(', ')}`);
      console.log(`[MEAL DEBUG] After conversion, pet_id: ${snakeCaseEntity['pet_id']}`);
      
      // Ensure pet_id is set as a last resort for meals
      if (!snakeCaseEntity['pet_id'] && (entity as any).petId) {
        snakeCaseEntity['pet_id'] = (entity as any).petId;
        console.log(`[MEAL DEBUG] Force-added pet_id as last resort: ${snakeCaseEntity['pet_id']}`);
      }
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
        const snakeKey = camelKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (!(snakeKey in snakeCaseEntity) && snakeCaseEntity[camelKey] !== undefined) {
          // Transfer value to snake_case key if it doesn't exist
          snakeCaseEntity[snakeKey] = snakeCaseEntity[camelKey];
          console.log(`Last-minute conversion: ${camelKey} → ${snakeKey}, value: ${snakeCaseEntity[camelKey]}`);
          
          // Debug microchipId specifically
          if (camelKey === 'microchipId') {
            console.log(`🔍 MICROCHIP DEBUG - Last-minute conversion successful: ${camelKey} → ${snakeKey}, value: ${snakeCaseEntity[snakeKey]}`);
          }
        }
        // Remove the camelCase key
        delete snakeCaseEntity[camelKey];
        console.log(`Removed unexpected camelCase key: ${camelKey}`);
        
        // Debug microchipId specifically
        if (camelKey === 'microchipId') {
          console.log(`🔍 MICROCHIP DEBUG - After removal, ${snakeKey} exists: ${snakeKey in snakeCaseEntity}, value: ${snakeCaseEntity[snakeKey]}`);
        }
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
      
      // Fields that actually don't exist in the Supabase pets table schema and should be removed
      const fieldsToRemove: string[] = [
        // Only remove fields that truly don't exist in the schema
        // Most fields in the original list actually DO exist in the Supabase schema
        // The veterinarian field is handled separately above
      ];
      
      // Check for camelCase version of the fields too (in case they weren't properly converted)
      const camelCaseFieldsToCheck = [
        'adoptionDate',
        'birthDate',
        'createdAt'
      ];
      
      // Handle veterinarian data before removing it
      if ('veterinarian' in entity && entity.veterinarian) {
        const vet = entity.veterinarian;
        // Extract veterinarian fields to separate columns
        if (vet.name) entity.veterinarian_name = vet.name;
        if (vet.phone) entity.veterinarian_phone = vet.phone;
        if (vet.clinic) entity.veterinarian_clinic = vet.clinic;
        console.log('Extracted veterinarian fields:', {
          veterinarian_name: entity.veterinarian_name,
          veterinarian_phone: entity.veterinarian_phone,
          veterinarian_clinic: entity.veterinarian_clinic
        });
        // Now we can safely remove the nested object
        delete entity.veterinarian;
      }
      
      // Log all entity keys for debugging
      console.log(`Entity keys for ${this.tableName}:`, Object.keys(entity));
      
      // Log fields being sanitized for debugging
      console.log(`Sanitizing fields for Supabase (${this.tableName}):`, 
        Object.keys(entity).filter(k => fieldsToRemove.includes(k) || camelCaseFieldsToCheck.includes(k)));
      
      // Remove fields that actually don't exist in the schema (snake_case version)
      fieldsToRemove.forEach((field: string) => {
        if (field in entity) {
          console.log(`Removing field ${field} that doesn't exist in schema`);
          delete entity[field];
        }
      });
      
      // Remove fields that might cause issues with the schema (camelCase version)
      camelCaseFieldsToCheck.forEach(field => {
        if (field in entity) {
          console.log(`Removing camelCase field ${field} that should be in snake_case`);
          delete entity[field];
        }
      });
    } else if (this.tableName === 'food_items') {
      // Handle food items specific sanitization for Supabase
      console.log('Sanitizing food item for Supabase...');

      // We need to flatten the nested structures that don't exist in Supabase
      // Check if inventory object exists and extract needed fields
      if (entity.inventory) {
        // Extract fields from inventory and add them directly to the entity
        entity.total_amount = entity.inventory.totalAmount ?? entity.inventory.total_amount;
        entity.current_amount = entity.inventory.currentAmount ?? entity.inventory.current_amount;
        entity.unit = entity.inventory.unit;
        entity.daily_feeding_amount = entity.inventory.dailyFeedingAmount ?? entity.inventory.daily_feeding_amount;
        entity.daily_feeding_unit = entity.inventory.dailyFeedingUnit ?? entity.inventory.daily_feeding_unit;
        entity.days_remaining = entity.inventory.daysRemaining ?? entity.inventory.days_remaining;
        entity.low_stock_threshold = entity.inventory.lowStockThreshold ?? entity.inventory.low_stock_threshold;
        entity.reorder_alert = entity.inventory.reorderAlert ?? entity.inventory.reorder_alert;
        
        // Remove the nested inventory object
        delete entity.inventory;
        console.log('Extracted inventory fields for Supabase:', {
          total_amount: entity.total_amount,
          current_amount: entity.current_amount,
          unit: entity.unit,
          daily_feeding_amount: entity.daily_feeding_amount,
          daily_feeding_unit: entity.daily_feeding_unit
        });
      }
      
      // Check for directly set flattened fields if they don't exist yet
      if (entity.total_amount === undefined && (entity as any).totalAmount) {
        entity.total_amount = (entity as any).totalAmount;
      }
      
      if (entity.current_amount === undefined && (entity as any).currentAmount) {
        entity.current_amount = (entity as any).currentAmount;
      }
      
      if (entity.unit === undefined && (entity as any).unitType) {
        entity.unit = (entity as any).unitType;
      }
      
      if (entity.daily_feeding_amount === undefined && (entity as any).dailyFeedingAmount) {
        entity.daily_feeding_amount = (entity as any).dailyFeedingAmount;
      }
      
      if (entity.daily_feeding_unit === undefined && (entity as any).dailyFeedingUnit) {
        entity.daily_feeding_unit = (entity as any).dailyFeedingUnit;
      }
      
      // Make sure numeric values are actually numeric (not strings)
      if (entity.total_amount !== undefined) entity.total_amount = Number(entity.total_amount);
      if (entity.current_amount !== undefined) entity.current_amount = Number(entity.current_amount);
      if (entity.daily_feeding_amount !== undefined) entity.daily_feeding_amount = Number(entity.daily_feeding_amount);
      
      // Make sure string values are strings
      if (entity.unit !== undefined) entity.unit = String(entity.unit);
      if (entity.daily_feeding_unit !== undefined) entity.daily_feeding_unit = String(entity.daily_feeding_unit);
      
      // Check if purchaseDetails object exists and extract needed fields
      if (entity.purchase_details || entity.purchaseDetails) {
        const details = entity.purchase_details || entity.purchaseDetails;
        // Extract fields from purchaseDetails and add them directly to the entity
        entity.purchase_date = details.date || details.purchase_date;
        entity.expiry_date = details.expiryDate || details.expiry_date;
        
        // Remove the nested purchaseDetails object
        delete entity.purchase_details;
        delete entity.purchaseDetails;
      }
      
      // Remove other nested objects that don't exist in Supabase schema
      if (entity.nutritional_info || entity.nutritionalInfo) {
        delete entity.nutritional_info;
        delete entity.nutritionalInfo;
      }
      
      if (entity.serving_size || entity.servingSize) {
        delete entity.serving_size;
        delete entity.servingSize;
      }
      
      // Handle UI-specific fields
      delete entity.amount;
      delete entity.lowStock;
      delete entity.nextPurchase;
      
      // Handle rating which is UI-only (not in database schema)
      delete entity.rating;
      
      // Convert pet preference to is_preferred
      if (entity.pet_preference === 'favorite' || entity.petPreference === 'favorite') {
        entity.is_preferred = true;
      }
      delete entity.pet_preference;
      delete entity.petPreference;
      
      // Remove veterinarianApproved field if not in schema
      delete entity.veterinarian_approved;
      delete entity.veterinarianApproved;
      
      console.log('Food item sanitized for Supabase:', Object.keys(entity));
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
    
    // Special handling for health_records table
    if (this.tableName === 'health_records') {
      console.log('Sanitizing health record for Supabase:', entity);
      
      // Ensure pet_id is properly set from petId if it exists
      if (!entity['pet_id'] && (entity['petId'] || (entity as any).petId)) {
        entity['pet_id'] = entity['petId'] || (entity as any).petId;
        console.log(`Added missing pet_id field from petId for health_records table`);
      }
      
      // Handle follow_up_needed field explicitly
      if (entity['followUpNeeded'] !== undefined) {
        entity['follow_up_needed'] = Boolean(entity['followUpNeeded']);
        delete entity['followUpNeeded'];
        console.log(`Explicitly set follow_up_needed to ${entity['follow_up_needed']}`);
      }
      
      // Handle follow_up_date field 
      if (entity['follow_up_date']) {
        if (entity['follow_up_date'] instanceof Date) {
          entity['follow_up_date'] = formatDateForSupabase(entity['follow_up_date']);
        } else if (entity['follow_up_date'] === null) {
          entity['follow_up_date'] = null;
        }
        console.log(`Handled follow_up_date field: ${entity['follow_up_date']}`);
      } else if (entity['follow_up_needed'] === true && !entity['follow_up_date']) {
        // SAFETY: If follow-up is needed but no date is set, provide a default
        const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        entity['follow_up_date'] = formatDateForSupabase(defaultDate);
        console.log(`Applied default follow_up_date because follow_up_needed=true but date was missing`);
      }
      
      // Handle provider fields if they exist in a nested structure
      if (entity['provider']) {
        entity['provider_name'] = entity['provider'].name || '';
        entity['provider_clinic'] = entity['provider'].clinic || '';
        // Also set camelCase versions for direct database compatibility
        entity['providerName'] = entity['provider'].name || '';
        entity['providerClinic'] = entity['provider'].clinic || '';
        console.log(`Extracted provider information to provider_name=${entity['provider_name']} and provider_clinic=${entity['provider_clinic']}`);
        // Delete the provider object when sending to Supabase as it will cause schema errors
        delete entity['provider'];
        console.log('Removed nested provider object for Supabase compatibility');
      } 
      
      // Check if direct fields are provided
      if (entity['veterinarian'] || entity['clinic']) {
        entity['provider_name'] = entity['veterinarian'] || entity['provider_name'] || '';
        entity['provider_clinic'] = entity['clinic'] || entity['provider_clinic'] || '';
        // Also set camelCase versions
        entity['providerName'] = entity['veterinarian'] || entity['providerName'] || '';
        entity['providerClinic'] = entity['clinic'] || entity['providerClinic'] || '';
        console.log(`Used direct fields for provider_name=${entity['provider_name']} and provider_clinic=${entity['provider_clinic']}`);
        
        // CRITICAL: Remove the direct fields as they don't exist in the Supabase schema
        delete entity['veterinarian'];
        delete entity['clinic'];
        console.log('Removed direct fields veterinarian and clinic that do not exist in Supabase schema');
      }
      
      // Check if snake_case fields exist directly
      if (entity['provider_name'] && !entity['providerName']) {
        entity['providerName'] = entity['provider_name'];
      }
      if (entity['provider_clinic'] && !entity['providerClinic']) {
        entity['providerClinic'] = entity['provider_clinic'];
      }
      
      // Check if camelCase fields exist directly
      if (entity['providerName'] && !entity['provider_name']) {
        entity['provider_name'] = entity['providerName'];
      }
      if (entity['providerClinic'] && !entity['provider_clinic']) {
        entity['provider_clinic'] = entity['providerClinic'];
      }
      
      // Handle severity field if it exists
      if (entity['severity'] !== undefined) {
        entity['severity'] = entity['severity'];
        console.log(`Preserved severity field: ${entity['severity']}`);
      }
      
      // Handle weight field if it exists
      if (entity['weight'] !== undefined) {
        entity['weight'] = entity['weight'];
        console.log(`Preserved weight field: ${entity['weight']}`);
      }
      
      // Remove any nested fields that don't exist in the Supabase schema
      // (labResults field removed as it's not needed)
      
      console.log('Health record sanitized for Supabase:', Object.keys(entity));
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
      // Convert individual key name from camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
      // Special handling for meals table
      else if (this.tableName === 'meals') {
        // Critical fields that need to be properly converted
        if (key === 'petId') {
          result['pet_id'] = value;
          console.log(`Converting critical field petId → pet_id in meals`);
        }
        else {
          result[snakeKey] = this.deepCamelToSnake(value);
        }
      }
      // Special handling for health_records table
      else if (this.tableName === 'health_records') {
        // Critical fields that need to be properly converted
        if (key === 'petId') {
          result['pet_id'] = value;
          console.log(`Converting critical field petId → pet_id in health_records`);
        }
        else if (key === 'followUpNeeded') {
          result['follow_up_needed'] = Boolean(value);
          console.log(`Converting critical field followUpNeeded → follow_up_needed (${Boolean(value)}) in health_records`);
        }
        else if (key === 'followUpDate') {
          if (value instanceof Date) {
            result['follow_up_date'] = formatDateForSupabase(value);
          } else {
            result['follow_up_date'] = value;
          }
          console.log(`Converting critical field followUpDate → follow_up_date in health_records`);
        }
        else if (key === 'overdueDate') {
          if (value instanceof Date) {
            result['overdue_date'] = value.toISOString();
          } else {
            result['overdue_date'] = value;
          }
          console.log(`Converting critical field overdueDate → overdue_date in health_records`);
        }
        else if (key === 'provider' && typeof value === 'object') {
          // Extract provider fields instead of nesting them
          if (value?.name) {
            result['provider_name'] = value.name;
          }
          if (value?.clinic) {
            result['provider_clinic'] = value.clinic;
          }
          console.log(`Extracting provider fields in health_records`);
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
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
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
    
    // Special handling for food items - reconstruct nested objects
    if (this.tableName === 'food_items') {
      // Reconstruct inventory object for UI compatibility
      if (!camelCaseEntity.inventory) {
        console.log('Reconstructing inventory object from flattened fields:', {
          total_amount: entity['total_amount'],
          unit: entity['unit'],
          daily_feeding_amount: entity['daily_feeding_amount'],
          daily_feeding_unit: entity['daily_feeding_unit']
        });
        
        // Ensure all values are properly typed
        const totalAmount = entity['total_amount'] ? Number(entity['total_amount']) : 0;
        const currentAmount = entity['current_amount'] ? Number(entity['current_amount']) : totalAmount;
        const dailyFeedingAmount = entity['daily_feeding_amount'] ? Number(entity['daily_feeding_amount']) : 0;
        
        (camelCaseEntity as any).inventory = {
          currentAmount: currentAmount,
          totalAmount: totalAmount,
          unit: entity['unit'] || 'kg',
          dailyFeedingAmount: dailyFeedingAmount,
          dailyFeedingUnit: entity['daily_feeding_unit'] || 'g',
          daysRemaining: entity['days_remaining'] || 0,
          lowStockThreshold: entity['low_stock_threshold'] || 7,
          reorderAlert: entity['reorder_alert'] || false
        };
        
        // Also make sure the flattened fields are available in the camelCase entity
        (camelCaseEntity as any).totalAmount = totalAmount;
        (camelCaseEntity as any).currentAmount = currentAmount;
        (camelCaseEntity as any).unit = entity['unit'] || 'kg';
        (camelCaseEntity as any).dailyFeedingAmount = dailyFeedingAmount;
        (camelCaseEntity as any).dailyFeedingUnit = entity['daily_feeding_unit'] || 'g';
        
        console.log('Reconstructed inventory object for UI compatibility');
      }
      
      // Reconstruct purchaseDetails object for UI compatibility
      if (!camelCaseEntity.purchaseDetails) {
        (camelCaseEntity as any).purchaseDetails = {
          date: entity['purchase_date'] ? new Date(entity['purchase_date']) : new Date(),
          expiryDate: entity['expiry_date'] ? new Date(entity['expiry_date']) : undefined,
          price: 0,
          supplier: ''
        };
        console.log('Reconstructed purchaseDetails object for UI compatibility');
      }
      
      // Create minimal placeholder objects for other required nested objects
      if (!camelCaseEntity.nutritionalInfo) {
        (camelCaseEntity as any).nutritionalInfo = {
          calories: 0,
          protein: 0,
          fat: 0,
          fiber: 0,
          ingredients: [],
          allergens: []
        };
      }
      
      if (!camelCaseEntity.servingSize) {
        (camelCaseEntity as any).servingSize = {
          amount: 100,
          unit: 'g',
          caloriesPerServing: 0
        };
      }
      
      // Sync is_preferred to petPreference for UI consistency
      if (entity['is_preferred'] !== undefined) {
        (camelCaseEntity as any).is_preferred = entity['is_preferred'];
        if (entity['is_preferred'] === true) {
          (camelCaseEntity as any).petPreference = 'favorite';
        } else {
          (camelCaseEntity as any).petPreference = 'neutral';
        }
        console.log('Synced is_preferred to petPreference for food item');
      }
      
      // Set a default rating based on is_preferred
      if (camelCaseEntity.rating === undefined) {
        (camelCaseEntity as any).rating = (entity['is_preferred'] === true) ? 5 : 3;
      }
      
      // Set a default for veterinarianApproved
      if (camelCaseEntity.veterinarianApproved === undefined) {
        (camelCaseEntity as any).veterinarianApproved = false;
      }
      
      // Map special_notes to specialNotes if needed
      if (entity['special_notes'] && !camelCaseEntity.specialNotes) {
        (camelCaseEntity as any).specialNotes = entity['special_notes'];
      }
    }
    
    // Handle health_records table
    else if (this.tableName === 'health_records') {
      // Make sure followUpNeeded is a boolean
      if (entity['follow_up_needed'] !== undefined) {
        (camelCaseEntity as any).followUpNeeded = Boolean(entity['follow_up_needed']);
      }
      
      // Make sure followUpDate is a Date if it exists
      if (entity['follow_up_date']) {
        try {
          (camelCaseEntity as any).followUpDate = new Date(entity['follow_up_date']);
        } catch (error) {
          console.error('Error converting follow_up_date to Date:', error);
          (camelCaseEntity as any).followUpDate = null;
        }
      }
      
      // Make sure overdueDate is a Date if it exists
      if (entity['overdue_date']) {
        try {
          (camelCaseEntity as any).overdueDate = new Date(entity['overdue_date']);
        } catch (error) {
          console.error('Error converting overdue_date to Date:', error);
          (camelCaseEntity as any).overdueDate = null;
        }
      }
      
      // Make sure overdue is a boolean if it exists
      if (entity['overdue'] !== undefined) {
        (camelCaseEntity as any).overdue = Boolean(entity['overdue']);
      }
      
      // Reconstruct provider object
      if (entity['provider_name'] || entity['provider_clinic']) {
        (camelCaseEntity as any).provider = {
          name: entity['provider_name'] || '',
          clinic: entity['provider_clinic'] || '',
          specialty: '',
          phone: '',
          email: ''
        };
        
        // Also set direct fields for components that might be using them
        (camelCaseEntity as any).veterinarian = entity['provider_name'] || '';
        (camelCaseEntity as any).clinic = entity['provider_clinic'] || '';
        
        console.log(`Reconstructed provider object with name=${entity['provider_name']} and clinic=${entity['provider_clinic']}`);
      }
      
      console.log('Converted health record from Supabase format with follow up data:', {
        followUpNeeded: (camelCaseEntity as any).followUpNeeded,
        followUpDate: (camelCaseEntity as any).followUpDate
      });
    }
    
    // Handle pets table - reconstruct veterinarian object
    else if (this.tableName === 'pets') {
      // Reconstruct veterinarian object from separate fields
      if (entity['veterinarian_name'] || entity['veterinarian_phone'] || entity['veterinarian_clinic']) {
        (camelCaseEntity as any).veterinarian = {
          name: entity['veterinarian_name'] || '',
          phone: entity['veterinarian_phone'] || '',
          clinic: entity['veterinarian_clinic'] || ''
        };
        
        console.log('Reconstructed veterinarian object:', (camelCaseEntity as any).veterinarian);
      }
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
          
          // Get current user ID from session if entity doesn't have it
          if (!supabaseEntity.user_id || !fullEntity.userId) {
            try {
              // Try to get the current user ID from the Supabase session
              const { data } = await supabase.auth.getSession();
              if (data && data.session && data.session.user) {
                supabaseEntity.user_id = data.session.user.id;
                console.log(`Added missing user_id from session: ${supabaseEntity.user_id}`);
              } else {
                console.log('No session available to get user_id');
              }
            } catch (sessionError) {
              console.error('Error getting user session to add user_id:', sessionError);
            }
          }
          
          // Special logging for health records table
          if (this.tableName === 'health_records') {
            console.log(`[HEALTH RECORD CREATE] Final entity before insert:`, JSON.stringify({
              id: supabaseEntity.id,
              pet_id: supabaseEntity.pet_id,
              user_id: supabaseEntity.user_id,
              provider_name: supabaseEntity.provider_name,
              provider_clinic: supabaseEntity.provider_clinic,
              severity: supabaseEntity.severity,
              weight: supabaseEntity.weight
            }, null, 2));
          }
          
          // Special logging for meals table
          if (this.tableName === 'meals') {
            console.log(`[MEAL CREATE] Final entity before insert:`, JSON.stringify({
              id: supabaseEntity.id,
              pet_id: supabaseEntity.pet_id,
              user_id: supabaseEntity.user_id,
              type: supabaseEntity.type,
              date: supabaseEntity.date
            }, null, 2));
            
            // Final safeguard - ensure pet_id is set
            if (!supabaseEntity.pet_id && (fullEntity as any).petId) {
              supabaseEntity.pet_id = (fullEntity as any).petId;
              console.log(`[MEAL CREATE] Added missing pet_id as final safeguard: ${supabaseEntity.pet_id}`);
            }
          }
          
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
      
      // Pre-process the existing entity to fix any data type issues
      const processedCurrentEntity = this.preprocessUpdateData(currentEntity as Partial<T>);
      
      // Pre-process the update data to handle dates and other special fields
      const processedUpdate = this.preprocessUpdateData(update);
      
      // Merge the update with the processed current entity
      const updatedEntity = { ...processedCurrentEntity, ...processedUpdate };
      
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
   * Pre-process update data to handle special fields and data types
   * @param update The update data to process
   * @returns Processed update data
   */
  private preprocessUpdateData(update: Partial<T>): Partial<T> {
    const processed = { ...update } as any;
    
    // Handle pet-specific date fields
    if (this.tableName === 'pets') {
      // Handle birthDate - convert string to Date if needed, null to undefined
      if ('birthDate' in processed) {
        if (processed.birthDate === null) {
          processed.birthDate = undefined;
          console.log(`Converted birthDate null to undefined`);
        } else if (processed.birthDate && typeof processed.birthDate === 'string') {
          processed.birthDate = new Date(processed.birthDate);
          console.log(`Converted birthDate string to Date: ${processed.birthDate}`);
        }
      }
      
      // Handle adoptionDate - convert string to Date if needed, null to undefined
      if ('adoptionDate' in processed) {
        if (processed.adoptionDate === null) {
          processed.adoptionDate = undefined;
          console.log(`Converted adoptionDate null to undefined`);
        } else if (processed.adoptionDate && typeof processed.adoptionDate === 'string') {
          processed.adoptionDate = new Date(processed.adoptionDate);
          console.log(`Converted adoptionDate string to Date: ${processed.adoptionDate}`);
        }
      }
      
      // Handle weight - ensure it's a number
      if ('weight' in processed && processed.weight) {
        if (typeof processed.weight === 'string') {
          processed.weight = parseFloat(processed.weight);
          console.log(`Converted weight string to number: ${processed.weight}`);
        }
      }
      
      // Handle boolean fields
      const booleanFields = ['microchipped', 'neutered'];
      booleanFields.forEach(field => {
        if (field in processed && processed[field] !== undefined) {
          const value = processed[field];
          if (typeof value === 'string') {
            processed[field] = (value === 'true' || value === '1');
            console.log(`Converted ${field} string to boolean: ${processed[field]}`);
          }
        }
      });
      
      // Handle arrays
      if ('medicalConditions' in processed && processed.medicalConditions) {
        if (typeof processed.medicalConditions === 'string') {
          processed.medicalConditions = []; // Default to empty array if it's a string
          console.log(`Reset medicalConditions to empty array`);
        }
      }
      
      if ('allergies' in processed && processed.allergies) {
        if (typeof processed.allergies === 'string') {
          processed.allergies = []; // Default to empty array if it's a string
          console.log(`Reset allergies to empty array`);
        }
      }
    }
    
    // Handle medication-specific fields
    if (this.tableName === 'medications') {
      // Handle refillsRemaining - convert null to undefined for optional number field
      if ('refillsRemaining' in processed) {
        if (processed.refillsRemaining === null) {
          processed.refillsRemaining = undefined;
          console.log(`Converted refillsRemaining null to undefined`);
        } else if (processed.refillsRemaining !== undefined && typeof processed.refillsRemaining === 'string') {
          const parsed = parseInt(processed.refillsRemaining, 10);
          if (!isNaN(parsed)) {
            processed.refillsRemaining = parsed;
            console.log(`Converted refillsRemaining string to number: ${processed.refillsRemaining}`);
          } else {
            processed.refillsRemaining = undefined;
            console.log(`Invalid refillsRemaining string, set to undefined`);
          }
        }
      }
      
      // Handle other optional number fields that might be null
      const optionalNumberFields = ['prescriptionNumber'];
      optionalNumberFields.forEach(field => {
        if (field in processed && processed[field] === null) {
          processed[field] = undefined;
          console.log(`Converted ${field} null to undefined`);
        }
      });
      
      // Handle date fields in duration object
      if ('duration' in processed && processed.duration) {
        // Handle startDate
        if (processed.duration.startDate) {
          if (typeof processed.duration.startDate === 'string') {
            processed.duration.startDate = new Date(processed.duration.startDate);
            console.log(`Converted medication startDate string to Date: ${processed.duration.startDate}`);
          }
        }
        
        // Handle endDate
        if ('endDate' in processed.duration) {
          if (processed.duration.endDate === null) {
            processed.duration.endDate = undefined;
            console.log(`Converted medication endDate null to undefined`);
          } else if (typeof processed.duration.endDate === 'string') {
            processed.duration.endDate = new Date(processed.duration.endDate);
            console.log(`Converted medication endDate string to Date: ${processed.duration.endDate}`);
          }
        }
      }
    }
    
    return processed;
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

  /**
   * Debug function to directly query Supabase and inspect data
   * This helps troubleshoot issues with data not appearing correctly
   */
  async debugSupabaseTable(): Promise<any> {
    if (!this.syncEnabled) {
      return { error: 'Sync is not enabled for this data manager' };
    }
    
    try {
      // Check if the table exists
      const exists = await this.tableExists();
      if (!exists) {
        return { error: `Table ${this.tableName} does not exist in Supabase` };
      }
      
      // Query the table directly
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .limit(5);
      
      if (error) {
        console.error(`Error querying ${this.tableName}:`, error);
        return { error: `Failed to query table: ${error.message}` };
      }
      
      // For food_items table, log specific columns we're interested in
      if (this.tableName === 'food_items' && data && data.length > 0) {
        const simplifiedData = data.map(item => ({
          id: item.id,
          name: item.name,
          total_amount: item.total_amount,
          unit: item.unit,
          daily_feeding_amount: item.daily_feeding_amount,
          daily_feeding_unit: item.daily_feeding_unit,
          days_remaining: item.days_remaining
        }));
        
        console.log(`Direct Supabase query results for ${this.tableName}:`, simplifiedData);
        return { data: simplifiedData };
      }
      
      console.log(`Direct Supabase query results for ${this.tableName}:`, data);
      return { data };
    } catch (error) {
      console.error(`Error in debugSupabaseTable for ${this.tableName}:`, error);
      return { error: `Exception: ${error}` };
    }
  }
} 