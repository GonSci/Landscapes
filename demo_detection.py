#!/usr/bin/env python3
"""
Demo script showing all YOLOv8 detection features
Run this after installing dependencies to verify everything works
"""

import os
import sys

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from yolo_realtime_detection import RealtimeDetector
import cv2


def demo_1_simple_webcam():
    """Demo 1: Simple webcam detection"""
    print("\n" + "="*60)
    print("DEMO 1: Simple Webcam Detection")
    print("="*60)
    print("Starting webcam detection...")
    print("Press 'q' to quit, 's' to save current frame")
    print()
    
    detector = RealtimeDetector(
        conf_threshold=0.5,
        iou_threshold=0.45,
        use_gpu=True
    )
    
    # Process 5 seconds of webcam
    detector.process_video(source=0, display=True)


def demo_2_video_file():
    """Demo 2: Process video file"""
    print("\n" + "="*60)
    print("DEMO 2: Video File Detection")
    print("="*60)
    
    video_path = 'public/assets/demo_video.mp4'
    
    if not os.path.exists(video_path):
        print(f"✗ Video not found: {video_path}")
        print("Please place demo_video.mp4 in public/assets/")
        return
    
    print(f"Processing video: {video_path}")
    print("Press 'q' to quit early")
    print()
    
    detector = RealtimeDetector(
        conf_threshold=0.5,
        iou_threshold=0.45,
        use_gpu=True
    )
    
    detector.process_video(source=video_path, display=True)


def demo_3_save_output():
    """Demo 3: Save annotated video"""
    print("\n" + "="*60)
    print("DEMO 3: Save Annotated Output")
    print("="*60)
    
    video_path = 'public/assets/demo_video.mp4'
    output_path = 'detected_output.mp4'
    
    if not os.path.exists(video_path):
        print(f"✗ Video not found: {video_path}")
        return
    
    print(f"Processing: {video_path}")
    print(f"Saving to: {output_path}")
    print()
    
    detector = RealtimeDetector(
        conf_threshold=0.5,
        iou_threshold=0.45,
        use_gpu=True
    )
    
    detector.process_video(
        source=video_path,
        output_path=output_path,
        display=True
    )
    
    print(f"\n✓ Saved annotated video to: {output_path}")


def demo_4_custom_detection():
    """Demo 4: Custom frame-by-frame detection"""
    print("\n" + "="*60)
    print("DEMO 4: Custom Frame Detection")
    print("="*60)
    
    video_path = 'public/assets/demo_video.mp4'
    
    if not os.path.exists(video_path):
        print(f"✗ Video not found: {video_path}")
        return
    
    print("Processing first 100 frames with custom logic...")
    print()
    
    detector = RealtimeDetector(
        conf_threshold=0.5,
        iou_threshold=0.45,
        use_gpu=True
    )
    
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    high_crowd_frames = []
    
    while cap.isOpened() and frame_count < 100:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect people
        detections = detector.detect_people(frame)
        people_count = len(detections)
        
        # Track high-crowd frames
        if people_count > 10:
            high_crowd_frames.append((frame_count, people_count))
        
        # Annotate and display every 10th frame
        if frame_count % 10 == 0:
            annotated = detector.draw_detections(frame, detections)
            annotated = detector.draw_cctv_overlay(annotated, people_count)
            
            cv2.imshow('Custom Detection', annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            
            print(f"Frame {frame_count}: {people_count} people detected")
        
        frame_count += 1
    
    cap.release()
    cv2.destroyAllWindows()
    
    print(f"\n✓ Processed {frame_count} frames")
    print(f"✓ Found {len(high_crowd_frames)} high-crowd frames (>10 people)")
    
    if high_crowd_frames:
        print("\nHigh-crowd frames:")
        for frame_num, count in high_crowd_frames[:5]:
            print(f"  Frame {frame_num}: {count} people")


def demo_5_parameter_comparison():
    """Demo 5: Compare different confidence thresholds"""
    print("\n" + "="*60)
    print("DEMO 5: Parameter Comparison")
    print("="*60)
    
    video_path = 'public/assets/demo_video.mp4'
    
    if not os.path.exists(video_path):
        print(f"✗ Video not found: {video_path}")
        return
    
    # Test different confidence thresholds
    thresholds = [0.3, 0.5, 0.7]
    
    print("Testing different confidence thresholds...")
    print()
    
    cap = cv2.VideoCapture(video_path)
    ret, test_frame = cap.read()
    cap.release()
    
    if not ret:
        print("✗ Failed to read test frame")
        return
    
    results = []
    
    for conf in thresholds:
        detector = RealtimeDetector(
            conf_threshold=conf,
            iou_threshold=0.45,
            use_gpu=True
        )
        
        detections = detector.detect_people(test_frame)
        count = len(detections)
        results.append((conf, count))
        
        print(f"Confidence {conf}: {count} people detected")
        
        # Show annotated frame
        annotated = detector.draw_detections(test_frame, detections)
        annotated = detector.draw_cctv_overlay(annotated, count)
        
        cv2.imshow(f'Conf={conf}', annotated)
    
    print("\nCompare the windows to see how confidence threshold affects detection")
    print("Press any key to continue...")
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def main():
    """Main demo menu"""
    print("\n" + "="*60)
    print("YOLOv8 People Detection - Demo Suite")
    print("="*60)
    print()
    print("Available Demos:")
    print("1. Simple Webcam Detection")
    print("2. Video File Detection")
    print("3. Save Annotated Output")
    print("4. Custom Frame-by-Frame Detection")
    print("5. Parameter Comparison")
    print("6. Run All Demos")
    print("0. Exit")
    print()
    
    while True:
        try:
            choice = input("Select demo (0-6): ").strip()
            
            if choice == '0':
                print("Exiting...")
                break
            elif choice == '1':
                demo_1_simple_webcam()
            elif choice == '2':
                demo_2_video_file()
            elif choice == '3':
                demo_3_save_output()
            elif choice == '4':
                demo_4_custom_detection()
            elif choice == '5':
                demo_5_parameter_comparison()
            elif choice == '6':
                print("\nRunning all demos...")
                demo_2_video_file()  # Skip webcam in auto mode
                demo_3_save_output()
                demo_4_custom_detection()
                demo_5_parameter_comparison()
                print("\n✓ All demos complete!")
                break
            else:
                print("Invalid choice. Please select 0-6.")
        
        except KeyboardInterrupt:
            print("\n\nInterrupted by user")
            break
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == '__main__':
    # Check if video file exists
    if not os.path.exists('public/assets/demo_video.mp4'):
        print("\n⚠ WARNING: demo_video.mp4 not found in public/assets/")
        print("Some demos will be skipped. Please add a demo video to test video processing.")
        print()
    
    main()
