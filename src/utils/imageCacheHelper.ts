import { clearImageCache } from './imageOptimization';

/**
 * Refreshes the image cache by clearing all cached images
 */
export const refreshImageCache = (): void => {
  console.log('Refreshing image cache');
  clearImageCache();
};

/**
 * Adds a cache buster parameter to an image URL to force a fresh load
 * @param url The image URL to add a cache buster to
 * @returns The URL with a cache buster parameter
 */
export const addCacheBuster = (url: string): string => {
  if (!url) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cache=${Date.now()}`;
}; 