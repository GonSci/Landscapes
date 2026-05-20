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
from datetime import datetime, timedelta
from dotenv import load_dotenv
from threading import Lock

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db
from models import User, SurveillanceLog, Location

load_dotenv()

# ── Flask Application Setup ────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

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


# ── Vision Integration Endpoints ──────────────────────────────────────────────
@app.route('/api/yolo/initialize', methods=['POST'])
def initialize_yolo():
    """Update active location in DB so vision worker can switch its video stream."""
    try:
        data = request.json
        video_filename = data.get('video')
        if not video_filename:
            return jsonify({'error': 'Video filename required'}), 400
            
        location = Location.query.filter_by(video_filename=video_filename).first()
        if not location:
            return jsonify({'error': 'Location not found for this video'}), 404
            
        # Set all locations to inactive
        Location.query.update({Location.is_active: False})
        
        # Set selected location to active
        location.is_active = True
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'Active location switched to {location.name}',
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
        
        # Verify start location exists
        start_location = Location.query.get(start_location_id)
        if not start_location:
            return jsonify({'error': f'Start location {start_location_id} not found'}), 400
        
        start_lat, start_lon = start_coords
        print(f"[API] Starting from {start_location.name} at [{start_lat}, {start_lon}]")
        
        # Build decision matrix
        locations_with_metrics = []
        decision_matrix = []
        
        for loc in all_locations:
            if loc.id == start_location_id:
                continue  # Skip the starting location
            
            # Calculate distance
            distance = haversine_distance(start_lat, start_lon, loc.latitude, loc.longitude)
            
            # Calculate travel time with Baguio terrain multiplier
            TERRAIN_MULTIPLIER = 1.4  # Baguio mountainous terrain
            if travel_mode == 'driving':
                SPEED_KMH = 18.0  # Driving speed in Baguio
            elif travel_mode == 'commuting':
                SPEED_KMH = 12.0  # Public transport speed
            else:
                SPEED_KMH = 5.0   # Walking speed (default)
            travel_time = (distance / SPEED_KMH * TERRAIN_MULTIPLIER) * 60  # Convert to minutes
            
            # Get crowd level from latest database logs
            raw_density_pm2 = 0.0
            effective_density_pm2 = 0.0
            age_minutes = 0.0
            latest_log = SurveillanceLog.query.filter_by(location_id=loc.id).order_by(
                SurveillanceLog.timestamp.desc()
            ).first()
            
            if latest_log:
                # Calculate raw_density_pm2 (People per Square Meter)
                fov_area = loc.fov_area_m2 if (loc.fov_area_m2 is not None and loc.fov_area_m2 > 0) else 50.0
                raw_density_pm2 = latest_log.people_count / fov_area
                
                # Apply time-decay logic
                age_minutes = (datetime.now() - latest_log.timestamp).total_seconds() / 60.0
                DECAY_LAMBDA = 0.01
                decay_factor = math.exp(-DECAY_LAMBDA * age_minutes)
                effective_density_pm2 = raw_density_pm2 * decay_factor
            
            location_data = {
                'id': loc.id,
                'name': loc.name,
                'type': loc.type if hasattr(loc, 'type') else 'Unknown',
                'latitude': loc.latitude,
                'longitude': loc.longitude,
                'distance': distance,
                'travel_time_minutes': travel_time,
                'raw_density_pm2': raw_density_pm2,
                'effective_density_pm2': effective_density_pm2,
                'crowd_reading_age_minutes': age_minutes,
            }
            
            locations_with_metrics.append(location_data)
            decision_matrix.append([travel_time, effective_density_pm2])
        
        # Apply hard constraints
        filtered_locations = apply_hard_constraints(locations_with_metrics, max_travel_time, place_category)
        print(f"[API] After constraints: {len(filtered_locations)} locations remain")
        
        if len(filtered_locations) < 1:
            print(f"[API] No locations match criteria")
            return jsonify({
                'top_3_results': [],
                'message': 'No recommendations match your criteria'
            }), 200
        
        # Rebuild decision matrix with filtered locations only
        filtered_decision_matrix = [
            [loc['travel_time_minutes'], loc['effective_density_pm2']]
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
                'location_id': loc['id'],
                'name': loc['name'],
                'type': loc['type'],
                'distance': round(loc['distance'], 2),
                'travel_time_minutes': round(loc['travel_time_minutes'], 1),
                'raw_density_pm2': round(loc['raw_density_pm2'], 4),
                'effective_density_pm2': round(loc['effective_density_pm2'], 4),
                'crowd_level': round(loc['effective_density_pm2'], 4),
                'topsis_score': round(topsis_scores[idx], 4),
                'latitude': loc['latitude'],
                'longitude': loc['longitude'],
                'priority_weight': priority_weight,
                'crowd_reading_age_minutes': round(loc['crowd_reading_age_minutes'], 1),
            })
        
        # Sort by TOPSIS score (descending) - higher is better
        ranked_results.sort(key=lambda x: x['topsis_score'], reverse=True)
        
        if ranked_results:
            max_topsis_id = ranked_results[0]['location_id']
            min_distance_id = min(ranked_results, key=lambda x: x['distance'])['location_id']
            min_crowd_id = min(ranked_results, key=lambda x: x['crowd_level'])['location_id']
        else:
            max_topsis_id = min_distance_id = min_crowd_id = None
            
        # Add dynamic reason_text
        for idx, result in enumerate(ranked_results):
            loc_id = result['location_id']
            if loc_id == max_topsis_id:
                result['reason_text'] = "Optimal balance of low crowds and proximity."
            elif loc_id == min_distance_id:
                result['reason_text'] = "Shortest travel time from your current position."
            elif loc_id == min_crowd_id:
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
        import traceback
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
        
        hourly_data = {}
        for log in logs:
            hour_key = f"{log.timestamp.hour}:00"
            if hour_key not in hourly_data or log.people_count > hourly_data[hour_key]:
                hourly_data[hour_key] = log.people_count
        
        result = []
        for i in range(hours):
            h = (reference_hour - i) % 24
            h_key = f"{h}:00"
            result.append({
                'label': h_key,
                'value': hourly_data.get(h_key, 0),
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
    """Get crowd distribution across locations."""
    try:
        from sqlalchemy import func
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = db.session.query(
            Location.name,
            func.sum(SurveillanceLog.people_count).label('total')
        ).join(SurveillanceLog, SurveillanceLog.location_id == Location.id)
        
        if start_date:
            query = query.filter(SurveillanceLog.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(SurveillanceLog.timestamp <= datetime.fromisoformat(end_date))
        
        results = query.group_by(Location.id, Location.name).all()
        total_people = sum(res.total for res in results) if results else 0
        
        if total_people == 0:
            return jsonify([])

        colors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"]
        distribution = []
        for i, res in enumerate(results):
            pct = (res.total / total_people) * 100
            distribution.append({
                "name": res.name,
                "percentage": round(pct, 1),
                "color": colors[i % len(colors)]
            })
        
        return jsonify(distribution)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("[API] Starting Travel AI REST API Server...")
    print("[API] Server running on http://localhost:5001")
    # Disable debug mode and reloader to prevent high memory/CPU usage
    app.run(debug=False, port=5001, use_reloader=False)
