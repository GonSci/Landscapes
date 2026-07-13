from extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Location(db.Model):
    __tablename__ = 'locations'
    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(150), unique=True, nullable=False)
    district       = db.Column(db.String(100), nullable=False)
    latitude       = db.Column(db.Float, nullable=False)
    longitude      = db.Column(db.Float, nullable=False)
    video_filename = db.Column(db.String(255), unique=True, nullable=False)
    description    = db.Column(db.Text)
    is_active      = db.Column(db.Boolean, default=False)
    
    # TOPSIS-required columns for crowd-aware redirection
    type           = db.Column(db.String(100), nullable=True)  # e.g., "Dining", "Nature", "Culture"
    fov_area_m2    = db.Column(db.Float, nullable=True)        # For crowd density calculation
    environment    = db.Column(db.String(50), nullable=True)   # e.g., "Indoor", "Outdoor"
    
    # Relationship back to logs
    logs = db.relationship('SurveillanceLog', backref='location', lazy=True)

    def to_dict(self):
        import os
        project_root = os.path.dirname(os.path.abspath(__file__))
        video_exists = False
        if self.video_filename:
            candidates = [
                os.path.join(project_root, '..', 'frontend', 'public', 'assets', self.video_filename),
                os.path.join(project_root, '..', 'public', 'assets', self.video_filename),
                os.path.join(project_root, self.video_filename),
            ]
            video_exists = any(os.path.exists(c) for c in candidates)

        return {
            'id': self.id, 
            'name': self.name, 
            'district': self.district,
            'latitude': self.latitude, 
            'longitude': self.longitude,
            'video_filename': self.video_filename, 
            'has_video': video_exists,
            'is_active': self.is_active,
            'description': self.description,
            'type': self.type,
            'fov_area_m2': self.fov_area_m2,
            'environment': self.environment
        }

class SurveillanceLog(db.Model):
    __tablename__ = 'surveillance_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False, index=True)
    people_count = db.Column(db.Integer, nullable=False)
    location_name = db.Column(db.String(120), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    confidence_avg = db.Column(db.Float)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'people_count': self.people_count,
            'location_name': self.location_name,
            'location_id': self.location_id,
            'confidence_avg': self.confidence_avg
        }
