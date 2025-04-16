import { BaseRepository } from './repository';
import { DEFAULT_QUERY_OPTIONS, QueryOptions } from '../../utils/queryOptimization';

/**
 * Extended repository class with query optimization features
 * T must be extendable with any properties as string indexable
 */
export class OptimizedRepository<T extends { id: string; [key: string]: any }> extends BaseRepository<T> {
  /**
   * Get paginated, filtered, and sorted entities
   * 
   * @param options Query options for pagination, filtering, and sorting
   * @returns Array of entities matching the criteria
   */
  async findWithOptions(options: QueryOptions = {}): Promise<T[]> {
    try {
      const { 
        limit = DEFAULT_QUERY_OPTIONS.limit!, 
        offset = DEFAULT_QUERY_OPTIONS.offset!,
        orderBy,
        orderDirection = DEFAULT_QUERY_OPTIONS.orderDirection,
        filters = {}
      } = options;
      
      // Get all entities first (in a real app, this would be a database query)
      let entities = await this.getAll();
      
      // Apply filters if provided
      if (Object.keys(filters).length > 0) {
        entities = entities.filter(entity => {
          return Object.entries(filters).every(([key, value]) => {
            // Skip undefined filters
            if (value === undefined) return true;
            
            // Handle array values (IN operator)
            if (Array.isArray(value)) {
              return value.includes(entity[key]);
            }
            
            // Handle null values
            if (value === null) {
              return entity[key] === null;
            }
            
            // Handle regular equality
            return entity[key] === value;
          });
        });
      }
      
      // Apply sorting if orderBy provided
      if (orderBy) {
        entities.sort((a, b) => {
          const valueA = a[orderBy];
          const valueB = b[orderBy];
          
          // Handle different data types
          if (typeof valueA === 'string' && typeof valueB === 'string') {
            return orderDirection === 'asc' 
              ? valueA.localeCompare(valueB)
              : valueB.localeCompare(valueA);
          }
          
          // Handle numbers and other types
          if (valueA < valueB) return orderDirection === 'asc' ? -1 : 1;
          if (valueA > valueB) return orderDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // Apply pagination
      return entities.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error in findWithOptions:', error);
      return [];
    }
  }
  
  /**
   * Count entities matching the given filters
   * 
   * @param filters Filter criteria
   * @returns Count of matching entities
   */
  async countWithFilters(filters: Record<string, any> = {}): Promise<number> {
    try {
      if (Object.keys(filters).length === 0) {
        return this.count();
      }
      
      const entities = await this.getAll();
      
      const matchingEntities = entities.filter(entity => {
        return Object.entries(filters).every(([key, value]) => {
          // Skip undefined filters
          if (value === undefined) return true;
          
          // Handle array values (IN operator)
          if (Array.isArray(value)) {
            return value.includes(entity[key]);
          }
          
          // Handle null values
          if (value === null) {
            return entity[key] === null;
          }
          
          // Handle regular equality
          return entity[key] === value;
        });
      });
      
      return matchingEntities.length;
    } catch (error) {
      console.error('Error in countWithFilters:', error);
      return 0;
    }
  }
  
  /**
   * Get entities with pagination data
   * 
   * @param options Query options
   * @returns Object containing entities and pagination metadata
   */
  async getPaginated(options: QueryOptions = {}): Promise<{
    data: T[];
    pagination: {
      total: number;
      pages: number;
      currentPage: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    try {
      const { 
        limit = DEFAULT_QUERY_OPTIONS.limit!, 
        offset = DEFAULT_QUERY_OPTIONS.offset!,
        filters = {}
      } = options;
      
      // Calculate current page
      const currentPage = Math.floor(offset / limit) + 1;
      
      // Get matching entities with options
      const data = await this.findWithOptions(options);
      
      // Count total matching entities
      const total = await this.countWithFilters(filters);
      
      // Calculate total pages
      const pages = Math.ceil(total / limit);
      
      return {
        data,
        pagination: {
          total,
          pages,
          currentPage,
          hasNext: currentPage < pages,
          hasPrevious: currentPage > 1
        }
      };
    } catch (error) {
      console.error('Error in getPaginated:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: 1,
          hasNext: false,
          hasPrevious: false
        }
      };
    }
  }
  
  /**
   * Get entities with specific fields only
   * 
   * @param fields Array of field names to include
   * @param options Query options
   * @returns Array of entities with only the specified fields
   */
  async findWithFields(fields: (keyof T)[], options: QueryOptions = {}): Promise<Partial<T>[]> {
    try {
      const entities = await this.findWithOptions(options);
      
      // Select only specified fields
      return entities.map(entity => {
        // Create a new partial object with the id field
        const result = { id: entity.id } as Partial<T>;
        
        fields.forEach(field => {
          if (field in entity) {
            result[field] = entity[field];
          }
        });
        
        return result;
      });
    } catch (error) {
      console.error('Error in findWithFields:', error);
      return [];
    }
  }
} 