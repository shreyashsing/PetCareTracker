import * as Crypto from 'expo-crypto';

/**
 * This is a minimal fallback implementation for secure random bytes 
 * that works in React Native environment
 */

// Simplified base64 encoding for React Native
export function bytesToBase64(bytes: Uint8Array): string {
  // Use a more efficient method in React Native
  try {
    // For modern environments that support this method
    return global.btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  } catch (e) {
    // Fallback for older environments or if above method fails
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    const len = bytes.length;
    let i = 0;
    
    while (i < len) {
      const b1 = bytes[i++] || 0;
      const b2 = i < len ? bytes[i++] : 0;
      const b3 = i < len ? bytes[i++] : 0;
      
      const enc1 = b1 >> 2;
      const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
      const enc3 = ((b2 & 15) << 2) | (b3 >> 6);
      const enc4 = b3 & 63;
      
      result += chars.charAt(enc1) + chars.charAt(enc2) +
                (i - 2 < len ? chars.charAt(enc3) : '=') +
                (i - 1 < len ? chars.charAt(enc4) : '=');
    }
    
    return result;
  }
}

/**
 * Get random bytes using expo-crypto or fallback
 * @param size Number of bytes
 * @returns Random bytes as Uint8Array
 */
export const getRandomBytes = async (size: number): Promise<Uint8Array> => {
  try {
    // Try to use expo-crypto for secure random bytes
    return await Crypto.getRandomBytesAsync(size);
  } catch (error) {
    console.error('Error using expo-crypto for random bytes:', error);
    
    // Fallback to less secure Math.random
    const randomValues = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
    return randomValues;
  }
};

/**
 * Get random bytes as Base64 string
 * @param size Number of bytes
 * @returns Base64 encoded random bytes
 */
export const getRandomBytesBase64 = async (size: number): Promise<string> => {
  const bytes = await getRandomBytes(size);
  return bytesToBase64(bytes);
}; 