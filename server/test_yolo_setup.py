#!/usr/bin/env python3
"""
Quick test script to verify YOLOv8 setup and video file
"""

import os
import sys

def test_imports():
    """Test if all required packages are installed"""
    print("Testing Python dependencies...")
    try:
        import cv2
        print("✓ opencv-python installed")
    except ImportError:
        print("✗ opencv-python missing - run: pip install opencv-python")
        return False
    
    try:
        import torch
        print(f"✓ PyTorch installed (version {torch.__version__})")
    except ImportError:
        print("✗ PyTorch missing - run: pip install torch torchvision")
        return False
    
    try:
        from ultralytics import YOLO
        print("✓ Ultralytics (YOLOv8) installed")
    except ImportError:
        print("✗ Ultralytics missing - run: pip install ultralytics")
        return False
    
    try:
        import numpy as np
        print("✓ NumPy installed")
    except ImportError:
        print("✗ NumPy missing - run: pip install numpy")
        return False
    
    return True

def test_video_file():
    """Check if demo video exists"""
    print("\nChecking for demo video...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    video_path = os.path.join(base_dir, 'public', 'assets', 'demo_video.mp4')
    
    if os.path.exists(video_path):
        print(f"✓ Video found: {video_path}")
        
        # Check if video can be opened
        import cv2
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / fps if fps > 0 else 0
            
            print(f"  Resolution: {width}x{height}")
            print(f"  Duration: {duration:.1f} seconds")
            print(f"  FPS: {fps:.1f}")
            print(f"  Total frames: {total_frames}")
            cap.release()
            return True
        else:
            print(f"✗ Cannot open video file")
            return False
    else:
        print(f"✗ Video not found at: {video_path}")
        print("  Please place demo_video.mp4 in public/assets/ folder")
        return False

def test_yolo_model():
    """Test YOLOv8 model loading and inference"""
    print("\nTesting YOLOv8 model...")
    try:
        from ultralytics import YOLO
        print("Loading YOLOv8n model (this may take a moment on first run)...")
        model = YOLO('yolov8n.pt')
        print("✓ YOLOv8 model loaded successfully")
        
        # Test inference on a blank image
        import numpy as np
        test_image = np.zeros((640, 640, 3), dtype=np.uint8)
        results = model(test_image, verbose=False)
        print("✓ Model inference test passed")
        return True
    except Exception as e:
        print(f"✗ YOLOv8 test failed: {str(e)}")
        return False

def test_detection():
    """Test detection on actual video"""
    print("\nTesting detection on demo video...")
    try:
        import cv2
        from ultralytics import YOLO
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        video_path = os.path.join(base_dir, 'public', 'assets', 'demo_video.mp4')
        
        if not os.path.exists(video_path):
            print("✗ Video not found, skipping detection test")
            return False
        
        model = YOLO('yolov8n.pt')
        cap = cv2.VideoCapture(video_path)
        
        # Test first frame
        ret, frame = cap.read()
        if not ret:
            print("✗ Cannot read video frame")
            cap.release()
            return False
        
        results = model(frame, classes=[0], verbose=False)  # Detect only people
        detections = len(results[0].boxes)
        
        print(f"✓ Detection test passed")
        print(f"  Detected {detections} people in first frame")
        
        if detections == 0:
            print("  ⚠ Warning: No people detected in first frame")
            print("    Make sure your video contains people")
        
        cap.release()
        return True
        
    except Exception as e:
        print(f"✗ Detection test failed: {str(e)}")
        return False

def main():
    print("="*60)
    print("YOLOv8 Crowd Detection Setup Test")
    print("="*60)
    
    tests = [
        ("Dependencies", test_imports),
        ("Video File", test_video_file),
        ("YOLOv8 Model", test_yolo_model),
        ("Detection", test_detection)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"✗ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
        print()
    
    # Summary
    print("="*60)
    print("Test Summary:")
    print("="*60)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed! You're ready to use Live View feature.")
        print("\nNext steps:")
        print("1. Start Flask server: python server/app.py")
        print("2. Start React app: npm run dev")
        print("3. Navigate to Live View and click 'Start Crowd Detection'")
    else:
        print("\n✗ Some tests failed. Please fix the issues above.")
        print("See YOLO_SETUP.md for detailed setup instructions.")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
