/**
 * Utility functions for message-specific timestamp formatting
 */

/**
 * Formats a timestamp for messages with relative time (e.g., "2m ago", "1h ago")
 * @param timestamp - Unix timestamp in seconds or milliseconds, or ISO string
 * @returns Formatted relative time string for messages
 */
export function formatMessageTime(timestamp: number | string): string {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    // Try parsing as ISO string first, then as timestamp
    date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // If ISO parsing failed, try as timestamp
      const numTimestamp = parseInt(timestamp);
      date = new Date(numTimestamp < 946684800000 ? numTimestamp * 1000 : numTimestamp);
    }
  } else {
    // Handle numeric timestamps - check if it's in seconds or milliseconds
    if (timestamp < 946684800000) {
      // Timestamp is in seconds (before year 2000 in milliseconds), convert to milliseconds
      date = new Date(timestamp * 1000);
    } else {
      // Timestamp is already in milliseconds
      date = new Date(timestamp);
    }
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return `Invalid date (${timestamp})`;
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return diffInSeconds <= 5 ? 'just now' : `${diffInSeconds}s ago`;
  } else if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1m ago' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1h ago' : `${diffInHours}h ago`;
  } else {
    return diffInDays === 1 ? '1d ago' : `${diffInDays}d ago`;
  }
}
