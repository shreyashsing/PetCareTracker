/**
 * Database Query Optimization Utilities
 * 
 * This module provides functions to optimize database queries for better performance
 * and scalability in the PetCareTracker application.
 */

import { Platform } from 'react-native';

/**
 * Options for query optimization
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  includeFields?: string[];
  excludeFields?: string[];
  relations?: string[];
  filters?: Record<string, any>;
  enableCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // Time to live in seconds
}

/**
 * Default query optimization options
 */
export const DEFAULT_QUERY_OPTIONS: QueryOptions = {
  limit: 20,
  offset: 0,
  orderDirection: 'desc',
  enableCache: true,
  cacheTTL: 300, // 5 minutes
};

/**
 * Selects only needed fields from a query for better performance
 * 
 * @param baseQuery The base query string or object
 * @param fields Array of fields to include in the query
 * @returns Optimized query with selected fields
 */
export const selectFields = (baseQuery: string, fields: string[]): string => {
  if (!fields || fields.length === 0) {
    return baseQuery;
  }
  
  // Replace SELECT * with specific fields
  return baseQuery.replace(
    /SELECT\s+\*/i,
    `SELECT ${fields.join(', ')}`
  );
};

/**
 * Constructs an optimized WHERE clause for SQL queries
 * 
 * @param filters Object containing field-value pairs for filtering
 * @returns Optimized WHERE clause
 */
export const buildWhereClause = (filters: Record<string, any>): string => {
  if (!filters || Object.keys(filters).length === 0) {
    return '';
  }
  
  const conditions = Object.entries(filters).map(([field, value]) => {
    // Handle null values
    if (value === null) {
      return `${field} IS NULL`;
    }
    
    // Handle array values for IN conditions
    if (Array.isArray(value)) {
      const values = value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
      return `${field} IN (${values})`;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      return `${field} = '${value}'`;
    }
    
    // Handle numeric and boolean values
    return `${field} = ${value}`;
  });
  
  return `WHERE ${conditions.join(' AND ')}`;
};

/**
 * Optimizes a query with pagination, ordering, and filtering
 * 
 * @param baseQuery Base query string
 * @param options Query optimization options
 * @returns Optimized query string
 */
export const optimizeQuery = (baseQuery: string, options: QueryOptions = {}): string => {
  const mergedOptions = { ...DEFAULT_QUERY_OPTIONS, ...options };
  const { limit, offset, orderBy, orderDirection, includeFields, filters } = mergedOptions;
  
  // Select specific fields if provided
  let query = includeFields && includeFields.length > 0
    ? selectFields(baseQuery, includeFields)
    : baseQuery;
  
  // Add WHERE clause if filters provided
  if (filters && Object.keys(filters).length > 0) {
    const whereClause = buildWhereClause(filters);
    query = query.includes('WHERE')
      ? query.replace(/WHERE/i, `${whereClause} AND`)
      : `${query} ${whereClause}`;
  }
  
  // Add ORDER BY clause if orderBy provided
  if (orderBy) {
    query = `${query} ORDER BY ${orderBy} ${orderDirection}`;
  }
  
  // Add LIMIT and OFFSET for pagination
  query = `${query} LIMIT ${limit} OFFSET ${offset}`;
  
  return query;
};

/**
 * Estimates query performance based on query complexity and data size
 * 
 * @param query The query to analyze
 * @param estimatedRows Estimated number of rows in the table
 * @returns Performance metrics
 */
export const estimateQueryPerformance = (
  query: string,
  estimatedRows: number
): { complexity: number; estimatedTime: number } => {
  // Calculate query complexity based on various factors
  let complexity = 1;
  
  // Check for joins (they increase complexity)
  const joinCount = (query.match(/JOIN/gi) || []).length;
  complexity += joinCount * 2;
  
  // Check for complex WHERE clauses
  const whereClauseComplexity = (query.match(/WHERE|AND|OR|IN|LIKE|NOT/gi) || []).length;
  complexity += whereClauseComplexity * 0.5;
  
  // Check for ORDER BY (sorting is expensive)
  if (query.includes('ORDER BY')) {
    complexity += 1;
  }
  
  // Check for aggregations
  const hasAggregation = /COUNT|SUM|AVG|MIN|MAX|GROUP BY/i.test(query);
  if (hasAggregation) {
    complexity += 2;
  }
  
  // Estimate time based on complexity and data size
  // This is a very rough estimation
  const estimatedTime = (complexity * Math.log10(estimatedRows + 1)) / 10;
  
  return { complexity, estimatedTime };
};

/**
 * Creates an optimized index suggestion for a query
 * 
 * @param query The query string
 * @returns Suggested indexes for the query
 */
export const suggestIndexes = (query: string): string[] => {
  const suggestedIndexes: string[] = [];
  
  // Extract columns from WHERE clauses
  const whereMatch = query.match(/WHERE\s+([^;]+)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    const columns = whereClause.split(/AND|OR/)
      .map(part => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    
    columns.forEach(column => {
      if (!suggestedIndexes.includes(column)) {
        suggestedIndexes.push(column);
      }
    });
  }
  
  // Extract columns from ORDER BY
  const orderByMatch = query.match(/ORDER BY\s+([^;]+)/i);
  if (orderByMatch) {
    const orderByColumns = orderByMatch[1].split(',')
      .map(part => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    
    orderByColumns.forEach(column => {
      if (!suggestedIndexes.includes(column)) {
        suggestedIndexes.push(column);
      }
    });
  }
  
  return suggestedIndexes;
};

/**
 * Provides platform-specific query optimizations
 * 
 * @param query The query to optimize
 * @returns Platform-optimized query
 */
export const applyPlatformOptimizations = (query: string): string => {
  // Apply platform-specific optimizations
  if (Platform.OS === 'android') {
    // Android SQLite has some specific optimizations
    return query.replace(/SELECT\s+/i, 'SELECT /*+ SQLITE_HINT */ ');
  }
  
  if (Platform.OS === 'ios') {
    // iOS may have different optimization hints
    return query.replace(/SELECT\s+/i, 'SELECT /*+ IOS_HINT */ ');
  }
  
  return query;
};

/**
 * Formats and prettifies a SQL query for better readability
 * 
 * @param query The query to format
 * @returns Formatted query
 */
export const formatQuery = (query: string): string => {
  return query
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}; 