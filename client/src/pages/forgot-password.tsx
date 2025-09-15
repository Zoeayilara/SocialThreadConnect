import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      console.log('Making forgot password request:', data);
      const result = await apiRequest("POST", "/api/forgot-password", data);
      console.log('Forgot password response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Success callback triggered with data:', data);
      toast({
        title: "Code Generated",
        description: data.developmentOtp ? `Your OTP: ${data.developmentOtp}` : "Check your email for password reset instructions.",
      });
      // Store email in localStorage for OTP verification
      localStorage.setItem('resetEmail', form.getValues('email'));
      setLocation("/verify-otp");
    },
    onError: (error) => {
      console.error('Error callback triggered:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

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
          <Link href="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Link>
        </Button>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {/* Header with Icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Reset Password</h1>
            <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
              Enter your email address and we'll send you a verification code to reset your password
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input 
                          placeholder="Enter your email address" 
                          type="email"
                          className="pl-12 h-14 rounded-xl border-2 border-gray-200 bg-white text-black placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 transition-colors"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm mt-2" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={forgotPasswordMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {forgotPasswordMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending code...
                  </div>
                ) : (
                  "Send verification code"
                )}
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}