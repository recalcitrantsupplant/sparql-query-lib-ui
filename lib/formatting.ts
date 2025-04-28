import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date string into a relative time string (e.g., "about 2 hours ago").
 * Returns an empty string if the input is invalid or null/undefined.
 * @param dateString - The ISO 8601 date string to format.
 * @returns A relative time string or an empty string.
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }
  try {
    const date = parseISO(dateString);
    // Add suffix 'ago'
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error parsing date for relative time:", error, "Input:", dateString);
    return ''; // Return empty string on error
  }
}
