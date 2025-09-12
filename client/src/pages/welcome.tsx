import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { FoxLogo } from "@/components/FoxLogo";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Welcome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user && user.userType) {
      if (user.userType === 'vendor') {
        setLocation('/vendor-dashboard', { replace: true });
      } else {
        setLocation('/customer-dashboard', { replace: true });
      }
    }
  }, [user, setLocation]);
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