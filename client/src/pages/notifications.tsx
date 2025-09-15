import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Repeat2 } from 'lucide-react';
import { authenticatedFetch } from '@/utils/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/utils/dateUtils';

interface NotificationProps {
  onBack: () => void;
}

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'repost';
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

export default function Notifications({ onBack }: NotificationProps) {

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/notifications`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'repost':
        return <Repeat2 className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };


  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No notifications yet</div>
            <div className="text-gray-500 text-sm">When someone likes, comments, or follows you, you'll see it here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`flex items-center space-x-3 p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                  !notification.isRead 
                    ? 'bg-gray-900/50 border-gray-700 shadow-md' 
                    : 'bg-gray-900/20 border-gray-800 hover:bg-gray-900/30'
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-gray-700">
                    <AvatarImage src={notification.user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-sm font-medium">
                      {notification.user.firstName?.[0]}{notification.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1.5 border-2 border-gray-800">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm leading-relaxed">
                        <span className="font-semibold">
                          {notification.user.firstName} {notification.user.lastName}
                        </span>{' '}
                        <span className="text-gray-300">{notification.message}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-2 font-medium">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-3 mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
