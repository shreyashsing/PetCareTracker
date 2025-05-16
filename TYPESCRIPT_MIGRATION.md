# TypeScript Migration Guide

This document provides guidance on the ongoing TypeScript migration in the Pet Care Tracker Mobile app.

## Current Status

The codebase is in the process of migrating from JavaScript to TypeScript. Most core files have been migrated, but there may still be some JavaScript files that need to be converted.

## Code Organization

- All new code should be written in TypeScript (`.ts` or `.tsx` files)
- Existing JavaScript files should be migrated to TypeScript when making significant changes

## Handling Duplicate Files

One issue in the codebase was the presence of both JavaScript and TypeScript versions of the same files. This caused confusion and potential bugs when imports referenced the wrong version.

### Cleanup Process

We've implemented a cleanup script that removes JavaScript files that have TypeScript equivalents:

```bash
npm run clean:js
```

This script:
1. Scans key directories for `.js` files
2. Checks if a corresponding `.ts` or `.tsx` file exists
3. Deletes the JavaScript version if a TypeScript version is found

### Special Case: Root index.js

The root `index.js` file is a special case. Even though we have an `index.ts` file, the `index.js` file is kept for compatibility with bundlers and tools that expect a JavaScript entry point.

When making changes to the application entry point:
1. First modify `index.ts` with proper TypeScript types
2. Then manually update `index.js` to match the functionality

A warning comment has been added to `index.js` to remind developers of this requirement. The warning is automatically added when running:

```bash
npm run sync:index
```

This script is also run automatically during `npm start` and after `npm install`.

### Directories Checked

- `src/services/db`
- `src/utils`
- `src/types`
- `src/services`
- `src/hooks`
- `src/components`
- Root directory (with special handling for index.js)

## Migration Guidelines

When migrating a file from JavaScript to TypeScript:

1. Create a new TypeScript file with the same name but `.ts` extension
2. Copy the contents of the JavaScript file and add appropriate type annotations
3. Update any imports in the TypeScript file to reference other TypeScript files
4. Test the functionality to ensure it works correctly
5. Run `npm run clean:js` to remove the original JavaScript file

## Common Issues

### Import Resolution

When migrating files, be careful with imports. The TypeScript compiler may generate JavaScript files with different export patterns than the original JavaScript files.

### Type Definitions

For third-party libraries without TypeScript definitions, check if `@types/{library-name}` is available or create custom type definitions in `src/types/declarations.d.ts`.

### Circular Dependencies

Be careful of circular dependencies, which can be more problematic in TypeScript. Use interface-only imports or restructure your code to avoid circular references.

## Best Practices

1. Use explicit types rather than `any` whenever possible
2. Leverage TypeScript interfaces for better code documentation
3. Use TypeScript's utility types (e.g., `Partial<T>`, `Pick<T>`, `Omit<T>`) for advanced type manipulations
4. Consider using `readonly` for immutable properties
5. Use TypeScript's discriminated unions for state management

## Database Management Migration

### Overview

As part of our TypeScript migration, we've consolidated our database management approach. Previously, we had multiple overlapping implementations:

1. Individual repository classes (e.g., `PetRepository`, `TaskRepository`)
2. `LegacyDatabaseManager` that used these repositories
3. Direct AsyncStorage access in some components

We've now standardized on a single unified approach using the `UnifiedDatabaseManager` class, which provides:

- Type-safe data access via `DataManager<T>` generic classes
- Specialized managers for entities that need additional methods
- Consistent API for both local storage and Supabase operations

### Migration Steps

1. **Replace direct repository usage**:

   ```typescript
   // BEFORE
   import { PetRepository } from '../services/db/petRepository';
   const petRepo = new PetRepository();
   const pets = await petRepo.getAll();
   
   // AFTER
   import { unifiedDatabaseManager } from '../services/db';
   const pets = await unifiedDatabaseManager.pets.getAll();
   ```

2. **Replace LegacyDatabaseManager usage**:

   ```typescript
   // BEFORE
   import { databaseManager } from '../services/db';
   const pets = await databaseManager.pets.getAll();
   
   // AFTER
   import { unifiedDatabaseManager } from '../services/db';
   const pets = await unifiedDatabaseManager.pets.getAll();
   ```

3. **Replace direct AsyncStorage usage**:

   ```typescript
   // BEFORE
   import AsyncStorage from '@react-native-async-storage/async-storage';
   const petsJson = await AsyncStorage.getItem('PETS');
   const pets = petsJson ? JSON.parse(petsJson) : [];
   
   // AFTER
   import { unifiedDatabaseManager } from '../services/db';
   const pets = await unifiedDatabaseManager.pets.getAll();
   ```

### Benefits

- **Type Safety**: All database operations are now fully typed
- **Consistency**: Single pattern for all data access
- **Maintainability**: Easier to add new features and fix bugs
- **Performance**: Optimized data access with caching
- **Offline Support**: Works seamlessly with or without network connection

### Specialized Methods

The unified manager includes specialized methods for different entity types:

#### Pets
- `getByUserId(userId)`: Get pets for a specific user
- `getBySpecies(petType)`: Get pets by species/type
- `findByStatus(status)`: Find pets by health status
- `findByMedicalCondition(condition)`: Find pets with specific medical conditions
- `getSortedByName(ascending)`: Get pets sorted by name

#### FoodItems
- `getLowStock(petId)`: Get food items that are low in stock
- `getByCategory(petId, category)`: Get food items by category
- `getByPreference(petId, preference)`: Get food items by pet preference
- `getExpiringSoon(petId, daysThreshold)`: Get food items expiring soon
- `updateInventory(id, newAmount)`: Update inventory amount

#### Medications
- `getActiveMedications(petId)`: Get active medications for a pet
- `getByType(petId, type)`: Get medications by type
- `getDueWithinHours(petId, hours)`: Get medications due within hours
- `addAdministrationRecord(id, administered, notes, administeredBy)`: Add administration record

#### Tasks
- `getByDate(petId, date)`: Get tasks for a specific date
- `getUpcoming(petId, days)`: Get upcoming tasks
- `markAsCompleted(id, completedBy, notes)`: Mark task as completed

#### Meals
- `getByPetIdAndDate(petId, date)`: Get meals for a pet on a specific date
- `markAsCompleted(id)`: Mark meal as completed
- `markAsSkipped(id)`: Mark meal as skipped
- `getUpcoming(petId, limit)`: Get upcoming meals

#### HealthRecords
- `getByPetIdAndType(petId, type)`: Get health records by type
- `getFollowUpNeeded(petId)`: Get records that require follow-up
- `getUpcomingFollowUps(petId, days)`: Get upcoming follow-up records

#### ActivitySessions
- `getRecentByPetId(petId, limit)`: Get recent activity sessions

### Implementation Details

1. **Base DataManager Class**: Generic class that handles CRUD operations for any entity type
2. **Specialized DataManager Classes**: Extend the base class with entity-specific methods
3. **UnifiedDatabaseManager**: Provides access to all entity managers through a single interface
4. **Singleton Instance**: Exported as `unifiedDatabaseManager` for consistent access

### Deprecation Notice

The old repository classes and `LegacyDatabaseManager` are marked as deprecated and will be removed in a future version. Please update your code to use the unified approach.

### Testing

All database operations have been thoroughly tested to ensure they work correctly with the unified approach. The tests include:

1. Basic CRUD operations
2. Specialized methods for each entity type
3. Synchronization with Supabase
4. Error handling

## Running Type Checks

To check for TypeScript errors:

```bash
npx tsc --noEmit
```

This will run the TypeScript compiler without generating output files, just to check for type errors. 