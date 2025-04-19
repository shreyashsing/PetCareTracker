# Module Declarations in PetCareTrackerMobile

This document explains how module declarations are structured in this project and how to add new ones.

## Types of Declaration Files

The project uses several declaration files:

1. **module-declarations.d.ts** - Contains declarations for third-party libraries that don't have TypeScript types
2. **declarations.d.ts** - Contains declarations for Expo modules and environment variables
3. **ambient.d.ts** - Used for any ambient declarations not covered by the above

## How to Resolve TypeScript Module Errors

When you encounter TypeScript errors related to missing modules, follow these steps:

### For Third-Party Libraries

1. Check if the library has a `@types` package:
   ```
   yarn add -D @types/library-name
   ```

2. If no types are available, add the declaration to `module-declarations.d.ts`:
   ```typescript
   declare module 'library-name' {
     // Define the types here
     export interface LibraryType {
       // ...
     }
     
     // Export functions or objects
     export function someFunction(): void;
     
     // Default export if needed
     export default any;
   }
   ```

### For Project-Specific Modules

1. Make sure the module actually exists in the source code
2. Ensure the module exports the types it claims to export
3. Avoid circular references between modules
4. If needed, create proper interfaces in the source files instead of relying on declaration files

## Common Issues and Solutions

1. **ESModule Interop Issues**
   - Error: "Module can only be default-imported using the 'esModuleInterop' flag"
   - Solution: Make sure `esModuleInterop: true` is set in tsconfig.json

2. **Duplicate Declarations**
   - Error: "Cannot redeclare block-scoped variable"
   - Solution: Remove duplicate declarations across different .d.ts files

3. **React JSX Errors**
   - Error: "Cannot use JSX unless the '--jsx' flag is provided"
   - Solution: Add `--jsx react-native` when running TypeScript compiler

## The Right Approach

The best practice is to:

1. Let the actual module define its own types
2. Use declaration merging only when necessary
3. Keep third-party declarations separate from project module declarations
4. Use ambient declarations only for truly global types

Remember that proper TypeScript configuration (in tsconfig.json) is crucial for all of this to work correctly. 