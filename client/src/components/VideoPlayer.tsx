import React, { useRef, useEffect, useState } from 'react';
import { useVideoAutoPause } from '../hooks/useVideoAutoPause';
import { Maximize, Minimize, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface VideoPlayerProps {
  src: string;
  className?: string;
  controls?: boolean;
  playsInline?: boolean;
  showFullscreenButton?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = '',
  controls = true,
  playsInline = true,
  showFullscreenButton = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerVideo } = useVideoAutoPause();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanup = registerVideo(video);
    return cleanup;
  }, [registerVideo]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };


  const handleShowControls = () => {
    setShowControls(true);
    if (controlsTimeout) {
      window.clearTimeout(controlsTimeout);
    }
    
    // Longer timeout for mobile devices
    const timeoutDuration = isMobile ? 5000 : 3000;
    const timeout = window.setTimeout(() => {
      if (isPlaying && (isFullscreen || isMobile)) {
        setShowControls(false);
      }
    }, timeoutDuration);
    setControlsTimeout(timeout);
  };

  const handleVideoClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    if (isMobile) {
      // On mobile: first tap shows controls, second tap toggles play
      if (!showControls) {
        handleShowControls();
      } else {
        togglePlay();
      }
    } else {
      // On desktop: click toggles play
      togglePlay();
    }
  };

  // Format time helper function
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group ${isFullscreen ? 'bg-black' : ''} ${className}`}
      onMouseMove={!isMobile ? handleShowControls : undefined}
      onTouchStart={isMobile ? handleShowControls : undefined}
      onMouseLeave={!isMobile ? () => {
        if (isFullscreen && isPlaying) {
          setShowControls(false);
        }
      } : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        controls={controls && !showFullscreenButton}
        playsInline={playsInline}
        className={`w-full h-full ${isFullscreen ? 'max-h-screen object-contain' : 'object-cover'} ${showFullscreenButton ? 'cursor-pointer' : ''}`}
        preload="metadata"
        onClick={showFullscreenButton ? handleVideoClick : undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
        onLoadedMetadata={(e) => {
          const video = e.target as HTMLVideoElement;
          setDuration(video.duration);
        }}
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          setCurrentTime(video.currentTime);
          setProgress((video.currentTime / video.duration) * 100);
        }}
      />
      
      {showFullscreenButton && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${showControls || !isFullscreen || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          {/* Play/Pause Overlay - Simple Center Button */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying ? 
              (isMobile ? (showControls ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover:opacity-100') : 
              'opacity-100'
          }`}>
            {/* Simple Play/Pause Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className={`bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 ${
                isMobile ? 'w-16 h-16' : 'w-14 h-14'
              }`}
            >
              {isPlaying ? (
                <Pause className={isMobile ? 'w-8 h-8' : 'w-7 h-7'} />
              ) : (
                <Play className={`${isMobile ? 'w-8 h-8 ml-1' : 'w-7 h-7 ml-1'}`} />
              )}
            </Button>
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-3">
              <div 
                className="w-full h-1 bg-white/30 rounded-full cursor-pointer group/progress"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-white rounded-full transition-all duration-150 group-hover/progress:bg-blue-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Time Display */}
                <span className="text-white text-sm font-mono min-w-[80px]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 w-8 h-8"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 w-8 h-8"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
