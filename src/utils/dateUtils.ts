/**
 * Utility functions for date handling and formatting
 */

/**
 * Convert a JavaScript Date object to an ISO string format
 * suitable for Supabase timestamps
 * 
 * @param date JavaScript Date object
 * @returns ISO string formatted for Supabase
 */
export function formatDateForSupabase(date: Date): string {
  if (!date) return '';
  return date.toISOString();
}

/**
 * Convert a Supabase timestamp string to a JavaScript Date object
 * 
 * @param dateString Timestamp string from Supabase
 * @returns JavaScript Date object
 */
export function parseSupabaseDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  return new Date(dateString);
}

/**
 * Format a date object to a user-friendly string (e.g., "Jan 15, 2023")
 * 
 * @param date JavaScript Date object
 * @returns Formatted date string
 */
export function formatReadableDate(date: Date | undefined): string {
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  });
}

/**
 * Get age in years based on birth date
 * 
 * @param birthDate Birth date
 * @returns Age in years
 */
export function getAge(birthDate: Date | undefined): number | undefined {
  if (!birthDate) return undefined;
  
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  
  // Adjust if birthday hasn't occurred yet this year
  const hasBirthdayOccurred = 
    now.getMonth() > birthDate.getMonth() || 
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  
  if (!hasBirthdayOccurred) {
    age--;
  }
  
  return age;
}

/**
 * Convert date object to YYYY-MM-DD format
 * 
 * @param date JavaScript Date object
 * @returns Date in YYYY-MM-DD format
 */
export function formatYYYYMMDD(date: Date | undefined): string {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convert time object to HH:MM format
 * 
 * @param date JavaScript Date object
 * @returns Time in HH:MM format
 */
export function formatHHMM(date: Date | undefined): string {
  if (!date) return '';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
} 