import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MessageCircle, Share, MoreHorizontal, Image, Send, LogOut, Edit, Trash2, Bookmark, Flag } from "lucide-react";
import { FoxLogo } from "@/components/FoxLogo";
import { formatRelativeTime } from "@/utils/dateUtils";
import { authenticatedFetch } from "@/utils/api";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AnimatedLikeButton } from "@/components/AnimatedLikeButton";

interface Post {
  id: number;
  userId: number;
  content: string;
  createdAt: number;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount: number;
  commentsCount: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
  isLiked?: boolean;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export default function Social() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [carouselIndex, setCarouselIndex] = useState<{[postId: number]: number}>({});

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading spinner only during logout
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
        <LoadingOverlay text="Logging out" overlay={false} />
      </div>
    );
  }

  // Fetch posts
  const { data: posts = [] } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/posts');
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000, // 30 minutes stale time
  });

  // Fetch comments for a post
  const { data: comments = [] } = useQuery({
    queryKey: ['/api/comments', showComments],
    queryFn: async () => {
      if (!showComments) return [];
      const response = await authenticatedFetch(`/api/posts/${showComments}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!showComments,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: string | FormData) => {
      const isFormData = data instanceof FormData;
      const response = await authenticatedFetch('/api/posts', {
        method: 'POST',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body: data,
      });
      if (!response.ok) throw new Error('Failed to create post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setNewPost("");
      setSelectedMedia([]);
      // Reset file input
      const fileInput = document.getElementById('mediaInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({ title: "Post created successfully!" });
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
              likesCount: Math.max(0, currentlyLiked ? post.likesCount - 1 : post.likesCount + 1)
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/comments', showComments] });
      setNewComment("");
      toast({ title: "Comment added!" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setEditingPost(null);
      setEditContent("");
      toast({ title: "Post updated successfully!" });
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

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedMedia(files);
  };

  const handleCreatePost = () => {
    if (newPost.trim() || selectedMedia.length > 0) {
      const formData = new FormData();
      formData.append('content', newPost);
      
      selectedMedia.forEach((file) => {
        formData.append('media', file);
      });
      
      createPostMutation.mutate(formData);
    }
  };

  const handleLike = (post: Post) => {
    likeMutation.mutate({ postId: post.id });
  };

  const handleComment = (postId: number) => {
    if (newComment.trim()) {
      commentMutation.mutate({ postId, content: newComment });
    }
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

  const isPostOwner = (post: Post) => {
    return user?.id === post.user.id;
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    return user.email ? user.email.split('@')[0] : 'User';
  };

  // Remove loading spinner for posts - let content load naturally

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FoxLogo size={32} />
            <h1 className="text-xl font-bold">EntreeFox</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Navigation Links */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation(user?.userType === 'vendor' ? '/vendor-dashboard' : '/customer-dashboard')}
            >
              Dashboard
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl ?? undefined} />
              <AvatarFallback>
                {user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-6 space-y-6">
        {/* Create Post */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-3">
              <Avatar>
                <AvatarImage src={user?.profileImageUrl ?? undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="What's happening?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[100px] border-none resize-none focus:ring-0 text-lg placeholder:text-gray-500"
                />
                {selectedMedia.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectedMedia.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-sm text-gray-600">Video</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => {
                            setSelectedMedia(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => document.getElementById('mediaInput')?.click()}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Photo/Video
                  </Button>
                  <input
                    type="file"
                    id="mediaInput"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaSelect}
                  />
                  <Button 
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() && selectedMedia.length === 0 || createPostMutation.isPending}
                    className="rounded-full"
                  >
                    {createPostMutation.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {posts.map((post: Post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={post.user.profileImageUrl ?? undefined} />
                    <AvatarFallback>
                      {post.user.firstName?.[0] || post.user.lastName?.[0] || post.user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{getUserDisplayName(post.user)}</p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isPostOwner(post) ? (
                      <>
                        <DropdownMenuItem onClick={() => handleEditPost(post)}>
                          <Edit className="w-4 h-4 mr-2" />
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
                    <DropdownMenuItem>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Save Post
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Flag className="w-4 h-4 mr-2" />
                      Report Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {editingPost === post.id ? (
                <div className="mb-4">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] mb-3"
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
                    <p className="text-lg mb-4 whitespace-pre-wrap">{post.content}</p>
                  )}
                  {/* Media display with carousel support */}
                  {(post.mediaUrl || post.imageUrl) && (() => {
                    const mediaUrl = post.mediaUrl || post.imageUrl || '';
                    const looksJsonArray = mediaUrl.trim().startsWith('[');
                    
                    if (looksJsonArray) {
                      try {
                        const urls = JSON.parse(mediaUrl);
                        if (Array.isArray(urls) && urls.length > 0) {
                          if (urls.length > 1) {
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
                                        <div className="relative w-full max-h-[500px] overflow-hidden rounded-lg bg-black">
                                          {url.match(/\.(mp4|mov|webm)$/i) ? (
                                            <VideoPlayer 
                                              src={url} 
                                              className="w-full h-auto max-h-[500px] object-contain"
                                            />
                                          ) : (
                                            <img 
                                              src={url} 
                                              alt="Post media" 
                                              className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                                              onClick={() => window.open(url, '_blank')}
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
                          } else {
                            // Single item from array
                            const url = urls[0];
                            return (
                              <div className="mb-4">
                                {url.match(/\.(mp4|mov|webm)$/i) ? (
                                  <VideoPlayer 
                                    src={url} 
                                    className="max-w-full h-auto rounded-lg"
                                  />
                                ) : (
                                  <img 
                                    src={url} 
                                    alt="Post image" 
                                    className="max-w-full h-auto rounded-lg cursor-pointer"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                )}
                              </div>
                            );
                          }
                        }
                      } catch (e) {
                        // Fall back to treating as single URL
                      }
                    }
                    
                    // Single URL (original behavior)
                    return (
                      <div className="mb-4">
                        {mediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                          <VideoPlayer 
                            src={mediaUrl} 
                            className="max-w-full h-auto rounded-lg"
                          />
                        ) : (
                          <img 
                            src={mediaUrl} 
                            alt="Post image" 
                            className="max-w-full h-auto rounded-lg cursor-pointer"
                            onClick={() => window.open(mediaUrl, '_blank')}
                          />
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Actions */}
              <div className="flex items-center justify-start gap-6 pt-3 border-t border-gray-800">
                <AnimatedLikeButton
                  isLiked={post.isLiked || false}
                  likesCount={post.likesCount}
                  onLike={() => handleLike(post)}
                  disabled={likeMutation.isPending}
                  size="sm"
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                  className="text-gray-400 hover:text-gray-200 p-0 h-auto font-normal"
                >
                  <MessageCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm">{post.commentsCount}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-200 p-0 h-auto font-normal"
                >
                  <Share className="w-5 h-5" />
                </Button>
              </div>

              {/* Comments Section */}
              {showComments === post.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Add Comment */}
                  <div className="flex space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex">
                      <Input
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="rounded-r-none"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleComment(post.id);
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleComment(post.id)}
                        disabled={!newComment.trim() || commentMutation.isPending}
                        className="rounded-l-none"
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className="flex space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {comment.user.firstName?.[0] || comment.user.lastName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <p className="font-semibold text-sm">
                            {getUserDisplayName(comment.user)}
                          </p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-3">
                          {formatRelativeTime(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {posts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FoxLogo size={60} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Welcome to EntreeFox!</h3>
              <p className="text-gray-600">Start sharing your thoughts with the community.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}