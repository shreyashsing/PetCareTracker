// Jest setup file
import { jest } from '@jest/globals';

// Mock the expo modules that might cause issues
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve('testValue')),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('hashedValue')),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32))),
}));

// Mock react-native components and APIs
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve('{"testKey": "testValue"}')),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Global setup
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  })
);

// Silence console.error and console.warn in tests
global.console.error = jest.fn();
global.console.warn = jest.fn(); 