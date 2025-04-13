# Theme Migration Guide

## Summary of Changes

We've simplified the theme handling in the app by:

1. Removing the ThemeProvider component and manual theme selection
2. Replacing it with a simpler system that automatically follows the device's theme setting
3. Creating a new `useAppColors` hook that provides colors based on the system theme

## How to Fix Import Errors

If you see errors like `Cannot find module '../../hooks/useTheme' or its corresponding type declarations`, you need to update your imports:

### Replace:
```tsx
import { useTheme } from '../hooks/useTheme';

// ...

const Component = () => {
  const { colors } = useTheme();
  // or
  const { colors, isDark } = useTheme();
  // or 
  const { theme, setTheme, colors, isDark } = useTheme();
  
  // Rest of component...
}
```

### With:
```tsx
import { useAppColors } from '../hooks/useAppColors';

// ...

const Component = () => {
  const { colors } = useAppColors();
  // or
  const { colors, isDark } = useAppColors();
  
  // Rest of component...
}
```

## Removing Theme Selection UI

If you have theme selection UI in your components (like in Settings.tsx), you should remove those sections as the app now follows the system theme.

## Automated Script

You can use the script we've included to automatically update imports:

```bash
# From the project root
chmod +x PetCareTrackerMobile/scripts/updateThemeImports.sh
./PetCareTrackerMobile/scripts/updateThemeImports.sh
```

Note: This script will attempt to update all files, but you may need to manually review some changes.

## Benefits

- Simplified codebase
- Better integration with system preferences
- Consistent user experience that matches other apps on the device
- Reduced bundle size 