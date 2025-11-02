import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { authenticatedFetch } from "@/utils/api";

export default function UploadPicture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { user, isLoading } = useAuth();

  // Check for temp registration data and auth token
  const tempUserId = localStorage.getItem('tempUserId');
  const authToken = localStorage.getItem('authToken');
  
  // Allow access if we have temp data OR authenticated user OR valid token
  const hasAccess = tempUserId || user || authToken;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      // Add temp user ID for registration flow
      const tempUserId = localStorage.getItem('tempUserId');
      if (tempUserId) {
        formData.append('tempUserId', tempUserId);
      }
      
      // Add retry logic for authentication issues
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const response = await authenticatedFetch('/api/upload-profile-picture', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            return result;
          }
          
          // Handle 401 specifically
          if (response.status === 401 && retryCount < maxRetries) {
            retryCount++;
            // Wait a bit before retry to allow session to establish
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          const error = await response.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(error.message || 'Upload failed');
          
        } catch (fetchError) {
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw fetchError;
        }
      }
    },
    onSuccess: async () => {
      // Mark profile setup as complete
      try {
        await authenticatedFetch('/api/users/complete-profile-setup', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to mark profile setup as complete:', error);
      }
      
      toast({
        title: "Upload Successful",
        description: "Profile picture uploaded successfully!",
      });
      setLocation("/success");
    },
    onError: (error) => {
      toast({
        title: "Upload Failed", 
        description: error instanceof Error ? error.message : "Please try again or skip for now.",
        variant: "destructive",
      });
    },
  });

  // Timeout mechanism to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
      setAuthCheckComplete(true);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, []);

  // Mark auth check as complete when we have definitive state
  useEffect(() => {
    if (user || (!isLoading && !tempUserId && !authToken)) {
      setAuthCheckComplete(true);
    }
  }, [user, isLoading, tempUserId, authToken]);

  // Handle redirects with useEffect to avoid breaking Rules of Hooks
  useEffect(() => {
    if (!hasAccess && (authCheckComplete || loadingTimeout)) {
      setLocation('/login');
    }
  }, [hasAccess, authCheckComplete, loadingTimeout, setLocation]);

  // Show loading only for a reasonable time
  if (!authCheckComplete && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render main content if no access
  if (!hasAccess) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleSkip = async () => {
    // Mark profile setup as complete even when skipping
    try {
      await authenticatedFetch('/api/users/complete-profile-setup', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to mark profile setup as complete:', error);
    }
    
    setLocation("/success");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Add Profile Picture</h1>
          <p className="text-muted-foreground">Help others recognize you</p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="mb-6">
              <div 
                className="w-32 h-32 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center border-4 border-dashed border-muted-foreground/25 hover:border-accent transition-colors cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Camera className="text-3xl text-muted-foreground" />
                )}
              </div>
              <input 
                type="file" 
                id="fileInput" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />

              <Button 
                onClick={() => document.getElementById('fileInput')?.click()}
                variant="outline"
                className="mb-4"
              >
                Choose Photo
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={selectedFile ? handleUpload : handleSkip}
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : (selectedFile ? "Upload & Continue" : "Continue")}
              </Button>

              <Button 
                onClick={handleSkip}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}