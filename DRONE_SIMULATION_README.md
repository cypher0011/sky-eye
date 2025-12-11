# Drone Simulation with Vision AI

## Overview

This project features a realistic drone simulation with satellite imagery integration and real-time object detection using computer vision AI. The drone flies over Riyadh, Saudi Arabia, with its camera feed piped to a Python inference server for real-time object detection.

## Features

### 🛰️ Satellite Imagery Integration
- **Mapbox Satellite Tiles**: High-resolution satellite imagery of Riyadh
- **On-demand Tiling**: Dynamic loading based on location
- **3D Terrain Rendering**: Realistic ground textures using Three.js

### 🚁 Drone Simulation
- **Realistic Flight Physics**: Acceleration, deceleration, and inertia-based movement
- **Smooth Controls**: WASD for movement, Q/E for strafing, Space/Shift for altitude
- **Dynamic Tilt**: Realistic drone tilting based on velocity
- **Third-Person & FPV Cameras**: Switch between camera modes

### 🤖 Vision AI Integration
- **Real-time Object Detection**: YOLOv8-powered inference
- **Camera Feed Streaming**: Drone camera captures frames at 2 FPS
- **Detection Overlay**: Bounding boxes with labels and confidence scores
- **Python Backend**: Separate inference server for scalability

### 📍 Location: Riyadh, Saudi Arabia
- **Coordinates**: 24.7136°N, 46.6753°E
- **Scale-accurate**: Telemetry data relative to actual scale
- **Mini-map**: Real-time position tracking

## Quick Start

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Add your Mapbox token to `.env`:
```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token
```

Get your token from: https://account.mapbox.com/

4. Start the development server:
```bash
npm run dev
```

### Python Inference Server Setup

1. Navigate to the inference server directory:
```bash
cd inference-server
```

2. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the inference server:
```bash
python server.py
```

The server will start on `http://localhost:5001`

## Controls

### Drone Flight
- **W** - Move forward
- **S** - Move backward
- **A** - Rotate left
- **D** - Rotate right
- **Q** - Strafe left
- **E** - Strafe right
- **Space** - Ascend
- **Shift** - Descend

## Architecture

### Frontend (React + Three.js)
```
src/
├── components/
│   ├── 3D/
│   │   ├── SatelliteScene.tsx      # Main satellite scene with drone
│   │   ├── DroneModel.tsx          # 3D drone model
│   │   └── DroneCamera.tsx         # Camera system (FPV/3rd person)
│   └── UI/
│       └── DetectionOverlay.tsx    # Vision AI detection overlay
├── services/
│   └── VisionInferenceService.ts   # API client for inference server
```

### Backend (Python Flask)
```
inference-server/
├── server.py              # Flask inference server
├── requirements.txt       # Python dependencies
└── README.md             # Server documentation
```

## Vision AI System

### How It Works

1. **Frame Capture**: Drone camera captures frames from the Three.js scene
2. **Encoding**: Frames are encoded as JPEG data URLs
3. **Streaming**: Frames are sent to Python inference server via HTTP POST
4. **Detection**: YOLOv8 model runs object detection on each frame
5. **Overlay**: Detections are rendered as bounding boxes on the frontend

### Detection API

**Endpoint**: `POST /detect/stream`

**Request**:
```json
{
  "image": "data:image/jpeg;base64,...",
  "timestamp": 1234567890
}
```

**Response**:
```json
{
  "detections": [
    {
      "class": "person",
      "confidence": 0.95,
      "bbox": [100, 150, 300, 450],
      "bbox_normalized": [0.5, 0.6, 0.3, 0.4]
    }
  ],
  "count": 1
}
```

### Supported Object Classes

The YOLOv8 model can detect 80 object classes including:
- People
- Vehicles (cars, trucks, buses, motorcycles)
- Animals
- Common objects
- And more...

## Performance

- **Frontend FPS**: 60 FPS (Three.js rendering)
- **Vision AI FPS**: 2 FPS (inference rate)
- **Detection Latency**: ~50-100ms per frame
- **Model Size**: 6MB (YOLOv8 Nano)

## Future Enhancements

### Gaussian Splatting (Planned)
Generate 3D models from satellite images using Gaussian splatting:
1. Capture satellite images from multiple angles
2. Run photogrammetry processing
3. Generate 3D Gaussian splat model
4. Replace flat terrain with volumetric 3D scene

This would provide:
- True 3D buildings and terrain
- Realistic shadows and occlusion
- Photo-realistic rendering
- Better depth perception

## Troubleshooting

### Mapbox Tiles Not Loading
- Check your Mapbox token in `.env`
- Verify network connectivity
- Check browser console for errors

### Vision AI Server Not Connecting
- Ensure Python server is running on port 5001
- Check CORS settings if running on different domains
- Verify ultralytics is installed correctly

### Performance Issues
- Reduce vision AI frame rate in `DroneCamera.tsx`
- Use a smaller YOLO model (yolov8n.pt is already the smallest)
- Close other applications to free up GPU/CPU

## Tech Stack

- **Frontend**: React, TypeScript, Three.js, React Three Fiber
- **3D Rendering**: Three.js, WebGL
- **Maps**: Mapbox GL JS
- **Vision AI**: YOLOv8 (Ultralytics), PyTorch
- **Backend**: Python Flask
- **State Management**: Zustand

## Credits

- **Mapbox**: Satellite imagery and tiling
- **Ultralytics**: YOLOv8 object detection model
- **Three.js**: 3D rendering engine

## License

MIT
