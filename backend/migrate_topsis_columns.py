#!/usr/bin/env python3
"""
Database Migration - Add TOPSIS-required columns to locations table
This script will:
1. Add missing columns (type, max_capacity, environment)
2. Populate them with template data for Baguio locations
"""

import os
from dotenv import load_dotenv
from extensions import db
from models import Location
from flask import Flask

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Baguio locations metadata
LOCATION_METADATA = {
    'Baguio Night Market': {
        'type': 'Dining & Shopping',
        'max_capacity': 150,
        'environment': 'Outdoor'
    },
    'The Mansion': {
        'type': 'Culture & History',
        'max_capacity': 200,
        'environment': 'Indoor'
    },
    'The Mansion Entrance': {
        'type': 'Culture',
        'max_capacity': 100,
        'environment': 'Outdoor'
    },
    'Baguio Cathedral': {
        'type': 'Culture & Religion',
        'max_capacity': 500,
        'environment': 'Indoor'
    },
    'Melvin Jones Burnham Park': {
        'type': 'Nature & Recreation',
        'max_capacity': 500,
        'environment': 'Outdoor'
    },
    'Mt. Cloud Bookshop': {
        'type': 'Dining & Culture',
        'max_capacity': 80,
        'environment': 'Indoor'
    },
    'Ili-Likha Arts & Village': {
        'type': 'Arts & Culture',
        'max_capacity': 120,
        'environment': 'Indoor'
    },
    'Cafe by the Ruins': {
        'type': 'Dining & Culture',
        'max_capacity': 100,
        'environment': 'Indoor'
    },
    'Gypsy Baguio by Chef Waya': {
        'type': 'Dining',
        'max_capacity': 90,
        'environment': 'Indoor'
    },
    'Baguio Orchidarium': {
        'type': 'Nature',
        'max_capacity': 150,
        'environment': 'Indoor'
    },
    'Heritage Hill': {
        'type': 'Nature & Recreation',
        'max_capacity': 300,
        'environment': 'Outdoor'
    }
}

def migrate():
    """Run migration"""
    with app.app_context():
        print("🚀 Starting TOPSIS Migration...")
        print()
        
        try:
            # Get all locations
            locations = Location.query.all()
            
            if not locations:
                print("❌ No locations found in database!")
                return False
            
            print(f"📍 Found {len(locations)} locations")
            print()
            
            updated_count = 0
            skipped_count = 0
            
            for location in locations:
                metadata = LOCATION_METADATA.get(location.name)
                
                if metadata:
                    try:
                        # Update location with metadata
                        location.type = metadata['type']
                        location.max_capacity = metadata['max_capacity']
                        location.environment = metadata['environment']
                        
                        db.session.add(location)
                        db.session.commit()
                        
                        print(f"✅ {location.name}")
                        print(f"   Type: {metadata['type']}")
                        print(f"   Capacity: {metadata['max_capacity']}")
                        print(f"   Environment: {metadata['environment']}")
                        
                        updated_count += 1
                    except Exception as e:
                        db.session.rollback()
                        print(f"❌ Failed to update {location.name}: {e}")
                        skipped_count += 1
                else:
                    print(f"⚠️  {location.name} - No metadata found (skipping)")
                    skipped_count += 1
                
                print()
            
            print("="*70)
            print("Migration Summary")
            print("="*70)
            print(f"✅ Updated: {updated_count}")
            print(f"⚠️  Skipped: {skipped_count}")
            print(f"📊 Total: {len(locations)}")
            print()
            
            if updated_count == len(locations):
                print("✅ MIGRATION SUCCESSFUL - All locations updated!")
                return True
            else:
                print(f"⚠️  PARTIAL SUCCESS - {updated_count}/{len(locations)} locations updated")
                return False
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = migrate()
    exit(0 if success else 1)
