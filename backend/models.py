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
    
    # Relationship back to logs
    logs = db.relationship('SurveillanceLog', backref='location', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 
            'name': self.name, 
            'district': self.district,
            'latitude': self.latitude, 
            'longitude': self.longitude,
            'video_filename': self.video_filename, 
            'is_active': self.is_active,
            'description': self.description
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
