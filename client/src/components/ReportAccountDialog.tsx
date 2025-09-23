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

interface ReportAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

const reportReasons = [
  { value: 'spam', label: 'Spam or fake account' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'impersonation', label: 'Impersonation or fake identity' },
  { value: 'inappropriate', label: 'Inappropriate content or behavior' },
  { value: 'scam', label: 'Scam or fraudulent activity' },
  { value: 'underage', label: 'Underage user' },
  { value: 'other', label: 'Other (please specify)' }
];

export default function ReportAccountDialog({ isOpen, onClose, userId, userName }: ReportAccountDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async ({ reason, description }: { reason: string; description?: string }) => {
      const response = await authenticatedFetch(`/api/reports/accounts/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit account report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account reported",
        description: "Thank you for reporting this account. Our team will review it shortly.",
      });
      handleClose();
    },
    onError: (err) => {
      console.error('Account report submission failed:', err);
      toast({
        title: "Error",
        description: "Failed to submit account report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this account.",
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
          <DialogTitle className="text-white">Report Account</DialogTitle>
          <DialogDescription className="text-gray-400">
            Help us understand what's wrong with @{userName}'s account. Your report is anonymous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-white text-sm font-medium mb-3 block">
              Why are you reporting this account?
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
            {reportMutation.isPending ? 'Submitting...' : 'Report Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
