import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnimatedLikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onLike: () => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}

export const AnimatedLikeButton: React.FC<AnimatedLikeButtonProps> = ({
  isLiked,
  likesCount,
  onLike,
  disabled = false,
  size = 'lg',
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsAnimating(true);
    setShowPulse(true);
    onLike();

    // Reset animation after completion
    setTimeout(() => {
      setIsAnimating(false);
      setShowPulse(false);
    }, 600);
  };

  const heartSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center gap-1 p-0 h-auto font-normal transition-all duration-200
        ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}
        ${className}
      `}
    >
      <div className="relative flex items-center">
        {/* Pulse animation background - only when liking */}
        {showPulse && isLiked && (
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
        )}
        
        {/* Heart icon with animations */}
        <Heart 
          className={`${heartSize} mr-2 transition-all duration-300 ${
            isLiked ? 'fill-current' : ''
          } ${
            isAnimating ? 'animate-bounce scale-125' : ''
          }`}
        />
        
        {/* Count with animation */}
        <span 
          className={`${textSize} font-semibold transition-all duration-200 ${
            isAnimating ? 'scale-110' : ''
          }`}
        >
          {Math.max(0, likesCount)}
        </span>
      </div>

      {/* Floating hearts animation */}
      {isAnimating && isLiked && (
        <>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <Heart className="w-3 h-3 text-red-500 fill-current animate-float-up opacity-0" />
          </div>
          <div className="absolute -top-1 left-1/3 transform -translate-x-1/2 pointer-events-none animation-delay-100">
            <Heart className="w-2 h-2 text-pink-500 fill-current animate-float-up opacity-0" />
          </div>
          <div className="absolute -top-1 right-1/3 transform translate-x-1/2 pointer-events-none animation-delay-200">
            <Heart className="w-2 h-2 text-red-400 fill-current animate-float-up opacity-0" />
          </div>
        </>
      )}
    </Button>
  );
};
