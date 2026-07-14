#!/usr/bin/env python3
"""
API Server - Handles HTTP requests, user preferences, and TOPSIS redirection
This service runs independently and serves all REST API endpoints.
It reads from the SurveillanceLog table (populated by vision_worker.py)
and performs TOPSIS calculations for location recommendations.
"""

import os
import math
import json
import traceback
from datetime import datetime, timedelta
from dotenv import load_dotenv

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db
from models import User, SurveillanceLog, Location

load_dotenv()

# ── Flask Application Setup ────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()


# ── TOPSIS Helper Functions ────────────────────────────────────────────────────
def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km."""
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat/2)**2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


def get_crowd_label(density_pm2):
    """
    Classify crowd density using Jacob's Crowd Density Method thresholds
    as defined in the Landscapes thesis:
        Low      : 1–2 persons/m²
        Moderate : 3–4 persons/m²
        High     : 5+  persons/m²
    Readings below 1 p/m² are labelled Sparse (area is effectively empty).
    """
    if density_pm2 < 1.0:
        return 'Sparse'
    elif density_pm2 <= 2.0:
        return 'Low'
    elif density_pm2 <= 4.0:
        return 'Moderate'
    else:
        return 'High'


def apply_hard_constraints(locations_with_metrics, max_travel_time, place_category):
    """
    Filter locations based on hard constraints:
    - Max travel time
    - Place category
    """
    filtered = []
    for loc in locations_with_metrics:
        # Constraint 1: Max travel time
        if loc['travel_time_minutes'] > max_travel_time:
            continue
        
        # Constraint 2: Place category (if not 'any')
        if place_category != 'any':
            loc_type = loc.get('type', '').lower()
            if place_category == 'shopping' and 'shopping' not in loc_type and 'retail' not in loc_type:
                continue
            elif place_category == 'nature' and 'nature' not in loc_type and 'park' not in loc_type and 'garden' not in loc_type:
                continue
            elif place_category == 'dining' and 'dining' not in loc_type and 'food' not in loc_type and 'cafe' not in loc_type and 'restaurant' not in loc_type:
                continue
            elif place_category == 'culture' and 'museum' not in loc_type and 'arts' not in loc_type and 'cultural' not in loc_type:
                continue
            else:
                # place_category value is not one of the known types — exclude this location
                # rather than silently returning all locations unfiltered.
                if place_category not in ('shopping', 'nature', 'dining', 'culture'):
                    continue
        
        filtered.append(loc)
    
    return filtered


def normalize_matrix(matrix):
    """Normalize decision matrix using vector normalization."""
    if not matrix:
        return []
    
    n_alternatives = len(matrix)
    n_criteria = len(matrix[0]) if matrix else 0
    
    # Initialize normalized matrix
    normalized = [[0.0 for _ in range(n_criteria)] for _ in range(n_alternatives)]
    
    # Normalize each criterion (column)
    for criterion_idx in range(n_criteria):
        # Calculate sum of squares for this criterion
        sum_of_squares = sum(matrix[alt_idx][criterion_idx]**2 for alt_idx in range(n_alternatives))
        norm_factor = math.sqrt(sum_of_squares) if sum_of_squares > 0 else 1
        
        # Normalize this criterion for all alternatives
        for alt_idx in range(n_alternatives):
            normalized[alt_idx][criterion_idx] = matrix[alt_idx][criterion_idx] / norm_factor
    
    return normalized


def calculate_weighted_matrix(normalized_matrix, weights):
    """Apply weights to normalized matrix."""
    weighted = []
    for row in normalized_matrix:
        weighted_row = [row[i] * weights[i] for i in range(len(weights))]
        weighted.append(weighted_row)
    return weighted


def calculate_ideal_solutions(weighted_matrix):
    """Calculate ideal and anti-ideal solutions."""
    if not weighted_matrix:
        return [], []
    
    n_criteria = len(weighted_matrix[0])
    ideal = []
    anti_ideal = []
    
    for criterion_idx in range(n_criteria):
        column = [row[criterion_idx] for row in weighted_matrix]
        ideal.append(min(column))  # Both criteria should be minimized
        anti_ideal.append(max(column))
    
    return ideal, anti_ideal


def calculate_separation(weighted_matrix, ideal, anti_ideal):
    """Calculate separation distances from ideal and anti-ideal solutions."""
    s_plus = []
    s_minus = []
    
    for row in weighted_matrix:
        sum_sq_ideal = sum((row[i] - ideal[i])**2 for i in range(len(ideal)))
        sum_sq_anti = sum((row[i] - anti_ideal[i])**2 for i in range(len(anti_ideal)))
        
        s_plus.append(math.sqrt(sum_sq_ideal))
        s_minus.append(math.sqrt(sum_sq_anti))
    
    return s_plus, s_minus


def calculate_topsis_scores(s_plus, s_minus):
    """Calculate TOPSIS scores (C_i = S- / (S+ + S-))."""
    scores = []
    for i in range(len(s_plus)):
        denominator = s_plus[i] + s_minus[i]
        score = s_minus[i] / denominator if denominator > 0 else 0
        scores.append(score)
    return scores


# ── Basic Health & Info Endpoints ──────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    """Comprehensive health check endpoint."""
    health_status = {
        'status': 'healthy',
        'api': 'running',
        'database': 'unknown',
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        # Check database connection by executing a simple query
        db.session.execute(db.text('SELECT 1'))
        health_status['database'] = 'connected'
        
        # Check if locations table has data
        loc_count = Location.query.count()
        health_status['locations_loaded'] = loc_count
        
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['database'] = 'disconnected'
        health_status['error'] = str(e)
        return jsonify(health_status), 503
        
    return jsonify(health_status), 200


# ── Authentication Endpoints ──────────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        new_user = User(
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """Login user."""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict()
            })
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Admin Helper ──────────────────────────────────────────────────────────────
def require_admin():
    """Check if the request is from an admin user via X-User-Email header."""
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    user = User.query.filter_by(email=user_email).first()
    if not user or not user.is_admin:
        return None, (jsonify({'error': 'Admin access required'}), 403)
    return user, None


# ── Vision Integration Endpoints ──────────────────────────────────────────────
@app.route('/api/yolo/initialize', methods=['POST'])
def initialize_yolo():
    """Update active location in DB so vision worker can switch its video stream.
    Step 7: No longer deactivates all other locations — multiple can be active."""
    try:
        data = request.json
        video_filename = data.get('video')
        if not video_filename:
            return jsonify({'error': 'Video filename required'}), 400
            
        location = Location.query.filter_by(video_filename=video_filename).first()
        if not location:
            return jsonify({'error': 'Location not found for this video'}), 404
            
        # Step 7: Just mark this location as active (don't deactivate others)
        location.is_active = True
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Active location: {location.name}',
            'location_id': location.id
        })
    except Exception as e:
        db.session.rollback()
        print(f"[API] Error initializing yolo: {e}")
        return jsonify({'error': str(e)}), 500


# ── Location Endpoints ────────────────────────────────────────────────────────
@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all locations."""
    try:
        locations = Location.query.all()
        return jsonify([loc.to_dict() for loc in locations])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/locations', methods=['POST'])
def create_location():
    """Create a new location (admin only)."""
    admin, err = require_admin()
    if err:
        return err
    try:
        data = request.get_json()
        required = ['name', 'district', 'latitude', 'longitude', 'video_filename']
        for field in required:
            if field not in data or data[field] is None:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        new_loc = Location(
            name=data['name'],
            district=data['district'],
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            video_filename=data['video_filename'],
            description=data.get('description', ''),
            is_active=data.get('is_active', False),
            type=data.get('type', ''),
            fov_area_m2=float(data['fov_area_m2']) if data.get('fov_area_m2') else None,
            environment=data.get('environment', ''),
        )
        db.session.add(new_loc)
        db.session.commit()
        return jsonify({'message': 'Location created', 'location': new_loc.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    """Update an existing location (admin only)."""
    admin, err = require_admin()
    if err:
        return err
    try:
        loc = Location.query.get(location_id)
        if not loc:
            return jsonify({'error': 'Location not found'}), 404

        data = request.get_json()
        if 'name' in data:
            loc.name = data['name']
        if 'district' in data:
            loc.district = data['district']
        if 'latitude' in data:
            loc.latitude = float(data['latitude'])
        if 'longitude' in data:
            loc.longitude = float(data['longitude'])
        if 'video_filename' in data:
            loc.video_filename = data['video_filename']
        if 'description' in data:
            loc.description = data['description']
        if 'is_active' in data:
            loc.is_active = data['is_active']
        if 'type' in data:
            loc.type = data['type']
        if 'fov_area_m2' in data:
            loc.fov_area_m2 = float(data['fov_area_m2']) if data['fov_area_m2'] else None
        if 'environment' in data:
            loc.environment = data['environment']

        db.session.commit()
        return jsonify({'message': 'Location updated', 'location': loc.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Delete a location (admin only)."""
    admin, err = require_admin()
    if err:
        return err
    try:
        loc = Location.query.get(location_id)
        if not loc:
            return jsonify({'error': 'Location not found'}), 404

        # Also delete associated surveillance logs
        SurveillanceLog.query.filter_by(location_id=location_id).delete()
        db.session.delete(loc)
        db.session.commit()
        return jsonify({'message': f'Location "{loc.name}" deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/locations/live-status', methods=['GET'])
def get_live_status():
    """Get latest surveillance status for all locations."""
    try:
        from sqlalchemy import func
        
        subquery = db.session.query(
            SurveillanceLog.location_id,
            func.max(SurveillanceLog.timestamp).label('max_time')
        ).group_by(SurveillanceLog.location_id).subquery()

        latest_logs = db.session.query(SurveillanceLog).join(
            subquery,
            (SurveillanceLog.location_id == subquery.c.location_id) & 
            (SurveillanceLog.timestamp == subquery.c.max_time)
        ).all()

        if not latest_logs:
            return jsonify([])

        return jsonify([{
            'location_id': log.location_id,
            'people_count': log.people_count,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None
        } for log in latest_logs])
    except Exception as e:
        print(f"Error in get_live_status: {str(e)}")
        return jsonify([])


# ── TOPSIS Redirection Endpoint ────────────────────────────────────────────────
@app.route('/api/redirection', methods=['POST'])
def get_topsis_recommendations():
    """
    TOPSIS-based crowd-aware redirection endpoint.
    
    Returns top 3 recommended locations based on travel time and crowd density.
    
    Expected payload:
    {
        "start_location_id": int,
        "start_coords": [lat, lon],
        "max_travel_time": int (minutes),
        "travel_mode": str ('walking', 'commuting', 'driving'),
        "group_size": int,
        "environment": str ('indoors', 'outdoors', 'any'),
        "place_category": str ('shopping', 'nature', 'dining', 'culture', 'any'),
        "paid_attractions": bool
    }
    """
    try:
        data = request.get_json()
        print(f"[API] Received TOPSIS request: {data}")
        
        # Extract parameters
        start_location_id = data.get('start_location_id')
        start_coords = data.get('start_coords')
        max_travel_time = data.get('max_travel_time', 15)
        place_category = data.get('place_category', 'any')
        travel_mode = data.get('travel_mode', 'walking')
        priority_weight = float(data.get('priority_weight', 0.5))
        priority_weight = max(0.0, min(1.0, priority_weight))  # Clamp to [0.0, 1.0]
        
        if not start_coords or len(start_coords) != 2:
            return jsonify({'error': 'Invalid start_coords format'}), 400
        
        # Fetch all available locations
        all_locations = Location.query.all()
        print(f"[API] Found {len(all_locations)} locations in database")
        
        if not all_locations:
            return jsonify({'error': 'No locations available in database'}), 400
        
        # Verify the intended destination exists
        start_location = Location.query.get(start_location_id)
        if not start_location:
            return jsonify({'error': f'Intended destination {start_location_id} not found'}), 400
        
        start_lat, start_lon = start_coords
        print(f"[API] Intended destination: {start_location.name} | Distance origin: [{start_lat}, {start_lon}]")
        
        # Build decision matrix
        locations_with_metrics = []

        # ── Pre-fetch all latest logs in a single query (T2 fix) ────────────────
        # Previously: one DB query per location inside the loop (N queries).
        # Now: two queries total regardless of how many locations exist.
        from sqlalchemy import func as sql_func
        latest_log_subq = db.session.query(
            SurveillanceLog.location_id,
            sql_func.max(SurveillanceLog.timestamp).label('max_time')
        ).group_by(SurveillanceLog.location_id).subquery()

        latest_logs_rows = db.session.query(SurveillanceLog).join(
            latest_log_subq,
            (SurveillanceLog.location_id == latest_log_subq.c.location_id) &
            (SurveillanceLog.timestamp  == latest_log_subq.c.max_time)
        ).all()

        latest_log_map = {log.location_id: log for log in latest_logs_rows}

        # ── Fixed neutral density for camera-less / no-log locations ────────────
        # Camera-less locations are assigned 2.0 p/m² — the midpoint of Jacob's
        # Moderate range (1–4 p/m²). This is a fixed, consistent value that:
        #   • prevents them from being falsely ranked best (0.0 p/m²)
        #   • prevents them from being falsely ranked worst (high spike value)
        #   • is justifiable in the thesis as a conservative middle-ground estimate
        # Reference: Jacobs' Crowd Density Method — Moderate = 1–4 persons/m²
        NEUTRAL_DENSITY_PM2 = 2.0
        print(f"[API] Neutral density for camera-less locations: {NEUTRAL_DENSITY_PM2} p/m² (fixed — Jacob's Moderate midpoint)")

        for loc in all_locations:

            # Calculate distance
            distance = haversine_distance(start_lat, start_lon, loc.latitude, loc.longitude)

            # Calculate travel time with Baguio terrain multiplier
            TERRAIN_MULTIPLIER = 1.4
            if travel_mode == 'driving':
                SPEED_KMH = 18.0
            elif travel_mode == 'commuting':
                SPEED_KMH = 12.0
            else:
                SPEED_KMH = 5.0
            travel_time = (distance / SPEED_KMH * TERRAIN_MULTIPLIER) * 60

            # ── Crowd density (Jacob's method) ───────────────────────────────────
            latest_log = latest_log_map.get(loc.id)
            has_camera = bool(loc.fov_area_m2 and loc.fov_area_m2 > 0)

            raw_density_pm2       = 0.0
            effective_density_pm2 = 0.0
            age_minutes           = 0.0

            if has_camera and latest_log:
                # Monitored location: real Jacob's density with time-decay
                raw_density_pm2 = latest_log.people_count / loc.fov_area_m2
                age_minutes     = max(0.0, (datetime.now() - latest_log.timestamp).total_seconds() / 60.0)
                effective_density_pm2 = raw_density_pm2 * math.exp(-0.01 * age_minutes)

            elif has_camera and not latest_log:
                # Camera configured but YOLO has not written any logs yet
                effective_density_pm2 = NEUTRAL_DENSITY_PM2
                raw_density_pm2       = NEUTRAL_DENSITY_PM2
                print(f"[API] '{loc.name}': camera set up but no logs yet — using neutral {NEUTRAL_DENSITY_PM2:.4f} p/m²")

            else:
                # No camera at this location — assign the fixed neutral density.
                # 2.0 p/m² is the midpoint of Jacob's Moderate range and is used
                # consistently across all camera-less locations so TOPSIS treats
                # them as moderately busy — neither best nor worst by default.
                effective_density_pm2 = NEUTRAL_DENSITY_PM2
                raw_density_pm2       = NEUTRAL_DENSITY_PM2
                print(f"[API] '{loc.name}': no camera — assigned fixed neutral density {NEUTRAL_DENSITY_PM2} p/m²")

            # Fix 5: Jacob's threshold label using thesis-defined cutoffs
            crowd_label = get_crowd_label(effective_density_pm2)

            location_data = {
                'id':                        loc.id,
                'name':                      loc.name,
                'type':                      loc.type if hasattr(loc, 'type') else 'Unknown',
                'latitude':                  loc.latitude,
                'longitude':                 loc.longitude,
                'distance':                  distance,
                'travel_time_minutes':       travel_time,
                # Fix 6: raw_density_pm2 = before decay (or neutral if no camera)
                #        crowd_level       = after decay — this is what TOPSIS uses
                'raw_density_pm2':           round(raw_density_pm2, 4),
                'crowd_level':               round(effective_density_pm2, 4),
                'crowd_label':               crowd_label,   # Fix 5: Sparse/Low/Moderate/High
                'has_camera':                has_camera,    # Fix 3: frontend can show "No live data"
                'crowd_reading_age_minutes': round(age_minutes, 1),
            }

            locations_with_metrics.append(location_data)
        
        # Apply hard constraints
        filtered_locations = apply_hard_constraints(locations_with_metrics, max_travel_time, place_category)
        print(f"[API] After constraints: {len(filtered_locations)} locations remain")
        
        if len(filtered_locations) < 1:
            print(f"[API] No locations match criteria")
            return jsonify({
                'top_3_results': [],
                'message': 'No recommendations match your criteria'
            }), 200
        # ── SINGLE RESULT EDGE CASE (SHORT-CIRCUIT) ──
        elif len(filtered_locations) == 1:
            print(f"[API] Only 1 location matches criteria. Bypassing TOPSIS.")
            loc = filtered_locations[0]

            single_result = {
                'location_id':               loc['id'],
                'name':                      loc['name'],
                'type':                      loc['type'],
                'distance':                  round(loc['distance'], 2),
                'travel_time_minutes':       round(loc['travel_time_minutes'], 1),
                'raw_density_pm2':           loc['raw_density_pm2'],   # before decay
                'crowd_level':               loc['crowd_level'],        # after decay
                'crowd_label':               loc['crowd_label'],        # Sparse/Low/Moderate/High
                'has_camera':                loc['has_camera'],
                'topsis_score':              1.0,
                'latitude':                  loc['latitude'],
                'longitude':                 loc['longitude'],
                'priority_weight':           priority_weight,
                'crowd_reading_age_minutes': loc['crowd_reading_age_minutes'],
                'reason_text':               "Only location matching your exact travel constraints.",
                'single_result_note':        True,
            }

            return jsonify({
                'top_3_results': [single_result],
                'total_considered': 1,
                'total_locations': len(locations_with_metrics),
                # Fix 7: include actual input values so the bypass is documented
                'calculation_breakdown': {
                    'calculation_explanation':  'TOPSIS bypassed — only one location met the hard constraints. '
                                                'The single eligible location is assigned a score of 1.0 by definition.',
                    'location_names_in_order':  [loc['name']],
                    'input_travel_time_minutes': round(loc['travel_time_minutes'], 2),
                    'input_raw_density_pm2':     loc['raw_density_pm2'],
                    'input_crowd_level_pm2':     loc['crowd_level'],
                    'input_crowd_label':         loc['crowd_label'],
                    'has_camera':                loc['has_camera'],
                    'topsis_score_assigned':     1.0,
                    'note': 'Only one option available — by definition the best and only choice.',
                },
            }), 200
        
        # Rebuild decision matrix with filtered locations only (for 2+ locations)
        filtered_decision_matrix = [
            [loc['travel_time_minutes'], loc['crowd_level']]
            for loc in filtered_locations
        ]
        
        # ── TOPSIS Calculation ──
        # Index 0 = Travel Time weight, Index 1 = Crowd Density weight
        weights = [1.0 - priority_weight, priority_weight]
        print(f"[API] TOPSIS weights — travel_time: {weights[0]:.2f}, crowd_density: {weights[1]:.2f} (priority_weight={priority_weight})")
        
        # Step 1: Normalize
        normalized = normalize_matrix(filtered_decision_matrix)
        
        # Step 2: Weight
        weighted = calculate_weighted_matrix(normalized, weights)
        
        # Step 3: Ideal solutions
        ideal, anti_ideal = calculate_ideal_solutions(weighted)
        
        # Step 4: Separation
        s_plus, s_minus = calculate_separation(weighted, ideal, anti_ideal)
        
        # Step 5: TOPSIS scores
        topsis_scores = calculate_topsis_scores(s_plus, s_minus)
        
        # Rank results
        ranked_results = []
        for idx, loc in enumerate(filtered_locations):
            ranked_results.append({
                'location_id':               loc['id'],
                'name':                      loc['name'],
                'type':                      loc['type'],
                'distance':                  round(loc['distance'], 2),
                'travel_time_minutes':       round(loc['travel_time_minutes'], 1),
                'raw_density_pm2':           loc['raw_density_pm2'],   # before decay
                'crowd_level':               loc['crowd_level'],        # after decay — TOPSIS input
                'crowd_label':               loc['crowd_label'],        # Fix 5: Sparse/Low/Moderate/High
                'has_camera':                loc['has_camera'],         # Fix 3: no-camera flag
                'topsis_score':              round(topsis_scores[idx], 4),
                'latitude':                  loc['latitude'],
                'longitude':                 loc['longitude'],
                'priority_weight':           priority_weight,
                'crowd_reading_age_minutes': loc['crowd_reading_age_minutes'],
            })
        
        # Sort by TOPSIS score (descending) - higher is better
        ranked_results.sort(key=lambda x: x['topsis_score'], reverse=True)
        
        if ranked_results:
            max_topsis_id = ranked_results[0]['location_id']
            min_distance_id = min(ranked_results, key=lambda x: x['distance'])['location_id']
            min_crowd_id = min(ranked_results, key=lambda x: x['crowd_level'])['location_id']
        else:
            max_topsis_id = min_distance_id = min_crowd_id = None
            
        # Add dynamic, compound reason_text
        for idx, result in enumerate(ranked_results):
            loc_id = result['location_id']
            
            is_top = (loc_id == max_topsis_id)
            is_closest = (loc_id == min_distance_id)
            is_emptiest = (loc_id == min_crowd_id)
            
            if is_top and is_closest and is_emptiest:
                result['reason_text'] = "The perfect match: Closest to you and currently the least crowded."
            elif is_top and is_closest:
                result['reason_text'] = "Top recommendation: Offers the absolute shortest travel time."
            elif is_top and is_emptiest:
                result['reason_text'] = "Top recommendation: Maximum comfort with the lowest crowd density."
            elif is_top:
                result['reason_text'] = "Optimal balance of manageable crowds and reasonable proximity."
            elif is_closest:
                result['reason_text'] = "Shortest travel time from your current position."
            elif is_emptiest:
                result['reason_text'] = "Recommended for maximum comfort and space (Quiet Zone)."
            else:
                result['reason_text'] = "Solid alternative matching your preferences."
        
        # Return top 3
        top_3 = ranked_results[:3]
        print(f"[API] Top 3 results: {[r['name'] for r in top_3]}")
        
        # ── TOPSIS Calculation Breakdown (for thesis transparency) ──
        location_names_in_order = [loc['name'] for loc in filtered_locations]
        calculation_breakdown = {
            'calculation_explanation': 'Crowd density is now calculated continuously as People per Square Meter (P/m²), using fov_area_m2 with time-decay. TOPSIS naturally handles this as a cost criterion.',
            'location_names_in_order': location_names_in_order,
            '1_raw_matrix':            filtered_decision_matrix,
            '2_weights_applied':       weights,
            '3_normalized_matrix':     normalized,
            '4_weighted_matrix':       weighted,
            '5_ideal_solutions': {
                'PIS_A_plus':  ideal,
                'NIS_A_minus': anti_ideal,
            },
            '6_separation_measures': {
                'S_plus':  s_plus,
                'S_minus': s_minus,
            },
            '7_final_topsis_scores':   topsis_scores,
        }
        
        return jsonify({
            'top_3_results': top_3,
            'total_considered': len(filtered_locations),
            'total_locations': len(locations_with_metrics),
            'calculation_breakdown': calculation_breakdown,
        }), 200
        
    except Exception as e:
        print(f"[API] Error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# ── Analytics Endpoints ────────────────────────────────────────────────────────
@app.route('/api/logs/hourly', methods=['GET'])
def get_hourly_logs():
    """Get hourly crowd data aggregates."""
    try:
        location_id = request.args.get('location_id')
        hours = int(request.args.get('hours', 4))
        date_str = request.args.get('date')
        
        now = datetime.now()
        query = SurveillanceLog.query
        
        if location_id:
            query = query.filter_by(location_id=location_id)
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d')
                start_time = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
                query = query.filter(
                    SurveillanceLog.timestamp >= start_time,
                    SurveillanceLog.timestamp < end_time
                )
                
                reference_hour = now.hour if target_date.date() == now.date() else 23
            except ValueError:
                query = query.filter(SurveillanceLog.timestamp >= now - timedelta(hours=hours))
                reference_hour = now.hour
        else:
            query = query.filter(SurveillanceLog.timestamp >= now - timedelta(hours=hours))
            reference_hour = now.hour

        logs = query.order_by(SurveillanceLog.timestamp.desc()).all()
        
        # ── THE NEW WEIGHTED/MEAN FIX ──
        # Instead of storing a single integer, we store a list of all readings for that hour
        hourly_data = {}
        for log in logs:
            hour_key = f"{log.timestamp.hour}:00"
            if hour_key not in hourly_data:
                hourly_data[hour_key] = []
            hourly_data[hour_key].append(log.people_count)
        
        result = []
        for i in range(hours):
            h = (reference_hour - i) % 24
            h_key = f"{h}:00"
            
            counts = hourly_data.get(h_key, [])
    
            # Calculate the mean (average) to smooth out YOLOv8 spikes
            avg_value = sum(counts) / len(counts) if counts else 0
            
            result.append({
                'label': h_key,
                'value': round(avg_value),  # Round to a whole integer (can't have half a person)
                'hour': h
            })
        result.reverse()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/logs/recent', methods=['GET'])
def get_recent_logs():
    """Get recent surveillance logs."""
    try:
        location_id = request.args.get('location_id')
        query = SurveillanceLog.query
        
        if location_id:
            query = query.filter_by(location_id=location_id)
        
        logs = query.order_by(SurveillanceLog.timestamp.desc()).limit(10).all()
        
        return jsonify([
            {
                'id': log.id,
                'time': log.timestamp.strftime("%I:%M:%S %p"),
                'count': log.people_count,
                'location_id': log.location_id,
                'location_name': log.location_name
            } for log in logs
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/distribution', methods=['GET'])
def get_distribution():
    """Get crowd distribution across locations using average density (p/m²)."""
    try:
        from sqlalchemy import func as sql_func

        start_date = request.args.get('start_date')
        end_date   = request.args.get('end_date')

        # Fix 8: aggregate by average density (people / fov_area_m2) per location
        # rather than summing raw headcounts. This corrects for locations with
        # different camera FOV sizes — a large-area camera would otherwise
        # accumulate higher totals even if the area is no busier than a smaller one.
        query = db.session.query(
            Location.name,
            Location.fov_area_m2,
            sql_func.avg(SurveillanceLog.people_count).label('avg_count')
        ).join(SurveillanceLog, SurveillanceLog.location_id == Location.id)

        if start_date:
            query = query.filter(SurveillanceLog.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            dt_end = datetime.fromisoformat(end_date)
            if dt_end.hour == 0 and dt_end.minute == 0 and dt_end.second == 0:
                dt_end = dt_end.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.filter(SurveillanceLog.timestamp <= dt_end)

        results = query.group_by(Location.id, Location.name, Location.fov_area_m2).all()

        # Compute average density per location; skip any with no FOV configured
        density_rows = []
        for res in results:
            if res.fov_area_m2 and res.fov_area_m2 > 0:
                avg_density = res.avg_count / res.fov_area_m2
            else:
                avg_density = 0.0  # no FOV — excluded from percentage share
            density_rows.append({'name': res.name, 'avg_density': avg_density})

        total_density = sum(r['avg_density'] for r in density_rows)

        if total_density == 0:
            return jsonify([])

        colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"]
        distribution = []
        for i, row in enumerate(density_rows):
            if row['avg_density'] == 0:
                continue  # omit locations with no FOV from the chart
            pct = (row['avg_density'] / total_density) * 100
            distribution.append({
                "name":       row['name'],
                "percentage": round(pct, 1),
                "color":      colors[i % len(colors)],
            })

        return jsonify(distribution)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("[API] Starting Travel AI REST API Server...")
    print("[API] Server running on http://localhost:5001")
    # Disable debug mode and reloader to prevent high memory/CPU usage
    app.run(host='0.0.0.0', debug=False, port=5001, use_reloader=False)