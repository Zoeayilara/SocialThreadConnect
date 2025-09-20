import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Crop, RotateCw, Download } from 'lucide-react';

interface ImageEditorProps {
  imageFile: File;
  onEditComplete: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageFile,
  onEditComplete,
  onCancel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const drawImage = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Move to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    
    // Draw image
    ctx.drawImage(img, 0, 0);
    
    ctx.restore();

    // Draw crop overlay if in crop mode
    if (cropMode && cropArea.width > 0 && cropArea.height > 0) {
      // Draw semi-transparent overlay on non-cropped areas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      
      // Top
      ctx.fillRect(0, 0, canvas.width, cropArea.y);
      // Bottom
      ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - cropArea.y - cropArea.height);
      // Left
      ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
      // Right
      ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - cropArea.x - cropArea.width, cropArea.height);
      
      // Draw crop border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      
      // Draw corner handles
      ctx.fillStyle = '#3b82f6';
      ctx.setLineDash([]);
      const handleSize = 8;
      
      // Top-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    }
  }, [brightness, contrast, saturation, rotation, cropMode, cropArea]);

  React.useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
      drawImage(img);
    };
    img.src = url;
    
    return () => URL.revokeObjectURL(url);
  }, [imageFile, drawImage]);

  React.useEffect(() => {
    if (originalImage) {
      drawImage(originalImage);
    }
  }, [originalImage, drawImage]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCrop = () => {
    setCropMode(!cropMode);
    if (!cropMode && originalImage) {
      // Initialize crop area to center quarter of image
      const quarterWidth = originalImage.width / 4;
      const quarterHeight = originalImage.height / 4;
      setCropArea({
        x: quarterWidth,
        y: quarterHeight,
        width: quarterWidth * 2,
        height: quarterHeight * 2
      });
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;

    const coords = getCanvasCoordinates(e);
    setIsDragging(true);
    setDragStart(coords);
    setCropArea({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !isDragging) return;

    const coords = getCanvasCoordinates(e);
    const width = coords.x - dragStart.x;
    const height = coords.y - dragStart.y;

    setCropArea({
      x: width < 0 ? coords.x : dragStart.x,
      y: height < 0 ? coords.y : dragStart.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    // Create a new canvas for the final output
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // If cropping, use crop dimensions, otherwise use full image
    if (cropMode && cropArea.width > 0 && cropArea.height > 0) {
      outputCanvas.width = cropArea.width;
      outputCanvas.height = cropArea.height;

      // Apply filters
      outputCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // Draw cropped portion
      outputCtx.drawImage(
        originalImage,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
    } else {
      // Use full image with filters and rotation
      outputCanvas.width = originalImage.width;
      outputCanvas.height = originalImage.height;

      outputCtx.save();
      outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
      outputCtx.rotate((rotation * Math.PI) / 180);
      outputCtx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
      outputCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      outputCtx.drawImage(originalImage, 0, 0);
      outputCtx.restore();
    }

    outputCanvas.toBlob((blob) => {
      if (blob) {
        onEditComplete(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Edit Image</h3>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-80px)]">
          {/* Canvas Area */}
          <div className="flex-1 p-4 flex items-center justify-center bg-gray-800">
            <div className="relative max-w-full max-h-full overflow-auto">
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full object-contain border border-gray-600 rounded-lg ${cropMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ maxHeight: '60vh' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-80 p-4 space-y-6 bg-gray-900 overflow-y-auto">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="text-white font-medium">Quick Actions</h4>
              {cropMode && (
                <p className="text-sm text-blue-400 bg-blue-500/10 p-2 rounded">
                  Click and drag on the image to select the area you want to crop
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleRotate}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate
                </Button>
                <Button
                  onClick={handleCrop}
                  variant={cropMode ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  <Crop className="w-4 h-4 mr-2" />
                  Crop
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Filters</h4>
                <Button onClick={resetFilters} variant="ghost" size="sm" className="text-xs">
                  Reset
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Brightness: {brightness}%
                  </label>
                  <Slider
                    value={[brightness]}
                    onValueChange={([value]) => setBrightness(value)}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Contrast: {contrast}%
                  </label>
                  <Slider
                    value={[contrast]}
                    onValueChange={([value]) => setContrast(value)}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Saturation: {saturation}%
                  </label>
                  <Slider
                    value={[saturation]}
                    onValueChange={([value]) => setSaturation(value)}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-700">
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 w-full">
                <Download className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
              <Button onClick={onCancel} variant="outline" className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
