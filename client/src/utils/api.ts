const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Get JWT token from localStorage
const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
};

// Make authenticated API calls with JWT token
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  // Always include credentials for session-based auth
  const credentials: RequestCredentials = 'include';
  
  // Remove Content-Type if FormData is being sent (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    credentials,
    ...options,
    headers,
  });
  
  // If unauthorized and we have a token, remove it (it's invalid)
  if (response.status === 401 && token) {
    localStorage.removeItem('authToken');
  }
  
  return response;
};

// Helper function to construct full image URLs
export const getImageUrl = (relativePath: string | undefined | null): string | undefined => {
  if (!relativePath) return undefined;
  
  // If already a full URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // If relative path, prepend API_URL
  return `${API_URL}${relativePath}`;
};

export { API_URL };
