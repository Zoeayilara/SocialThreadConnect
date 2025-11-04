import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Heart, MessageCircle, Repeat2, Send, Loader2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { authenticatedFetch, getImageUrl, API_URL } from '@/utils/api';
import { formatRelativeTime } from '@/utils/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VerificationBadge } from '@/components/VerificationBadge';
import { VideoPlayer } from '@/components/VideoPlayer';

export default function PostDetail() {
  const params = useParams();
  const postId = parseInt((params as { postId?: string }).postId || '0');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  // Fetch single post
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      console.log('🔍 Fetching post from:', `${API_URL}/api/posts/${postId}`);
      const response = await fetch(`${API_URL}/api/posts/${postId}`);
      console.log('📡 Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Fetch error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch post');
      }
      const data = await response.json();
      console.log('✅ Post data received:', data);
      return data;
    },
    enabled: !!postId,
    retry: 2,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!user) return [];
      const response = await authenticatedFetch(`/api/posts/${postId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!postId && !!user,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to like post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to post comment');
      return response.json();
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast({ title: 'Comment posted!' });
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to repost');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  const handleLike = () => {
    if (!user) {
      toast({ title: 'Please login to like posts', variant: 'destructive' });
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!user) {
      toast({ title: 'Please login to comment', variant: 'destructive' });
      return;
    }
    if (!comment.trim()) return;
    commentMutation.mutate(comment);
  };

  const handleRepost = () => {
    if (!user) {
      toast({ title: 'Please login to repost', variant: 'destructive' });
      return;
    }
    repostMutation.mutate();
  };

  const getUserDisplayName = (post: any) => {
    if (post.authorFirstName || post.authorLastName) {
      return `${post.authorFirstName || ''} ${post.authorLastName || ''}`.trim();
    }
    return post.authorEmail?.split('@')[0] || 'User';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error loading post</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{(error as Error).message}</p>
          <Button onClick={() => setLocation('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Post not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">This post may have been deleted.</p>
          <Button onClick={() => setLocation('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const mediaItems = post.mediaUrl ? JSON.parse(post.mediaUrl) : [];
  const mediaTypes = post.mediaType ? JSON.parse(post.mediaType) : [];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Post</h1>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-start space-x-3">
              <Avatar
                className="w-12 h-12 cursor-pointer"
                onClick={() => setLocation(`/profile/${post.user_id}`)}
              >
                <AvatarImage src={getImageUrl(post.authorProfileImage)} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getUserDisplayName(post)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span
                    className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                    onClick={() => setLocation(`/profile/${post.user_id}`)}
                  >
                    {getUserDisplayName(post)}
                  </span>
                  {post.authorIsVerified && <VerificationBadge />}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(post.created_at)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-0 pb-4">
            {/* Post Text */}
            {post.content && (
              <div className="px-6 mb-4">
                <p className="text-gray-900 dark:text-white whitespace-pre-line break-words leading-relaxed">
                  {post.content}
                </p>
              </div>
            )}

            {/* Media */}
            {mediaItems.length > 0 && (
              <div className="mb-4">
                {mediaItems.length === 1 ? (
                  <div className="w-full">
                    {mediaTypes[0]?.startsWith('video/') ? (
                      <VideoPlayer src={getImageUrl(mediaItems[0]) || ''} />
                    ) : (
                      <img
                        src={getImageUrl(mediaItems[0]) || ''}
                        alt="Post media"
                        className="w-full max-h-[600px] object-contain bg-gray-100 dark:bg-gray-900"
                      />
                    )}
                  </div>
                ) : (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {mediaItems.map((url: string, index: number) => (
                        <CarouselItem key={index}>
                          {mediaTypes[index]?.startsWith('video/') ? (
                            <VideoPlayer src={getImageUrl(url) || ''} />
                          ) : (
                            <img
                              src={getImageUrl(url) || ''}
                              alt={`Post media ${index + 1}`}
                              className="w-full max-h-[600px] object-contain bg-gray-100 dark:bg-gray-900"
                            />
                          )}
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={post.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}
              >
                <Heart className={`w-5 h-5 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
                {post.likesCount || 0}
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-5 h-5 mr-1" />
                {post.commentsCount || 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRepost}
                className={post.isReposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}
              >
                <Repeat2 className="w-5 h-5 mr-1" />
                {post.repostsCount || 0}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Login Prompt for Non-Users */}
        {!user && (
          <Card className="mt-4 border-blue-500 dark:border-blue-600">
            <CardContent className="py-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Join the conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Login or create an account to like, comment, and interact with posts.
              </p>
              <div className="flex justify-center space-x-3">
                <Button onClick={() => setLocation('/login')}>Login</Button>
                <Button variant="outline" onClick={() => setLocation('/register')}>
                  Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comment Section */}
        {user && (
          <>
            {/* Add Comment */}
            <Card className="mt-4 border-gray-200 dark:border-gray-800">
              <CardContent className="pt-4">
                <div className="flex space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getImageUrl(user.profileImageUrl)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleComment}
                        disabled={!comment.trim() || commentMutation.isPending}
                        size="sm"
                      >
                        {commentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments List */}
            {comments.length > 0 && (
              <div className="mt-4 space-y-4">
                {comments.map((comment: any) => (
                  <Card key={comment.id} className="border-gray-200 dark:border-gray-800">
                    <CardContent className="pt-4">
                      <div className="flex space-x-3">
                        <Avatar
                          className="w-10 h-10 cursor-pointer"
                          onClick={() => setLocation(`/profile/${comment.user_id}`)}
                        >
                          <AvatarImage src={getImageUrl(comment.userProfileImage)} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {comment.userFirstName?.[0] || comment.userEmail[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span
                              className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer text-sm"
                              onClick={() => setLocation(`/profile/${comment.user_id}`)}
                            >
                              {comment.userFirstName || comment.userLastName
                                ? `${comment.userFirstName || ''} ${comment.userLastName || ''}`.trim()
                                : comment.userEmail?.split('@')[0]}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white text-sm whitespace-pre-line break-words">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
