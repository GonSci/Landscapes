#!/usr/bin/env python3
"""
YOLOv8 Real-Time People Detection
Supports webcam, video files, and saves annotated output with CCTV overlay
"""

import cv2
import torch
from ultralytics import YOLO
import numpy as np
from datetime import datetime
import argparse
import os
import time


class RealtimeDetector:
    """Real-time people detection with YOLOv8"""
    
    def __init__(self, model_path='yolov8n.pt', conf_threshold=0.5, iou_threshold=0.45, use_gpu=True):
        """
        Initialize YOLOv8 detector
        
        Args:
            model_path: Path to YOLOv8 model weights
            conf_threshold: Confidence threshold for detections (0.0-1.0)
            iou_threshold: IoU threshold for NMS
            use_gpu: Use GPU if available
        """
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        # Set device
        if use_gpu and torch.cuda.is_available():
            self.device = 'cuda'
            print(f"✓ Using GPU: {torch.cuda.get_device_name(0)}")
        else:
            self.device = 'cpu'
            print(f"✓ Using CPU")
        
        # Load YOLOv8 model
        print(f"Loading YOLOv8 model: {model_path}")
        self.model = YOLO(model_path)
        self.model.to(self.device)
        print("✓ Model loaded successfully")
        
        # FPS calculation
        self.fps = 0
        self.frame_times = []
        self.max_frame_times = 30  # Average over 30 frames
        
    def calculate_fps(self):
        """Calculate current FPS"""
        if len(self.frame_times) > 0:
            avg_time = sum(self.frame_times) / len(self.frame_times)
            self.fps = 1.0 / avg_time if avg_time > 0 else 0
        return self.fps
    
    def detect_people(self, frame):
        """
        Run YOLOv8 detection on frame
        
        Args:
            frame: Input frame (BGR format)
            
        Returns:
            detections: List of (bbox, confidence) tuples
        """
        start_time = time.time()
        
        # Run inference (class 0 = person)
        results = self.model(
            frame,
            classes=[0],  # Only detect people
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            verbose=False
        )
        
        # Extract detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0])
                
                detections.append({
                    'bbox': (int(x1), int(y1), int(x2), int(y2)),
                    'confidence': confidence
                })
        
        # Update FPS calculation
        elapsed = time.time() - start_time
        self.frame_times.append(elapsed)
        if len(self.frame_times) > self.max_frame_times:
            self.frame_times.pop(0)
        
        return detections
    
    def draw_detections(self, frame, detections):
        """
        Draw bounding boxes and labels on frame
        
        Args:
            frame: Input frame
            detections: List of detection dictionaries
            
        Returns:
            annotated_frame: Frame with drawn detections
        """
        annotated = frame.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            confidence = det['confidence']
            
            # Draw bounding box
            color = (0, 255, 0)  # Green
            thickness = 2
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
            
            # Draw label with confidence
            label = f"Person {confidence:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            label_y = max(y1, label_size[1] + 10)
            
            # Draw label background
            cv2.rectangle(
                annotated,
                (x1, label_y - label_size[1] - 10),
                (x1 + label_size[0], label_y + 5),
                color,
                -1
            )
            
            # Draw label text
            cv2.putText(
                annotated,
                label,
                (x1, label_y - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 0),
                1
            )
        
        return annotated
    
    def draw_cctv_overlay(self, frame, people_count):
        """
        Draw CCTV-style overlay with timestamp, count, and FPS
        
        Args:
            frame: Input frame
            people_count: Number of people detected
            
        Returns:
            frame_with_overlay: Frame with CCTV overlay
        """
        overlay = frame.copy()
        h, w = frame.shape[:2]
        
        # Semi-transparent black bar at top
        cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
        frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
        
        # Current timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Calculate FPS
        current_fps = self.calculate_fps()
        
        # Draw text information
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Timestamp (left)
        cv2.putText(frame, f"CCTV - {timestamp}", (10, 30), 
                   font, 0.6, (255, 255, 255), 2)
        
        # People count (center)
        count_text = f"PEOPLE: {people_count}"
        count_size = cv2.getTextSize(count_text, font, 0.8, 2)[0]
        count_x = (w - count_size[0]) // 2
        cv2.putText(frame, count_text, (count_x, 30), 
                   font, 0.8, (0, 255, 0), 2)
        
        # FPS (right)
        fps_text = f"FPS: {current_fps:.1f}"
        fps_size = cv2.getTextSize(fps_text, font, 0.6, 2)[0]
        fps_x = w - fps_size[0] - 10
        cv2.putText(frame, fps_text, (fps_x, 30), 
                   font, 0.6, (0, 255, 255), 2)
        
        # Device info (bottom of top bar)
        device_info = f"Device: {self.device.upper()} | Conf: {self.conf_threshold} | IoU: {self.iou_threshold}"
        cv2.putText(frame, device_info, (10, 60), 
                   font, 0.4, (200, 200, 200), 1)
        
        return frame
    
    def process_video(self, source, output_path=None, display=True):
        """
        Process video source with real-time detection
        
        Args:
            source: Video file path, webcam index (0), or None for default webcam
            output_path: Path to save annotated video (optional)
            display: Display video in window
        """
        # Open video source
        if source is None or source == 'webcam':
            cap = cv2.VideoCapture(0)
            source_name = "Webcam"
        elif isinstance(source, int):
            cap = cv2.VideoCapture(source)
            source_name = f"Webcam {source}"
        else:
            cap = cv2.VideoCapture(source)
            source_name = os.path.basename(source)
        
        if not cap.isOpened():
            print(f"✗ Error: Cannot open video source: {source}")
            return
        
        # Get video properties
        fps_original = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"\n{'='*60}")
        print(f"Processing: {source_name}")
        print(f"Resolution: {width}x{height}")
        print(f"FPS: {fps_original:.1f}")
        if total_frames > 0:
            print(f"Total Frames: {total_frames}")
        print(f"{'='*60}\n")
        
        # Setup video writer if output path specified
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps_original, (width, height))
            print(f"✓ Saving output to: {output_path}")
        
        frame_count = 0
        total_people = 0
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Run detection
                detections = self.detect_people(frame)
                people_count = len(detections)
                total_people += people_count
                
                # Draw detections
                annotated_frame = self.draw_detections(frame, detections)
                
                # Draw CCTV overlay
                annotated_frame = self.draw_cctv_overlay(annotated_frame, people_count)
                
                # Save frame if writer is active
                if writer:
                    writer.write(annotated_frame)
                
                # Display frame
                if display:
                    cv2.imshow('YOLOv8 People Detection', annotated_frame)
                    
                    # Check for key press
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q'):
                        print("\n✓ Quit requested")
                        break
                    elif key == ord('s') and not writer:
                        # Save current frame
                        save_path = f"detection_frame_{frame_count}.jpg"
                        cv2.imwrite(save_path, annotated_frame)
                        print(f"✓ Saved frame to: {save_path}")
                
                # Print progress for video files
                if total_frames > 0 and frame_count % 30 == 0:
                    progress = (frame_count / total_frames) * 100
                    avg_people = total_people / frame_count
                    print(f"Progress: {progress:.1f}% | Frame: {frame_count}/{total_frames} | Avg People: {avg_people:.1f}")
        
        except KeyboardInterrupt:
            print("\n✓ Interrupted by user")
        
        finally:
            # Cleanup
            cap.release()
            if writer:
                writer.release()
            if display:
                cv2.destroyAllWindows()
            
            # Print summary
            print(f"\n{'='*60}")
            print("Detection Summary:")
            print(f"{'='*60}")
            print(f"Frames Processed: {frame_count}")
            print(f"Total People Detected: {total_people}")
            if frame_count > 0:
                print(f"Average People per Frame: {total_people/frame_count:.2f}")
            print(f"{'='*60}\n")


def main():
    """Main function with argument parsing"""
    parser = argparse.ArgumentParser(
        description='YOLOv8 Real-Time People Detection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Use webcam
  python yolo_realtime_detection.py --source webcam

  # Process video file
  python yolo_realtime_detection.py --source video.mp4

  # Process and save output
  python yolo_realtime_detection.py --source video.mp4 --output detected_video.mp4

  # Use specific webcam device
  python yolo_realtime_detection.py --source 1

  # Adjust detection parameters
  python yolo_realtime_detection.py --source webcam --conf 0.6 --iou 0.5 --no-gpu

Controls:
  q - Quit
  s - Save current frame
        """
    )
    
    parser.add_argument('--source', type=str, default='webcam',
                       help='Video source: "webcam", webcam index (0,1), or video file path')
    parser.add_argument('--output', type=str, default=None,
                       help='Output video file path (optional)')
    parser.add_argument('--model', type=str, default='yolov8n.pt',
                       help='YOLOv8 model path (default: yolov8n.pt)')
    parser.add_argument('--conf', type=float, default=0.5,
                       help='Confidence threshold (default: 0.5)')
    parser.add_argument('--iou', type=float, default=0.45,
                       help='IoU threshold for NMS (default: 0.45)')
    parser.add_argument('--no-gpu', action='store_true',
                       help='Disable GPU even if available')
    parser.add_argument('--no-display', action='store_true',
                       help='Disable video display window')
    
    args = parser.parse_args()
    
    # Parse source
    source = args.source
    if source.lower() == 'webcam':
        source = 0
    elif source.isdigit():
        source = int(source)
    
    # Initialize detector
    detector = RealtimeDetector(
        model_path=args.model,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
        use_gpu=not args.no_gpu
    )
    
    # Process video
    detector.process_video(
        source=source,
        output_path=args.output,
        display=not args.no_display
    )


if __name__ == '__main__':
    main()
