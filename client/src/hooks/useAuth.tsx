import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  profileImageUrl?: string | null;
  isVerified?: boolean;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  isAuthenticating: boolean;
  isUserDataComplete: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  redirectToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoggingOut] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  // Check for temp registration data to skip auth query if present
  const tempUserId = typeof window !== 'undefined' ? localStorage.getItem('tempUserId') : null;
  
  const { data: user, error, isLoading: userQueryLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/auth/user`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticating(false);
          return null;
        }
        throw new Error('Failed to fetch user');
      }
      const userData = await response.json();
      setIsAuthenticating(false);
      return userData;
    },
    enabled: !tempUserId && !hasLoggedOut,
    retry: false, // Don't retry to prevent loading loops
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnMount: true,
  });

  // Show loading only during initial authentication check, but not after logout
  const isLoading = tempUserId ? false : (userQueryLoading && !user && !error && !hasLoggedOut);

  // Check if user data is fully loaded and complete
  const isUserDataComplete = !!user && !!user.userType && !!user.id && !!user.email;

  // Function to redirect users to their appropriate dashboard
  const redirectToDashboard = () => {
    if (user) {
      let dashboardPath = '/customer-dashboard';
      if (user.userType === 'vendor') {
        dashboardPath = '/vendor-dashboard';
      } else if (user.userType === 'admin') {
        dashboardPath = '/admin-dashboard';
      }
      window.history.pushState(null, '', dashboardPath);
      // Trigger a popstate event to update wouter
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      setIsAuthenticating(true);
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Clear any temp data from registration
      localStorage.removeItem('tempUserId');
      localStorage.removeItem('tempUserType');
      localStorage.removeItem('tempEmail');
      localStorage.removeItem('tempPassword');
      
      queryClient.setQueryData(['auth', 'user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      setIsAuthenticating(false);
      
      toast({
        title: "Login successful!",
        description: `Welcome back, ${data.user.firstName}!`,
      });

      setTimeout(() => {
        if (data.user.userType === 'vendor') {
          window.location.replace('/vendor-dashboard');
        } else if (data.user.userType === 'admin') {
          window.location.replace('/admin-dashboard');
        } else {
          window.location.replace('/customer-dashboard');
        }
      }, 1000);
    },
    onError: (error: Error) => {
      setIsAuthenticating(false);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Don't reset authenticating state here to prevent 404 flashes during redirect
      // It will be reset when the page reloads after redirect
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.clear(); // Clear all queries
      setHasLoggedOut(true);
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
      // Direct navigation to welcome page
      setTimeout(() => {
        window.location.href = '/welcome';
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isLoggingOut,
        isAuthenticating,
        isUserDataComplete,
        error,
        loginMutation,
        logoutMutation,
        redirectToDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}