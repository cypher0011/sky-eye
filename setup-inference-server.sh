#!/bin/bash

echo "🚁 Setting up Vision Inference Server..."
echo ""

# Navigate to inference server directory
cd inference-server || exit 1

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Remove existing venv if it exists
if [ -d "venv" ]; then
    echo "🗑️  Removing existing virtual environment..."
    rm -rf venv
fi

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✓ Virtual environment created"
echo ""
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip and setuptools
echo ""
echo "📦 Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

# Install dependencies
echo ""
echo "📦 Installing dependencies (this may take a few minutes)..."
echo "   Installing basic dependencies first..."
pip install flask flask-cors pillow numpy

echo "   Installing computer vision dependencies..."
pip install opencv-python-headless

echo "   Installing PyTorch (this is large, ~2GB)..."
pip install torch torchvision

echo "   Installing Ultralytics YOLOv8..."
pip install ultralytics

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the inference server:"
echo "  cd inference-server"
echo "  source venv/bin/activate"
echo "  python server.py"
echo ""
echo "The server will run on http://localhost:5001"
