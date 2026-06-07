import os
from flask import Flask
from extensions import db
from models import Location, SurveillanceLog
from sqlalchemy import func as sql_func
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
db.init_app(app)

with app.app_context():
    query = db.session.query(
        Location.name,
        Location.fov_area_m2,
        sql_func.avg(SurveillanceLog.people_count).label('avg_count')
    ).join(SurveillanceLog, SurveillanceLog.location_id == Location.id)
    
    start_date = '2026-06-06'
    end_date = '2026-06-06'
    
    dt_start = datetime.strptime(start_date, '%Y-%m-%d')
    query = query.filter(SurveillanceLog.timestamp >= dt_start)
    
    dt_end = datetime.fromisoformat(end_date)
    if dt_end.hour == 0 and dt_end.minute == 0 and dt_end.second == 0:
        dt_end = dt_end.replace(hour=23, minute=59, second=59, microsecond=999999)
    query = query.filter(SurveillanceLog.timestamp <= dt_end)
        
    results = query.group_by(Location.id, Location.name, Location.fov_area_m2).all()
    
    density_rows = []
    for res in results:
        print(f"Location: {res.name}, fov: {res.fov_area_m2}, avg_count: {res.avg_count}")
        if res.fov_area_m2 and res.fov_area_m2 > 0:
            avg_density = float(res.avg_count) / float(res.fov_area_m2)
        else:
            avg_density = 0.0
        density_rows.append({'name': res.name, 'avg_density': avg_density})
        
    total_density = sum(r['avg_density'] for r in density_rows)
    print(f"Total density: {total_density}")
    
    if total_density > 0:
        for r in density_rows:
            if r['avg_density'] > 0:
                print(f"   {r['name']}: {r['avg_density'] / total_density * 100:.1f}%")
