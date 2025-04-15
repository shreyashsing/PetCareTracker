import { jest } from '@jest/globals';
import { SecurityService, SecurityMode, DataSensitivity } from '../../../src/services/security';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize in SECURE mode when secure store is available', async () => {
      const securityService = SecurityService.getInstance();
      const result = await securityService.initialize();
      
      expect(result).toBe(true);
      expect(securityService.getSecurityMode()).toBe(SecurityMode.SECURE);
      expect(securityService.isInitialized()).toBe(true);
    });

    it('should fall back to FALLBACK mode when secure store is not available', async () => {
      jest.spyOn(SecureStore, 'isAvailableAsync').mockResolvedValueOnce(false);
      
      const securityService = SecurityService.getInstance();
      await securityService.initialize();
      
      expect(securityService.getSecurityMode()).toBe(SecurityMode.FALLBACK);
    });
  });

  describe('data storage', () => {
    it('should store highly sensitive data with encryption in SECURE mode', async () => {
      const securityService = SecurityService.getInstance();
      await securityService.initialize();
      
      await securityService.setItem('testKey', 'testValue', DataSensitivity.HIGH);
      
      // The value should be encrypted before storage
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should retrieve and decrypt highly sensitive data', async () => {
      const securityService = SecurityService.getInstance();
      await securityService.initialize();
      
      await securityService.setItem('testKey', 'testValue', DataSensitivity.HIGH);
      const value = await securityService.getItem('testKey', DataSensitivity.HIGH);
      
      expect(value).not.toBeNull();
    });
  });

  describe('security adequacy check', () => {
    it('should correctly identify if security is adequate for the requested sensitivity', async () => {
      const securityService = SecurityService.getInstance();
      await securityService.initialize();
      
      // SECURE mode should be adequate for all sensitivity levels
      expect(securityService.isSecurityAdequate(DataSensitivity.HIGH)).toBe(true);
      expect(securityService.isSecurityAdequate(DataSensitivity.MEDIUM)).toBe(true);
      expect(securityService.isSecurityAdequate(DataSensitivity.LOW)).toBe(true);
      
      // Force FALLBACK mode
      jest.spyOn(securityService, 'getSecurityMode').mockReturnValue(SecurityMode.FALLBACK);
      
      // FALLBACK should be adequate for MEDIUM and LOW
      expect(securityService.isSecurityAdequate(DataSensitivity.HIGH)).toBe(false);
      expect(securityService.isSecurityAdequate(DataSensitivity.MEDIUM)).toBe(true);
      expect(securityService.isSecurityAdequate(DataSensitivity.LOW)).toBe(true);
    });
  });
}); 