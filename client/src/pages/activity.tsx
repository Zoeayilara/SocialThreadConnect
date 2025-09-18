import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, MessageCircle, Repeat2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from '@tanstack/react-query';
import { formatRelativeTime } from '@/utils/dateUtils';
import { useLocation } from 'wouter';
import { authenticatedFetch } from '@/utils/api';


interface ActivityProps {
  onBack: () => void;
}

interface ActivityItem {
  type: 'like' | 'comment' | 'repost' | 'follow' | 'post';
  timestamp: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  post_id?: number;
  post_content?: string;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
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
    `${activity.first_name} ${activity.last_name}` || 'User';

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
      default:
        return 'interacted with your post';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'post':
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Heart className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    // Navigate to the user's profile
    setLocation(`/profile/${activity.user_id}`);
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
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No recent activity</p>
              <p className="text-gray-500 text-sm mt-2">When people interact with your posts, you'll see it here</p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div 
                key={`${activity.user_id}-${activity.post_id || 'follow'}-${index}`} 
                onClick={() => handleActivityClick(activity)}
                className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-900/50 cursor-pointer transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={activity.profile_image_url} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {activity.first_name?.[0]}{activity.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-white">
                          <span className="font-medium">{getUserDisplayName(activity)}</span>
                          <span className="text-gray-400 ml-1">{getActivityText(activity)}</span>
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {activity.post_content && activity.type !== 'follow' && (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {activity.post_content.length > 120 
                          ? `${activity.post_content.substring(0, 120)}...` 
                          : activity.post_content
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
