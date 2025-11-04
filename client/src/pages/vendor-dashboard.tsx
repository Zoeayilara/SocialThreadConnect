import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Heart, MessageCircle, MoreHorizontal, Send, Search, Shield, Repeat2, MessageSquare, Edit3, Trash2, Flag, X, ShoppingBag, Share2 } from "lucide-react";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { FoxLogo } from "@/components/FoxLogo";
import { formatRelativeTime } from "@/utils/dateUtils";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { User } from "@/components/User";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SavePostMenuItem } from '@/components/SavePostMenuItem';
import ReportDialog from '@/components/ReportDialog';
import { VerificationBadge } from '@/components/VerificationBadge';
import TermsDialog from '@/components/TermsDialog';
import { useLocation } from "wouter";

interface Post {
  id: number;
  userId: number;
  content: string;
  createdAt: number;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    isVerified?: number;
  };
  isLiked?: boolean;
  isReposted?: boolean;
  likesCount?: number;
  repostsCount?: number;
  commentsCount?: number;
}

interface Comment {
  id: number;
  postId: number;
  parentId?: number;
  content: string;
  repliesCount: number;
  createdAt: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    isVerified?: number;
  };
  replies?: Comment[];
}

export default function VendorDashboard() {
  const { user, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unreadCount } = useUnreadMessages();
  
  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMessageSquare] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [carouselIndex, setCarouselIndex] = useState<{[postId: number]: number}>({});
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showUser, setShowUser] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [, setLocation] = useLocation();

  // Show loading spinner only during logout
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
        <LoadingOverlay text="Logging out" overlay={false} />
      </div>
    );
  }

  // Fetch posts with automatic refetching
  const { data: posts = [] } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/posts?sortBy=algorithm');
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    refetchInterval: false, // No automatic updates - only manual refresh
    refetchOnWindowFocus: false, // No interruptions when switching tabs
    refetchIntervalInBackground: false, // No background updates
    staleTime: Infinity, // Never consider data stale - only refresh on manual action
  });

  // Fetch comments for a post with optimized refetching
  const { data: comments = [] } = useQuery({
    queryKey: ['/api/comments', showComments],
    queryFn: async () => {
      if (!showComments) return [];
      const response = await authenticatedFetch(`/api/posts/${showComments}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!showComments,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Save scroll position when navigating away
  useEffect(() => {
    const saveScrollPosition = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        sessionStorage.setItem('vendor-dashboard-scroll-position', scrollTop.toString());
        
        // Find the currently visible post to save as reference
        const posts = scrollContainerRef.current.querySelectorAll('[data-post-id]');
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        
        for (const postElement of posts) {
          const postRect = postElement.getBoundingClientRect();
          if (postRect.top >= containerRect.top && postRect.top <= containerRect.top + 200) {
            const postId = postElement.getAttribute('data-post-id');
            if (postId) {
              sessionStorage.setItem('vendor-dashboard-last-viewed-post', postId);
              break;
            }
          }
        }
      }
    };

    const handleBeforeUnload = () => saveScrollPosition();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Restore scroll position when posts are loaded
  useEffect(() => {
    if (posts.length > 0 && scrollContainerRef.current) {
      const savedScrollPosition = sessionStorage.getItem('vendor-dashboard-scroll-position');
      const savedPostId = sessionStorage.getItem('vendor-dashboard-last-viewed-post');
      
      if (savedPostId) {
        // Try to scroll to the saved post
        const postElement = scrollContainerRef.current.querySelector(`[data-post-id="${savedPostId}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          sessionStorage.removeItem('vendor-dashboard-last-viewed-post');
          sessionStorage.removeItem('vendor-dashboard-scroll-position');
          return;
        }
      }
      
      if (savedScrollPosition) {
        // Fallback to scroll position
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition);
            sessionStorage.removeItem('vendor-dashboard-scroll-position');
          }
        }, 100);
      }
    }
  }, [posts]);

  // Check if user needs to see terms dialog (only for new registrations)
  useEffect(() => {
    const isFromRegistration = sessionStorage.getItem('from-registration');
    
    // Always show terms dialog if coming from registration
    if (isFromRegistration) {
      setShowTermsDialog(true);
      sessionStorage.removeItem('from-registration');
    }
  }, [user?.id]); // Re-run when user loads

  const handleTermsAccept = () => {
    const userId = user?.id || localStorage.getItem('tempUserId');
    if (userId) {
      localStorage.setItem(`terms-accepted-${userId}`, 'true');
    }
    
    // Clean up tempUserId after terms are accepted (registration complete)
    if (!user?.id && localStorage.getItem('tempUserId')) {
      localStorage.removeItem('tempUserId');
    }
    
    setShowTermsDialog(false);
  };

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
      await queryClient.cancelQueries({ queryKey: ['/api/posts'] });
      
      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['/api/posts']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/posts'], (old: any) => {
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
      
      return { previousPosts };
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPosts) {
        queryClient.setQueryData(['/api/posts'], context.previousPosts);
      }
    },
    onSuccess: (data, { postId }) => {
      // Update with server response to ensure consistency
      queryClient.setQueryData(['/api/posts'], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: data.liked,
              // Don't update likesCount here as optimistic update should be correct
            };
          }
          return post;
        });
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: number; content: string; parentId?: number }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Only update comments, don't reorder posts
      queryClient.invalidateQueries({ queryKey: ['/api/comments', showComments] });
      
      // Update comment count for the specific post without reordering
      queryClient.setQueryData(['/api/posts'], (oldPosts: any[] = []) => {
        return oldPosts.map(post => 
          post.id === variables.postId 
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        );
      });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle repost');
      return response.json();
    },
    onSuccess: (result, postId) => {
      // Use the backend response to update the post correctly
      queryClient.setQueryData(['/api/posts'], (oldPosts: any[] = []) => {
        return oldPosts.map(post => 
          post.id === postId 
            ? { ...post, repostsCount: result.repostsCount, isReposted: result.isReposted }
            : post
        );
      });
    },
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
    onSuccess: (_, variables) => {
      // Update the specific post in cache without reordering
      queryClient.setQueryData(['/api/posts'], (oldPosts: any[] = []) => {
        return oldPosts.map(post => 
          post.id === variables.postId ? { ...post, content: variables.content } : post
        );
      });
      
      // Only invalidate profile-related queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
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
    onSuccess: (_, postId) => {
      // Remove the deleted post from cache without reordering others
      queryClient.setQueryData(['/api/posts'], (oldPosts: any[] = []) => {
        return oldPosts.filter(post => post.id !== postId);
      });
      
      // Only invalidate profile-related queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post unsaved successfully!" });
    },
  });


  const handleLike = (post: Post) => {
    likeMutation.mutate({ postId: post.id });
  };

  const handleComment = async (postId: number, parentId?: number) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;
    
    commentMutation.mutate({ postId, content, parentId });
    
    if (parentId) {
      setReplyContent("");
      setReplyingTo(null);
    } else {
      setNewComment("");
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

  const handleRepost = (postId: number) => {
    repostMutation.mutate(postId);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editingPost) {
      editPostMutation.mutate({ postId: editingPost, content: editContent });
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent("");
  };

  const handleDeletePost = (postId: number) => {
    deletePostMutation.mutate(postId);
  };

  const handleSavePost = (postId: number) => {
    savePostMutation.mutate(postId);
  };

  const handleSharePost = async (postId: number) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    
    try {
      if (navigator.share) {
        // Use native share API (works on mobile and modern browsers)
        await navigator.share({
          title: 'Check out this post on EntreeFox',
          text: 'I found this interesting post on EntreeFox!',
          url: shareUrl,
        });
        toast({ title: 'Post shared successfully!' });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({ 
          title: 'Link copied!',
          description: 'Post link has been copied to clipboard.',
        });
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      console.log('Share cancelled or failed:', error);
    }
  };

  const handleUnsavePost = (postId: number) => {
    unsavePostMutation.mutate(postId);
  };


  const isPostOwner = (post: Post) => {
    return user?.id === post.user.id;
  };

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
    return u.email ? u.email.split('@')[0] : 'User';
  };

  // Search users mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await authenticatedFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
    },
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
      // Refresh search results to update follow status
      if (searchQuery.trim()) {
        searchUsersMutation.mutate(searchQuery);
      }
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchUsersMutation.mutate(query);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserClick = (userId?: number) => {
    // Clear scroll position when navigating to profile to prevent scroll restoration issues
    sessionStorage.removeItem('vendor-dashboard-scroll-position');
    sessionStorage.removeItem('vendor-dashboard-last-viewed-post');
    
    if (userId) {
      setLocation(`/profile/${userId}`);
    } else {
      setLocation(`/profile/${user?.id}`);
    }
  };

  // Remove loading spinner for posts - let content load naturally

  if (showUser) {
    return <User 
      userId={viewingUserId}
      onBack={() => {
        setShowUser(false);
        setViewingUserId(undefined);
        localStorage.setItem('currentPage', 'dashboard');
      }} 
    />;
  }

  if (showMessageSquare) {
    return <MessageSquare />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header mimicking Threads */}
      <div className="border-b sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-gray-200 dark:border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FoxLogo size={28} />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">VendorHub</h1>
          </div>
          <div className="flex items-center space-x-3">
            {user?.userType === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation('/admin-dashboard')}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                View as Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/marketplace')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ShoppingBag className="w-5 h-5" />
            </Button>
            <Avatar className="w-8 h-8 cursor-pointer" onClick={() => handleUserClick()}>
              <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
              <AvatarFallback className="bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md mx-4 max-h-[500px] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Input
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                autoFocus
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {searchUsersMutation.isPending && (
                <div className="p-4 text-center text-gray-400">Searching...</div>
              )}
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((searchUser: any) => (
                    <div 
                      key={searchUser.id} 
                      className="flex items-center space-x-3 p-3 hover:bg-gray-800 rounded-lg"
                    >
                      <Avatar 
                        className="w-10 h-10 cursor-pointer"
                        onClick={() => {
                          handleUserClick(searchUser.id);
                          setShowSearch(false);
                        }}
                      >
                        <AvatarImage src={getImageUrl(searchUser.profileImageUrl)} />
                        <AvatarFallback className="bg-gray-700 text-white">{searchUser.firstName?.[0] || searchUser.lastName?.[0] || searchUser.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          handleUserClick(searchUser.id);
                          setShowSearch(false);
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <p className="font-semibold text-gray-900 dark:text-white">{getUserDisplayName(searchUser)}</p>
                          {searchUser.isVerified === 1 && (
                            <VerificationBadge className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400">@{searchUser.university || searchUser.email.split('@')[0]}</p>
                      </div>
                      {searchUser.id !== user?.id && (
                        <Button
                          size="sm"
                          variant={searchUser.isFollowing ? "outline" : "default"}
                          className={`${
                            searchUser.isFollowing 
                              ? 'bg-transparent border-gray-600 text-white hover:bg-gray-800' 
                              : 'bg-white text-black hover:bg-gray-200'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            followMutation.mutate({ userId: searchUser.id, isFollowing: !!searchUser.isFollowing });
                          }}
                          disabled={followMutation.isPending}
                        >
                          {followMutation.isPending ? 'Loading...' : (searchUser.isFollowing ? 'Unfollow' : 'Follow')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery && !searchUsersMutation.isPending ? (
                <div className="p-4 text-center text-gray-400">No users found</div>
              ) : null}
            </div>
            <div className="p-3 border-t border-gray-700">
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)} className="w-full text-gray-400">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 pt-6 pb-24 space-y-1 overflow-y-auto">
        {/* Create Post */}
        <Card className="mx-2 md:mx-0 border-0 shadow-none bg-transparent">
          <CardContent className="pt-4 pb-2 px-0">
            <div className="flex space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
                <AvatarFallback className="bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 cursor-pointer" onClick={() => setLocation('/create-post')}>
                <div className="mb-1">
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg">{getUserDisplayName(user)}</h3>
                  <p className="text-gray-400 text-lg hover:text-gray-300 transition-colors">What's new?</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {posts.map((post: Post) => (
          <Card key={post.id} data-post-id={post.id} className="overflow-hidden border-0 shadow-none bg-transparent border-b border-gray-200 dark:border-gray-800 rounded-none">
            <CardHeader className="pb-2 px-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10 cursor-pointer" onClick={() => handleUserClick(post.user.id)}>
                    <AvatarImage src={getImageUrl(post.user.profileImageUrl)} />
                    <AvatarFallback className="bg-gray-700 text-white">{post.user.firstName?.[0] || post.user.lastName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{getUserDisplayName(post.user)}</p>
                      {post.user.isVerified === 1 && (
                        <VerificationBadge className="w-3.5 h-3.5" />
                      )}
                      <p className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</p>
                    </div>
                    {editingPost === post.id ? (
                      <div className="mt-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[100px] mb-3 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                          placeholder="Edit your post..."
                        />
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim() || editPostMutation.isPending}
                            size="sm"
                          >
                            {editPostMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button 
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {post.content && (
                          <p className="text-gray-900 dark:text-white mt-2 whitespace-pre-line break-words leading-relaxed">{post.content}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isPostOwner(post) ? (
                      <>
                        <DropdownMenuItem onClick={() => handleEditPost(post)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Post
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this post? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeletePost(post.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <DropdownMenuItem onClick={() => handleSharePost(post.id)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Post
                    </DropdownMenuItem>
                    <SavePostMenuItem postId={post.id} onSave={handleSavePost} onUnsave={handleUnsavePost} />
                    <DropdownMenuItem onClick={() => {
                      setReportPostId(post.id);
                      setReportDialogOpen(true);
                    }}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-4">
              {/* Render media from imageUrl: single URL or JSON array */}
              {post.imageUrl ? (() => {
                const val = post.imageUrl || '';
                const looksJsonArray = val.trim().startsWith('[');
                if (looksJsonArray) {
                  const urls: string[] = (() => { try { return JSON.parse(val); } catch { return []; }})();
                  if (urls.length > 0) {
                    // Threads-like swipeable carousel with flexible sizing
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
                                    <VideoPlayer 
                                      src={url} 
                                      className="w-full h-auto max-h-[500px]"
                                    />
                                  ) : (
                                    <img 
                                      src={url} 
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
                  // Single item in array
                  const only = urls[0];
                  if (only) {
                    return (
                      <div className="relative w-full max-h-[500px] mb-4 overflow-hidden rounded-2xl bg-black">
                        {only.match(/\.(mp4|mov|webm)$/i) ? (
                          <VideoPlayer 
                            src={only} 
                            className="w-full h-auto max-h-[500px]"
                          />
                        ) : (
                          <img 
                            src={only} 
                            className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                            onClick={() => openImageModal(only)}
                          />
                        )}
                      </div>
                    );
                  }
                  return null;
                }
                // Plain single URL
                return (
                  <div className="relative w-full max-h-[500px] mb-4 overflow-hidden rounded-2xl bg-black">
                    {val.match(/\.(mp4|mov|webm)$/i) ? (
                      <VideoPlayer 
                        src={val} 
                        className="w-full h-auto max-h-[500px]"
                      />
                    ) : (
                      <img 
                        src={val} 
                        alt="Post media" 
                        className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => openImageModal(val)}
                      />
                    )}
                  </div>
                );
              })() : null}
              <div className="flex items-center space-x-4 pt-4">
                <Button variant="ghost" size="lg" onClick={() => handleLike(post)} className={`p-3 h-auto rounded-full transition-all duration-200 ${post.isLiked ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/10'}`}>
                  <Heart className={`w-5 h-5 mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-semibold">{post.likesCount}</span>
                </Button>
                <Button variant="ghost" size="lg" onClick={() => setShowComments(showComments === post.id ? null : post.id)} className="p-3 h-auto rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-200">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-semibold">{post.commentsCount}</span>
                </Button>
                <Button variant="ghost" size="lg" onClick={() => handleRepost(post.id)} className={`p-3 h-auto rounded-full hover:bg-green-500/10 transition-all duration-200 ${post.isReposted ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:text-green-500'}`}>
                  <Repeat2 className="w-5 h-5 mr-2" />
                  <span className="text-sm font-semibold">{post.repostsCount}</span>
                </Button>
              </div>

              {showComments === post.id && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                  <div className="flex space-x-2">
                    <Avatar className="w-8 h-8 cursor-pointer" onClick={() => handleUserClick(user?.id)}>
                      <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
                      <AvatarFallback className="text-xs bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex">
                      <Input
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="rounded-r-none bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500"
                        onKeyPress={(e) => { if (e.key === 'Enter') { handleComment(post.id); } }}
                      />
                      <Button onClick={() => handleComment(post.id)} disabled={!newComment.trim() || commentMutation.isPending} className="rounded-l-none" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-2">
                        <Avatar className="w-8 h-8 cursor-pointer" onClick={() => handleUserClick(comment.user.id)}>
                          <AvatarImage src={getImageUrl(comment.user.profileImageUrl)} />
                          <AvatarFallback className="bg-gray-700 text-white">{comment.user.firstName?.[0] || comment.user.lastName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-900 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-1">
                              <p className="font-semibold text-sm text-white">{getUserDisplayName(comment.user)}</p>
                              {comment.user.isVerified === 1 && (
                                <VerificationBadge className="w-3 h-3" />
                              )}
                            </div>
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
                                <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
                                <AvatarFallback className="text-xs bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex">
                                <Input
                                  placeholder={`Reply to ${getUserDisplayName(comment.user)}...`}
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  className="rounded-r-none bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 text-sm"
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
                          {comment.replies.map((reply: Comment) => (
                            <div key={reply.id} className="space-y-2">
                              <div className="flex space-x-2">
                                <Avatar className="w-6 h-6 cursor-pointer" onClick={() => handleUserClick(reply.user.id)}>
                                  <AvatarImage src={getImageUrl(reply.user.profileImageUrl)} />
                                  <AvatarFallback className="bg-gray-700 text-white text-xs">{reply.user.firstName?.[0] || reply.user.lastName?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="bg-gray-800 rounded-lg px-3 py-2">
                                    <div className="flex items-center space-x-1">
                                      <p className="font-semibold text-xs text-white">{getUserDisplayName(reply.user)}</p>
                                      {reply.user.isVerified === 1 && (
                                        <VerificationBadge className="w-2.5 h-2.5" />
                                      )}
                                    </div>
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
                                        <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
                                        <AvatarFallback className="text-xs bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 flex">
                                        <Input
                                          placeholder={`Reply to ${getUserDisplayName(reply.user)}...`}
                                          value={replyContent}
                                          onChange={(e) => setReplyContent(e.target.value)}
                                          className="rounded-r-none bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 text-xs"
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
        ))}

        {posts.length === 0 && (
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="text-center py-12 px-0">
              <FoxLogo size={60} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">No posts yet</h3>
              <p className="text-gray-500">Be the first to share something.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navbar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 dark:bg-black/95 backdrop-blur-sm border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="text-gray-900 dark:text-white h-14 w-14 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200"><span className="sr-only">Home</span><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z"/></svg></Button>
          <Button variant="ghost" size="icon" onClick={() => setLocation('/messages')} className="h-14 w-14 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200 relative">
            <span className="sr-only">MessageSquare</span>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <NotificationBadge count={unreadCount} />
          </Button>
          <Button variant="ghost" size="icon" className="bg-blue-600 hover:bg-blue-700 rounded-full h-16 w-16 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" onClick={() => setLocation('/create-post')}><span className="sr-only">Create</span><svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></Button>
          <Button variant="ghost" size="icon" className="h-14 w-14 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200" onClick={() => setLocation('/activity')}><span className="sr-only">Activity</span><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></Button>
          <Button variant="ghost" size="icon" className="h-14 w-14 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200" onClick={() => handleUserClick()}><span className="sr-only">User</span><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/></svg></Button>
        </div>
      </div>

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

      {/* Terms Dialog */}
      <TermsDialog
        isOpen={showTermsDialog}
        onAccept={handleTermsAccept}
        userType="vendor"
      />
    </div>
  );
}