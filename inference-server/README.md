# Vision Model Inference Server

Python Flask server for real-time object detection from drone camera feed using YOLOv8.

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the server:
```bash
python server.py
```

The server will start on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and model availability.

### Object Detection
```
POST /detect
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}
```
Returns detected objects with bounding boxes and confidence scores.

### Streaming Detection
```
POST /detect/stream
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "timestamp": 1234567890
}
```
Optimized endpoint for continuous camera feed. Returns detections with minimal latency.

## Response Format

```json
{
  "success": true,
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

## Model

Uses YOLOv8 Nano (yolov8n.pt) for fast inference. The model will be automatically downloaded on first run.

You can switch to a more accurate model by changing the model in server.py:
- `yolov8n.pt` - Nano (fastest)
- `yolov8s.pt` - Small
- `yolov8m.pt` - Medium
- `yolov8l.pt` - Large
- `yolov8x.pt` - Extra Large (most accurate)

## Performance

- Inference time: ~10-30ms per frame (on GPU)
- Recommended frame rate: 2-10 FPS for continuous detection
- Input resolution: Auto-scaled to 640px max dimension for faster processing
