import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Heart, MessageCircle, Share, MoreHorizontal, Image, Send, LogOut, Edit, Trash2, Bookmark, Flag } from "lucide-react";
import { FoxLogo } from "@/components/FoxLogo";
import { formatRelativeTime } from "@/utils/dateUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const { user, logoutMutation, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

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
      const response = await fetch(`${API_URL}/api/posts`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  // Fetch comments for a post
  const { data: comments = [] } = useQuery({
    queryKey: ['/api/comments', showComments],
    queryFn: async () => {
      if (!showComments) return [];
      const response = await fetch(`${API_URL}/api/posts/${showComments}/comments`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!showComments,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: string | FormData) => {
      const isFormData = data instanceof FormData;
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: isFormData ? data : JSON.stringify({ content: data }),
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
    mutationFn: async ({ postId, isLiked }: { postId: number; isLiked: boolean }) => {
      const response = await fetch(`${API_URL}/api/posts/${postId}/${isLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update like');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
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
    likeMutation.mutate({ postId: post.id, isLiked: !!post.isLiked });
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
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email.split('@')[0];
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
              onClick={() => window.location.href = user?.userType === 'vendor' ? '/vendor-dashboard' : '/customer-dashboard'}
            >
              Dashboard
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl ?? undefined} />
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                      {post.user.firstName?.[0]}{post.user.lastName?.[0]}
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
                  {post.mediaUrl && (
                    <div className="mb-4">
                      {post.mediaType === 'image' ? (
                        <img 
                          src={post.mediaUrl} 
                          alt="Post image" 
                          className="max-w-full h-auto rounded-lg cursor-pointer"
                          onClick={() => window.open(post.mediaUrl, '_blank')}
                        />
                      ) : post.mediaType === 'video' ? (
                        <video 
                          src={post.mediaUrl} 
                          controls 
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '400px' }}
                        />
                      ) : null}
                    </div>
                  )}
                </>
              )}
              
              {post.imageUrl && (
                <img 
                  src={post.imageUrl} 
                  alt="Post image" 
                  className="w-full rounded-lg mb-4"
                />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post)}
                  className={`hover:bg-red-50 hover:text-red-600 ${
                    post.isLiked ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  <Heart 
                    className={`w-4 h-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`} 
                  />
                  {post.likesCount}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                  className="hover:bg-blue-50 hover:text-blue-600"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {post.commentsCount}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-green-50 hover:text-green-600"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
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
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                          {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
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