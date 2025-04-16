import { OptimizedRepository } from './optimizedRepository';
import { cacheManager } from '../../utils/cacheManager';
import { QueryOptions } from '../../utils/queryOptimization';

/**
 * Repository with caching capabilities
 */
export class CachedRepository<T extends { id: string; [key: string]: any }> extends OptimizedRepository<T> {
  // Default TTLs
  private readonly TTL_SHORT = 60 * 1000; // 1 minute
  private readonly TTL_MEDIUM = 5 * 60 * 1000; // 5 minutes
  private readonly TTL_LONG = 30 * 60 * 1000; // 30 minutes
  
  // Cache key prefixes
  private CACHE_KEY_ALL: string;
  private CACHE_KEY_ID_PREFIX: string;
  private CACHE_KEY_FIND_PREFIX: string;
  private CACHE_KEY_COUNT: string;
  
  /**
   * Create a new CachedRepository instance
   * 
   * @param entityName Name of the entity for cache keys
   * @param storageKey Storage key for the repository
   */
  constructor(private readonly entityName: string, storageKey: string) {
    super(storageKey);
    // Initialize cache keys after super() is called
    this.CACHE_KEY_ALL = `repo:${entityName}:all`;
    this.CACHE_KEY_ID_PREFIX = `repo:${entityName}:id:`;
    this.CACHE_KEY_FIND_PREFIX = `repo:${entityName}:find:`;
    this.CACHE_KEY_COUNT = `repo:${entityName}:count`;
  }
  
  /**
   * Generate a cache key for findWithOptions
   */
  private generateFindCacheKey(options: QueryOptions): string {
    return `${this.CACHE_KEY_FIND_PREFIX}${JSON.stringify(options)}`;
  }
  
  /**
   * Invalidate all cache entries for this repository
   */
  private async invalidateCache(): Promise<void> {
    await cacheManager.invalidateByPrefix(`repo:${this.entityName}:`);
  }
  
  /**
   * Get all entities with caching
   */
  async getAll(): Promise<T[]> {
    // Try to get from cache
    const cached = await cacheManager.get<T[]>(this.CACHE_KEY_ALL);
    if (cached !== null) {
      return cached;
    }
    
    // Get from storage
    const entities = await super.getAll();
    
    // Cache the result
    await cacheManager.set(this.CACHE_KEY_ALL, entities, this.TTL_MEDIUM);
    
    return entities;
  }
  
  /**
   * Get entity by ID with caching
   */
  async getById(id: string): Promise<T | null> {
    const cacheKey = `${this.CACHE_KEY_ID_PREFIX}${id}`;
    
    // Try to get from cache
    const cached = await cacheManager.get<T | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Get from storage
    const entity = await super.getById(id);
    
    // Cache the result (including null results with a shorter TTL)
    await cacheManager.set(
      cacheKey, 
      entity, 
      entity === null ? this.TTL_SHORT : this.TTL_MEDIUM
    );
    
    return entity;
  }
  
  /**
   * Create a new entity and invalidate cache
   */
  async create(entity: T): Promise<T> {
    const result = await super.create(entity);
    await this.invalidateCache();
    return result;
  }
  
  /**
   * Update an entity and invalidate cache
   */
  async update(id: string, update: Partial<T>): Promise<T | null> {
    const result = await super.update(id, update);
    await this.invalidateCache();
    return result;
  }
  
  /**
   * Delete an entity and invalidate cache
   */
  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    await this.invalidateCache();
    return result;
  }
  
  /**
   * Delete all entities and invalidate cache
   */
  async deleteAll(): Promise<void> {
    await super.deleteAll();
    await this.invalidateCache();
  }
  
  /**
   * Count with caching
   */
  async count(): Promise<number> {
    // Try to get from cache
    const cached = await cacheManager.get<number>(this.CACHE_KEY_COUNT);
    if (cached !== null) {
      return cached;
    }
    
    // Get from storage
    const count = await super.count();
    
    // Cache the result
    await cacheManager.set(this.CACHE_KEY_COUNT, count, this.TTL_MEDIUM);
    
    return count;
  }
  
  /**
   * Find with options and caching
   */
  async findWithOptions(options: QueryOptions = {}): Promise<T[]> {
    const cacheKey = this.generateFindCacheKey(options);
    
    // Check if caching is enabled in options
    const enableCache = options.enableCache !== false;
    
    if (enableCache) {
      // Try to get from cache
      const cached = await cacheManager.get<T[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }
    
    // Get from storage
    const entities = await super.findWithOptions(options);
    
    // Cache the result if enabled
    if (enableCache) {
      const ttl = options.cacheTTL || this.TTL_MEDIUM;
      await cacheManager.set(cacheKey, entities, ttl);
    }
    
    return entities;
  }
  
  /**
   * Get paginated with caching
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
    const cacheKey = `${this.CACHE_KEY_FIND_PREFIX}paginated:${JSON.stringify(options)}`;
    
    // Check if caching is enabled in options
    const enableCache = options.enableCache !== false;
    
    if (enableCache) {
      // Try to get from cache
      const cached = await cacheManager.get<{
        data: T[];
        pagination: any;
      }>(cacheKey);
      
      if (cached !== null) {
        return cached;
      }
    }
    
    // Get from storage
    const result = await super.getPaginated(options);
    
    // Cache the result if enabled
    if (enableCache) {
      const ttl = options.cacheTTL || this.TTL_MEDIUM;
      await cacheManager.set(cacheKey, result, ttl);
    }
    
    return result;
  }
} 