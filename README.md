# Pet Care Tracker Mobile App

This React Native application allows users to track and manage their pets' care needs including health records, feeding schedules, medication, and more.

## Code Organization

### Navigation Structure

The application follows a clear navigation structure:

- **src/pages/**: Contains the primary screen implementations that are actively used in the app. These are the source of truth for our screens.
- **src/screens/**: Contains legacy screen implementations that are being phased out. New development should focus on the `pages` directory.

### Directory Structure

- **src/components/**: Reusable UI components
- **src/contexts/**: React Context providers (Auth, etc.)
- **src/forms/**: Form components and utilities
- **src/hooks/**: Custom React hooks
- **src/navigation/**: Navigation configuration
- **src/pages/**: Primary screen implementations
- **src/screens/**: Legacy screens (to be migrated or removed)
- **src/services/**: Business logic and services
- **src/types/**: TypeScript type definitions
- **src/utils/**: Utility functions

## Navigation

The app uses React Navigation with the following structure:

1. **AppNavigator**: The root navigator that handles authentication state
2. **AuthStack**: Screens for authentication flow
3. **MainStack**: Primary app screens when logged in

## Development Guidelines

1. **Screen Implementation**: Always create new screens in the `src/pages/` directory.
2. **Type Safety**: Avoid using type assertions like `as any` or `as ComponentType<any>`. Instead, properly type your components.
3. **Code Consistency**: Follow the established patterns in the codebase for new features.
4. **Navigation**: Use the correct route names and parameters as defined in `src/types/navigation.ts`.

## Cleanup Roadmap

1. Migrate any remaining functionality from `src/screens/` to `src/pages/`
2. Remove duplicate screen implementations
3. Ensure proper typing throughout the application 