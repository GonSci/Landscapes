import os
from flask import Flask
from extensions import db
from models import Location

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
db.init_app(app)

with app.app_context():
    locs = Location.query.all()
    for loc in locs:
        print(f"Location: {loc.name}, fov_area_m2: {loc.fov_area_m2}")
