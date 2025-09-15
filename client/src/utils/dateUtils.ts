/**
 * Utility functions for consistent timestamp handling across the application
 */

/**
 * Formats a timestamp for display as relative time (e.g., "2hr ago", "3min ago")
 * @param timestamp - Unix timestamp in seconds or milliseconds, or ISO string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number | string): string {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    // Handle both seconds and milliseconds timestamps
    // If timestamp is less than a reasonable year 2000 timestamp in milliseconds,
    // assume it's in seconds and convert to milliseconds
    const msTimestamp = timestamp < 946684800000 ? timestamp * 1000 : timestamp;
    date = new Date(msTimestamp);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return diffInSeconds <= 0 ? 'now' : `${diffInSeconds}s ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}min ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}hr ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }
  
  // For older posts, show the actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Formats a timestamp for display as a readable date
 * @param timestamp - Unix timestamp in seconds or milliseconds, or ISO string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number | string): string {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    // Handle both seconds and milliseconds timestamps
    const msTimestamp = timestamp < 946684800000 ? timestamp * 1000 : timestamp;
    date = new Date(msTimestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Formats a timestamp for display with full date and time in 24-hour format
 * @param timestamp - Unix timestamp in seconds or milliseconds, or ISO string
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number | string): string {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    // Handle both seconds and milliseconds timestamps
    const msTimestamp = timestamp < 946684800000 ? timestamp * 1000 : timestamp;
    date = new Date(msTimestamp);
  }
  
  return date.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Gets current Unix timestamp in seconds (for consistency with database)
 * @returns Current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Converts any timestamp format to Unix seconds
 * @param timestamp - Timestamp in any format
 * @returns Unix timestamp in seconds
 */
export function toUnixSeconds(timestamp: number | string | Date): number {
  if (timestamp instanceof Date) {
    return Math.floor(timestamp.getTime() / 1000);
  }
  
  if (typeof timestamp === 'string') {
    return Math.floor(new Date(timestamp).getTime() / 1000);
  }
  
  // If it's already in seconds, return as is
  // If it's in milliseconds, convert to seconds
  return timestamp < 946684800000 ? timestamp : Math.floor(timestamp / 1000);
}
