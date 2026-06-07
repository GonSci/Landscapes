#!/usr/bin/env python3
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from sahi.predict import get_sliced_prediction, get_prediction
from sahi.models.base import DetectionModel

# ── Configuration ──────────────────────────────────────────────────────────────
DETECTION_CONFIG = {
    'iou_threshold': 0.45,
    'use_gpu': True,
}

# ── CoreML SAHI Wrapper (Standalone) ───────────────────────────────────────────
class CoreMLDetectionModel(DetectionModel):
    def __init__(self, mlpackage_path: str, conf: float):
        super().__init__(
            model_path=mlpackage_path,
            confidence_threshold=conf,
            device='cpu', 
            category_mapping={0: 'person'},
            category_remapping=None,
            load_at_init=False,
            image_size=None,
        )
        self.load_model()

    def load_model(self):
        from ultralytics import YOLO as UltralyticsYOLO
        self.model = UltralyticsYOLO(self.model_path, task='detect')
        self.set_model(self.model)

    def set_model(self, model):
        self.model = model
        self.category_names = {0: 'person'}

    def perform_inference(self, image: np.ndarray):
        self._original_predictions = self.model.predict(
            source=image,
            conf=self.confidence_threshold,
            classes=[0],
            verbose=False,
            imgsz=800,  
        )

    def convert_original_predictions(self, shift_amount=None, full_shape=None):
        from sahi.prediction import ObjectPrediction
        if shift_amount is None: shift_amount = [0, 0]
        
        object_prediction_list = []
        results = self._original_predictions

        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            img_h, img_w = results[0].orig_shape

            if full_shape is None: full_shape = [img_h, img_w]

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf   = float(boxes.conf[i].item())
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()

                try:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                except TypeError:
                    pred = ObjectPrediction(
                        bbox=[x1, y1, x2, y2], bool_mask=None, score=conf, category_id=cls_id,
                        category_name='person', shift_amount=shift_amount, full_shape=full_shape,
                    )
                object_prediction_list.append(pred)

        self._object_prediction_list_per_image = [object_prediction_list]

# ── API Server ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

backend_dir = os.path.dirname(os.path.abspath(__file__))
mlpackage_path = os.path.join(backend_dir, 'best.mlpackage')

print(f"[MAC WORKER] Loading CoreML model from {mlpackage_path}...")
MAC_MODEL = CoreMLDetectionModel(mlpackage_path, conf=0.35)
print("[MAC WORKER] Ready for background inference.")

@app.route('/predict_background', methods=['POST'])
def predict_background():
    # 1. Read the compressed JPEG from the PC
    file = request.files['frame'].read()
    npimg = np.frombuffer(file, np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    
    # 2. Extract pipeline settings
    conf = float(request.form.get('conf', 0.25))
    use_sahi = request.form.get('use_sahi', 'True') == 'True'
    slice_size = int(request.form.get('slice_size', 512))
    overlap = float(request.form.get('overlap', 0.15))

    MAC_MODEL.confidence_threshold = conf

    # 3. Run Inference on M5
    if use_sahi:
        results = get_sliced_prediction(
            frame, MAC_MODEL,
            slice_height=slice_size, slice_width=slice_size,
            overlap_height_ratio=overlap, overlap_width_ratio=overlap,
            postprocess_match_metric="IOU",
            postprocess_match_threshold=DETECTION_CONFIG['iou_threshold'],
            postprocess_class_agnostic=True, verbose=False
        )
    else:
        results = get_prediction(frame, MAC_MODEL, verbose=False)

    # 4. Return results as JSON
    predictions = []
    for obj in results.object_prediction_list:
        predictions.append({
            'bbox': [obj.bbox.minx, obj.bbox.miny, obj.bbox.maxx, obj.bbox.maxy],
            'score': obj.score.value,
            'category_id': obj.category.id
        })

    return jsonify({'status': 'success', 'predictions': predictions})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=False, threaded=True)