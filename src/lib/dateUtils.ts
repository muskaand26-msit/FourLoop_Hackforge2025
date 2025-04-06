/**
 * Date utilities for consistent date handling across the application
 */

/**
 * Get a standardized day of week string from a Date object
 * This ensures consistent day name formatting between frontend and backend
 * 
 * @param date The date to get the day name for
 * @returns A standardized day name (Monday, Tuesday, etc.)
 */
export function getDayOfWeek(date: Date): string {
  // Get the day name with proper capitalization and no trailing spaces
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Format a date as YYYY-MM-DD for database queries
 * Ensures the date is in UTC to prevent timezone issues
 * 
 * @param date The date to format
 * @returns The date formatted as YYYY-MM-DD
 */
export function formatDateForDB(date: Date): string {
  // Create a new date object with the same year, month, and day
  // This ensures we don't have timezone issues
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create a new date with time set to noon to avoid timezone issues
  const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  
  // Format as YYYY-MM-DD
  return normalizedDate.toISOString().split('T')[0];
}

/**
 * Format a date for display in the UI
 * 
 * @param date The date to format
 * @returns A user-friendly date string
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get a standardized SQL query for converting a date to a day name
 * This helps synchronize between frontend and backend day name format
 * 
 * @returns SQL fragment for extracting consistent day names
 */
export function getSQLDayOfWeekConversion(): string {
  // Return the SQL function that matches our JS implementation
  return "TO_CHAR(date, 'Day')";
} 