import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, Users, FileText, MessageSquare, CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';
import { useState } from "react";
import AdminReports from './admin-reports';
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FoxLogo } from "@/components/FoxLogo";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";


interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  is_verified: number;
  university: string;
  phone: string;
  created_at: number;
  profile_image_url?: string;
}

interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalPosts: number;
  totalComments: number;
  pendingReports?: number;
}

export default function AdminDashboard() {
  const { user, isLoggingOut, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showReports, setShowReports] = useState(false);
  
  // Redirect if not admin
  if (user && user.userType !== 'admin') {
    setLocation('/customer-dashboard');
    return null;
  }

  // Show loading spinner during logout
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
        <LoadingOverlay text="Logging out" overlay={false} />
      </div>
    );
  }

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch admin stats');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch users with pagination and search
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users', currentPage, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery })
      });
      const response = await authenticatedFetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Verify/unverify user mutation
  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: number; isVerified: boolean }) => {
      const response = await authenticatedFetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified }),
      });
      if (!response.ok) throw new Error('Failed to update user verification');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyUser = (userId: number, currentStatus: boolean) => {
    verifyUserMutation.mutate({ userId, isVerified: !currentStatus });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const getUserDisplayName = (user: AdminUser) => 
    (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show reports page if requested
  if (showReports) {
    return <AdminReports onBack={() => setShowReports(false)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-gray-800">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FoxLogo size={28} />
            <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
            <Badge variant="secondary" className="bg-red-600 text-white">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowReports(true)}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/customer-dashboard')}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <Eye className="w-4 h-4 mr-2" />
              View as User
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Verified Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.verifiedUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Unverified Users</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.unverifiedUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalPosts || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalComments || 0}</div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-900 border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={() => setShowReports(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Pending Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.pendingReports || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white">User Management</CardTitle>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingOverlay text="Loading users..." overlay={false} />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {usersData?.users?.map((adminUser: AdminUser) => (
                    <div key={adminUser.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={adminUser.profile_image_url ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${adminUser.profile_image_url}` : undefined} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {adminUser.first_name?.[0]}{adminUser.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white">{getUserDisplayName(adminUser)}</h3>
                            {adminUser.is_verified ? (
                              <Badge variant="secondary" className="bg-blue-600 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-600 text-gray-400">
                                Unverified
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-gray-600 text-gray-400 capitalize">
                              {adminUser.user_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{adminUser.email}</p>
                          <p className="text-xs text-gray-500">
                            {adminUser.university} • Joined {formatDate(adminUser.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {adminUser.user_type !== 'admin' && (
                          <Button
                            onClick={() => handleVerifyUser(adminUser.id, !!adminUser.is_verified)}
                            disabled={verifyUserMutation.isPending}
                            variant={adminUser.is_verified ? "outline" : "default"}
                            size="sm"
                            className={
                              adminUser.is_verified 
                                ? "border-red-600 text-red-400 hover:bg-red-600 hover:text-white" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }
                          >
                            {verifyUserMutation.isPending ? (
                              'Processing...'
                            ) : adminUser.is_verified ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Unverify
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {usersData?.pagination && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      Showing {((usersData.pagination.page - 1) * usersData.pagination.limit) + 1} to{' '}
                      {Math.min(usersData.pagination.page * usersData.pagination.limit, usersData.pagination.total)} of{' '}
                      {usersData.pagination.total} users
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400">
                        Page {usersData.pagination.page} of {usersData.pagination.totalPages}
                      </span>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(usersData.pagination.totalPages, prev + 1))}
                        disabled={currentPage === usersData.pagination.totalPages}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
