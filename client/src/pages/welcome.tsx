import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FoxLogo } from "@/components/FoxLogo";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Welcome() {
  const { user, isLoading } = useAuth();

  // Only redirect if user is truly authenticated and not in a logout state
  useEffect(() => {
    // Check if we're in a logout state or if we just navigated to welcome intentionally
    const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
    const currentPath = window.location.pathname;
    
    // Don't redirect if:
    // 1. We're in a logout state
    // 2. We're currently loading
    // 3. We explicitly navigated to /welcome (user clicked welcome or was redirected here)
    if (isLoggingOut || isLoading || currentPath === '/welcome') {
      return;
    }
    
    // Only redirect if user exists, has userType, and we're not on welcome page intentionally
    if (user && user.userType) {
      const dashboardPath = user.userType === 'vendor' ? '/vendor-dashboard' : '/customer-dashboard';
      window.location.replace(dashboardPath);
    }
  }, [user, isLoading]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo and Welcome */}
        <div className="mb-12">
          <FoxLogo size={120} className="mb-8" />
          <h1 className="text-3xl font-bold text-black mb-4">Welcome!</h1>
        </div>

        {/* Get Started Button */}
        <div className="space-y-4">
          <Link href="/user-selection">
            <Button className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-full font-medium text-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}