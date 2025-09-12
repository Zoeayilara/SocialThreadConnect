const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Get JWT token from localStorage
const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
};

// Make authenticated API calls with JWT token
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export { API_URL };
