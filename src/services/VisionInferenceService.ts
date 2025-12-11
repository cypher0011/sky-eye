/**
 * Vision Inference Service
 * Handles communication with Python inference server for object detection
 */

export interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  bbox_normalized: [number, number, number, number]; // [x_center, y_center, width, height]
}

export interface DetectionResponse {
  success?: boolean;
  detections: Detection[];
  count: number;
  timestamp?: number;
}

export class VisionInferenceService {
  private serverUrl: string;
  private isConnected: boolean = false;
  private lastFrameTime: number = 0;
  private frameQueue: string[] = [];
  private isProcessing: boolean = false;
  private minFrameInterval: number = 500; // Min time between frames in ms

  constructor(serverUrl: string = 'http://localhost:5001') {
    this.serverUrl = serverUrl;
    this.checkHealth();
  }

  /**
   * Check if inference server is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = data.status === 'healthy' && data.model_loaded;
        console.log('Vision inference server status:', data);
        return this.isConnected;
      }

      this.isConnected = false;
      return false;
    } catch (error) {
      console.warn('Vision inference server not available:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Send frame to inference server for detection
   */
  async detectObjects(imageDataUrl: string): Promise<DetectionResponse | null> {
    if (!this.isConnected) {
      await this.checkHealth();
      if (!this.isConnected) {
        return null;
      }
    }

    try {
      const response = await fetch(`${this.serverUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
        }),
      });

      if (response.ok) {
        const data: DetectionResponse = await response.json();
        return data;
      }

      console.error('Detection request failed:', response.statusText);
      return null;
    } catch (error) {
      console.error('Error sending frame to inference server:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Streaming detection - optimized for continuous camera feed
   */
  async detectObjectsStream(imageDataUrl: string, timestamp?: number): Promise<DetectionResponse | null> {
    if (!this.isConnected) {
      await this.checkHealth();
      if (!this.isConnected) {
        return null;
      }
    }

    // Throttle frame rate
    const now = Date.now();
    if (now - this.lastFrameTime < this.minFrameInterval) {
      return null; // Skip frame
    }
    this.lastFrameTime = now;

    try {
      const response = await fetch(`${this.serverUrl}/detect/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          timestamp: timestamp || now,
        }),
      });

      if (response.ok) {
        const data: DetectionResponse = await response.json();
        return data;
      }

      console.error('Stream detection request failed:', response.statusText);
      return null;
    } catch (error) {
      console.error('Error in stream detection:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Queue frame for processing (non-blocking)
   */
  queueFrame(imageDataUrl: string): void {
    if (this.frameQueue.length < 3) {
      this.frameQueue.push(imageDataUrl);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued frames
   */
  private async processQueue(): Promise<void> {
    if (this.frameQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.frameQueue.length > 0) {
      const frame = this.frameQueue.shift();
      if (frame) {
        await this.detectObjectsStream(frame);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Set minimum frame interval (for throttling)
   */
  setFrameInterval(intervalMs: number): void {
    this.minFrameInterval = intervalMs;
  }

  /**
   * Get connection status
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get server URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }
}

// Singleton instance
export const visionInferenceService = new VisionInferenceService();
