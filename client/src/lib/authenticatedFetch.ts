const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Always include credentials for session-based auth fallback
  const requestOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };
  
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  
  return fetch(fullUrl, requestOptions);
}
