import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface NewPostNotificationProps {
  newPostsCount: number;
  onRefresh: () => void;
  onDismiss: () => void;
}

export const NewPostNotification: React.FC<NewPostNotificationProps> = ({
  newPostsCount,
  onRefresh,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (newPostsCount > 0) {
      setIsVisible(true);
    }
  }, [newPostsCount]);

  const handleRefresh = () => {
    onRefresh();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    onDismiss();
    setIsVisible(false);
  };

  if (!isVisible || newPostsCount === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
        <ArrowUp className="w-4 h-4" />
        <span className="text-sm font-medium">
          {newPostsCount} new post{newPostsCount > 1 ? 's' : ''}
        </span>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-blue-700 px-3 py-1 h-auto text-sm"
        >
          View
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-blue-700 p-1 h-auto"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Hook to manage new post notifications
export const useNewPostNotifications = () => {
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastPostId, setLastPostId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const checkForNewPosts = (posts: any[]) => {
    if (!posts || posts.length === 0) return;
    
    const latestPost = posts[0];
    if (lastPostId === null) {
      setLastPostId(latestPost.id);
      return;
    }
    
    if (latestPost.id > lastPostId) {
      const newPosts = posts.filter(post => post.id > lastPostId);
      setNewPostsCount(prev => prev + newPosts.length);
    }
  };

  const refreshPosts = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    
    // Update last post ID to latest
    const postsData = queryClient.getQueryData(['/api/posts']) as any[];
    if (postsData && postsData.length > 0) {
      setLastPostId(postsData[0].id);
    }
    
    setNewPostsCount(0);
  };

  const dismissNotification = () => {
    setNewPostsCount(0);
  };

  return {
    newPostsCount,
    checkForNewPosts,
    refreshPosts,
    dismissNotification
  };
};
