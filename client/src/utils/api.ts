const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Get JWT token from localStorage
const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
};

// Make authenticated API calls with JWT token
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  console.log('🔍 Frontend authenticatedFetch - Token:', token ? 'EXISTS' : 'MISSING');
  console.log('🔍 Frontend authenticatedFetch - URL:', url);
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  // Only set Content-Type for non-FormData requests
  // FormData automatically sets the correct Content-Type with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔍 Frontend authenticatedFetch - Authorization header set');
  } else {
    console.log('❌ Frontend authenticatedFetch - No token, no Authorization header');
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    credentials: 'include',
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
