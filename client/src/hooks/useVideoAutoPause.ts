import { useEffect, useRef } from 'react';

export const useVideoAutoPause = () => {
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          
          if (entry.isIntersecting) {
            // Video is visible - allow manual play but don't auto-play
            video.dataset.isVisible = 'true';
          } else {
            // Video is not visible - pause it
            video.dataset.isVisible = 'false';
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      {
        threshold: 0.5, // Video needs to be at least 50% visible
        rootMargin: '0px 0px -100px 0px' // Start pausing when video is 100px from bottom
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const registerVideo = (video: HTMLVideoElement | null) => {
    if (!video || !observerRef.current) return;

    // Add to our set of tracked videos
    videoRefs.current.add(video);
    
    // Start observing this video
    observerRef.current.observe(video);

    // Add event listeners to prevent auto-play conflicts
    const handlePlay = () => {
      // Only allow play if video is visible
      if (video.dataset.isVisible !== 'true') {
        video.pause();
      }
    };

    video.addEventListener('play', handlePlay);

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.unobserve(video);
      }
      videoRefs.current.delete(video);
      video.removeEventListener('play', handlePlay);
    };
  };

  const unregisterVideo = (video: HTMLVideoElement) => {
    if (observerRef.current) {
      observerRef.current.unobserve(video);
    }
    videoRefs.current.delete(video);
  };

  // Pause all videos (useful for navigation)
  const pauseAllVideos = () => {
    videoRefs.current.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });
  };

  return {
    registerVideo,
    unregisterVideo,
    pauseAllVideos
  };
};
