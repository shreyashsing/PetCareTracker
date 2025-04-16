/**
 * Cache Management Utility
 * 
 * This module provides a caching system to improve application performance
 * by storing and retrieving frequently accessed data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache item metadata
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number | null; // null means no expiry
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  prefix?: string; // Prefix for cache keys (default: 'cache:')
  version?: string; // Cache version for invalidation (default: '1.0')
  persistToStorage?: boolean; // Whether to persist cache to AsyncStorage (default: true)
}

// Default cache options
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes
  prefix: 'cache:',
  version: '1.0',
  persistToStorage: true
};

/**
 * Cache Manager Class
 * 
 * Provides methods for caching and retrieving data with TTL support.
 */
export class CacheManager {
  private inMemoryCache: Map<string, CacheItem<any>> = new Map();
  private options: Required<CacheOptions>;
  private storageLoadPromise: Promise<void> | null = null;
  
  /**
   * Create a new CacheManager instance
   */
  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options } as Required<CacheOptions>;
    
    // Initialize the cache from storage if enabled
    if (this.options.persistToStorage) {
      this.storageLoadPromise = this.initFromStorage();
    } else {
      this.storageLoadPromise = Promise.resolve();
    }
  }
  
  /**
   * Initialize cache from AsyncStorage
   */
  private async initFromStorage(): Promise<void> {
    try {
      // Get all keys with the current cache prefix and version
      const storageKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = storageKeys.filter(key => 
        key.startsWith(`${this.options.prefix}${this.options.version}:`)
      );
      
      if (cacheKeys.length === 0) {
        return;
      }
      
      // Load all cache items in one batch
      const entries = await AsyncStorage.multiGet(cacheKeys);
      
      // Process and add valid entries to in-memory cache
      for (const [key, value] of entries) {
        if (!value) continue;
        
        try {
          const cacheItem = JSON.parse(value) as CacheItem<any>;
          
          // Check if expired
          if (cacheItem.expiry !== null && Date.now() > cacheItem.expiry) {
            // Remove expired item
            AsyncStorage.removeItem(key).catch(e => 
              console.warn('Failed to remove expired cache item:', e)
            );
            continue;
          }
          
          // Add valid item to in-memory cache
          const pureKey = key.slice((this.options.prefix + this.options.version + ':').length);
          this.inMemoryCache.set(pureKey, cacheItem);
        } catch (e) {
          console.warn('Failed to parse cache item:', e);
        }
      }
      
      console.log(`Loaded ${this.inMemoryCache.size} items from cache storage`);
    } catch (error) {
      console.error('Failed to initialize cache from storage:', error);
    }
  }
  
  /**
   * Ensure the cache is initialized from storage before proceeding
   */
  private async ensureInitialized(): Promise<void> {
    if (this.storageLoadPromise) {
      await this.storageLoadPromise;
      this.storageLoadPromise = null;
    }
  }
  
  /**
   * Generate a full cache key with prefix and version
   */
  private getFullKey(key: string): string {
    return `${this.options.prefix}${this.options.version}:${key}`;
  }
  
  /**
   * Set a value in the cache
   * 
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   * @returns Promise resolving when the operation is complete
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.ensureInitialized();
    
    const timestamp = Date.now();
    const expiry = ttl !== undefined 
      ? timestamp + ttl 
      : this.options.ttl !== undefined 
        ? timestamp + this.options.ttl 
        : null;
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp,
      expiry
    };
    
    // Store in memory cache
    this.inMemoryCache.set(key, cacheItem);
    
    // Persist to storage if enabled
    if (this.options.persistToStorage) {
      const fullKey = this.getFullKey(key);
      try {
        await AsyncStorage.setItem(fullKey, JSON.stringify(cacheItem));
      } catch (error) {
        console.error('Failed to persist cache item to storage:', error);
      }
    }
  }
  
  /**
   * Get a value from the cache
   * 
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    
    const cacheItem = this.inMemoryCache.get(key) as CacheItem<T> | undefined;
    
    // Check if item exists
    if (!cacheItem) {
      return null;
    }
    
    // Check if expired
    if (cacheItem.expiry !== null && Date.now() > cacheItem.expiry) {
      // Remove expired item
      this.remove(key);
      return null;
    }
    
    return cacheItem.data;
  }
  
  /**
   * Remove an item from the cache
   * 
   * @param key Cache key
   * @returns Promise resolving when the operation is complete
   */
  async remove(key: string): Promise<void> {
    await this.ensureInitialized();
    
    // Remove from memory cache
    this.inMemoryCache.delete(key);
    
    // Remove from storage if enabled
    if (this.options.persistToStorage) {
      const fullKey = this.getFullKey(key);
      try {
        await AsyncStorage.removeItem(fullKey);
      } catch (error) {
        console.error('Failed to remove cache item from storage:', error);
      }
    }
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const cacheItem = this.inMemoryCache.get(key);
    
    // Check if item exists
    if (!cacheItem) {
      return false;
    }
    
    // Check if expired
    if (cacheItem.expiry !== null && Date.now() > cacheItem.expiry) {
      // Remove expired item
      this.remove(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all cache keys
   * 
   * @returns Array of all cache keys
   */
  async keys(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.inMemoryCache.keys());
  }
  
  /**
   * Clear the entire cache
   * 
   * @returns Promise resolving when the operation is complete
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    
    // Clear memory cache
    this.inMemoryCache.clear();
    
    // Clear storage if enabled
    if (this.options.persistToStorage) {
      try {
        const storageKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = storageKeys.filter(key => 
          key.startsWith(`${this.options.prefix}${this.options.version}:`)
        );
        
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
      } catch (error) {
        console.error('Failed to clear cache from storage:', error);
      }
    }
  }
  
  /**
   * Invalidate all cache items with the given prefix
   * 
   * @param prefix Key prefix to invalidate
   * @returns Promise resolving when the operation is complete
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    await this.ensureInitialized();
    
    // Find keys to remove
    const keysToRemove: string[] = [];
    
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove from memory cache
    for (const key of keysToRemove) {
      this.inMemoryCache.delete(key);
    }
    
    // Remove from storage if enabled
    if (this.options.persistToStorage && keysToRemove.length > 0) {
      try {
        const fullKeys = keysToRemove.map(key => this.getFullKey(key));
        await AsyncStorage.multiRemove(fullKeys);
      } catch (error) {
        console.error('Failed to invalidate cache keys by prefix from storage:', error);
      }
    }
  }
  
  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    memoryUsage: number;
    oldestItem: number | null;
    newestItem: number | null;
  }> {
    await this.ensureInitialized();
    
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;
    let totalSize = 0;
    
    for (const item of this.inMemoryCache.values()) {
      // Update timestamps
      if (oldestTimestamp === null || item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
      
      if (newestTimestamp === null || item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
      }
      
      // Estimate memory usage (rough approximation)
      totalSize += JSON.stringify(item).length * 2; // Unicode chars are 2 bytes
    }
    
    return {
      totalItems: this.inMemoryCache.size,
      memoryUsage: totalSize,
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp
    };
  }
}

// Export a singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache decorator for class methods
 * 
 * @param keyPrefix Prefix for the cache key
 * @param ttl Time to live in milliseconds (optional)
 * @returns Decorator function
 */
export function Cached(keyPrefix: string, ttl?: number) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      // Generate cache key from method name, args, and prefix
      const argsKey = JSON.stringify(args);
      const cacheKey = `${keyPrefix}:${propertyKey}:${argsKey}`;
      
      // Try to get from cache
      const cachedResult = await cacheManager.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Execute the original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cacheManager.set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
} 