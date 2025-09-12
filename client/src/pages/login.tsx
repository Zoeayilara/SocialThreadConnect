import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { FoxLogo } from "@/components/FoxLogo";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect after successful login
  if (user && loginMutation.isSuccess) {
    if (user.userType === 'vendor') {
      setLocation('/vendor-dashboard');
    } else {
      setLocation('/customer-dashboard');
    }
  }

  // Redirect if already logged in
  if (user) {
    if (user.userType === 'vendor') {
      setLocation('/vendor-dashboard');
    } else {
      setLocation('/customer-dashboard');
    }
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
      <div className="w-full max-w-sm">
        {/* Floating Logo */}
        <div className="w-full flex items-center justify-center mb-6">
          <FoxLogo size={72} className="mb-2 animate-float" />
        </div>

        {/* Frosted Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-sm p-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">Sign In</h2>
            <p className="text-gray-600 text-sm">Sign in to your EntreeFox account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-12 rounded-2xl bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-12 rounded-2xl bg-gray-50 border-gray-300 pr-12 text-gray-900 placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-full font-medium text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Button
              variant="link"
              onClick={() => setLocation("/forgot-password")}
              className="text-sm"
            >
              Forgot your password?
            </Button>
            
            <div className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Button
                variant="link"
                onClick={() => setLocation("/register")}
                className="p-0 h-auto font-semibold"
              >
                Sign up here
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Page-scoped animation */}
      <style>{`
        @keyframes floatUpDown { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-float { animation: floatUpDown 3s ease-in-out infinite; }
      `}</style>

      {/* Signing overlay */}
      {loginMutation.isPending && <LoadingOverlay text="Signing in" overlay size={128} />}
    </div>
  );
}