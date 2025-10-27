import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Heart, MessageCircle, MoreHorizontal, Send, Bookmark, ArrowLeft, X, Flag, Repeat2 } from "lucide-react";
import { formatRelativeTime } from "@/utils/dateUtils";
import { authenticatedFetch } from "@/utils/api";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SavePostMenuItem } from '@/components/SavePostMenuItem';
import ReportDialog from '@/components/ReportDialog';

// # interface save post
interface SavedPost {
  id: number;
  content: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: number;
  savedAt: number;
  isLiked?: boolean;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    universityHandle?: string;
  };
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  repliesCount: number;
  replies?: Comment[];
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

const Saved = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<{[postId: number]: number}>({});
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedPosts = [], isLoading } = useQuery<SavedPost[]>({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/saved-posts`);
      if (!response.ok) {
        throw new Error('Failed to fetch saved posts');
      }
      return response.json();
    },
  });

  // Fetch comments for a specific post
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', showComments],
    queryFn: async () => {
      if (!showComments) return [];
      const response = await authenticatedFetch(`/api/posts/${showComments}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!showComments,
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
      await queryClient.cancelQueries({ queryKey: ['saved-posts'] });
      
      // Snapshot the previous value
      const previousSavedPosts = queryClient.getQueryData(['saved-posts']);
      
      // Optimistically update saved posts
      queryClient.setQueryData(['saved-posts'], (old: SavedPost[] = []) => {
        return old.map((post: SavedPost) => {
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
      
      return { previousSavedPosts };
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSavedPosts) {
        queryClient.setQueryData(['saved-posts'], context.previousSavedPosts);
      }
    },
    onSuccess: (data, { postId }) => {
      // Update with server response to ensure consistency
      queryClient.setQueryData(['saved-posts'], (old: SavedPost[] = []) => {
        return old.map((post: SavedPost) => {
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
        queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      }, 100);
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
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      toast({ title: "Post unsaved successfully!" });
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
    onSuccess: (_, variables) => {
      // Only update comments, don't reorder posts
      queryClient.invalidateQueries({ queryKey: ['comments', showComments] });
      
      // Update comment count for the specific post without reordering
      queryClient.setQueryData(['saved-posts'], (oldPosts: SavedPost[] = []) => {
        return oldPosts.map(post => 
          post.id === variables.postId 
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        );
      });
    },
  });

  const handleLike = (post: SavedPost) => {
    likeMutation.mutate({ postId: post.id });
  };

  const handleUnsave = (postId: number) => {
    unsavePostMutation.mutate(postId);
  };

  // Repost mutation
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
      queryClient.setQueryData(['saved-posts'], (oldPosts: SavedPost[] = []) => {
        return oldPosts.map(post => 
          post.id === postId 
            ? { ...post, repostsCount: result.repostsCount, isReposted: result.isReposted }
            : post
        );
      });
    },
  });

  const handleRepost = (postId: number) => {
    repostMutation.mutate(postId);
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

  const openImageModal = (url: string) => {
    window.open(url, '_blank');
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
    return user.universityHandle || user.email?.split('@')[0] || 'User';
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl">
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="p-2 text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-white">Saved</h1>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="text-center text-gray-400">Loading saved posts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="p-2 text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">Saved</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-20">
          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Bookmark className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No saved posts yet</h2>
              <p className="text-gray-400 text-center max-w-sm">
                When you save posts, they'll appear here so you can easily find them later.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {savedPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden border-0 shadow-none bg-transparent border-b border-gray-800 rounded-none">
                  <CardHeader className="pb-2 px-0 pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10 cursor-pointer">
                          <AvatarImage src={post.user.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-gray-700 text-white">{post.user.firstName?.[0] || post.user.lastName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-white">{getUserDisplayName(post.user)}</p>
                            <p className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</p>
                          </div>
                          <>
                            {post.content && (
                              <p className="text-white mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                            )}
                            {post.mediaUrl && (
                              <div className="mt-3">
                                {post.mediaType === 'image' ? (
                                  <img 
                                    src={post.mediaUrl} 
                                    alt="Post image" 
                                    className="max-w-full h-auto rounded-lg cursor-pointer"
                                    onClick={() => window.open(post.mediaUrl, '_blank')}
                                  />
                                ) : post.mediaType === 'video' ? (
                                  <VideoPlayer 
                                    src={post.mediaUrl} 
                                    className="max-w-full h-auto rounded-lg"
                                  />
                                ) : null}
                              </div>
                            )}
                          </>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <SavePostMenuItem postId={post.id} onSave={() => {}} onUnsave={handleUnsave} />
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
                  <CardContent className="pt-0 px-0 pb-6">
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
                                      <div className="relative w-full max-h-[300px] sm:max-h-[400px] overflow-hidden rounded-2xl bg-black">
                                        {url.match(/\.(mp4|mov|webm)$/i) ? (
                                          <VideoPlayer src={url} className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain" />
                                        ) : (
                                          <img 
                                            src={url} 
                                            className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
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
                            <div className="relative w-full max-h-[300px] sm:max-h-[400px] mb-4 overflow-hidden rounded-2xl bg-black">
                              {only.match(/\.(mp4|mov|webm)$/i) ? (
                                <VideoPlayer src={only} className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain" />
                              ) : (
                                <img 
                                  src={only} 
                                  className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
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
                        <div className="relative w-full max-h-[300px] sm:max-h-[400px] mb-4 overflow-hidden rounded-2xl bg-black">
                          {val.match(/\.(mp4|mov|webm)$/i) ? (
                            <VideoPlayer src={val} className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain" />
                          ) : (
                            <img 
                              src={val} 
                              alt="Post media" 
                              className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
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
                      <Button variant="ghost" size="lg" onClick={() => handleRepost(post.id)} className="p-3 h-auto rounded-full text-gray-500 hover:text-green-500 hover:bg-green-500/10 transition-all duration-200">
                        <Repeat2 className="w-5 h-5 mr-2" />
                        <span className="text-sm font-semibold">{post.repostsCount}</span>
                      </Button>
                    </div>

                    {showComments === post.id && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                        <div className="flex space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                              className="rounded-r-none bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                              onKeyPress={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { handleComment(post.id); } }}
                            />
                            <Button onClick={() => handleComment(post.id)} disabled={!newComment.trim() || commentMutation.isPending} className="rounded-l-none" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {comments.map((comment: Comment) => (
                          <div key={comment.id} className="space-y-2">
                            <div className="flex space-x-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={comment.user.profileImageUrl || undefined} />
                                <AvatarFallback className="bg-gray-700 text-white">{comment.user.firstName?.[0] || comment.user.lastName?.[0] || 'U'}</AvatarFallback>
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
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={user?.profileImageUrl || undefined} />
                                      <AvatarFallback className="text-xs bg-gray-700 text-white">{user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 flex">
                                      <Input
                                        placeholder={`Reply to ${getUserDisplayName(comment.user)}...`}
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                        onKeyPress={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { handleComment(post.id, comment.id); } }}
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
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage src={reply.user.profileImageUrl || undefined} />
                                        <AvatarFallback className="bg-gray-700 text-white text-xs">{reply.user.firstName?.[0] || reply.user.lastName?.[0] || 'U'}</AvatarFallback>
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
                                              <AvatarImage src={undefined} />
                                              <AvatarFallback className="text-xs bg-gray-700 text-white">U</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 flex">
                                              <Input
                                                placeholder={`Reply to ${getUserDisplayName(reply.user)}...`}
                                                value={replyContent}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyContent(e.target.value)}
                                                className="rounded-r-none bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                                                onKeyPress={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { handleComment(post.id, reply.id); } }}
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
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-black/95 border-gray-800 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 text-white hover:bg-gray-800/80 rounded-full p-2 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Full size image"
                className="w-full h-auto max-h-[90vh] object-contain transition-all duration-300 ease-out animate-in zoom-in-95 fade-in-0"
                style={{ animationDelay: '100ms' }}
              />
            )}
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
};

export default Saved;
