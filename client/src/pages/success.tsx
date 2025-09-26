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
      // Get the temporary user data
      const tempUserType = localStorage.getItem('tempUserType');
      const authToken = localStorage.getItem('authToken');
      
      // Check if we already have a valid auth token from registration
      if (authToken && tempUserType) {
        // Invalidate auth queries to force refetch with new token
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        
        // Clean up temp data (but keep tempUserId for terms dialog)
        localStorage.removeItem('tempUserType');
        // Keep tempUserId until terms dialog is shown in dashboard
        localStorage.removeItem('tempEmail');
        localStorage.removeItem('tempPassword');
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to appropriate dashboard using wouter
        if (tempUserType === 'vendor') {
          setLocation("/vendor-dashboard");
        } else if (tempUserType === 'admin') {
          setLocation("/admin-dashboard");
        } else {
          setLocation("/customer-dashboard");
        }
        return;
      }
      
      // Fallback: try to login with temp credentials if no token
      const tempEmail = localStorage.getItem('tempEmail');
      const tempPassword = localStorage.getItem('tempPassword');
      
      if (tempEmail && tempPassword) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: tempEmail,
            password: tempPassword
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store JWT token if provided
          if (data.token) {
            localStorage.setItem('authToken', data.token);
          }
          
          // Login successful, clean up temp data (but keep tempUserId for terms dialog)
          localStorage.removeItem('tempUserType');
          // Keep tempUserId until terms dialog is shown in dashboard
          localStorage.removeItem('tempEmail');
          localStorage.removeItem('tempPassword');
          
          // Small delay to ensure token is stored
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Navigate to appropriate dashboard using wouter
          if (tempUserType === 'vendor') {
            setLocation("/vendor-dashboard");
          } else if (tempUserType === 'admin') {
            setLocation("/admin-dashboard");
          } else {
            setLocation("/customer-dashboard");
          }
          return;
        }
      }
      
      // Fallback: clean up and redirect to login
      localStorage.removeItem('tempUserType');
      localStorage.removeItem('tempUserId');
      localStorage.removeItem('tempEmail');
      localStorage.removeItem('tempPassword');
      setLocation("/login");
      
    } catch (error) {
      console.error('Navigation failed:', error);
      // Clean up and redirect to login on error
      localStorage.removeItem('tempUserType');
      localStorage.removeItem('tempUserId');
      localStorage.removeItem('tempEmail');
      localStorage.removeItem('tempPassword');
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