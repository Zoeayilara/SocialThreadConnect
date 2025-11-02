import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Success() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const queryClient = useQueryClient();

  const handleContinue = async () => {
    setIsLoading(true);
    setIsRedirecting(true);
    
    try {
      // Check if we have a valid auth token
      const authToken = localStorage.getItem('authToken');
      
      if (authToken) {
        // Fetch user data to determine dashboard
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/auth/user`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Invalidate auth queries to force refetch
          queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
          queryClient.setQueryData(['auth', 'user'], userData);
          
          // Navigate to appropriate dashboard
          if (userData.userType === 'vendor') {
            window.location.replace('/vendor-dashboard');
          } else if (userData.userType === 'admin') {
            window.location.replace('/admin-dashboard');
          } else {
            window.location.replace('/customer-dashboard');
          }
          return;
        }
      }
      
      // Fallback: redirect to login if no valid token
      console.log('❌ No valid auth token, redirecting to login');
      setLocation("/login");
      
    } catch (error) {
      console.error('Error in success page:', error);
      setLocation("/login");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner if redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="text-white text-2xl">✓</div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Redirecting to Dashboard...</h1>
          <p className="text-muted-foreground">Please wait while we set up your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <Card>
          <CardContent className="pt-6">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="text-white text-2xl" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold mb-4">Account Created Successfully!</h1>
            <p className="text-muted-foreground mb-8">
              Welcome to EntreeFox! Your account has been created and you're ready to start connecting with your community.
            </p>

            {/* Continue Button */}
            <Button 
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {isLoading ? "Logging in..." : "Continue to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}