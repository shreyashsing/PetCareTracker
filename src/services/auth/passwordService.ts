import * as Crypto from 'expo-crypto';
import { getRandomBytesBase64 } from './cryptoFallback';

// Constants
const SALT_LENGTH = 16; // 16 bytes = 128 bits
const ITERATIONS = 10000; // Number of PBKDF2 iterations
const ALGORITHM = Crypto.CryptoDigestAlgorithm.SHA256;

/**
 * Generate a random salt
 * @returns Base64-encoded salt string
 */
const generateSalt = async (): Promise<string> => {
  return getRandomBytesBase64(SALT_LENGTH);
};

/**
 * Hash a password securely using PBKDF2-like approach with SHA-256
 * This is a React Native compatible implementation
 * @param password Plain text password
 * @returns Promise resolving to hashed password in format: $iterations$salt$hash
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // Generate salt
    const salt = await generateSalt();
    
    // Create key material from password and salt
    let hash = password + salt;
    
    // Multiple iterations to strengthen against brute force
    for (let i = 0; i < ITERATIONS; i++) {
      hash = await Crypto.digestStringAsync(ALGORITHM, hash);
    }
    
    // Format: $iterations$salt$hash
    return `$${ITERATIONS}$${salt}$${hash}`;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Verify a password against a hash
 * @param password Plain text password to check
 * @param hashedPassword Previously hashed password
 * @returns Promise resolving to boolean indicating if password matches
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    // Parse the stored hash value
    const parts = hashedPassword.split('$');
    
    if (parts.length !== 4) {
      console.error('Invalid hash format');
      return false;
    }
    
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const storedHash = parts[3];
    
    // Hash the provided password with the same salt and iterations
    let hash = password + salt;
    
    // Apply the same number of iterations
    for (let i = 0; i < iterations; i++) {
      hash = await Crypto.digestStringAsync(ALGORITHM, hash);
    }
    
    // Compare the generated hash with the stored hash
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}; 