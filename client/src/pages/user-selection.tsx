import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Link } from "wouter";

export default function UserSelection() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800"
          asChild
        >
          <Link href="/welcome">
            <X className="h-5 w-5" />
          </Link>
        </Button>

        {/* Illustration Area with Animation */}
        <div className="text-center mb-16">
          <div className="h-64 flex items-center justify-center relative">
            {/* Animated illustration */}
            <div className="relative">
              {/* Background circles for animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-white/20 animate-pulse"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-white/30 animate-ping"></div>
              </div>
              
              {/* User icons */}
              <div className="relative z-10 flex items-center justify-center space-x-8">
                {/* Vendor figure */}
                <div className="animate-bounce delay-0">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mt-2 text-xs font-medium text-blue-700">Vendor</div>
                </div>
                
                {/* Connection line */}
                <div className="flex items-center">
                  <div className="w-8 h-0.5 bg-blue-400 animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1 animate-pulse"></div>
                  <div className="w-8 h-0.5 bg-blue-400 animate-pulse"></div>
                </div>
                
                {/* Customer figure */}
                <div className="animate-bounce delay-300">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-700">Customer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Type Selection with more spacing */}
        <div className="space-y-6">
          <Link href="/register?type=vendor">
            <Button className="w-full h-16 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-medium text-lg transition-all duration-200 transform hover:scale-105">
              Vendor
            </Button>
          </Link>

          <Link href="/register?type=customer">
            <Button 
              variant="outline" 
              className="w-full h-16 bg-white border-2 border-gray-300 text-black hover:bg-gray-50 rounded-2xl font-medium text-lg transition-all duration-200 transform hover:scale-105"
            >
              Customer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}