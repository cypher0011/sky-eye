import React, { useEffect, useRef } from 'react';
import { Detection } from '../../services/VisionInferenceService';

interface DetectionOverlayProps {
  detections: Detection[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  showConfidence?: boolean;
}

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  width = 800,
  height = 600,
  showLabels = true,
  showConfidence = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw each detection
    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;

      // Scale bounding box to canvas size
      const boxX1 = (x1 / 640) * width; // Assuming model uses 640px input
      const boxY1 = (y1 / 640) * height;
      const boxX2 = (x2 / 640) * width;
      const boxY2 = (y2 / 640) * height;

      // Draw bounding box
      ctx.strokeStyle = getColorForClass(detection.class, index);
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);

      // Draw label background
      if (showLabels) {
        const label = showConfidence
          ? `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`
          : detection.class;

        ctx.font = '14px monospace';
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        // Background
        ctx.fillStyle = getColorForClass(detection.class, index);
        ctx.fillRect(boxX1, boxY1 - textHeight - 4, textWidth + 8, textHeight + 4);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, boxX1 + 4, boxY1 - 8);
      }

      // Draw confidence bar
      if (showConfidence) {
        const barWidth = 60;
        const barHeight = 6;
        const barX = boxX1;
        const barY = boxY2 + 4;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Confidence level
        ctx.fillStyle = getColorForConfidence(detection.confidence);
        ctx.fillRect(barX, barY, barWidth * detection.confidence, barHeight);
      }
    });
  }, [detections, width, height, showLabels, showConfidence]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

// Helper function to get color for object class
const getColorForClass = (className: string, index: number): string => {
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  // Hash class name to get consistent color
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// Helper function to get color based on confidence
const getColorForConfidence = (confidence: number): string => {
  if (confidence >= 0.8) return '#10b981'; // green
  if (confidence >= 0.5) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

export default DetectionOverlay;
