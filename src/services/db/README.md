# Database Service

This directory contains the database services for the PetCareTracker app.

## Architecture

The database service uses a unified approach to data management:

### UnifiedDatabaseManager

The `UnifiedDatabaseManager` is the primary entry point for all database operations. It provides:

- Type-safe data access via generic `DataManager<T>` classes
- Specialized managers for entities that need additional methods
- Consistent API for both local storage and Supabase operations

```typescript
import { unifiedDatabaseManager } from '../services/db';

// Get all pets
const pets = await unifiedDatabaseManager.pets.getAll();

// Create a new pet
const newPet = await unifiedDatabaseManager.pets.create({
  name: 'Fluffy',
  type: 'Cat',
  breed: 'Persian',
  // ... other properties
});

// Update a pet
await unifiedDatabaseManager.pets.update(petId, {
  name: 'Fluffy Jr.',
});

// Delete a pet
await unifiedDatabaseManager.pets.delete(petId);
```

## Supabase Integration

The app uses Supabase as a cloud database for data synchronization. The following tables are used:

### Existing Tables
- `profiles` - User profiles
- `pets` - Pet information
- `chat_sessions` - Chat sessions for the AI assistant
- `chat_messages` - Individual chat messages

### Additional Tables
The following tables will be created automatically if they don't exist:

- `food_items` - Food items for pets
- `meals` - Meal schedules and records
- `tasks` - Pet care tasks
- `medications` - Pet medications
- `health_records` - Pet health records
- `activity_sessions` - Pet activity records

## Table Creation

When the app initializes, it checks if the required tables exist in Supabase. If they don't, it will display a message with instructions on how to create them.

You can manually create the tables by running the SQL scripts in the Supabase SQL Editor:

```sql
-- See the createEntityTablesSQL constant in migrations.ts for the full SQL
```

## Local Storage

All data is stored locally in AsyncStorage with the following keys:

- `pets` - Pet information
- `tasks` - Pet care tasks
- `meals` - Meal schedules and records
- `food_items` - Food items for pets
- `medications` - Pet medications
- `health_records` - Pet health records
- `activity_sessions` - Pet activity records
- `users` - User information

## Legacy Repositories

The app previously used a repository pattern for data access. These repositories are now deprecated and will be removed in a future version. Use the `UnifiedDatabaseManager` instead.

```typescript
// DEPRECATED - Don't use
import { PetRepository } from '../services/db/petRepository';
const petRepo = new PetRepository();

// RECOMMENDED - Use this instead
import { unifiedDatabaseManager } from '../services/db';
const pets = unifiedDatabaseManager.pets;
```

### Specialized Methods

Each entity type has specialized methods for common operations:

- **Pets**: `getByUserId()`, `getBySpecies()`
- **FoodItems**: `getLowStock()`, `getByCategory()`, `getByPreference()`
- **Medications**: `getActiveMedications()`, `getByType()`
- **Tasks**: `getByDate()`, `getUpcoming()`
- **ActivitySessions**: `getRecentByPetId()`

### Legacy Components (Deprecated)

The following components are deprecated and will be removed in a future version:

- Individual repository classes (e.g., `PetRepository`, `TaskRepository`)
- `LegacyDatabaseManager`

Please use the `UnifiedDatabaseManager` for all new code.

## Storage

Data is stored in:

1. **Local Storage**: Using AsyncStorage for offline access
2. **Supabase**: For cloud sync and backup when available

The `DataManager<T>` class handles the synchronization between these two storage mechanisms automatically.

## Migrations

Database migrations are handled in the `migrations.ts` file. These migrations are applied when the app is upgraded to ensure data consistency.

## Best Practices

1. Always use the `unifiedDatabaseManager` for database operations
2. Use the appropriate specialized methods when available
3. Handle errors properly in async operations
4. Use TypeScript types for better code documentation and safety 