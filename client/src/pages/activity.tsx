import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatRelativeTime } from '@/utils/dateUtils';
import { authenticatedFetch } from '@/utils/api';


interface ActivityProps {
  onBack: () => void;
}

interface ActivityItem {
  type: 'like' | 'comment' | 'repost';
  timestamp: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  post_id: number;
  post_content: string;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
}

export default function Activity({ onBack }: ActivityProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'follows' | 'reposts'>('all');
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ['activities', activeTab],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'credentials': 'include',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/activities`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'follows', label: 'Follows' },
    { key: 'reposts', label: 'Posts' }
  ];

  const getUserDisplayName = (activity: ActivityItem) => 
    `${activity.first_name} ${activity.last_name}` || 'User';

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };


  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'repost':
        return 'reposted your post';
      default:
        return 'interacted with your post';
    }
  };

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: number; isLiked: boolean }) => {
      const response = await authenticatedFetch(`/api/posts/${postId}/${isLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to update like');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Like mutation error:', error);
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
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Repost mutation error:', error);
    },
  });

  const handleLike = (activity: ActivityItem) => {
    console.log('Like button clicked for post:', activity.post_id);
    likeMutation.mutate({ postId: activity.post_id, isLiked: false }); // Assume not liked in activity
  };

  const handleRepost = (postId: number) => {
    console.log('Repost button clicked for post:', postId);
    repostMutation.mutate(postId);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Activity</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-4">
        <div className="flex space-x-2 mb-6">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Previous Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Previous</h2>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No recent activity</p>
              <p className="text-gray-500 text-sm mt-2">When people interact with your posts, you'll see it here</p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div key={`${activity.user_id}-${activity.post_id}-${index}`} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={activity.profile_image_url} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {activity.first_name?.[0]}{activity.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{getUserDisplayName(activity)}</p>
                        <p className="text-gray-400 text-sm">{getActivityText(activity)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 text-sm">{formatRelativeTime(activity.timestamp)}</span>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-white text-sm leading-relaxed">
                        {activity.post_content.length > 100 
                          ? `${activity.post_content.substring(0, 100)}...` 
                          : activity.post_content
                        }
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-gray-400">
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={() => handleLike(activity)}
                          disabled={likeMutation.isPending}
                          className="flex items-center space-x-1 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-sm">{formatNumber(activity.likes_count)}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-blue-400 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{formatNumber(activity.comments_count)}</span>
                        </button>
                        <button 
                          onClick={() => handleRepost(activity.post_id)}
                          disabled={repostMutation.isPending}
                          className="flex items-center space-x-1 hover:text-green-400 transition-colors disabled:opacity-50"
                        >
                          <Repeat2 className="w-4 h-4" />
                          <span className="text-sm">{formatNumber(activity.reposts_count || 0)}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-gray-300 transition-colors">
                          <Share className="w-4 h-4" />
                          <span className="text-sm">0</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
