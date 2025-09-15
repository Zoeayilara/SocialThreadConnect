import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onMention?: (users: User[]) => void;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  className = "",
  onMention
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search users for mentions
  const { data: mentionSuggestions = [] } = useQuery({
    queryKey: ['mentionUsers', mentionQuery],
    queryFn: async () => {
      if (!mentionQuery.trim()) return [];
      const response = await authenticatedFetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: mentionQuery.length > 0 && showSuggestions
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Check for @ mentions
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the @ symbol position
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (!mentionMatch) return;
    
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.substring(0, mentionStart);
    const mentionText = `@${user.firstName}${user.lastName} `;
    
    const newValue = beforeMention + mentionText + textAfterCursor;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionQuery('');
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);

    // Notify parent component about the mention
    if (onMention) {
      const mentionedUsers = extractMentions(newValue);
      onMention(mentionedUsers);
    }
  };

  const extractMentions = (text: string): User[] => {
    const mentions: User[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // This is a simplified extraction - in a real app, you'd want to store user IDs
      // For now, we'll just track that mentions exist
      const mentionText = match[1];
      // Find user by name (simplified)
      const user = mentionSuggestions.find((u: User) => 
        `${u.firstName}${u.lastName}`.toLowerCase() === mentionText.toLowerCase()
      );
      if (user) {
        mentions.push(user);
      }
    }
    
    return mentions;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setMentionQuery('');
      }
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        rows={4}
      />
      
      {showSuggestions && mentionSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {mentionSuggestions.map((user: User) => (
            <div
              key={user.id}
              onClick={() => insertMention(user)}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profileImageUrl} />
                <AvatarFallback>
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  @{user.firstName}{user.lastName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
