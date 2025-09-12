import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post created successfully!" });
      window.history.back(); // Go back to previous page
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

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
    return (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : 'User';
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
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">{getUserDisplayName(user)}</h3>
            <p className="text-gray-400 text-sm">Add a topic</p>
          </div>
        </div>

        {/* Text Area */}
        <div className="mb-6 animate-fade-in-delay">
          <Textarea
            placeholder="What's new?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="min-h-[60px] max-h-[200px] border-none resize-none focus:ring-0 text-lg placeholder:text-gray-500 bg-transparent text-white p-0 leading-relaxed transition-all duration-200 focus:placeholder:text-gray-600"
            autoFocus
          />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group animate-scale-in" style={{animationDelay: `${index * 100}ms`}}>
                  {file.type.startsWith('image/') ? (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Selected ${index + 1}`}
                      className="w-full h-32 sm:h-40 object-cover rounded-xl border border-gray-700/50 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700/50 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.02]">
                      <span className="text-gray-400 text-sm font-medium px-4 text-center">{file.name}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newFiles = selectedFiles.filter((_, i) => i !== index);
                      setSelectedFiles(newFiles);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
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
