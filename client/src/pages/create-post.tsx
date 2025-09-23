import { useState, useRef } from 'react';
import { authenticatedFetch, getImageUrl } from '../utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImageIcon, Edit3, AtSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { VideoPreview } from '@/components/VideoPreview';
import { ImageEditor } from '@/components/ImageEditor';


interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  profileImageUrl?: string | null;
}

export default function CreatePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<File | null>(null);
  
  // Mention functionality
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await authenticatedFetch('/api/posts', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Post creation failed:', errorText);
        throw new Error(`Failed to create post: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (newPost) => {
      // Optimistically add the new post to the top of existing posts
      queryClient.setQueryData(['/api/posts'], (oldPosts: any[] = []) => {
        return [newPost, ...oldPosts];
      });
      
      // Invalidate all related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      
      toast({ title: "Post created successfully!" });
      window.history.back(); // Go back to previous page
    },
    onError: (error) => {
      console.error('Post creation error:', error);
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  // Search for users when typing @ mentions
  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([]);
      return;
    }
    
    try {
      const response = await authenticatedFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const users = await response.json();
        setMentionUsers(users.slice(0, 5)); // Limit to 5 suggestions
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Handle text change and detect @ mentions
  const handleTextChange = (value: string) => {
    setNewPost(value);
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);
    
    // Find @ mentions
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setShowMentions(true);
      searchUsers(query);
    } else {
      setShowMentions(false);
      setMentionUsers([]);
    }
  };

  // Insert mention into text
  const insertMention = (mentionedUser: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const textBeforeCursor = newPost.substring(0, cursorPosition);
    const textAfterCursor = newPost.substring(cursorPosition);
    
    // Replace the @ and partial name with full mention
    const mentionText = `@${mentionedUser.firstName || 'User'}${mentionedUser.lastName ? ` ${mentionedUser.lastName}` : ''}`;
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newText = beforeMention + mentionText + ' ' + textAfterCursor;
    
    setNewPost(newText);
    setShowMentions(false);
    setMentionUsers([]);
    
    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeMention.length + mentionText.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleCreatePost = () => {
    if (newPost.trim() || selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append('content', newPost);
      
      selectedFiles.forEach((file) => {
        formData.append('media', file);
      });
      
      createPostMutation.mutate(formData);
    }
  };

  const getUserDisplayName = (user: User | null) => {
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
    return 'User';
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-800/50 transition-colors duration-200 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-semibold">New post</h1>
          </div>
          <Button 
            onClick={handleCreatePost}
            disabled={(!newPost.trim() && selectedFiles.length === 0) || createPostMutation.isPending}
            className="rounded-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {createPostMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Posting...</span>
              </div>
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* User Profile Section */}
        <div className="flex space-x-3 mb-6 animate-fade-in">
          <Avatar className="w-12 h-12 ring-2 ring-gray-700/50">
            <AvatarImage src={getImageUrl(user?.profileImageUrl)} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
              {user?.firstName?.[0] || user?.lastName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">{getUserDisplayName(user)}</h3>
            <p className="text-gray-400 text-sm">Add a topic</p>
          </div>
        </div>

        {/* Text Area */}
        <div className="mb-6 animate-fade-in-delay relative">
          <Textarea
            ref={textareaRef}
            placeholder="What's new? Use @ to mention someone"
            value={newPost}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[60px] max-h-[200px] border-none resize-none focus:ring-0 text-lg placeholder:text-gray-500 bg-transparent text-white p-0 leading-relaxed transition-all duration-200 focus:placeholder:text-gray-600"
            autoFocus
          />
          
          {/* Mention Suggestions Dropdown */}
          {showMentions && mentionUsers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto">
              {mentionUsers.map((mentionUser) => (
                <div
                  key={mentionUser.id}
                  onClick={() => insertMention(mentionUser)}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-800 last:border-b-0"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getImageUrl(mentionUser.profileImageUrl)} />
                    <AvatarFallback className="bg-gray-700 text-white text-sm">
                      {mentionUser.firstName?.[0]}{mentionUser.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {getUserDisplayName(mentionUser)}
                    </p>
                    <p className="text-gray-400 text-sm">
                      @{mentionUser.firstName || 'user'}{mentionUser.lastName ? mentionUser.lastName : ''}
                    </p>
                  </div>
                  <AtSign className="w-4 h-4 text-gray-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Button */}
        <div className="flex items-center space-x-4 mb-6 animate-fade-in-delay-2">
          <input 
            id="post-media" 
            type="file" 
            accept="image/*,video/*" 
            multiple
            className="hidden" 
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setSelectedFiles(files);
            }} 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => document.getElementById('post-media')?.click()}
            className="p-3 rounded-full border border-gray-600/50 hover:border-gray-500 hover:bg-gray-800/30 transition-all duration-200 transform hover:scale-105"
          >
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </Button>
        </div>

        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400 font-medium">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFiles([])}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200 rounded-full px-3 py-1"
              >
                Remove all
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group animate-scale-in bg-gray-900/50 rounded-xl p-3" style={{animationDelay: `${index * 100}ms`}}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Media Preview */}
                    <div className="relative flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Selected ${index + 1}`}
                          className="w-full sm:w-32 h-32 object-cover rounded-lg border border-gray-700/50"
                        />
                      ) : file.type.startsWith('video/') ? (
                        <div className="w-full sm:w-32 h-32">
                          <VideoPreview videoFile={file} className="w-full h-full rounded-lg" />
                        </div>
                      ) : (
                        <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700/50 flex items-center justify-center">
                          <span className="text-gray-400 text-xs font-medium text-center px-2">{file.name}</span>
                        </div>
                      )}
                    </div>

                    {/* File Info & Actions */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-white font-medium text-sm mb-1 truncate">{file.name}</h4>
                        <p className="text-gray-400 text-xs">
                          {file.type.split('/')[0]} • {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        {file.type.startsWith('image/') && (
                          <Button
                            onClick={() => handleEditImage(file)}
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-1 h-8 border-gray-600 hover:border-blue-500 hover:text-blue-400"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                            setSelectedFiles(newFiles);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs px-3 py-1 h-8 border-red-600/50 hover:border-red-500 hover:text-red-400 text-red-400/80"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Image Editor Modal */}
        {showImageEditor && imageToEdit && (
          <ImageEditor
            imageFile={imageToEdit}
            onEditComplete={handleImageEditComplete}
            onCancel={handleImageEditCancel}
          />
        )}

        {/* Bottom Section */}
        <div className="border-t border-gray-800/50 pt-4 mt-8 animate-fade-in-delay-3">
          <p className="text-gray-500 text-sm">Anyone can reply & quote</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.5s ease-out 0.1s both;
        }
        
        .animate-fade-in-delay-2 {
          animation: fade-in 0.5s ease-out 0.2s both;
        }
        
        .animate-fade-in-delay-3 {
          animation: fade-in 0.5s ease-out 0.3s both;
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out both;
        }
      `}</style>
    </div>
  );
}
