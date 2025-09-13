import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from '@/utils/api';
import { useMutation } from '@tanstack/react-query';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
}

const reportReasons = [
  { value: 'spam', label: 'Spam or unwanted content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'misinformation', label: 'False or misleading information' },
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'other', label: 'Other (please specify)' }
];

export default function ReportDialog({ isOpen, onClose, postId }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async ({ reason, description }: { reason: string; description?: string }) => {
      const response = await authenticatedFetch(`/api/reports/posts/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for reporting this content. Our team will review it shortly.",
      });
      handleClose();
    },
    onError: (err) => {
      console.error('Report submission failed:', err);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this post.",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      toast({
        title: "Please provide details",
        description: "Please describe the issue when selecting 'Other'.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate({
      reason: selectedReason,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Report Post</DialogTitle>
          <DialogDescription className="text-gray-400">
            Help us understand what's wrong with this post. Your report is anonymous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-white text-sm font-medium mb-3 block">
              Why are you reporting this post?
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={reason.value} 
                    id={reason.value}
                    className="border-gray-600 text-blue-500"
                  />
                  <Label 
                    htmlFor={reason.value} 
                    className="text-gray-300 text-sm cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(selectedReason === 'other' || selectedReason) && (
            <div>
              <Label className="text-white text-sm font-medium mb-2 block">
                Additional details {selectedReason === 'other' ? '(required)' : '(optional)'}
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide more details about the issue..."
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={reportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || reportMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
