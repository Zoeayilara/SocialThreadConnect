import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Scissors, X } from 'lucide-react';

interface VideoTrimmerProps {
  videoFile: File;
  onTrimComplete: (trimmedBlob: Blob) => void;
  onCancel: () => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  videoFile,
  onTrimComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(Math.min(videoDuration, 30)); // Default to 30 seconds max
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Auto-pause at end time
      if (time >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTrim = async () => {
    try {
      if (!videoRef.current) return;
      
      // Create a new video element for processing
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      
      // Create canvas for frame extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Use MediaRecorder to create trimmed video
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
        onTrimComplete(trimmedBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Seek to start time and play
      video.currentTime = startTime;
      
      const drawFrame = () => {
        if (video.currentTime >= endTime) {
          mediaRecorder.stop();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      
      video.onplay = () => {
        drawFrame();
      };
      
      await video.play();
      
      // Stop after duration
      setTimeout(() => {
        video.pause();
        mediaRecorder.stop();
      }, (endTime - startTime) * 1000);
      
    } catch (error) {
      console.error('Error trimming video:', error);
      // Fallback: return original file
      const trimmedBlob = new Blob([videoFile], { type: videoFile.type });
      onTrimComplete(trimmedBlob);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Trim Video</h3>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-64 object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
            />
            
            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={togglePlayPause}
                variant="ghost"
                size="lg"
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{formatTime(startTime)}</span>
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              <span>{formatTime(endTime)}</span>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => handleSeek(value)}
                className="w-full"
              />
            </div>

            {/* Trim Range */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Start Time</label>
              <Slider
                value={[startTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => setStartTime(Math.min(value, endTime - 1))}
                className="w-full"
              />
              
              <label className="text-sm text-gray-400">End Time</label>
              <Slider
                value={[endTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => setEndTime(Math.max(value, startTime + 1))}
                className="w-full"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleTrim} className="bg-blue-600 hover:bg-blue-700">
              <Scissors className="w-4 h-4 mr-2" />
              Trim Video
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
