import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils/api';

export function useUnreadMessages() {
  const queryClient = useQueryClient();

  // Get unread message count
  const { data: unreadCount = 0, isLoading } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/messages/unread-count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      return data.unreadCount;
    },
    refetchInterval: 5000, // Check every 5 seconds
    refetchOnWindowFocus: true,
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await authenticatedFetch(`/api/messages/mark-read/${otherUserId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark messages as read');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate unread count to refresh
      queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    },
  });

  return {
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}
