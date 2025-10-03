import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Send, Paperclip, Smile, MoreHorizontal, Trash2, ArrowLeft, Loader2, Search, Edit3 } from "lucide-react";
import { formatMessageTime } from "@/utils/messageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VerificationBadge } from '@/components/VerificationBadge';
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { VideoPreview } from "@/components/VideoPreview";
import { ImageEditor } from "@/components/ImageEditor";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Polling and timeout constants
const CONVERSATIONS_POLL_INTERVAL = 3000; // 3 seconds
const MESSAGES_POLL_INTERVAL = 3000; // 3 seconds
const USER_DATA_REFRESH_INTERVAL = 30000; // 30 seconds
const SCROLL_DEBOUNCE_DELAY = 150; // 150ms
const INITIAL_SCROLL_DELAY = 100; // 100ms
const SCROLL_BOTTOM_THRESHOLD = 20; // 20px from bottom

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface MessagesProps {
  directUserId?: number;
}

export default function Messages({ directUserId }: MessagesProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(() => {
    return localStorage.getItem('messagesShowSearch') === 'true';
  });
  const [selectedUser, setSelectedUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('messagesSelectedUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasScrolledToBottom = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { markAsRead } = useUnreadMessages();

  // Fetch user data for direct message
  const { data: directUser } = useQuery({
    queryKey: ['user', directUserId],
    queryFn: async () => {
      if (!directUserId) return null;
      const response = await authenticatedFetch(`/api/users/${directUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!directUserId,
  });

  // Get messages for selected user
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const response = await authenticatedFetch(`/api/messages/${selectedUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedUser,
    staleTime: 0,
    refetchInterval: MESSAGES_POLL_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  // Fetch fresh user data to ensure verification status is up to date
  const fetchFreshUserData = async (userId: number) => {
    try {
      const response = await authenticatedFetch(`/api/users/${userId}`);
      if (response.ok) {
        const freshUserData = await response.json();
        return freshUserData;
      }
    } catch (error) {
      // Failed to fetch fresh user data
    }
    return null;
  };

  // Handle direct user selection from URL
  useEffect(() => {
    if (directUserId && directUser) {
      // Fetch fresh user data to ensure verification status is current
      fetchFreshUserData(directUser.id).then(freshData => {
        setSelectedUser(freshData || directUser);
      });
      setShowSearch(false);
    }
  }, [directUserId, directUser]);

  // Mark messages as read when user scrolls to bottom or sends a message
  const handleMarkAsRead = () => {
    if (selectedUser?.id) {
      markAsRead(selectedUser.id);
    }
  };

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('messagesShowSearch', showSearch.toString());
  }, [showSearch]);

  useEffect(() => {
    try {
      if (selectedUser) {
        localStorage.setItem('messagesSelectedUser', JSON.stringify(selectedUser));
      } else {
        localStorage.removeItem('messagesSelectedUser');
      }
    } catch (error) {
      // Failed to save to localStorage
    }
  }, [selectedUser]);

  // Periodically refresh selected user data to keep verification status current
  useEffect(() => {
    if (!selectedUser?.id) return;

    const refreshUserData = async () => {
      const freshUserData = await fetchFreshUserData(selectedUser.id);
      if (freshUserData && freshUserData.isVerified !== selectedUser.isVerified) {
        setSelectedUser(freshUserData);
      }
    };

    // Refresh user data periodically
    const interval = setInterval(refreshUserData, USER_DATA_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [selectedUser?.id, selectedUser?.isVerified]);

  // Get user's conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: CONVERSATIONS_POLL_INTERVAL,
    refetchIntervalInBackground: true
  });

  

  // Search for users
  const { data: searchResults = [] } = useQuery({
    queryKey: ['searchUsers', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const response = await authenticatedFetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: searchTerm.length > 0
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, content, files }: { recipientId: number; content?: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append('recipientId', recipientId.toString());
      
      if (content && content.trim()) {
        formData.append('content', content.trim());
      }
      
      // Append all files to a single request
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append('media', file);
        });
      }

      const response = await authenticatedFetch('/api/messages', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Force refetch conversations to get updated last message
      queryClient.refetchQueries({ queryKey: ['conversations'] });
      // Mark messages as read when user sends a message (they've engaged with the conversation)
      handleMarkAsRead();
      toast({ title: "Message sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  });

  // Position chat at bottom only when opening a conversation
  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const container = document.getElementById('messages-container');
      if (container) {
        // Only auto-scroll if this is a new conversation (selectedUser.id changed)
        const isNewConversation = selectedUser.id !== hasScrolledToBottom.current;
        
        if (isNewConversation) {
          hasScrolledToBottom.current = selectedUser.id;
          
          // Smooth scroll to bottom with a small delay to prevent glitches
          const scrollTimer = window.setTimeout(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }, INITIAL_SCROLL_DELAY);
          
          // Clean up scroll timer on unmount
          return () => {
            if (scrollTimer !== undefined) {
              window.clearTimeout(scrollTimer);
            }
          };
        }
        
        // Add scroll listener to mark as read only after user actively scrolls
        let hasUserScrolled = false;
        let scrollTimeout: number | undefined;
        
        const handleScroll = () => {
          // Clear any existing timeout to prevent rapid firing
          if (scrollTimeout !== undefined) {
            window.clearTimeout(scrollTimeout);
            scrollTimeout = undefined;
          }
          
          // Debounce scroll events to prevent glitches
          scrollTimeout = window.setTimeout(() => {
            hasUserScrolled = true; // User has actively scrolled
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD;
            
            // Only mark as read if user has actively scrolled AND is at bottom
            if (isAtBottom && messages.length > 0 && hasUserScrolled) {
              handleMarkAsRead();
            }
            scrollTimeout = undefined;
          }, SCROLL_DEBOUNCE_DELAY);
        };
        
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
          // Clean up scroll listener
          container.removeEventListener('scroll', handleScroll);
          // Clean up debounce timeout
          if (scrollTimeout !== undefined) {
            window.clearTimeout(scrollTimeout);
          }
        };
      }
    }
  }, [selectedUser?.id, messages.length, handleMarkAsRead]);
  

  // Typing indicator effect and mark as read when user starts typing
  useEffect(() => {
    if (messageText.length > 0) {
      setIsTyping(true);
      // Mark messages as read when user starts typing (shows engagement)
      if (messageText.length === 1) { // First character typed
        handleMarkAsRead();
      }
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [messageText, handleMarkAsRead]);

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await authenticatedFetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUser?.id] });
      toast({ title: "Message deleted successfully" });
      // Don't auto-scroll after deletion
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await authenticatedFetch(`/api/conversations/${otherUserId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete conversation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedUser(null);
      setShowDeleteDialog(false);
      toast({ title: "Chat deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    }
  });

  // File size validation
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFiles = (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        toast({
          title: "Video too large", 
          description: `Max video size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
          variant: "destructive"
        });
        return false;
      }
      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "Image too large", 
          description: `Max image size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const handleSendMessage = () => {
    // Prevent duplicate sends
    if (sendMessageMutation.isPending) {
      console.log('Upload already in progress, ignoring duplicate send');
      return;
    }
    
    if (!selectedUser || (!messageText.trim() && selectedFiles.length === 0)) return;
    
    // Validate file sizes before sending
    if (selectedFiles.length > 0 && !validateFiles(selectedFiles)) {
      return;
    }
    
    // Show upload notification for video files
    if (selectedFiles.some(f => f.type.startsWith('video/'))) {
      toast({
        title: "Uploading video...", 
        description: "Please wait while your video is being uploaded."
      });
    }
    
    sendMessageMutation.mutate({ 
      recipientId: selectedUser.id, 
      content: messageText.trim() || undefined,
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    });
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const validFiles: File[] = [];
      
      for (const file of files) {
        // Check file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast({ title: `${file.name} is not a valid image or video file`, variant: "destructive" });
          continue;
        }
        
        // Check file size with specific limits
        if (isVideo && file.size > MAX_VIDEO_SIZE) {
          toast({
            title: `${file.name} is too large`, 
            description: `Max video size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
            variant: "destructive"
          });
          continue;
        }
        
        if (isImage && file.size > MAX_IMAGE_SIZE) {
          toast({
            title: `${file.name} is too large`, 
            description: `Max image size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
            variant: "destructive"
          });
          continue;
        }
        
        validFiles.push(file);
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };


  const handleEditImage = (file: File) => {
    setImageToEdit(file);
    setShowImageEditor(true);
  };

  const handleImageEditComplete = (editedBlob: Blob) => {
    const editedFile = new File([editedBlob], imageToEdit?.name || 'edited-image.jpg', {
      type: editedBlob.type || 'image/jpeg'
    });
    
    // Replace the original image with the edited one
    const updatedFiles = selectedFiles.map(file => 
      file === imageToEdit ? editedFile : file
    );
    setSelectedFiles(updatedFiles);
    
    setShowImageEditor(false);
    setImageToEdit(null);
  };

  const handleImageEditCancel = () => {
    setShowImageEditor(false);
    setImageToEdit(null);
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    return user.email ? user.email.split('@')[0] : 'User';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-gray-700/50 shadow-lg">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectedUser ? () => {
                if (directUserId) {
                  setLocation('/messages');
                } else {
                  setSelectedUser(null);
                }
              } : showSearch ? () => setShowSearch(false) : () => {
                const dashboardPath = user?.userType === 'vendor' ? '/vendor-dashboard' : '/customer-dashboard';
                setLocation(dashboardPath);
              }} 
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-full transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {selectedUser ? (
              <div className="flex items-center space-x-3 animate-in slide-in-from-left duration-300">
                <div className="relative">
                  <Avatar className="w-10 h-10 cursor-pointer ring-2 ring-blue-500/20 hover:ring-blue-500/40 transition-all duration-200" onClick={() => setLocation(`/profile/${selectedUser.id}`)}>
                    <AvatarImage src={getImageUrl(selectedUser.profileImageUrl)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                      {selectedUser.firstName?.[0] || selectedUser.lastName?.[0] || selectedUser.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white text-lg">
                      {getUserDisplayName(selectedUser)}
                    </span>
                    {selectedUser.isVerified === 1 && (
                      <VerificationBadge className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    <span>@{selectedUser.email.split('@')[0]}</span>
                  </div>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{showSearch ? "New message" : "Messages"}</h1>
            )}
          </div>
          {!showSearch && !selectedUser && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSearch(true)} 
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-full transition-all duration-200 hover:scale-105"
            >
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
          {selectedUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-800/50 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-xl">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content */}
      {selectedUser ? (
        /* Messages View */
        <div className="flex flex-col h-[calc(100vh-80px)]">
          <div 
            id="messages-container"
            className="flex-1 overflow-y-auto mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-6 pb-24 space-y-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
          >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Avatar className="w-20 h-20 mb-6 cursor-pointer" onClick={() => setLocation(`/profile/${selectedUser.id}`)}>
                    <AvatarImage src={getImageUrl(selectedUser.profileImageUrl)} />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {selectedUser.firstName?.[0] || selectedUser.lastName?.[0] || selectedUser.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {getUserDisplayName(selectedUser)}
                    </h3>
                    {selectedUser.isVerified === 1 && (
                      <VerificationBadge className="w-5 h-5" />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-8">
                    Start a conversation with {getUserDisplayName(selectedUser)}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message: any, index: number) => {
                    const isOwn = Number(message.senderId) === Number(user?.id);
                    console.log('Message debug:', { messageId: message.id, senderId: message.senderId, userId: user?.id, isOwn, senderIdType: typeof message.senderId, userIdType: typeof user?.id });
                    const messageFiles = message.imageUrl ? (Array.isArray(message.imageUrl) ? message.imageUrl : [message.imageUrl]) : [];
                    
                    return (
                      <div 
                        key={message.id} 
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom duration-300`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`group max-w-xs lg:max-w-md px-5 py-3 rounded-3xl shadow-lg transition-all duration-200 hover:scale-[1.02] relative ${
                          isOwn 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto' 
                            : 'bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700/50'
                        }`}>
                          {/* Message Options Menu */}
                          {isOwn && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-6 h-6 p-0 bg-gray-700/80 hover:bg-gray-600/80 rounded-full text-gray-300 hover:text-white"
                                  >
                                    <MoreHorizontal className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-xl">
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors duration-200"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                          {!isOwn && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={getImageUrl(selectedUser.profileImageUrl)} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs">
                                  {selectedUser.firstName?.[0] || selectedUser.lastName?.[0] || selectedUser.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-400 font-medium">
                                  {getUserDisplayName(selectedUser)}
                                </span>
                                {selectedUser.isVerified === 1 && (
                                  <VerificationBadge className="w-3 h-3" />
                                )}
                              </div>
                            </div>
                          )}
                          {message.content && (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          )}
                          {messageFiles.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {messageFiles.map((fileUrl: string, index: number) => {
                                const isVideo = fileUrl.match(/\.(mp4|mov|webm)$/i);
                                return (
                                  <div key={index} className="relative group/media w-48">
                                    {isVideo ? (
                                      <div className="w-48 h-80 overflow-hidden rounded-2xl shadow-lg group-hover/media:shadow-xl transition-all duration-200 bg-black">
                                        <VideoPlayer 
                                          src={getImageUrl(fileUrl) || fileUrl} 
                                          className="w-full h-full object-cover rounded-2xl"
                                        />
                                      </div>
                                    ) : (
                                      <img 
                                        src={getImageUrl(fileUrl)} 
                                        alt="Shared media" 
                                        className="max-w-full h-auto rounded-2xl cursor-pointer hover:opacity-90 transition-all duration-200 shadow-lg group-hover/media:shadow-xl group-hover/media:scale-[1.02]"
                                        onClick={() => window.open(getImageUrl(fileUrl), '_blank')}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className={`text-xs mt-2 flex items-center justify-between ${
                            isOwn ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            <p className={`text-xs ${isOwn ? 'text-white' : 'text-gray-500'}`}>{formatMessageTime(message.createdAt)}</p>
                            {isOwn && (
                              <div className="flex items-center space-x-1">
                                <div className="w-1 h-1 bg-blue-200 rounded-full"></div>
                                <div className="w-1 h-1 bg-blue-200 rounded-full"></div>
                                <span className="text-xs">Delivered</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-gray-700/50 p-3 shadow-2xl">
              <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl">
                {selectedFiles.length > 0 && (
                  <div className="mb-4 animate-in fade-in slide-in-from-bottom duration-200">
                    <div className="space-y-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
                          <div className="flex items-start gap-3">
                            {/* Media Preview */}
                            <div className="flex-shrink-0">
                              {file.type.startsWith('image/') ? (
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                                />
                              ) : file.type.startsWith('video/') ? (
                                <div className="w-16 h-16">
                                  <VideoPreview videoFile={file} className="w-full h-full rounded-lg" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <Paperclip className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </div>

                            {/* File Info & Actions */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {file.type.split('/')[0]} • {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                  className="text-gray-400 hover:text-red-400 transition-colors duration-200 p-1 rounded-full hover:bg-red-500/10 ml-2"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Edit Actions */}
                              <div className="flex items-center gap-2 mt-2">
                                {file.type.startsWith('image/') && (
                                  <Button
                                    onClick={() => handleEditImage(file)}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2 border-gray-600 hover:border-blue-500 hover:text-blue-400"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload Progress Indicator */}
                {sendMessageMutation.isPending && selectedFiles.some(f => f.type.startsWith('video/')) && (
                  <div className="mb-4 animate-in fade-in slide-in-from-bottom duration-200">
                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-300 mb-2">Uploading video...</p>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {isTyping && (
                  <div className="mb-2 animate-in fade-in slide-in-from-bottom duration-200">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>Typing...</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-end space-x-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-blue-400 p-2 hover:bg-blue-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !sendMessageMutation.isPending && handleSendMessage()}
                      className="bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:border-none resize-none min-h-[40px] max-h-[120px] py-2 px-3"
                    />
                  </div>
                  
                  <div className="relative" ref={emojiPickerRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-gray-400 hover:text-yellow-400 p-2 hover:bg-yellow-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="grid grid-cols-8 gap-2 w-64">
                          {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
                            '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                            '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
                            '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
                            '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
                            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
                            '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
                            '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
                            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                            '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
                            '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲', '🤜',
                            '🤛', '✊', '👊', '🤚', '👋', '💪', '🦾', '🖕',
                            '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋', '👄',
                            '🦷', '👅', '👂', '🦻', '👃', '👣', '👁️', '👀',
                            '🧠', '🫀', '🫁', '🩸', '🦴', '👤', '👥', '🫂',
                            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-xl hover:bg-gray-700 rounded-lg p-1 transition-colors duration-150 hover:scale-110"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-blue-500/25"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
      ) : (
        /* Search/User List */
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 pb-4">
          {showSearch && (
            <div className="mb-6 animate-in fade-in slide-in-from-top duration-300">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {(showSearch ? searchResults : conversations)?.map((user: any, index: number) => (
              <div
                key={user.id}
                onClick={async () => {
                  // Fetch fresh user data to ensure verification status is current
                  const freshUserData = await fetchFreshUserData(user.id);
                  setSelectedUser(freshUserData || user);
                  setShowSearch(false);
                }}
                className="group flex items-center space-x-4 p-4 hover:bg-gray-800/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-in fade-in slide-in-from-left duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 ring-2 ring-gray-700/50 group-hover:ring-blue-500/30 transition-all duration-300">
                    <AvatarImage src={getImageUrl(user.profileImageUrl)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {user.firstName?.[0] || user.lastName?.[0] || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors duration-200">
                      {getUserDisplayName(user)}
                    </span>
                    {user.isVerified === 1 && (
                      <VerificationBadge className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    @{user.email.split('@')[0]}
                  </div>
                  {user.lastMessage && (
                    <div className="text-sm text-gray-500 truncate mt-1 flex items-center space-x-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full opacity-60"></span>
                      <span>{user.lastMessage}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {user.timeAgo && (
                    <div className="text-xs text-gray-500">
                      {user.timeAgo}
                    </div>
                  )}
                  <div className="w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              </div>
            ))}
            
            {!showSearch && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-700 rounded-full border-4 border-black overflow-hidden">
                    <img src={getImageUrl(user?.profileImageUrl)} alt="Profile" className="w-8 h-8 rounded-full" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Keep it real in direct messages
                </h2>
                
                <p className="text-gray-400 mb-8 max-w-sm">
                  You can message anyone who follows you.
                </p>

                <Button 
                  onClick={() => setShowSearch(true)}
                  className="bg-white text-black hover:bg-gray-200 rounded-full px-8 py-3 font-semibold"
                >
                  Message
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Chat</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConversationMutation.mutate(selectedUser?.id)}
              disabled={deleteConversationMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Image Editor Modal */}
      {showImageEditor && imageToEdit && (
        <ImageEditor
          imageFile={imageToEdit}
          onEditComplete={handleImageEditComplete}
          onCancel={handleImageEditCancel}
        />
      )}
    </div>
  );
}
