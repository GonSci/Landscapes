import os
from flask import Flask
from extensions import db
from models import SurveillanceLog

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
db.init_app(app)

with app.app_context():
    logs = SurveillanceLog.query.filter(SurveillanceLog.timestamp >= '2026-06-08').all()
    print(f"Total logs on June 8: {len(logs)}")
    for log in logs[:5]:
        print(f"Log: {log.id}, timestamp: {log.timestamp}, count: {log.people_count}, loc: {log.location_name}")
