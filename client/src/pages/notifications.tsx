import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell } from 'lucide-react';
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
        return <Bell className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <Bell className="w-5 h-5 text-green-500" />;
      case 'repost':
        return <Bell className="w-5 h-5 text-purple-500" />;
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
          <div className="space-y-1">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-900/50 transition-colors ${
                  !notification.isRead ? 'bg-gray-900/30' : ''
                }`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={notification.user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-gray-700 text-white text-sm">
                    {notification.user.firstName?.[0]}{notification.user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-medium">
                          {notification.user.firstName} {notification.user.lastName}
                        </span>{' '}
                        <span className="text-gray-400">{notification.message}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
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
