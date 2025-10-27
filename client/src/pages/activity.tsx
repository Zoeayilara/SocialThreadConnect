import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, MessageCircle, Repeat2, UserPlus, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from '@tanstack/react-query';
import { formatRelativeTime } from '@/utils/dateUtils';
import { useLocation } from 'wouter';
import { authenticatedFetch } from '@/utils/api';


interface ActivityProps {
  onBack: () => void;
}

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'post' | 'mention';
  message: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  isRead: boolean;
  postId?: number;
}

export default function Activity({ onBack }: ActivityProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'follows' | 'posts'>('all');
  const [, setLocation] = useLocation();

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ['activities', activeTab],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/activities`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'follows', label: 'Follows' },
    { key: 'posts', label: 'Posts' }
  ];

  const getUserDisplayName = (activity: ActivityItem) => 
    `${activity.user.firstName} ${activity.user.lastName}` || 'User';

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'repost':
        return 'reposted your post';
      case 'follow':
        return 'followed you';
      case 'post':
        return 'posted';
      case 'mention':
        return 'tagged you in a post';
      default:
        return 'interacted with your post';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'repost':
        return <Repeat2 className="w-5 h-5 text-purple-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'post':
        return <MessageCircle className="w-5 h-5 text-gray-500" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-orange-500" />;
      default:
        return <Heart className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    // For mentions, navigate to the post; for others, navigate to profile
    if (activity.type === 'mention' && activity.postId) {
      // Navigate to dashboard and scroll to the specific post
      setLocation(`/?post=${activity.postId}`);
    } else {
      // Navigate to the user's profile
      setLocation(`/profile/${activity.user.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
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
        <div className="space-y-0">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No recent activity</div>
              <div className="text-gray-500 text-sm">When people interact with your posts, you'll see it here</div>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div 
                key={`${activity.user.id}-${activity.postId || 'follow'}-${index}`} 
                onClick={() => handleActivityClick(activity)}
                className="flex items-center space-x-3 p-4 border-b border-gray-800 transition-all duration-200 hover:bg-gray-900/30 cursor-pointer"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-gray-700">
                    <AvatarImage src={activity.user.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-sm font-medium">
                      {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1.5 border-2 border-gray-800">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm leading-relaxed">
                        <span className="font-semibold">
                          {getUserDisplayName(activity)}
                        </span>{' '}
                        <span className="text-gray-300">{getActivityText(activity)}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-2 font-medium">
                        {formatRelativeTime(new Date(activity.createdAt).getTime())}
                      </p>
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
