import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface VideoPreviewProps {
  videoFile: File;
  className?: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoFile, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Try different fullscreen methods for browser compatibility
        const video = videoRef.current;
        if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if ((video as any).webkitRequestFullscreen) {
          (video as any).webkitRequestFullscreen();
        } else if ((video as any).mozRequestFullScreen) {
          (video as any).mozRequestFullScreen();
        } else if ((video as any).msRequestFullscreen) {
          (video as any).msRequestFullscreen();
        } else {
          console.warn('Fullscreen not supported on this browser');
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain" 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        muted={isMuted}
        style={{ aspectRatio: 'auto' }}
      />
      
      {/* Controls Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Center Play/Pause Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            variant="ghost"
            size="lg"
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <div 
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-white rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={togglePlayPause}
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-300 p-1"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-300 p-1"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <span className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-300 p-1"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
