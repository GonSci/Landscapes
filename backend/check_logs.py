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
    logs = SurveillanceLog.query.order_by(SurveillanceLog.timestamp.desc()).limit(10).all()
    for log in logs:
        print(f"Log: {log.id}, timestamp: {log.timestamp}, count: {log.people_count}, loc: {log.location_name}")
