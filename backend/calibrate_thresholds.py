#!/usr/bin/env python3
"""
Landscapes - Per-Location Confidence Threshold Calibration Utility
Runs YOLO + SAHI detection on sample frames across multiple thresholds
and generates an interactive visual HTML dashboard.
"""

import os
import sys
import cv2
import numpy as np
import torch
import time
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

def resolve_video_path(video_name):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(project_root, 'frontend', 'public', 'assets', video_name),
        os.path.join(project_root, 'public', 'assets', video_name),
        os.path.join(project_root, 'backend', video_name),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None

def apply_clahe(frame):
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def main():
    print("==================================================")
    print("      Landscapes Calibration Dashboard Generator  ")
    print("==================================================")

    # 1. Setup paths
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(backend_dir, 'calibration')
    images_dir = os.path.join(output_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)

    # 2. Detect device
    use_gpu = torch.cuda.is_available()
    device = 'cuda:0' if use_gpu else 'cpu'
    sahi_device = '0' if use_gpu else 'cpu'
    print(f"Device detected: {device}")

    # 3. Load YOLO model via SAHI
    pt_path = os.path.join(backend_dir, 'best.pt')
    if not os.path.exists(pt_path):
        print(f"ERROR: Model file not found at {pt_path}")
        sys.exit(1)

    print(f"Loading YOLO model from {pt_path}...")
    model = AutoDetectionModel.from_pretrained(
        model_type='yolov8',
        model_path=pt_path,
        confidence_threshold=0.10,  # low base confidence to allow custom filtering
        device=sahi_device,
    )

    # 4. Videos to process
    videos = [
        {
            "id": 1,
            "name": "Baguio Night Market",
            "filename": "night_market.mp4",
            "desc": "Overhead/elevated angle, dense green tent canopies, low artificial lighting, high occlusion.",
            "recommended": 0.25,
            "current": 0.35
        },
        {
            "id": 2,
            "name": "The Mansion",
            "filename": "mansion.mp4",
            "desc": "Ground-level view, wide field with fountain, pine trees in background, tiny background figures.",
            "recommended": 0.30,
            "current": 0.40
        },
        {
            "id": 3,
            "name": "The Mansion Entrance",
            "filename": "mansion_entrance.mp4",
            "desc": "Ground-level, wide gate area, clustered crowds, golden hour lighting, gate/pillar occlusion.",
            "recommended": 0.35,
            "current": 0.30
        },
        {
            "id": 4,
            "name": "Baguio Cathedral",
            "filename": "cathedral.mp4",
            "desc": "Elevated side angle, church facade with arched columns (false positive risk), wet pavement (rain).",
            "recommended": 0.45,
            "current": 0.35
        },
        {
            "id": 5,
            "name": "Melvin Jones Burnham Park",
            "filename": "burnham.mp4",
            "desc": "Flat open field, soccer players, extremely wide depth of field, very distant tiny figures.",
            "recommended": 0.20,
            "current": 0.25
        }
    ]

    thresholds = [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55]
    results_data = {}

    for video_info in videos:
        video_name = video_info["name"]
        filename = video_info["filename"]
        video_path = resolve_video_path(filename)

        if not video_path:
            print(f"Skipping {video_name} (file {filename} not found).")
            continue

        print(f"\nProcessing {video_name} ({filename})...")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Failed to open video {video_path}")
            continue

        # Extract frame 150 (approx 5 seconds in)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 150)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            print(f"Failed to extract frame 150 from {filename}")
            continue

        # Apply CLAHE preprocessing to match vision_worker behavior
        frame_proc = apply_clahe(frame)
        h, w = frame_proc.shape[:2]

        results_data[video_info["id"]] = {
            "name": video_name,
            "desc": video_info["desc"],
            "recommended": video_info["recommended"],
            "current": video_info["current"],
            "thresholds": {}
        }

        # Run inference once at a low threshold to cache predictions or just run per threshold
        # To match SAHI's internal confidence threshold, we set confidence_threshold on the model
        for conf in thresholds:
            print(f"  Running detection with confidence = {conf:.2f}...")
            model.confidence_threshold = conf
            
            # Sliced inference parameters to match active stream settings in vision_worker.py
            preds = get_sliced_prediction(
                frame_proc,
                model,
                slice_height=448,
                slice_width=448,
                overlap_height_ratio=0.15,
                overlap_width_ratio=0.15,
                postprocess_match_metric="IOU",
                postprocess_match_threshold=0.45,
                postprocess_class_agnostic=True,
                verbose=False,
            )

            # Filter bounding boxes using same criteria as vision_worker.py
            detections = []
            for obj in preds.object_prediction_list:
                if obj.category.id != 0:
                    continue  # person class only

                x1, y1, x2, y2 = obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy
                score = obj.score.value

                bw, bh = x2 - x1, y2 - y1
                # Filter out giant bounding boxes or border artifacts
                if bw > (w * 0.6) or bh > (h * 0.6):
                    continue
                if x1 <= 2 and y1 <= 2 and x2 >= (w - 2) and y2 >= (h - 2):
                    continue

                detections.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": float(score)
                })

            # Draw detections
            annotated_frame = frame_proc.copy()
            for det in detections:
                bx1, by1, bx2, by2 = det["bbox"]
                bconf = det["confidence"]
                color = (0, 255, 0)
                
                # Check if this matches our recommended settings
                if abs(conf - video_info["recommended"]) < 0.01:
                    color = (0, 215, 255) # Highlight recommended setting boxes in gold/yellow
                elif abs(conf - video_info["current"]) < 0.01:
                    color = (0, 165, 255) # Highlight current setting boxes in orange

                cv2.rectangle(annotated_frame, (bx1, by1), (bx2, by2), color, 2)
                label = f"{bconf:.2f}"
                cv2.putText(annotated_frame, label, (bx1, max(by1 - 5, 15)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

            # Draw CCTV style banner on top
            cv2.rectangle(annotated_frame, (0, 0), (w, 45), (0, 0, 0), -1)
            banner_text = f"{video_name.upper()} | CONFIDENCE THRESHOLD: {conf:.2f} | DETECTED: {len(detections)}"
            cv2.putText(annotated_frame, banner_text, (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # Save annotated frame
            img_filename = f"loc_{video_info['id']}_conf_{int(conf * 100)}.jpg"
            img_path = os.path.join(images_dir, img_filename)
            cv2.imwrite(img_path, annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

            avg_conf = sum(d["confidence"] for d in detections) / len(detections) if detections else 0.0
            results_data[video_info["id"]]["thresholds"][conf] = {
                "count": len(detections),
                "avg_confidence": avg_conf,
                "image_url": f"images/{img_filename}"
            }

    # 5. Generate HTML Dashboard
    html_content = generate_html_report(results_data, thresholds)
    html_path = os.path.join(output_dir, 'index.html')
    with open(html_path, 'w') as f:
        f.write(html_content)

    print(f"\nCalibration execution complete!")
    print(f"Interactive HTML dashboard written to: {html_path}")
    print("Open this file in a web browser to inspect detection counts and boxes across thresholds.")

def generate_html_report(results_data, thresholds):
    # CSS & JS dynamic tab and slider loader
    tab_buttons = []
    tab_contents = []

    for i, (loc_id, loc_data) in enumerate(sorted(results_data.items())):
        active_class = "active" if i == 0 else ""
        tab_buttons.append(f'<button class="tab-btn {active_class}" onclick="showTab({loc_id})">{loc_data["name"]}</button>')

        # Slider options data attributes and script
        t_data = []
        rows = []
        for t in thresholds:
            t_info = loc_data["thresholds"][t]
            t_data.append(f"'{t:.2f}': {{ 'count': {t_info['count']}, 'avg_conf': {t_info['avg_confidence']:.2f}, 'img': '{t_info['image_url']}' }}")
            
            # Highlight recommended and current
            row_class = ""
            label_badge = ""
            if abs(t - loc_data["recommended"]) < 0.01:
                row_class = "table-recommended"
                label_badge = ' <span class="badge badge-rec">RECOMMENDED</span>'
            elif abs(t - loc_data["current"]) < 0.01:
                row_class = "table-current"
                label_badge = ' <span class="badge badge-curr">CURRENT</span>'

            rows.append(f"""
                <tr class="{row_class}" onclick="setSliderValue({loc_id}, '{t:.2f}')">
                    <td>{t:.2f}{label_badge}</td>
                    <td><strong>{t_info['count']}</strong></td>
                    <td>{t_info['avg_confidence']:.2f}</td>
                </tr>
            """)

        rows_html = "\n".join(rows)

        tab_contents.append(f"""
        <div id="tab-{loc_id}" class="tab-content {active_class}">
            <div class="loc-grid">
                <div class="loc-sidebar">
                    <h3>Scene Characteristics</h3>
                    <p class="desc">{loc_data["desc"]}</p>
                    
                    <div class="tuning-summary">
                        <div class="tuning-metric">
                            <span class="label">Current Setting:</span>
                            <span class="value val-curr">{loc_data["current"]:.2f}</span>
                        </div>
                        <div class="tuning-metric">
                            <span class="label">Recommended Setting:</span>
                            <span class="value val-rec">{loc_data["recommended"]:.2f}</span>
                        </div>
                    </div>

                    <div class="slider-container">
                        <h3>Adjust Confidence Threshold</h3>
                        <div class="slider-display">
                            <span class="slider-val" id="val-display-{loc_id}">0.35</span>
                        </div>
                        <input type="range" class="conf-slider" id="slider-{loc_id}" min="0.15" max="0.55" step="0.05" value="{loc_data["recommended"]:.2f}" oninput="updateSlider({loc_id})">
                        <div class="slider-ticks">
                            <span>0.15</span>
                            <span>0.25</span>
                            <span>0.35</span>
                            <span>0.45</span>
                            <span>0.55</span>
                        </div>
                    </div>

                    <div class="stats-panel">
                        <div class="stat-card">
                            <span class="num" id="stat-count-{loc_id}">-</span>
                            <span class="label">People Detected</span>
                        </div>
                        <div class="stat-card">
                            <span class="num" id="stat-conf-{loc_id}">-</span>
                            <span class="label">Avg Confidence</span>
                        </div>
                    </div>

                    <div class="table-container">
                        <h3>Detection Sweep Data</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Threshold</th>
                                    <th>Count</th>
                                    <th>Avg Conf</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows_html}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="loc-preview">
                    <div class="img-wrapper">
                        <img id="img-{loc_id}" src="" alt="Calibration Preview">
                    </div>
                </div>
            </div>
            
            <script>
                window.locData_{loc_id} = {{
                    {", ".join(t_data)}
                }};
            </script>
        </div>
        """)

    tab_buttons_html = "\n".join(tab_buttons)
    tab_contents_html = "\n".join(tab_contents)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landscapes - YOLO Confidence Calibration</title>
    <style>
        :root {{
            --bg-color: #0f172a;
            --panel-bg: #1e293b;
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #10b981;
            --primary-hover: #059669;
            --curr-color: #f97316;
            --rec-color: #eab308;
            --border-color: #334155;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
            line-height: 1.5;
        }}
        header {{
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
        }}
        header h1 {{
            font-size: 24px;
            font-weight: 700;
        }}
        header p {{
            color: var(--text-muted);
            margin-top: 4px;
        }}
        .tabs {{
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
            overflow-x: auto;
        }}
        .tab-btn {{
            background: none;
            border: none;
            color: var(--text-muted);
            padding: 8px 16px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            border-radius: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }}
        .tab-btn:hover {{
            background-color: #1e293b;
            color: var(--text-color);
        }}
        .tab-btn.active {{
            background-color: var(--primary);
            color: #ffffff;
        }}
        .tab-content {{
            display: none;
        }}
        .tab-content.active {{
            display: block;
        }}
        .loc-grid {{
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 24px;
            align-items: start;
        }}
        .loc-sidebar {{
            background-color: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            max-height: 85vh;
            overflow-y: auto;
        }}
        .loc-sidebar h3 {{
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 6px;
        }}
        .desc {{
            color: var(--text-muted);
            font-size: 14px;
            margin-bottom: 20px;
        }}
        .tuning-summary {{
            background-color: #0f172a;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid var(--border-color);
        }}
        .tuning-metric {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
        }}
        .tuning-metric:last-child {{
            margin-bottom: 0;
        }}
        .tuning-metric .label {{
            color: var(--text-muted);
        }}
        .tuning-metric .value {{
            font-weight: 700;
        }}
        .val-curr {{
            color: var(--curr-color);
        }}
        .val-rec {{
            color: var(--rec-color);
        }}
        .slider-container {{
            margin-bottom: 20px;
        }}
        .slider-display {{
            display: flex;
            justify-content: center;
            margin-bottom: 10px;
        }}
        .slider-val {{
            font-size: 32px;
            font-weight: 800;
            color: var(--primary);
            background-color: #0f172a;
            padding: 4px 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }}
        .conf-slider {{
            width: 100%;
            height: 6px;
            background: #475569;
            outline: none;
            border-radius: 3px;
            -webkit-appearance: none;
            cursor: pointer;
        }}
        .conf-slider::-webkit-slider-thumb {{
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: var(--primary);
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.1s;
        }}
        .conf-slider::-webkit-slider-thumb:hover {{
            transform: scale(1.2);
        }}
        .slider-ticks {{
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
            padding: 0 4px;
        }}
        .stats-panel {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background-color: #0f172a;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }}
        .stat-card .num {{
            display: block;
            font-size: 28px;
            font-weight: 700;
            color: var(--text-color);
        }}
        .stat-card .label {{
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
        }}
        .table-container {{
            margin-top: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }}
        th, td {{
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }}
        th {{
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
        }}
        tbody tr {{
            cursor: pointer;
            transition: background 0.1s;
        }}
        tbody tr:hover {{
            background-color: #334155;
        }}
        .table-recommended {{
            background-color: rgba(234, 179, 8, 0.15);
        }}
        .table-current {{
            background-color: rgba(249, 115, 22, 0.15);
        }}
        .badge {{
            font-size: 8px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 800;
            margin-left: 6px;
            display: inline-block;
        }}
        .badge-rec {{
            background-color: var(--rec-color);
            color: #000000;
        }}
        .badge-curr {{
            background-color: var(--curr-color);
            color: #ffffff;
        }}
        .loc-preview {{
            background-color: #020617;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 500px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
        }}
        .img-wrapper {{
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
        }}
        .img-wrapper img {{
            max-width: 100%;
            max-height: 80vh;
            border-radius: 8px;
            object-fit: contain;
        }}
        @media (max-width: 1000px) {{
            .loc-grid {{
                grid-template-columns: 1fr;
            }}
            .loc-sidebar {{
                max-height: none;
            }}
        }}
    </style>
</head>
<body>

    <header>
        <h1>Landscapes - YOLO Confidence Threshold Calibration</h1>
        <p>Visually evaluate different confidence levels against surveillance footage characteristics to optimize detection accuracy.</p>
    </header>

    <div class="tabs">
        {tab_buttons_html}
    </div>

    {tab_contents_html}

    <script>
        function showTab(locId) {{
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Set button and content active
            event.target.classList.add('active');
            const targetContent = document.getElementById('tab-' + locId);
            targetContent.classList.add('active');
            
            // Trigger slider update for current active tab
            updateSlider(locId);
        }}

        function updateSlider(locId) {{
            const slider = document.getElementById('slider-' + locId);
            const val = parseFloat(slider.value).toFixed(2);
            document.getElementById('val-display-' + locId).innerText = val;
            
            const data = window['locData_' + locId][val];
            if (data) {{
                document.getElementById('img-' + locId).src = data.img;
                document.getElementById('stat-count-' + locId).innerText = data.count;
                document.getElementById('stat-conf-' + locId).innerText = data.avg_conf.toFixed(2);
            }}
        }}

        function setSliderValue(locId, valStr) {{
            const slider = document.getElementById('slider-' + locId);
            slider.value = parseFloat(valStr);
            updateSlider(locId);
        }}

        // Initialize all active sliders on load
        window.addEventListener('DOMContentLoaded', () => {{
            const activeTabContent = document.querySelector('.tab-content.active');
            if (activeTabContent) {{
                const locId = activeTabContent.id.replace('tab-', '');
                updateSlider(locId);
            }}
            // Initialize others too in background so they don't lag when clicked
            document.querySelectorAll('.tab-content').forEach(content => {{
                const locId = content.id.replace('tab-', '');
                updateSlider(locId);
            }});
        }});
    </script>
</body>
</html>
"""
    return html

if __name__ == '__main__':
    main()
