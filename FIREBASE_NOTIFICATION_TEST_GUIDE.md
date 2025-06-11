# Firebase Notification Testing Guide

## Overview
This guide will help you test if Firebase Cloud Messaging (FCM) is properly configured in your PetCareTracker app after building.

## Prerequisites
- Your app must be built with the Firebase configuration files in place
- Test on a physical device for accurate results (emulators have limited FCM support)
- Ensure you have an internet connection while testing

## Testing Options

### Option 1: Use the Built-in Tester Component

1. Import the Firebase Notification Tester component in your app:
```jsx
import FirebaseNotificationTester from './src/components/FirebaseNotificationTester';
```

2. Add the component to your app temporarily (e.g., in a settings screen or developer menu):
```jsx
<FirebaseNotificationTester />
```

3. Build and run your app
4. Navigate to the screen containing the tester component
5. Press the "Test Firebase Notifications" button
6. Check the logs displayed in the component for test results
7. If everything is configured correctly, you should receive a test notification

### Option 2: Run the Test Script Directly

You can also run the test script directly from your terminal:

```bash
cd PetCareTrackerMobile
npx react-native run-android  # or run-ios
```

Then in a separate terminal window:

```bash
cd PetCareTrackerMobile
node -e "require('./test-firebase-notifications').testFirebaseNotifications()"
```

### Option 3: Test Using the Existing Functions

In your app code, you can add this test anywhere (e.g., on a button press):

```typescript
import { fcmService } from './src/services/notifications/fcm';

// Function to test FCM
const testFCM = async () => {
  try {
    // Initialize FCM
    const initialized = await fcmService.initialize();
    console.log('FCM initialized:', initialized);
    
    // Get FCM token
    const token = await fcmService.getFCMToken();
    console.log('FCM token:', token);
    
    // Send test notification
    if (initialized && token) {
      const sent = await fcmService.sendTestNotification(
        'Test Notification',
        'This is a test notification from your app!'
      );
      console.log('Test notification sent:', sent);
    }
  } catch (error) {
    console.error('FCM test failed:', error);
  }
};

// Call this function wherever needed
testFCM();
```

## Background Testing

To fully test Firebase notifications when the app is in the background:

1. Run the test using any of the methods above
2. Immediately press the home button to put the app in the background
3. Wait for the notification to arrive (should be within a few seconds)
4. If properly configured, you should receive the notification even when the app is in the background

## What Should Happen

If Firebase is properly configured:

1. **FCM Initialization**: Should succeed
2. **FCM Token**: Should be generated successfully
3. **Test Notification**: Should be sent successfully
4. **Notification Delivery**: Should receive notification in the foreground and background

## Troubleshooting

### Common Issues

1. **No FCM Token Generated**
   - Check if Firebase configuration files are in the correct locations
   - Verify your app's bundle ID matches the one in Firebase console
   - Make sure you're testing on a physical device

2. **Notification Not Received**
   - Check if notification permissions are granted
   - Verify internet connection
   - Check if FCM is available on the device

3. **App Crashes During Test**
   - Check console logs for specific errors
   - Verify Firebase dependencies are correctly installed
   - Make sure you're using the latest version of Firebase

### Checking Firebase Setup

Verify these files are present and correctly configured:

- Android: `android/app/google-services.json`
- iOS: `ios/PetCareTrackerMobile/GoogleService-Info.plist`

## Conclusion

Once you confirm that Firebase notifications are working properly, you can:

1. Remove the test component from your app
2. Continue with your app's development
3. Implement actual notification content for your app's features

Your notifications should now work reliably both when the app is open and when it's in the background or closed. 