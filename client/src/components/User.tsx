import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface UserProps {
  userId: number | undefined;
  onBack: () => void;
}

export const User: React.FC<UserProps> = ({ userId, onBack }) => {
  return (
    <div className="p-4">
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <div className="text-center">
        <p>User Profile for ID: {userId}</p>
        <p className="text-gray-500 mt-2">User profile component placeholder</p>
      </div>
    </div>
  );
};
