import { format, parse } from "date-fns";

/**
 * Time utility functions for consistent time handling across the app.
 * - Storage format: 24-hour format (HH:mm) in database
 * - Display format: 12-hour format with AM/PM suffix for UI
 */

/**
 * Get current time in 24-hour format (HH:mm) for database storage
 * @returns Time string in 24-hour format (e.g., "14:30")
 */
export function getCurrentTime24(): string {
  return format(new Date(), "HH:mm");
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM for display
 * @param time24 - Time string in 24-hour format (HH:mm)
 * @returns Time string in 12-hour format with AM/PM (e.g., "2:30 PM")
 */
export function formatTime12(time24: string): string {
  try {
    const date = parse(time24, "HH:mm", new Date());
    return format(date, "h:mm a");
  } catch (error) {
    console.error("Error formatting time:", error);
    return time24; // Fallback to original value
  }
}

/**
 * Convert 12-hour time with AM/PM to 24-hour format for storage
 * @param time12 - Time string in 12-hour format with AM/PM (e.g., "2:30 PM")
 * @returns Time string in 24-hour format (e.g., "14:30")
 */
export function formatTime24(time12: string): string {
  try {
    const date = parse(time12, "h:mm a", new Date());
    return format(date, "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return time12; // Fallback to original value
  }
}

/**
 * Validate if a time string is in valid 24-hour format (HH:mm)
 * @param time - Time string to validate
 * @returns True if valid 24-hour format
 */
export function isValidTime24(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
