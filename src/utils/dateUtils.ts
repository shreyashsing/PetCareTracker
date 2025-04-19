/**
 * Utility functions for date handling
 */

/**
 * Format a date for Supabase (ISO 8601 with timezone)
 * @param date The date to format
 * @returns ISO 8601 formatted date string with timezone
 */
export const formatDateForSupabase = (date: Date): string => {
  if (!date) return '';
  if (!(date instanceof Date)) {
    try {
      date = new Date(date);
    } catch (e) {
      console.error('Invalid date provided to formatDateForSupabase:', date, e);
      return '';
    }
  }
  return date.toISOString();
};

/**
 * Parse a date string from Supabase to a Date object
 * @param dateString ISO 8601 date string
 * @returns Date object
 */
export const parseSupabaseDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString);
  } catch (e) {
    console.error('Error parsing date:', dateString, e);
    return null;
  }
};

/**
 * Format a date for display in the UI
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export const formatDateForDisplay = (
  date: Date | string | null, 
  includeTime: boolean = false
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString(undefined, options);
  } catch (e) {
    console.error('Error formatting date for display:', date, e);
    return 'Invalid date';
  }
};

/**
 * Calculate age from birth date
 * Returns age in years, or months if less than 1 year
 */
export function calculateAge(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return 'Unknown';
  
  try {
    const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    
    if (isNaN(birthDateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDateObj.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    if (diffYears < 1) {
      const diffMonths = Math.floor(diffYears * 12);
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
    } else {
      const years = Math.floor(diffYears);
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
  } catch (error) {
    console.error('Error calculating age:', error);
    return 'Unknown';
  }
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