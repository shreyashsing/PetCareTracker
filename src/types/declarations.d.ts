/**
 * Global type declarations
 */

// Expo Notifications
declare module 'expo-notifications' {
  export interface NotificationRequest {
    identifier: string;
    content: NotificationContent;
    trigger: any;
  }

  export interface NotificationContent {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: any;
    badge?: number;
    sound?: boolean | string;
    priority?: string;
    vibrate?: boolean | number[];
    launchImageName?: string;
  }

  export interface NotificationContentInput {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: any;
    badge?: number;
    sound?: boolean | string;
  }

  export interface Notification {
    date: number;
    request: NotificationRequest;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
    userText?: string;
  }

  export function setNotificationHandler(handler: {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }): void;

  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): { remove: () => void };

  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): { remove: () => void };

  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;

  export function scheduleNotificationAsync(notificationRequest: {
    content: NotificationContentInput;
    trigger: Date | null;
  }): Promise<string>;

  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
}

// Expo Device
declare module 'expo-device' {
  export const isDevice: boolean;
  export const brand: string;
  export const manufacturer: string;
  export const modelName: string;
  export const modelId: string;
  export const designName: string;
  export const productName: string;
  export const deviceYearClass: number;
  export const totalMemory: number;
  export const supportedCpuArchitectures: string[];
  export const osName: string;
  export const osVersion: string;
  export const osBuildId: string;
  export const osInternalBuildId: string;
  export const osBuildFingerprint: string;
  export const platformApiLevel: number;
  export const deviceName: string;
}

// Environment variables
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const GEMINI_API_KEY: string;
}