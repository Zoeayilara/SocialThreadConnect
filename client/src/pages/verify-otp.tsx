import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Clock, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get email from localStorage and setup timer
  useEffect(() => {
    const resetEmail = localStorage.getItem('resetEmail');
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "No email found. Please start the password reset process again.",
        variant: "destructive",
      });
      setLocation("/forgot-password");
      return;
    }
    setEmail(resetEmail);
  }, [toast, setLocation]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/verify-otp", { email, otp: code });
    },
    onSuccess: () => {
      // Store verified OTP for reset password page
      localStorage.setItem('verifiedOtp', otp);
      setLocation("/reset-password");
    },
    onError: (error) => {
      toast({
        title: "Invalid Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate(value);
    }
  };

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/forgot-password", { email });
    },
    onSuccess: () => {
      setTimeLeft(600); // Reset timer
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2"
          asChild
        >
          <Link href="/forgot-password">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {/* Header with Icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Enter Verification Code</h1>
            <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
              We've sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center bg-gray-50 rounded-full px-4 py-2">
              <Clock className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                {timeLeft > 0 ? formatTime(timeLeft) : "Expired"}
              </span>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                onComplete={handleOtpComplete}
                disabled={timeLeft <= 0}
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot 
                    index={0} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                  <InputOTPSlot 
                    index={1} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                  <InputOTPSlot 
                    index={2} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                  <InputOTPSlot 
                    index={3} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                  <InputOTPSlot 
                    index={4} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                  <InputOTPSlot 
                    index={5} 
                    className="w-14 h-14 text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-black focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Verify Button */}
            <Button 
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              onClick={() => {
                if (otp.length === 6) {
                  verifyOtpMutation.mutate(otp);
                }
              }}
              disabled={otp.length !== 6 || verifyOtpMutation.isPending || timeLeft <= 0}
            >
              {verifyOtpMutation.isPending ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                "Verify Code"
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                onClick={() => resendOtpMutation.mutate()}
                disabled={resendOtpMutation.isPending || timeLeft > 540} // Can resend after 1 minute
              >
                {resendOtpMutation.isPending ? (
                  <div className="flex items-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend code
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}