import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Security status keys
const SECURITY_STATUS_KEY = 'security_status';
const ENCRYPTION_CHECK_KEY = 'encryption_initialized';
const FALLBACK_STORAGE_PREFIX = 'secure_fallback_';

/**
 * Security modes for the app
 */
export enum SecurityMode {
  SECURE = 'secure',      // Using secure storage and encryption
  FALLBACK = 'fallback',  // Using AsyncStorage with basic encryption
  DISABLED = 'disabled',  // Security disabled, using plain AsyncStorage
}

/**
 * Enum for different levels of data sensitivity
 */
export enum DataSensitivity {
  HIGH = 'high',     // Very sensitive data (credentials, health records)
  MEDIUM = 'medium', // Semi-sensitive data (pet information)
  LOW = 'low',       // Non-sensitive data (app preferences)
}

/**
 * Manages security features and provides secure storage capabilities
 */
export class SecurityService {
  private static instance: SecurityService;
  private securityMode: SecurityMode = SecurityMode.DISABLED;
  private encryptionKey: string | null = null;
  private initialized = false;

  private constructor() { }

  /**
   * Get the singleton instance of SecurityService
   */
  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security features
   * @returns Promise resolving to true if security is properly initialized
   */
  public async initialize(): Promise<boolean> {
    try {
      // Skip if already initialized
      if (this.initialized) {
        return this.securityMode !== SecurityMode.DISABLED;
      }

      console.log('Initializing security service...');

      // Check if secure storage is available
      const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
      
      if (isSecureStoreAvailable) {
        // Try to use secure storage
        try {
          // Set a test value
          await SecureStore.setItemAsync(ENCRYPTION_CHECK_KEY, 'true');
          const testValue = await SecureStore.getItemAsync(ENCRYPTION_CHECK_KEY);
          
          if (testValue === 'true') {
            // Secure storage works
            this.securityMode = SecurityMode.SECURE;
            console.log('Security initialized in SECURE mode');
            
            // Generate or retrieve encryption key
            await this.setupEncryptionKey();
            
            // Save the security status
            await AsyncStorage.setItem(SECURITY_STATUS_KEY, SecurityMode.SECURE);
            this.initialized = true;
            
            return true;
          } else {
            throw new Error('Secure storage verification failed');
          }
        } catch (secureStoreError) {
          console.error('Secure storage failed despite being available:', secureStoreError);
          // Fall back to encrypted AsyncStorage
          this.securityMode = SecurityMode.FALLBACK;
        }
      } else {
        console.warn('Secure storage is not available on this device');
        this.securityMode = SecurityMode.FALLBACK;
      }
      
      // If we're in fallback mode, set up fallback encryption
      if (this.securityMode === SecurityMode.FALLBACK) {
        console.log('Initializing fallback security...');
        const success = await this.setupFallbackEncryption();
        
        if (success) {
          console.log('Security initialized in FALLBACK mode');
          await AsyncStorage.setItem(SECURITY_STATUS_KEY, SecurityMode.FALLBACK);
          this.initialized = true;
          return true;
        } else {
          console.error('Failed to initialize fallback security');
          this.securityMode = SecurityMode.DISABLED;
        }
      }
      
      // If we reach here, security is disabled
      console.warn('Security is DISABLED. Data will not be securely stored.');
      await AsyncStorage.setItem(SECURITY_STATUS_KEY, SecurityMode.DISABLED);
      this.initialized = true;
      
      // Show critical security warning to user
      this.showSecurityWarning();
      
      return false;
    } catch (error) {
      console.error('Security initialization error:', error);
      this.securityMode = SecurityMode.DISABLED;
      this.initialized = true;
      
      // Show critical security warning to user
      this.showSecurityWarning();
      
      return false;
    }
  }

  /**
   * Get current security mode
   */
  public getSecurityMode(): SecurityMode {
    return this.securityMode;
  }

  /**
   * Check if the security service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Securely store a value
   * @param key Storage key
   * @param value Value to store
   * @param sensitivity Data sensitivity level
   */
  public async setItem(key: string, value: string, sensitivity: DataSensitivity = DataSensitivity.MEDIUM): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      switch (this.securityMode) {
        case SecurityMode.SECURE:
          if (sensitivity === DataSensitivity.HIGH) {
            // For highly sensitive data, add additional encryption
            const encryptedValue = await this.encrypt(value);
            await SecureStore.setItemAsync(key, encryptedValue);
          } else {
            // Medium/low sensitivity can go directly to secure store
            await SecureStore.setItemAsync(key, value);
          }
          break;
        
        case SecurityMode.FALLBACK:
          // In fallback mode, encrypt all data regardless of sensitivity
          const encryptedValue = await this.encrypt(value);
          await AsyncStorage.setItem(`${FALLBACK_STORAGE_PREFIX}${key}`, encryptedValue);
          break;
        
        case SecurityMode.DISABLED:
          // In disabled mode, store directly in AsyncStorage
          if (sensitivity === DataSensitivity.HIGH) {
            console.warn(`Storing HIGH sensitivity data with disabled security: ${key}`);
          }
          await AsyncStorage.setItem(key, value);
          break;
      }
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a securely stored value
   * @param key Storage key
   * @param sensitivity Data sensitivity level
   */
  public async getItem(key: string, sensitivity: DataSensitivity = DataSensitivity.MEDIUM): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      switch (this.securityMode) {
        case SecurityMode.SECURE:
          const secureValue = await SecureStore.getItemAsync(key);
          
          if (secureValue && sensitivity === DataSensitivity.HIGH) {
            // Decrypt high sensitivity data
            return await this.decrypt(secureValue);
          }
          
          return secureValue;
        
        case SecurityMode.FALLBACK:
          const encryptedValue = await AsyncStorage.getItem(`${FALLBACK_STORAGE_PREFIX}${key}`);
          
          if (encryptedValue) {
            return await this.decrypt(encryptedValue);
          }
          
          return null;
        
        case SecurityMode.DISABLED:
          return await AsyncStorage.getItem(key);
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a securely stored value
   * @param key Storage key
   */
  public async removeItem(key: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      switch (this.securityMode) {
        case SecurityMode.SECURE:
          await SecureStore.deleteItemAsync(key);
          break;
        
        case SecurityMode.FALLBACK:
          await AsyncStorage.removeItem(`${FALLBACK_STORAGE_PREFIX}${key}`);
          break;
        
        case SecurityMode.DISABLED:
          await AsyncStorage.removeItem(key);
          break;
      }
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generate a secure random string for use as keys, etc.
   * @param length Desired length of the random string
   */
  public async generateSecureRandomString(length: number = 32): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(length);
      return Array.from(new Uint8Array(randomBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Error generating secure random string:', error);
      
      // Fallback to less secure but functional random string
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  }

  /**
   * Generate a secure hash of the provided data
   * @param data Data to hash
   */
  public async hash(data: string): Promise<string> {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
    } catch (error) {
      console.error('Error generating hash:', error);
      throw error;
    }
  }

  /**
   * Check if the app's security mode is appropriate for the given sensitivity level
   * @param requiredSensitivity Minimum required sensitivity level
   */
  public isSecurityAdequate(requiredSensitivity: DataSensitivity): boolean {
    switch (requiredSensitivity) {
      case DataSensitivity.HIGH:
        return this.securityMode === SecurityMode.SECURE;
      
      case DataSensitivity.MEDIUM:
        return this.securityMode === SecurityMode.SECURE || 
               this.securityMode === SecurityMode.FALLBACK;
      
      case DataSensitivity.LOW:
        return true; // All security modes are adequate for low sensitivity
      
      default:
        return false;
    }
  }

  // Private methods

  /**
   * Set up encryption key for secure operation
   */
  private async setupEncryptionKey(): Promise<void> {
    try {
      // Try to retrieve existing key
      let key = await SecureStore.getItemAsync('encryption_key');
      
      if (!key) {
        // Generate new key
        key = await this.generateSecureRandomString(32);
        await SecureStore.setItemAsync('encryption_key', key);
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Error setting up encryption key:', error);
      throw error;
    }
  }

  /**
   * Set up fallback encryption when secure storage is unavailable
   */
  private async setupFallbackEncryption(): Promise<boolean> {
    try {
      // For fallback mode, we'll store encryption key in AsyncStorage
      // This is not fully secure but better than nothing
      let key = await AsyncStorage.getItem('fallback_encryption_key');
      
      if (!key) {
        // Generate new key
        key = await this.generateSecureRandomString(32);
        await AsyncStorage.setItem('fallback_encryption_key', key);
      }
      
      this.encryptionKey = key;
      return true;
    } catch (error) {
      console.error('Error setting up fallback encryption:', error);
      return false;
    }
  }

  /**
   * Show security warning to user
   */
  private showSecurityWarning(): void {
    Alert.alert(
      "Security Warning",
      "Your device does not support secure storage. Sensitive data like passwords and health records may not be fully protected. Consider using this app for non-sensitive data only.",
      [
        { 
          text: "I Understand", 
          style: "default" 
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * Encrypt a string value using a simple XOR cipher
   * @param value Value to encrypt
   */
  private async encrypt(value: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      // Simple XOR encryption with the key
      const keyChars = this.encryptionKey.split('');
      const valueChars = value.split('');
      
      // Create an encrypted string where each character is replaced by its 
      // XOR with a key character, then encoded to a hex representation
      let result = '';
      
      for (let i = 0; i < valueChars.length; i++) {
        const char = valueChars[i];
        const keyChar = keyChars[i % keyChars.length];
        
        // XOR the character codes and convert to hex
        const encrypted = char.charCodeAt(0) ^ keyChar.charCodeAt(0);
        result += encrypted.toString(16).padStart(4, '0');
      }
      
      return result;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decrypt an encrypted string value
   * @param encryptedValue Encrypted value to decrypt
   */
  private async decrypt(encryptedValue: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      const keyChars = this.encryptionKey.split('');
      let result = '';
      
      // Process each 4-character hex group
      for (let i = 0; i < encryptedValue.length; i += 4) {
        if (i + 4 <= encryptedValue.length) {
          // Convert hex to number
          const hexGroup = encryptedValue.substring(i, i + 4);
          const charCode = parseInt(hexGroup, 16);
          
          // XOR with the key to get original character
          const keyChar = keyChars[(i / 4) % keyChars.length];
          const originalChar = String.fromCharCode(charCode ^ keyChar.charCodeAt(0));
          
          result += originalChar;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance(); 