import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function UploadPicture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user, isLoading } = useAuth();

  // Check for temp registration data first
  const tempUserId = localStorage.getItem('tempUserId');
  
  // Allow access if we have temp data OR authenticated user
  const hasAccess = tempUserId || user;
  
  if (!hasAccess && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!hasAccess && !isLoading) {
    setLocation('/login');
    return null;
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Starting upload for file:', file.name);
      const formData = new FormData();
      formData.append('profilePicture', file);

      console.log('Making request to /api/upload-profile-picture');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/upload-profile-picture`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error('Upload failed with error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Profile picture uploaded successfully!",
      });
      setLocation("/success");
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleSkip = () => {
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