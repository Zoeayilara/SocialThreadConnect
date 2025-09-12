import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Welcome from "@/pages/welcome";
import UserSelection from "@/pages/user-selection";
import Register from "@/pages/register";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import VerifyOtp from "@/pages/verify-otp";
import ResetPassword from "@/pages/reset-password";
import UploadPicture from "@/pages/upload-picture";
import Success from "@/pages/success";
import Social from "@/pages/social";
import VendorDashboard from "@/pages/vendor-dashboard";
import CustomerDashboard from "@/pages/customer-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Settings from './pages/settings';
import Notifications from './pages/notifications';
import Saved from './pages/saved';
import Account from './pages/account';
import Activity from './pages/activity';
import Profile from './pages/profile';
import Messages from './pages/messages';
import CreatePost from './pages/create-post';

function AppContent() {
  const { user, isLoggingOut, isAuthenticating } = useAuth();
  
  // Auto-redirect authenticated users from welcome to dashboard
  if (user && (window.location.pathname === '/welcome' || window.location.pathname === '/')) {
    let dashboardPath = '/customer-dashboard';
    if (user.userType === 'vendor') {
      dashboardPath = '/vendor-dashboard';
    } else if (user.userType === 'admin') {
      dashboardPath = '/admin-dashboard';
    }
    window.history.replaceState(null, '', dashboardPath);
  }

  // Show loading spinner only during logout or authentication
  if (isLoggingOut || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
        <LoadingOverlay text={isLoggingOut ? "Logging out" : "Signing in"} overlay={false} />
      </div>
    );
  }

  return (
    <>
    <Switch>
      {!user ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/welcome" component={Welcome} />
          <Route path="/user-selection" component={UserSelection} />
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/verify-otp" component={VerifyOtp} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/success" component={Success} />
        </>
      ) : (
        <>
          <Route path="/" component={user.userType === 'vendor' ? VendorDashboard : user.userType === 'admin' ? AdminDashboard : CustomerDashboard} />
          <Route path="/welcome" component={user.userType === 'vendor' ? VendorDashboard : user.userType === 'admin' ? AdminDashboard : CustomerDashboard} />
          <Route path="/upload-picture" component={UploadPicture} />
          <Route path="/success" component={Success} />
          <Route path="/social" component={Social} />
          <Route path="/vendor-dashboard" component={VendorDashboard} />
          <Route path="/customer-dashboard" component={CustomerDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/settings" component={() => <Settings onBack={() => window.history.back()} />} />
          <Route path="/notifications" component={() => <Notifications onBack={() => window.history.back()} />} />
          <Route path="/saved" component={Saved} />
          <Route path="/account" component={() => <Account onBack={() => window.history.back()} />} />
          <Route path="/activity" component={() => <Activity onBack={() => window.history.back()} />} />
          <Route path="/messages" component={() => <Messages onBack={() => window.history.back()} />} />
          <Route path="/create-post" component={CreatePost} />
          <Route path="/profile/:userId" component={({ params }: any) => <Profile onBack={() => window.history.back()} userId={parseInt(params.userId)} />} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}