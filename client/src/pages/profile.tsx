import React from 'react';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Share, MoreHorizontal, Send, Edit, Trash2, Flag, Camera, X, ArrowLeft, Plus, Edit3, Repeat2 } from "lucide-react";
import { FoxLogo } from "@/components/FoxLogo";
import { formatRelativeTime } from "@/utils/dateUtils";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { VideoPlayer } from "@/components/VideoPlayer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VerificationBadge } from '@/components/VerificationBadge';
import ReportDialog from '@/components/ReportDialog';
import { SavePostMenuItem } from "@/components/SavePostMenuItem";
import { useLocation } from "wouter";

interface Post {
  id: number;
  content: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
    isVerified?: number;
  };
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  isLiked: boolean;
  isReposted: boolean;
  comments?: Array<{
    id: number;
    content: string;
    createdAt: string;
    repliesCount: number;
    replies?: Array<{
      id: number;
      content: string;
      createdAt: string;
      user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        profileImageUrl?: string;
        isVerified?: number;
      };
    }>;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      profileImageUrl?: string;
      isVerified?: number;
    };
  }>;
}

interface ProfileProps {
  onBack: () => void;
  userId?: number; // If viewing another user's profile
}

export default function Profile({ onBack, userId }: ProfileProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [mediaItems, setMediaItems] = useState<{ url: string; mime: string }[]>([]);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [carouselIndex, setCarouselIndex] = useState<{[postId: number]: number}>({});
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    bio: '',
    link: '',
    university: '',
    isPrivate: false
  });
  const [profileImageKey, setProfileImageKey] = useState(0);
  
  // Image modal state
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
  }>({
    isOpen: false,
    imageUrl: "",
    title: ""
  });

  const openImageModal = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      imageUrl: "",
      title: ""
    });
  };
  
  // Use current user if no userId provided
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  // Fetch user profile data
  const { data: profileUser } = useQuery({
    queryKey: ['user', profileUserId],
    queryFn: async () => {
      if (isOwnProfile) return currentUser;
      const response = await authenticatedFetch(`/api/users/${profileUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!profileUserId,
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Initialize edit profile data when profile user changes
  React.useEffect(() => {
    if (profileUser) {
      setEditProfileData({
        firstName: profileUser.firstName || '',
        lastName: profileUser.lastName || '',
        fullName: `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim(),
        bio: profileUser.bio || '',
        link: profileUser.link || '',
        university: profileUser.university || '',
        isPrivate: !!profileUser.isPrivate
      });
    }
  }, [profileUser]);

  // Fetch user's posts with comments
  const { data: userPosts = [] } = useQuery({
    queryKey: ['userPosts', profileUserId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/users/${profileUserId}/posts`);
      if (!response.ok) throw new Error('Failed to fetch user posts');
      const posts = await response.json();
      
      // Fetch comments for each post
      const postsWithComments = await Promise.all(
        posts.map(async (post: Post) => {
          try {
            const commentsResponse = await authenticatedFetch(`/api/posts/${post.id}/comments`);
            if (commentsResponse.ok) {
              const comments = await commentsResponse.json();
              return { ...post, comments };
            }
          } catch (error) {
            console.error('Failed to fetch comments for post', post.id, error);
          }
          return { ...post, comments: [] };
        })
      );
      
      return postsWithComments;
    },
    enabled: !!profileUserId,
    refetchInterval: 8000, // Refetch every 8 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Continue refetching in background
    staleTime: 3000, // 3 seconds stale time
  });

  // Fetch user's reposts
  const { data: userReposts = [] } = useQuery({
    queryKey: ['userReposts', profileUserId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/users/${profileUserId}/reposts`);
      if (!response.ok) throw new Error('Failed to fetch user reposts');
      return response.json();
    },
    enabled: !!profileUserId,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Continue refetching in background
    staleTime: 5000, // 5 seconds stale time
  });

  // Fetch follower count and follow status
  const { data: followerData } = useQuery({
    queryKey: ['followers', profileUserId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/users/${profileUserId}/followers`);
      if (!response.ok) throw new Error('Failed to fetch followers');
      return response.json();
    },
    enabled: !!profileUserId,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: number; isFollowing: boolean }) => {
      const response = await authenticatedFetch(`/api/${isFollowing ? 'unfollow' : 'follow'}/${userId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', profileUserId] });
    },
  });

  const getUserDisplayName = (u: any) => {
    if (!u) return 'User';
    if (u.firstName && u.lastName) {
      return `${u.firstName} ${u.lastName}`;
    }
    if (u.firstName) {
      return u.firstName;
    }
    if (u.lastName) {
      return u.lastName;
    }
    return u.universityHandle || u.email?.split('@')[0] || 'User';
  };

  const getUserHandle = (u: any) => {
    console.log('🔍 Profile user data:', u);
    console.log('🔍 University field:', u?.university);
    console.log('🔍 Email field:', u?.email);
    return u?.university || u?.email?.split('@')[0] || '';
  };

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; imageUrl?: string }) => {
      const response = await authenticatedFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
      if (!response.ok) throw new Error('Failed to create post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user', profileUserId] });
      setNewPost("");
      setMediaItems([]);
      setShowCreatePost(false);
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle repost');
      return response.json();
    },
    onSuccess: () => {
      // Update both user posts and reposts queries with correct data from backend
      queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['userReposts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId }: { postId: number }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to update like');
      return response.json();
    },
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['userPosts', profileUserId] });
      await queryClient.cancelQueries({ queryKey: ['userReposts', profileUserId] });
      
      // Snapshot the previous values
      const previousUserPosts = queryClient.getQueryData(['userPosts', profileUserId]);
      const previousUserReposts = queryClient.getQueryData(['userReposts', profileUserId]);
      
      // Optimistically update user posts
      queryClient.setQueryData(['userPosts', profileUserId], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id === postId) {
            const currentlyLiked = !!post.isLiked;
            return {
              ...post,
              isLiked: !currentlyLiked,
              likesCount: Math.max(0, currentlyLiked ? (post.likesCount || 0) - 1 : (post.likesCount || 0) + 1)
            };
          }
          return post;
        });
      });
      
      // Optimistically update user reposts
      queryClient.setQueryData(['userReposts', profileUserId], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id === postId) {
            const currentlyLiked = !!post.isLiked;
            return {
              ...post,
              isLiked: !currentlyLiked,
              likesCount: Math.max(0, currentlyLiked ? (post.likesCount || 0) - 1 : (post.likesCount || 0) + 1)
            };
          }
          return post;
        });
      });
      
      return { previousUserPosts, previousUserReposts };
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUserPosts) {
        queryClient.setQueryData(['userPosts', profileUserId], context.previousUserPosts);
      }
      if (context?.previousUserReposts) {
        queryClient.setQueryData(['userReposts', profileUserId], context.previousUserReposts);
      }
    },
    onSuccess: (data, { postId }) => {
      // Update with server response to ensure consistency
      queryClient.setQueryData(['userPosts', profileUserId], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: data.liked,
            };
          }
          return post;
        });
      });
      
      queryClient.setQueryData(['userReposts', profileUserId], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: data.liked,
            };
          }
          return post;
        });
      });
      
      // Invalidate queries after a short delay to get accurate counts from backend
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
        queryClient.invalidateQueries({ queryKey: ['userReposts', profileUserId] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      }, 100);
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: number; content: string; parentId?: number }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['userReposts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  // Fetch comments for a specific post
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', showComments],
    queryFn: async () => {
      if (!showComments) return [];
      const response = await authenticatedFetch(`/api/posts/${showComments}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!showComments,
  });

  // Edit post mutation
  const editPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to update post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setEditingPost(null);
      setEditContent("");
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({ title: "Post deleted successfully!" });
    },
  });

  // Save post mutation
  const savePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/save`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to save post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-status'] });
      toast({ title: "Post saved successfully!" });
    },
  });

  // Unsave post mutation
  const unsavePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/save`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to unsave post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-status'] });
      toast({ title: "Post unsaved successfully!" });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { firstName: string; lastName: string; bio?: string; link?: string; university?: string; isPrivate?: boolean }) => {
      const response = await authenticatedFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries to update the UI automatically
      queryClient.invalidateQueries({ queryKey: ['user', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      setShowEditProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
  });

  // Profile picture upload mutation
  const uploadProfilePicMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Uploading profile picture:', { name: file.name, type: file.type, size: file.size });
      
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await authenticatedFetch('/api/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Profile picture upload failed:', error);
        throw new Error(`Failed to upload profile picture: ${error}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: ['user', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      
      // Force update current user data if it's own profile
      if (isOwnProfile && currentUser) {
        const updatedUser = {
          ...currentUser,
          profileImageUrl: data.profileImageUrl
        };
        queryClient.setQueryData(['auth', 'user'], updatedUser);
        queryClient.setQueryData(['user', profileUserId], updatedUser);
      }
      
      // Force re-render of profile image
      setProfileImageKey(prev => prev + 1);
      
      // Show success message
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Profile picture upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPost.trim() && !mediaItems.length) return;
    
    const imageUrl = mediaItems.length > 0 ? JSON.stringify(mediaItems.map(item => item.url)) : undefined;
    createPostMutation.mutate({ content: newPost.trim(), imageUrl });
  };

  const handleLike = (post: Post) => {
    likeMutation.mutate({ postId: post.id });
  };

  const handleSavePost = (postId: number) => {
    savePostMutation.mutate(postId);
  };

  const handleUnsavePost = (postId: number) => {
    unsavePostMutation.mutate(postId);
  };

  const handleProfileClick = (userId: number) => {
    window.location.href = `/profile/${userId}`;
  };

  const handleSaveEdit = () => {
    if (editingPost && editContent.trim()) {
      editPostMutation.mutate({ postId: editingPost, content: editContent });
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent("");
  };

  const handleRepost = (postId: number) => {
    repostMutation.mutate(postId);
  };

  const handleComment = async (postId: number, parentId?: number) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    try {
      await commentMutation.mutateAsync({ postId, content, parentId });
      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const toggleReplies = (commentId: number) => {
    const newShowReplies = new Set(showReplies);
    if (newShowReplies.has(commentId)) {
      newShowReplies.delete(commentId);
    } else {
      newShowReplies.add(commentId);
    }
    setShowReplies(newShowReplies);
  };

  const isPostOwner = (post: Post) => {
    return currentUser?.id === post.user.id;
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (5MB limit for Railway compatibility)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Profile picture must be smaller than 5MB. Please choose a smaller image.",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, WebP).",
          variant: "destructive",
        });
        return;
      }
      
      uploadProfilePicMutation.mutate(file);
    }
  };


  // No loading spinner for profile page - let content load naturally
  if (!profileUser && profileUserId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <FoxLogo size={60} className="mx-auto mb-4" />
          <p>Profile not found</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <FoxLogo size={60} className="mx-auto mb-4 opacity-50" />
          <p>Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">{getUserDisplayName(profileUser)}</h1>
              <p className="text-sm text-gray-400">{userPosts.length} posts</p>
            </div>
          </div>
          {isOwnProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem 
                  onClick={() => setLocation('/settings')}
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                >
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 pt-6 pb-24">
        {/* Profile Header */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-white">{getUserDisplayName(profileUser)}</h2>
                {profileUser.isVerified === 1 && (
                  <VerificationBadge className="w-5 h-5" />
                )}
              </div>
              <p className="text-gray-400">@{getUserHandle(profileUser)}</p>
            </div>
            <div className="relative">
              <Avatar className="w-20 h-20" key={profileImageKey}>
                <AvatarImage 
                  src={getImageUrl(profileUser.profileImageUrl)} 
                />
                <AvatarFallback className="bg-gray-700 text-white text-xl">
                  {profileUser.firstName?.[0]}{profileUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <input
                    type="file"
                    id="profile-picture-upload"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => document.getElementById('profile-picture-upload')?.click()}
                    disabled={uploadProfilePicMutation.isPending}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio section */}
          <div className="space-y-2">
            {profileUser.bio && (
              <p className="text-white">{profileUser.bio}</p>
            )}
            {profileUser.link && (
              <a 
                href={profileUser.link.startsWith('http') ? profileUser.link : `https://${profileUser.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline break-all"
              >
                {profileUser.link}
              </a>
            )}
            <p className="text-gray-400">{followerData?.count || 0} followers</p>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {isOwnProfile ? (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-gray-600 text-white hover:bg-gray-800"
                  onClick={() => setShowEditProfile(true)}
                >
                  Edit profile
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent border-gray-600 text-white hover:bg-gray-800">
                  Share profile
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className={`flex-1 ${followerData?.isFollowing ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-200'}`}
                  onClick={() => followMutation.mutate({ userId: profileUserId!, isFollowing: !!followerData?.isFollowing })}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? 'Loading...' : (followerData?.isFollowing ? 'Unfollow' : 'Follow')}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-gray-600 text-white hover:bg-gray-800"
                  onClick={() => setLocation(`/messages/${profileUserId}`)}
                >
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'posts'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('reposts')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'reposts'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Reposts
            </button>
          </div>
        </div>

        {/* Profile completion cards (only for own profile with no posts AND no profile picture) */}
        {isOwnProfile && userPosts.length === 0 && !profileUser.profileImageUrl && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400">Finish your profile</h3>
              <span className="text-gray-400 text-sm">2 left</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Edit3 className="w-6 h-6 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-white mb-2">Create post</h4>
                  <p className="text-sm text-gray-400 mb-3">Say what's on your mind or share a recent highlight.</p>
                  <Button 
                    size="sm" 
                    onClick={() => setShowCreatePost(true)}
                    className="w-full bg-white text-black hover:bg-gray-200"
                  >
                    Create
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-6 h-6 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-white mb-2">Add profile photo</h4>
                  <p className="text-sm text-gray-400 mb-3">Make it easier for people to recognize you.</p>
                  <Button 
                    size="sm" 
                    onClick={() => document.getElementById('profile-picture-upload')?.click()}
                    disabled={uploadProfilePicMutation.isPending}
                    className="w-full bg-white text-black hover:bg-gray-200"
                  >
                    {uploadProfilePicMutation.isPending ? "Uploading..." : "Add"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Create Post</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCreatePost(false)}>
                  <Plus className="w-4 h-4 rotate-45" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex space-x-3">
                  <Avatar>
                    <AvatarImage src={profileUser.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {profileUser.firstName?.[0]}{profileUser.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="bg-transparent border-0 text-white placeholder:text-gray-400 resize-none min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    {mediaItems.length > 0 && `${mediaItems.length} media selected`}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCreatePost}
                      disabled={(!newPost.trim() && !mediaItems.length) || createPostMutation.isPending}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Posts/Reposts Content */}
        <div className="space-y-4">
          {activeTab === 'posts' && (
            <>
              {userPosts.length > 0 ? (
                userPosts.map((post: Post) => (
                  <Card key={post.id} className="bg-transparent border-0 border-b border-gray-800 rounded-none pb-4">
                    <CardContent className="p-0">
                      <div className="flex space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getImageUrl(post.user.profileImageUrl)} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {post.user.firstName?.[0]}{post.user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">{getUserDisplayName(post.user)}</span>
                                {post.user.isVerified === 1 && (
                                  <VerificationBadge className="w-3.5 h-3.5" />
                                )}
                                <span className="text-gray-400 text-sm">
                                  {formatRelativeTime(post.createdAt)}
                                </span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                                  {isPostOwner(post) ? (
                                    <>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setEditingPost(post.id);
                                          setEditContent(post.content);
                                        }}
                                        className="text-white hover:bg-gray-800"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit post
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => deletePostMutation.mutate(post.id)}
                                        className="text-red-400 hover:bg-gray-800"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete post
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <>
                                      <SavePostMenuItem postId={post.id} onSave={handleSavePost} onUnsave={handleUnsavePost} />
                                      <DropdownMenuItem 
                                        className="text-red-400 hover:bg-gray-800"
                                        onClick={() => {
                                          setReportPostId(post.id);
                                          setReportDialogOpen(true);
                                        }}
                                      >
                                        <Flag className="mr-2 h-4 w-4" />
                                        Report post
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {editingPost === post.id ? (
                              <div className="mt-3">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="min-h-[100px] mb-3 bg-gray-900 border-gray-700 text-white"
                                  placeholder="Edit your post..."
                                />
                                <div className="flex space-x-2 mb-3">
                                  <Button 
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim() || editPostMutation.isPending}
                                    size="sm"
                                    className="bg-white text-black hover:bg-gray-200"
                                  >
                                    {editPostMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button 
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-white mb-3">{post.content}</p>
                            )}
                            
                            {/* Media display with carousel */}
                            {post.imageUrl ? (() => {
                              const val = post.imageUrl || '';
                              const looksJsonArray = val.trim().startsWith('[');
                              if (looksJsonArray) {
                                const urls: string[] = (() => { try { return JSON.parse(val); } catch { return []; }})();
                                if (urls.length > 1) {
                                  return (
                                    <div className="relative mb-3">
                                      <Carousel 
                                        className=""
                                        setApi={(api) => {
                                          if (api) {
                                            api.on('select', () => {
                                              setCarouselIndex(prev => ({ ...prev, [post.id]: api.selectedScrollSnap() }));
                                            });
                                          }
                                        }}
                                      >
                                        <CarouselContent>
                                          {urls.map((url, idx) => (
                                            <CarouselItem key={idx} className="pr-2">
                                              <div className="relative w-full max-h-96 overflow-hidden rounded-lg bg-gray-900">
                                                {url.match(/\.(mp4|mov|webm)$/i) ? (
                                                  <div 
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openImageModal(url);
                                                    }}
                                                  >
                                                    <VideoPlayer
                                                      src={url}
                                                      className="w-full h-auto max-h-96 object-contain"
                                                    />
                                                  </div>
                                                ) : (
                                                  <img
                                                    src={url}
                                                    alt="Post media"
                                                    className="w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => openImageModal(url)}
                                                  />
                                                )}
                                              </div>
                                            </CarouselItem>
                                          ))}
                                        </CarouselContent>
                                        <CarouselPrevious className="left-2 bg-background/60" />
                                        <CarouselNext className="right-2 bg-background/60" />
                                      </Carousel>
                                      <div className="absolute right-3 top-3 rounded-full bg-black/60 text-white text-xs px-2 py-1">
                                        {(carouselIndex[post.id] || 0) + 1}/{urls.length}
                                      </div>
                                    </div>
                                  );
                                } else if (urls.length === 1) {
                                  return (
                                    <div className="mb-3">
                                      <div className="w-full max-h-96 overflow-hidden rounded-lg bg-gray-900">
                                        {urls[0].match(/\.(mp4|mov|webm)$/i) ? (
                                          <VideoPlayer
                                            src={urls[0]}
                                            className="w-full h-auto max-h-96 object-contain"
                                          />
                                        ) : (
                                          <img
                                            src={urls[0]}
                                            alt="Post media"
                                            className="w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => openImageModal(urls[0])}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              } else if (val) {
                                return (
                                  <div className="mb-3">
                                    <div className="w-full max-h-96 overflow-hidden rounded-lg bg-gray-900">
                                      {val.match(/\.(mp4|mov|webm)$/i) ? (
                                        <VideoPlayer
                                          src={val}
                                          className="w-full h-auto max-h-96 object-contain"
                                        />
                                      ) : (
                                        <img
                                          src={val}
                                          alt="Post media"
                                          className="w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => openImageModal(val)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })() : null}
                            <div className="flex items-center space-x-4 text-gray-400">
                              <button 
                                onClick={() => handleLike(post)}
                                className={`flex items-center space-x-3 transition-colors p-3 rounded-full ${post.isLiked ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/10'}`}
                              >
                                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current text-red-500' : 'text-gray-500'}`} />
                                <span className="text-sm font-semibold">{post.likesCount}</span>
                              </button>
                              <button 
                                onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                                className="flex items-center space-x-3 hover:text-blue-500 transition-colors p-3 rounded-full hover:bg-blue-500/10"
                              >
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-sm font-semibold">{post.commentsCount}</span>
                              </button>
                              <button 
                                onClick={() => handleRepost(post.id)}
                                className={`flex items-center space-x-3 hover:text-green-500 transition-colors p-3 rounded-full hover:bg-green-500/10 ${post.isReposted ? 'text-green-500' : 'text-gray-400'}`}
                              >
                                <Repeat2 className="w-5 h-5" />
                                <span className="text-sm font-semibold">{post.repostsCount}</span>
                              </button>
                            </div>
                            
                            {showComments === post.id && (
                              <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                                <div className="flex space-x-2">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                    <AvatarFallback className="text-xs bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 flex">
                                    <Input
                                      placeholder="Write a comment..."
                                      value={newComment}
                                      onChange={(e) => setNewComment(e.target.value)}
                                      className="rounded-r-none bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                                      onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id); } }}
                                    />
                                    <Button onClick={() => handleComment(post.id)} disabled={!newComment.trim() || commentMutation.isPending} className="rounded-l-none" size="sm">
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                {post.comments?.map((comment: any) => (
                                  <div key={comment.id} className="space-y-2">
                                    <div className="flex space-x-2">
                                      <Avatar className="w-8 h-8 cursor-pointer" onClick={() => handleProfileClick(comment.user.id)}>
                                        <AvatarImage src={comment.user.profileImageUrl || undefined} />
                                        <AvatarFallback className="bg-gray-700 text-white">{comment.user.firstName?.[0]}{comment.user.lastName?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="bg-gray-900 rounded-lg px-3 py-2">
                                          <p className="font-semibold text-sm text-white">{getUserDisplayName(comment.user)}</p>
                                          <p className="text-sm text-gray-300">{comment.content}</p>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1 ml-3">
                                          <p className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</p>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                          >
                                            Reply
                                          </Button>
                                          {comment.repliesCount > 0 && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => toggleReplies(comment.id)}
                                              className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                            >
                                              {showReplies.has(comment.id) ? 'Hide' : 'View'} {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                                            </Button>
                                          )}
                                        </div>
                                        
                                        {replyingTo === comment.id && (
                                          <div className="mt-2 ml-3 flex space-x-2">
                                            <Avatar className="w-6 h-6">
                                              <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                              <AvatarFallback className="text-xs bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 flex">
                                              <Input
                                                placeholder={`Reply to ${getUserDisplayName(comment.user)}...`}
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                                onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id, comment.id); } }}
                                              />
                                              <Button 
                                                onClick={() => handleComment(post.id, comment.id)} 
                                                disabled={!replyContent.trim() || commentMutation.isPending} 
                                                className="rounded-l-none" 
                                                size="sm"
                                              >
                                                <Send className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Replies */}
                                    {showReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                                      <div className="ml-10 space-y-2 border-l-2 border-gray-800 pl-4">
                                        {comment.replies.map((reply: any) => (
                                          <div key={reply.id} className="space-y-2">
                                            <div className="flex space-x-2">
                                              <Avatar className="w-6 h-6 cursor-pointer" onClick={() => handleProfileClick(reply.user.id)}>
                                                <AvatarImage src={reply.user.profileImageUrl || undefined} />
                                                <AvatarFallback className="bg-gray-700 text-white text-xs">{reply.user.firstName?.[0]}{reply.user.lastName?.[0]}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1">
                                                <div className="bg-gray-800 rounded-lg px-3 py-2">
                                                  <p className="font-semibold text-xs text-white">{getUserDisplayName(reply.user)}</p>
                                                  <p className="text-xs text-gray-300">{reply.content}</p>
                                                </div>
                                                <div className="flex items-center space-x-4 mt-1 ml-3">
                                                  <p className="text-xs text-gray-500">{formatRelativeTime(reply.createdAt)}</p>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                                    className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                                  >
                                                    Reply
                                                  </Button>
                                                </div>
                                                
                                                {replyingTo === reply.id && (
                                                  <div className="mt-2 ml-3 flex space-x-2">
                                                    <Avatar className="w-5 h-5">
                                                      <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                                      <AvatarFallback className="text-xs bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 flex">
                                                      <Input
                                                        placeholder={`Reply to ${getUserDisplayName(reply.user)}...`}
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                        className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                                        onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id, reply.id); } }}
                                                      />
                                                      <Button 
                                                        onClick={() => handleComment(post.id, reply.id)} 
                                                        disabled={!replyContent.trim() || commentMutation.isPending} 
                                                        className="rounded-l-none" 
                                                        size="sm"
                                                      >
                                                        <Send className="w-3 h-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No posts yet</p>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'reposts' && (
            <>
              {userReposts.length > 0 ? (
                userReposts.map((post: any) => {
                  return (
                    <Card key={post.id} className="bg-black border-gray-800 mb-4">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10 cursor-pointer" onClick={() => handleProfileClick(post.user.id)}>
                              <AvatarImage src={getImageUrl(post.user.profileImageUrl)} />
                              <AvatarFallback className="bg-gray-700 text-white">{post.user.firstName?.[0]}{post.user.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-white cursor-pointer hover:underline" onClick={() => handleProfileClick(post.user.id)}>
                                {post.user.firstName} {post.user.lastName}
                              </p>
                              <p className="text-sm text-gray-400">
                                {formatRelativeTime(post.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 px-0 pb-4">
                        <div className="px-6">
                          <p className="text-white mb-3">{post.content}</p>
                        </div>
                        
                        {/* Render media from imageUrl: single URL or JSON array */}
                        {post.imageUrl ? (() => {
                          const val = post.imageUrl || '';
                          const looksJsonArray = val.trim().startsWith('[');
                          if (looksJsonArray) {
                            const urls: string[] = (() => { try { return JSON.parse(val); } catch { return []; }})();
                            if (urls.length > 0) {
                              return (
                                <div className="relative mb-4">
                                  <Carousel 
                                    className=""
                                    setApi={(api) => {
                                      if (api) {
                                        api.on('select', () => {
                                          setCarouselIndex(prev => ({ ...prev, [post.id]: api.selectedScrollSnap() }));
                                        });
                                      }
                                    }}
                                  >
                                    <CarouselContent>
                                      {urls.map((url, idx) => (
                                        <CarouselItem key={idx} className="pr-2">
                                          <div className="relative w-full max-h-[500px] overflow-hidden rounded-2xl bg-black">
                                            {url.match(/\.(mp4|mov|webm)$/i) ? (
                                              <VideoPlayer src={url} className="w-full h-auto max-h-[500px] object-contain" />
                                            ) : (
                                              <img 
                                                src={url} 
                                                alt="Post media" 
                                                className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                                                onClick={() => openImageModal(url)}
                                              />
                                            )}
                                          </div>
                                        </CarouselItem>
                                      ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="left-2 bg-background/60" />
                                    <CarouselNext className="right-2 bg-background/60" />
                                  </Carousel>
                                  <div className="absolute right-3 top-3 rounded-full bg-black/60 text-white text-xs px-2 py-1">
                                    {(carouselIndex[post.id] || 0) + 1}/{urls.length}
                                  </div>
                                </div>
                              );
                            }
                          } else {
                            // Plain single URL
                            return (
                              <div className="relative w-full max-h-[500px] mb-4 overflow-hidden rounded-2xl bg-black">
                                {val.match(/\.(mp4|mov|webm)$/i) ? (
                                  <VideoPlayer src={val} className="w-full h-auto max-h-[500px] object-contain" />
                                ) : (
                                  <img 
                                    src={val} 
                                    alt="Post media" 
                                    className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                                  />
                                )}
                              </div>
                            );
                          }
                        })() : null}
                        
                        {/* Post interactions */}
                        <div className="px-6 flex items-center space-x-6 pt-3">
                          <button 
                            onClick={() => handleLike(post)}
                            className={`flex items-center space-x-2 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current text-red-500' : 'text-gray-400'}`} />
                            <span className="text-xs font-semibold">{post.likesCount}</span>
                          </button>
                          <button 
                            onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                            className="flex items-center space-x-2 hover:text-blue-500 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-xs font-semibold">{post.commentsCount}</span>
                          </button>
                          <button 
                            onClick={() => handleRepost(post.id)}
                            className={`flex items-center space-x-2 hover:text-green-500 transition-colors ${post.isReposted ? 'text-green-500' : 'text-gray-400'}`}
                          >
                            <Repeat2 className="w-5 h-5" />
                            <span className="text-xs font-semibold">{post.repostsCount}</span>
                          </button>
                          <button className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                            <Share className="w-5 h-5" />
                          </button>
                        </div>

                        {showComments === post.id && (
                          <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                            <div className="flex space-x-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                <AvatarFallback className="bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex">
                                <Input
                                  placeholder="Write a comment..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  className="rounded-r-none bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                                  onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id); } }}
                                />
                                <Button onClick={() => handleComment(post.id)} disabled={!newComment.trim() || commentMutation.isPending} className="rounded-l-none" size="sm">
                                  <Send className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {comments.map((comment: any) => (
                              <div key={comment.id} className="space-y-2">
                                <div className="flex space-x-2">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={comment.user.profileImageUrl || undefined} />
                                    <AvatarFallback className="bg-gray-700 text-white">{comment.user.firstName?.[0]}{comment.user.lastName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-gray-900 rounded-lg px-3 py-2">
                                      <p className="font-semibold text-sm text-white">{getUserDisplayName(comment.user)}</p>
                                      <p className="text-sm text-gray-300">{comment.content}</p>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 ml-3">
                                      <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</p>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                        className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                      >
                                        Reply
                                      </Button>
                                      {comment.repliesCount > 0 && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => toggleReplies(comment.id)}
                                          className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                        >
                                          {showReplies.has(comment.id) ? 'Hide' : 'View'} {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {replyingTo === comment.id && (
                                      <div className="mt-2 ml-3 flex space-x-2">
                                        <Avatar className="w-6 h-6">
                                          <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                          <AvatarFallback className="text-xs bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 flex">
                                          <Input
                                            placeholder={`Reply to ${getUserDisplayName(comment.user)}...`}
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                            onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id, comment.id); } }}
                                          />
                                          <Button 
                                            onClick={() => handleComment(post.id, comment.id)} 
                                            disabled={!replyContent.trim() || commentMutation.isPending} 
                                            className="rounded-l-none" 
                                            size="sm"
                                          >
                                            <Send className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Replies */}
                                {showReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                                  <div className="ml-10 space-y-2 border-l-2 border-gray-800 pl-4">
                                    {comment.replies.map((reply: any) => (
                                      <div key={reply.id} className="space-y-2">
                                        <div className="flex space-x-2">
                                          <Avatar className="w-6 h-6">
                                            <AvatarImage src={reply.user.profileImageUrl || undefined} />
                                            <AvatarFallback className="bg-gray-700 text-white text-xs">{reply.user.firstName?.[0]}{reply.user.lastName?.[0]}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <div className="bg-gray-800 rounded-lg px-3 py-2">
                                              <p className="font-semibold text-xs text-white">{getUserDisplayName(reply.user)}</p>
                                              <p className="text-xs text-gray-300">{reply.content}</p>
                                            </div>
                                            <div className="flex items-center space-x-4 mt-1 ml-3">
                                              <p className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleDateString()}</p>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                                className="text-xs text-gray-500 hover:text-white p-0 h-auto"
                                              >
                                                Reply
                                              </Button>
                                            </div>
                                            
                                            {replyingTo === reply.id && (
                                              <div className="mt-2 ml-3 flex space-x-2">
                                                <Avatar className="w-5 h-5">
                                                  <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                                  <AvatarFallback className="text-xs bg-gray-700 text-white">{currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 flex">
                                                  <Input
                                                    placeholder={`Reply to ${getUserDisplayName(reply.user)}...`}
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                                    onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id, reply.id); } }}
                                                  />
                                                  <Button 
                                                    onClick={() => handleComment(post.id, reply.id)} 
                                                    disabled={!replyContent.trim() || commentMutation.isPending} 
                                                    className="rounded-l-none" 
                                                    size="sm"
                                                  >
                                                    <Send className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No reposts yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black z-50 flex items-start justify-center">
          <div className="bg-black w-full max-w-md min-h-screen overflow-y-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => setShowEditProfile(false)} className="text-white p-0">
                  <X className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-semibold text-white">Edit profile</h3>
              </div>
              <Button 
                onClick={() => {
                  // Split fullName before sending
                  const fullName = editProfileData.fullName?.trim() || '';
                  const spaceIndex = fullName.lastIndexOf(' ');
                  
                  const profileDataToSend = {
                    ...editProfileData,
                    firstName: spaceIndex === -1 ? fullName : fullName.substring(0, spaceIndex),
                    lastName: spaceIndex === -1 ? '' : fullName.substring(spaceIndex + 1)
                  };
                  
                  updateProfileMutation.mutate(profileDataToSend);
                }}
                disabled={updateProfileMutation.isPending}
                className="text-gray-400 hover:text-white bg-transparent p-0 font-medium"
                variant="ghost"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Done"}
              </Button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Profile Card */}
              <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
                {/* Name Section */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium mb-1">Name</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 text-gray-500">🔒</div>
                      <input
                        type="text"
                        value={editProfileData.fullName || ''}
                        onChange={(e) => setEditProfileData({...editProfileData, fullName: e.target.value})}
                        className="bg-transparent text-gray-300 text-sm outline-none flex-1"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={profileUser?.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {profileUser?.firstName?.[0]}{profileUser?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => document.getElementById('edit-profile-picture-input')?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                    <input
                      id="edit-profile-picture-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Bio Section */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="text-white font-medium mb-2">Bio</div>
                  <textarea
                    value={editProfileData.bio}
                    onChange={(e) => setEditProfileData({...editProfileData, bio: e.target.value})}
                    placeholder="Write a bio..."
                    className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none min-h-[60px]"
                  />
                </div>

                {/* University Section */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="text-white font-medium mb-2">University</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-400">@</span>
                    <input
                      type="text"
                      value={editProfileData.university || ''}
                      onChange={(e) => setEditProfileData({...editProfileData, university: e.target.value})}
                      placeholder="Enter university name"
                      className="bg-transparent text-gray-300 text-sm outline-none flex-1"
                    />
                  </div>
                </div>

                {/* Link Section */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="text-white font-medium mb-2">Link</div>
                  <input
                    type="text"
                    value={editProfileData.link || ''}
                    onChange={(e) => setEditProfileData({...editProfileData, link: e.target.value})}
                    placeholder="Add a link"
                    className="w-full bg-transparent text-gray-300 text-sm outline-none"
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={imageModal.isOpen} onOpenChange={closeImageModal}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-black/95 border-gray-800 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 text-white hover:bg-gray-800/80 rounded-full p-2 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </Button>
            <img
              src={imageModal.imageUrl}
              alt={imageModal.title}
              className="w-full h-auto max-h-[90vh] object-contain transition-all duration-300 ease-out animate-in zoom-in-95 fade-in-0"
              style={{ animationDelay: '100ms' }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      {reportPostId && (
        <ReportDialog
          isOpen={reportDialogOpen}
          onClose={() => {
            setReportDialogOpen(false);
            setReportPostId(null);
          }}
          postId={reportPostId}
        />
      )}
    </div>
  );
}
