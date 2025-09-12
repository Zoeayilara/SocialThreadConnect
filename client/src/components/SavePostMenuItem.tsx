import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { authenticatedFetch } from '@/utils/api';

interface SavePostMenuItemProps {
  postId: number;
  onSave: (postId: number) => void;
  onUnsave: (postId: number) => void;
}

export function SavePostMenuItem({ postId, onSave, onUnsave }: SavePostMenuItemProps) {
  const { data: isSaved, isLoading } = useQuery({
    queryKey: ['saved-status', postId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/posts/${postId}/saved-status`);
      if (!response.ok) throw new Error('Failed to check saved status');
      const data = await response.json();
      return data.isSaved;
    },
  });

  const handleClick = () => {
    if (isSaved) {
      onUnsave(postId);
    } else {
      onSave(postId);
    }
  };

  if (isLoading) {
    return (
      <DropdownMenuItem disabled>
        <Bookmark className="w-4 h-4 mr-2" />
        Loading...
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem onClick={handleClick}>
      <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
      {isSaved ? 'Unsave Post' : 'Save Post'}
    </DropdownMenuItem>
  );
}
