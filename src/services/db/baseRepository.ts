import { supabase } from '../supabase';

/**
 * Base repository class for database operations
 */
export class BaseRepository<T extends object> {
  protected tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  /**
   * Get all records
   */
  async getAll(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select();
        
      if (error) throw error;
      
      return data as T[] || [];
    } catch (error) {
      console.error(`Error getting all records from ${this.tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get record by id
   */
  async getById(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data as T;
    } catch (error) {
      console.error(`Error getting record by id from ${this.tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create new record
   */
  async create(item: Partial<T>): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(item)
        .select()
        .single();
        
      if (error) throw error;
      
      return data as T;
    } catch (error) {
      console.error(`Error creating record in ${this.tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Update record
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      return data as T;
    } catch (error) {
      console.error(`Error updating record in ${this.tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete record
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting record from ${this.tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Find records by field value
   */
  async findBy(field: string, value: any): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select()
        .eq(field, value);
        
      if (error) throw error;
      
      return data as T[] || [];
    } catch (error) {
      console.error(`Error finding records in ${this.tableName} by ${field}:`, error);
      throw error;
    }
  }
} 