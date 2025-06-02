# Firebase Cloud Functions Production Push Notifications Setup

This document provides a complete guide for setting up and deploying Firebase Cloud Functions for production push notifications in the PetCareTracker app.

## Overview

The Firebase Cloud Functions implementation provides:

- **Server-side notification scheduling** with reliable delivery
- **Automatic retry mechanisms** with exponential backoff
- **Notification storage and tracking** in Firestore
- **Real-time delivery statistics** and monitoring
- **Production-grade scalability** and reliability
- **Cross-platform push notifications** via Expo

## Architecture

```
Mobile App → Firebase Cloud Functions → Firestore → Expo Push Service → Device
```

### Components

1. **Firebase Cloud Functions** (`functions/src/index.ts`)
   - HTTP endpoints for scheduling and managing notifications
   - Scheduled functions for processing pending notifications
   - Automatic cleanup and maintenance tasks

2. **Client Service** (`src/services/notifications/firebaseCloudFunctions.ts`)
   - Mobile app interface to Firebase Cloud Functions
   - Local caching and offline support
   - Error handling and retry logic

3. **Notification Service Integration** (`src/services/notifications/index.ts`)
   - Production notification methods
   - Seamless integration with existing notification system
   - Statistics and monitoring capabilities

## Prerequisites

1. **Firebase Project Setup**
   - Firebase project created and configured
   - Firestore database enabled
   - Firebase CLI installed globally

2. **Expo Push Notifications**
   - Valid Expo push tokens
   - Proper app configuration for push notifications

## Installation & Setup

### 1. Firebase CLI Installation

```bash
npm install -g firebase-tools
```

### 2. Firebase Login

```bash
firebase login
```

### 3. Initialize Firebase Functions

```bash
cd PetCareTrackerMobile
firebase init functions
```

Select:
- Use an existing project (your Firebase project)
- TypeScript
- ESLint (optional)
- Install dependencies

### 4. Install Dependencies

```bash
cd functions
npm install
```

Dependencies are already configured in `functions/package.json`:
- `firebase-admin`: Firebase Admin SDK
- `firebase-functions`: Cloud Functions SDK
- `expo-server-sdk`: Expo push notifications
- `node-cron`: Scheduled task management

### 5. Configure Firebase Project

Update the Firebase project ID in `src/services/notifications/firebaseCloudFunctions.ts`:

```typescript
const FIREBASE_PROJECT_ID = 'your-firebase-project-id';
```

## Deployment

### 1. Build Functions

```bash
cd functions
npm run build
```

### 2. Deploy to Firebase

```bash
firebase deploy --only functions
```

### 3. Verify Deployment

Check the Firebase Console for deployed functions:
- `scheduleNotification`
- `sendImmediateNotification`
- `cancelNotification`
- `getNotificationStats`
- `processScheduledNotifications`
- `cleanupOldNotifications`

## Available Functions

### HTTP Functions

#### 1. Schedule Notification
- **Endpoint**: `POST /scheduleNotification`
- **Purpose**: Schedule a push notification for future delivery
- **Parameters**:
  ```json
  {
    "userId": "string",
    "pushToken": "string",
    "title": "string",
    "body": "string",
    "data": {
      "type": "string",
      "petId": "string",
      "entityId": "string",
      "priority": "normal|high|critical"
    },
    "scheduledTime": "number (timestamp)",
    "maxRetries": "number (optional, default: 3)"
  }
  ```

#### 2. Send Immediate Notification
- **Endpoint**: `POST /sendImmediateNotification`
- **Purpose**: Send a push notification immediately
- **Parameters**:
  ```json
  {
    "pushToken": "string",
    "title": "string",
    "body": "string",
    "data": "object (optional)"
  }
  ```

#### 3. Cancel Notification
- **Endpoint**: `POST /cancelNotification`
- **Purpose**: Cancel a scheduled notification
- **Parameters**:
  ```json
  {
    "notificationId": "string"
  }
  ```

#### 4. Get Notification Statistics
- **Endpoint**: `GET /getNotificationStats?userId={userId}`
- **Purpose**: Retrieve notification statistics for a user
- **Response**:
  ```json
  {
    "success": true,
    "stats": {
      "pending": "number",
      "sent": "number",
      "failed": "number",
      "total": "number"
    }
  }
  ```

### Scheduled Functions

#### 1. Process Scheduled Notifications
- **Schedule**: Every 1 minute
- **Purpose**: Process pending notifications that are due for delivery
- **Features**:
  - Batch processing (max 100 notifications per run)
  - Automatic retry with exponential backoff
  - Error handling and logging

#### 2. Cleanup Old Notifications
- **Schedule**: Every 24 hours
- **Purpose**: Remove old notifications and delivery logs
- **Features**:
  - Removes notifications older than 7 days
  - Cleans up delivery logs
  - Maintains database performance

## Firestore Collections

### 1. scheduledNotifications
```typescript
{
  id: string;
  userId: string;
  pushToken: string;
  title: string;
  body: string;
  data: {
    type: string;
    petId: string;
    entityId: string;
    priority: 'normal' | 'high' | 'critical';
  };
  scheduledTime: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
}
```

### 2. notificationDeliveryLogs
```typescript
{
  id: string;
  notificationId: string;
  status: 'scheduled' | 'delivered' | 'failed' | 'cancelled' | 'interacted';
  timestamp: number;
  error?: string;
  pushTicketId?: string;
  receiptId?: string;
}
```

## Mobile App Integration

### 1. Initialize Service

```typescript
import { firebaseCloudFunctionsService } from './src/services/notifications/firebaseCloudFunctions';

// Initialize the service
await firebaseCloudFunctionsService.initialize();
```

### 2. Schedule Notifications

```typescript
// Schedule a medication reminder
const result = await firebaseCloudFunctionsService.scheduleMedicationReminder(
  pushToken,
  medicationId,
  petId,
  medicationName,
  scheduledTime,
  'high'
);

if (result.success) {
  console.log('Notification scheduled:', result.notificationId);
}
```

### 3. Production Service Integration

```typescript
import { notificationService } from './src/services/notifications';

// Use production notification methods
const result = await notificationService.scheduleProductionMedicationReminder(
  medicationId,
  petId,
  medicationName,
  scheduledTime,
  'high'
);
```

## Testing

### 1. Run Test Suite

```bash
node test-firebase-cloud-functions.js
```

### 2. Individual Tests

```typescript
import { testConnectionToFirebase } from './test-firebase-cloud-functions';

// Test Firebase connection
const success = await testConnectionToFirebase();
```

### 3. Manual Testing

1. **Test Connection**: Use the test connection method to verify Firebase setup
2. **Schedule Test Notification**: Schedule a notification for 1-2 minutes in the future
3. **Monitor Firestore**: Check the `scheduledNotifications` collection
4. **Verify Delivery**: Confirm notification is delivered to device
5. **Check Logs**: Review Firebase Functions logs for any errors

## Monitoring & Debugging

### 1. Firebase Console
- **Functions**: Monitor function executions and errors
- **Firestore**: View stored notifications and logs
- **Logs**: Check function execution logs

### 2. Mobile App Logs
```typescript
// Get production notification stats
const stats = await notificationService.getProductionNotificationStats();
console.log('Notification stats:', stats);

// Test connection
const connectionTest = await notificationService.testProductionNotificationConnection();
console.log('Connection test:', connectionTest);
```

### 3. Function Logs
```bash
firebase functions:log
```

## Production Considerations

### 1. Security Rules

Configure Firestore security rules to protect notification data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to notification collections
    match /scheduledNotifications/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /notificationDeliveryLogs/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. Rate Limiting

Implement rate limiting for notification endpoints to prevent abuse:

```typescript
// Add rate limiting middleware to functions
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 3. Error Handling

- All functions include comprehensive error handling
- Failed notifications are automatically retried with exponential backoff
- Permanent failures are logged for investigation

### 4. Scalability

- Functions automatically scale based on demand
- Firestore handles concurrent reads/writes efficiently
- Batch processing prevents overwhelming the system

## Troubleshooting

### Common Issues

1. **Function Deployment Fails**
   - Check Firebase CLI version: `firebase --version`
   - Verify project permissions
   - Check function syntax and dependencies

2. **Notifications Not Delivered**
   - Verify push token validity
   - Check Expo push service status
   - Review function logs for errors

3. **Firestore Permission Errors**
   - Update security rules
   - Verify authentication setup
   - Check user permissions

4. **High Function Costs**
   - Monitor function execution frequency
   - Optimize batch processing
   - Implement proper cleanup

### Debug Commands

```bash
# View function logs
firebase functions:log

# Test functions locally
firebase emulators:start --only functions

# Deploy specific function
firebase deploy --only functions:scheduleNotification
```

## Cost Optimization

1. **Function Optimization**
   - Use appropriate memory allocation
   - Minimize cold starts
   - Implement efficient batch processing

2. **Firestore Optimization**
   - Use compound indexes for queries
   - Implement proper data cleanup
   - Monitor read/write operations

3. **Monitoring**
   - Set up billing alerts
   - Monitor function execution metrics
   - Track notification delivery rates

## Next Steps

1. **Enhanced Features**
   - Push notification receipts tracking
   - Advanced scheduling options
   - User preference management

2. **Analytics Integration**
   - Notification engagement tracking
   - Delivery success metrics
   - User behavior analysis

3. **Advanced Monitoring**
   - Real-time alerting
   - Performance dashboards
   - Automated health checks

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review function execution metrics
3. Test with the provided test suite
4. Monitor Firestore collections for data integrity

This setup provides a robust, scalable foundation for production push notifications in the PetCareTracker app. 