import * as Crypto from 'expo-crypto';

/**
 * Generate a random encryption key
 * @returns Base64 encoded random key
 */
export const generateEncryptionKey = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits key
  return Buffer.from(randomBytes).toString('base64');
};

/**
 * Hash a sensitive value (one-way encryption)
 * @param value Value to hash
 * @returns Hashed value
 */
export const hashValue = async (value: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value
  );
};

/**
 * Basic encryption for sensitive data 
 * (Note: For production apps, use a more robust encryption library)
 * @param text Text to encrypt
 * @param key Encryption key (Base64)
 * @returns Encrypted text (Base64)
 */
export const encryptData = async (text: string, key: string): Promise<string> => {
  // In a real app, use a proper encryption library
  // This is a simple XOR-based encryption for demonstration purposes
  
  // Convert key to Buffer
  const keyBuffer = Buffer.from(key, 'base64');
  
  // Convert text to Buffer
  const textBuffer = Buffer.from(text, 'utf-8');
  
  // Simple XOR encryption
  const result = new Uint8Array(textBuffer.length);
  
  for (let i = 0; i < textBuffer.length; i++) {
    result[i] = textBuffer[i] ^ keyBuffer[i % keyBuffer.length];
  }
  
  // Return base64 encoded result
  return Buffer.from(result).toString('base64');
};

/**
 * Basic decryption for sensitive data
 * (Note: For production apps, use a more robust encryption library)
 * @param encryptedText Encrypted text (Base64)
 * @param key Encryption key (Base64)
 * @returns Decrypted text
 */
export const decryptData = async (encryptedText: string, key: string): Promise<string> => {
  // In a real app, use a proper encryption library
  // This is a simple XOR-based encryption for demonstration purposes
  
  // Convert key to Buffer
  const keyBuffer = Buffer.from(key, 'base64');
  
  // Convert encrypted text to Buffer
  const encryptedBuffer = Buffer.from(encryptedText, 'base64');
  
  // Simple XOR decryption (same as encryption)
  const result = new Uint8Array(encryptedBuffer.length);
  
  for (let i = 0; i < encryptedBuffer.length; i++) {
    result[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length];
  }
  
  // Return utf-8 encoded result
  return Buffer.from(result).toString('utf-8');
};

/**
 * Generate a secure random token (useful for reset tokens, etc.)
 * @param length Length of token
 * @returns Random token
 */
export const generateSecureToken = async (length: number = 32): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return Buffer.from(randomBytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, length);
};

/**
 * Verify if a string is probably an encrypted value (starts with specific pattern)
 * @param text Text to check
 * @returns Boolean indicating if text is encrypted
 */
export const isEncryptedValue = (text: string): boolean => {
  // In a real app, use a more robust method
  // This is a simple check for demonstration purposes
  const pattern = /^[A-Za-z0-9+/]+=*$/;
  return pattern.test(text) && text.length > 20;
}; 