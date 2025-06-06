# Navigation State Management Testing Guide

## Quick Test Steps

### 1. Enable Debug Mode
Add this to any screen to see navigation state in real-time:

```typescript
import { NavigationDebugger } from '../components/NavigationDebugger';

// Add this to your screen's render:
<NavigationDebugger visible={__DEV__} />
```

### 2. Test Basic Navigation Persistence

**Test 1: Basic Restoration**
1. Open the app
2. Navigate to Health, Schedule, or Feeding screen
3. Send app to background (home button)
4. Wait 2-3 seconds
5. Reopen the app
6. **Expected**: Should return to the same screen

**Test 2: Home Screen Fallback**
1. Navigate to Home screen
2. Send app to background
3. Reopen the app
4. **Expected**: Should stay on Home (no restoration needed)

**Test 3: Time-based Reset**
1. Navigate to any screen
2. Send app to background
3. Wait 15+ minutes (or change `MAX_BACKGROUND_TIME` to 30 seconds for testing)
4. Reopen the app
5. **Expected**: Should return to Home screen

### 3. Debug Console Logs

Look for these console messages:

**When navigating:**
```
[Home] Updating current route to Home
[AppNavigator] Navigation changed: none -> Home
[AppStore] State saved to storage: Home
```

**When going to background:**
```
[AppNavigator] App state changed: active -> background
[AppStore] State saved to storage: Health
```

**When returning from background:**
```
[AppNavigator] App became active
[AppStore] Loading state from storage: {currentRoute: "Health", ...}
[AppStore] State restored successfully, will navigate to: Health
[AppNavigator] Should restore navigation. Current route: Health
[AppNavigator] Attempting to restore navigation to: Health
[AppNavigator] Navigation restored successfully to: Health
```

### 4. Troubleshooting

**Issue: Always goes to Home**
- Check if route is in `SAFE_RESTORATION_ROUTES` in AppStore.ts
- Look for console error messages
- Verify AsyncStorage permissions

**Issue: Loading screen appears**
- This is normal for a brief moment
- Should disappear after navigation restoration

**Issue: Navigation fails**
- Check if the target route exists in MainStack.tsx
- Verify route name matches exactly

### 5. Configuration for Testing

**Reduce timeout for faster testing:**
```typescript
// In AppStore.ts - change this line for testing:
const MAX_BACKGROUND_TIME = 30 * 1000; // 30 seconds instead of 15 minutes
```

**Add more safe routes:**
```typescript
const SAFE_RESTORATION_ROUTES = [
  'Home', 'Health', 'Schedule', 'Feeding', 'Exercise',
  'YourNewScreen', // Add your screens here
];
```

### 6. Current Implementation Status

✅ **Working:**
- State persistence to AsyncStorage
- App state change detection
- Route tracking and history
- Time-based reset logic
- Safe route validation

🔧 **Known Issues:**
- Navigation hierarchy (MainStack -> individual screens)
- Loading screen timing
- Route parameter restoration

### 7. Expected Console Output

**Normal Flow:**
```
[AppStore] Loading state from storage: No stored navigation state found
[Home] Updating current route to Home
[AppStore] State saved to storage: Home
```

**Background/Restore Flow:**
```
[AppNavigator] App state changed: active -> background
[AppStore] State saved to storage: Health
[AppNavigator] App state changed: background -> active
[AppStore] Loading state from storage: {currentRoute: "Health", timeSinceLastActive: "3s", wasInBackground: true}
[AppStore] State restored successfully, will navigate to: Health
[AppNavigator] Should restore navigation. Current route: Health
[AppNavigator] Attempting to restore navigation to: Health undefined
[AppNavigator] Navigating to MainStack first
[AppNavigator] Now navigating to target route: Health
[AppNavigator] Navigation restored successfully to: Health
```

If you see these logs, the system is working correctly! 