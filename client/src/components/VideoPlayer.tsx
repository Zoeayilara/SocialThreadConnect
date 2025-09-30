import React, { useRef, useEffect } from 'react';
import { useVideoAutoPause } from '../hooks/useVideoAutoPause';

interface VideoPlayerProps {
  src: string;
  className?: string;
  controls?: boolean;
  playsInline?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = '',
  controls = true,
  playsInline = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { registerVideo } = useVideoAutoPause();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanup = registerVideo(video);
    return cleanup;
  }, [registerVideo]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls={controls}
      playsInline={playsInline}
      className={className}
      preload="metadata"
    />
  );
};
