import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, Phone } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FoxLogo } from "@/components/FoxLogo";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  university: z.string().min(1, "University is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  userType: z.enum(["customer", "vendor"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const userType = new URLSearchParams(window.location.search).get('type') || 'customer';

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      university: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      userType: userType as "vendor" | "customer",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      return await apiRequest("POST", "/api/register", data);
    },
    onSuccess: async (result, formData) => {
      // Update auth context with the new user data
      queryClient.setQueryData(['auth', 'user'], result.user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      
      // Store JWT token if provided
      if (result.token) {
        console.log('🔑 Frontend - Storing JWT token from registration');
        localStorage.setItem('authToken', result.token);
        console.log('🔑 Frontend - Token stored, verifying:', localStorage.getItem('authToken') ? 'SUCCESS' : 'FAILED');
      } else {
        console.log('❌ Frontend - No token received from registration');
      }
      
      // Store temporary data for use in subsequent pages
      localStorage.setItem('tempUserType', formData.userType);
      localStorage.setItem('tempUserId', result.userId);
      localStorage.setItem('tempEmail', formData.email);
      localStorage.setItem('tempPassword', formData.password);

      toast({
        title: "Registration successful!",
        description: "Please upload a profile picture to continue.",
      });

      // Small delay to ensure auth state is updated
      setTimeout(() => {
        setLocation("/upload-picture");
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
      <div className="w-full max-w-sm relative">
        {/* Removed close button per request */}

        {/* Floating Logo */}
        <div className="w-full flex items-center justify-center mb-6">
          <FoxLogo size={72} className="mb-2 animate-float" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-sm p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Create your Account</h1>
          </div>

        {/* Registration Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        placeholder="Enter your name" 
                        className="pl-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="university"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        placeholder="University name" 
                        className="pl-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        placeholder="Email Address" 
                        className="pl-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        placeholder="Phone Number" 
                        className="pl-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Password" 
                        className="pl-12 pr-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                      <Input 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password" 
                        className="pl-12 pr-12 h-14 rounded-2xl border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500"
                        {...field} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={registerMutation.isPending}
              className="w-full h-14 rounded-full font-medium text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600"
            >
              {registerMutation.isPending ? "Creating..." : "Sign up"}
            </Button>
          </form>
        </Form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link href="/login">
                <Button variant="link" className="text-black font-medium p-0">
                  Sign in
                </Button>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Page-scoped animation */}
      <style>{`
        @keyframes floatUpDown { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-6px); } 
        }
        .animate-float { 
          animation: floatUpDown 3s ease-in-out infinite; 
        }
      `}</style>
    </div>
  );
}