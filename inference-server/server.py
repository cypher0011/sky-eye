#!/usr/bin/env python3
"""
Vision Model Inference Server for Drone Camera Feed
Receives images from the drone camera and performs object detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import numpy as np
from PIL import Image
import logging

# Try to import vision models (install with: pip install ultralytics opencv-python)
try:
    from ultralytics import YOLO
    MODEL_AVAILABLE = True
except ImportError:
    print("Warning: ultralytics not installed. Install with: pip install ultralytics")
    MODEL_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load YOLO model (using YOLOv8 nano for speed)
model = None
if MODEL_AVAILABLE:
    try:
        model = YOLO('yolov8n.pt')  # Nano model for fast inference
        logger.info("YOLOv8 model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        MODEL_AVAILABLE = False


def decode_image(image_data):
    """Decode base64 image data to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        # Decode base64
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        return image
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        return None


def detect_objects(image):
    """Run object detection on image"""
    if not MODEL_AVAILABLE or model is None:
        return []

    try:
        # Run inference
        results = model(image, conf=0.25, iou=0.45)

        # Extract detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                detection = {
                    'class': result.names[int(box.cls[0])],
                    'confidence': float(box.conf[0]),
                    'bbox': box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                    'bbox_normalized': box.xywhn[0].tolist()  # [x_center, y_center, width, height] normalized
                }
                detections.append(detection)

        return detections
    except Exception as e:
        logger.error(f"Error in object detection: {e}")
        return []


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': MODEL_AVAILABLE and model is not None
    })


@app.route('/detect', methods=['POST'])
def detect():
    """Object detection endpoint"""
    try:
        data = request.json

        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        # Decode image
        image = decode_image(data['image'])
        if image is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        logger.info(f"Received image: {image.size}")

        # Run detection
        detections = detect_objects(image)

        logger.info(f"Found {len(detections)} objects")

        return jsonify({
            'success': True,
            'detections': detections,
            'count': len(detections)
        })

    except Exception as e:
        logger.error(f"Error in detect endpoint: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/detect/stream', methods=['POST'])
def detect_stream():
    """
    Streaming detection endpoint for continuous camera feed
    Optimized for lower latency
    """
    try:
        data = request.json

        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        # Decode image
        image = decode_image(data['image'])
        if image is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        # Resize for faster inference if needed
        max_size = 640
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Run detection
        detections = detect_objects(image)

        # Return only essential data for streaming
        return jsonify({
            'detections': detections,
            'count': len(detections),
            'timestamp': data.get('timestamp', None)
        })

    except Exception as e:
        logger.error(f"Error in stream endpoint: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("Starting Vision Inference Server...")
    logger.info(f"Model available: {MODEL_AVAILABLE}")

    # Run server
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        threaded=True
    )
