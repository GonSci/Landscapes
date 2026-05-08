#!/usr/bin/env python3
"""
Database Audit Script - Verifies TOPSIS-readiness of Landscapes database
Checks schema, data quality, and identifies missing critical columns.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import inspect, text
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes')

# Parse connection string
try:
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL)
    
    db_config = {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/'),
        'user': parsed.username,
        'password': parsed.password
    }
except Exception as e:
    print(f"❌ Error parsing DATABASE_URL: {e}")
    sys.exit(1)

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def print_table(headers, rows):
    """Print formatted table"""
    if not rows:
        print("  (No data)")
        return
    
    col_widths = [max(len(str(header)), max(len(str(row[i])) for row in rows)) for i, header in enumerate(headers)]
    
    # Header
    header_row = " | ".join(str(h).ljust(w) for h, w in zip(headers, col_widths))
    print(header_row)
    print("-" * len(header_row))
    
    # Rows
    for row in rows:
        print(" | ".join(str(val).ljust(w) for val, w in zip(row, col_widths)))

try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    print("✓ Connected to database successfully")
except Exception as e:
    print(f"❌ Failed to connect to database: {e}")
    sys.exit(1)

# ============================================================================
# 1. SCHEMA INSPECTION
# ============================================================================

print_section("1. SCHEMA INSPECTION")

print("📋 Checking 'locations' table structure:")
try:
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'locations'
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    
    if not columns:
        print("  ❌ 'locations' table does not exist!")
        sys.exit(1)
    
    headers = ['Column', 'Type', 'Nullable', 'Default']
    rows = [(col['column_name'], col['data_type'], col['is_nullable'], col['column_default'] or 'NULL') for col in columns]
    print_table(headers, rows)
    
    current_columns = {col['column_name'] for col in columns}
    print(f"\n  Total columns: {len(current_columns)}")
    
except Exception as e:
    print(f"  ❌ Error: {e}")
    sys.exit(1)

print("\n📋 Checking 'surveillance_logs' table structure:")
try:
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'surveillance_logs'
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    
    if not columns:
        print("  ❌ 'surveillance_logs' table does not exist!")
    else:
        headers = ['Column', 'Type', 'Nullable', 'Default']
        rows = [(col['column_name'], col['data_type'], col['is_nullable'], col['column_default'] or 'NULL') for col in columns]
        print_table(headers, rows)
except Exception as e:
    print(f"  ❌ Error: {e}")

# ============================================================================
# 2. CRITICAL COLUMNS CHECK
# ============================================================================

print_section("2. CRITICAL COLUMNS AUDIT FOR TOPSIS")

critical_columns = {
    'type': ('VARCHAR or TEXT', 'Place category (Dining, Nature, Shopping, Culture, etc.)'),
    'max_capacity': ('INTEGER', 'Maximum venue capacity for crowd density calculation'),
    'environment': ('VARCHAR', 'Indoor/Outdoor classification for filtering')
}

missing_columns = {}
print("🔍 Checking for TOPSIS-required columns:\n")

for col_name, (data_type, purpose) in critical_columns.items():
    if col_name in current_columns:
        print(f"  ✅ '{col_name}' - EXISTS")
        print(f"     Purpose: {purpose}")
    else:
        print(f"  ❌ '{col_name}' - MISSING")
        print(f"     Purpose: {purpose}")
        print(f"     Recommended Type: {data_type}")
        missing_columns[col_name] = data_type
    print()

if missing_columns:
    print(f"⚠️  {len(missing_columns)} critical column(s) are MISSING")
else:
    print("✅ All critical columns present")

# ============================================================================
# 3. DATA QUALITY CHECK
# ============================================================================

print_section("3. DATA QUALITY CHECK")

print("📊 Location Coordinates Validation:")
try:
    cursor.execute("""
        SELECT 
            COUNT(*) as total_locations,
            COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as null_coords,
            COUNT(CASE WHEN latitude < -90 OR latitude > 90 THEN 1 END) as invalid_lat,
            COUNT(CASE WHEN longitude < -180 OR longitude > 180 THEN 1 END) as invalid_lon
        FROM locations;
    """)
    result = cursor.fetchone()
    
    print(f"  Total locations: {result['total_locations']}")
    print(f"  Null coordinates: {result['null_coords']}")
    print(f"  Invalid latitude: {result['invalid_lat']}")
    print(f"  Invalid longitude: {result['invalid_lon']}")
    
    if result['null_coords'] > 0 or result['invalid_lat'] > 0 or result['invalid_lon'] > 0:
        print("  ⚠️  ISSUES FOUND - Details below:")
        
        cursor.execute("""
            SELECT id, name, latitude, longitude
            FROM locations
            WHERE latitude IS NULL OR longitude IS NULL 
               OR latitude < -90 OR latitude > 90
               OR longitude < -180 OR longitude > 180;
        """)
        bad_coords = cursor.fetchall()
        headers = ['ID', 'Name', 'Latitude', 'Longitude']
        rows = [(r['id'], r['name'], r['latitude'], r['longitude']) for r in bad_coords]
        print_table(headers, rows)
    else:
        print("  ✅ All coordinates are valid")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n📊 Location and SurveillanceLog Relationship:")
try:
    cursor.execute("""
        SELECT 
            COUNT(*) as total_locations,
            COUNT(CASE WHEN video_filename IS NOT NULL THEN 1 END) as with_video,
            COUNT(CASE WHEN video_filename IS NOT NULL AND l.id NOT IN (
                SELECT DISTINCT location_id FROM surveillance_logs
            ) THEN 1 END) as no_logs
        FROM locations l;
    """)
    result = cursor.fetchone()
    
    print(f"  Total locations: {result['total_locations']}")
    print(f"  Locations with video_filename: {result['with_video']}")
    print(f"  Locations with video but NO logs: {result['no_logs']}")
    
    if result['no_logs'] and result['no_logs'] > 0:
        print("\n  ⚠️  Locations with video but no logs:")
        cursor.execute("""
            SELECT l.id, l.name, l.video_filename
            FROM locations l
            WHERE l.video_filename IS NOT NULL 
              AND l.id NOT IN (SELECT DISTINCT location_id FROM surveillance_logs);
        """)
        orphans = cursor.fetchall()
        headers = ['ID', 'Name', 'Video File']
        rows = [(r['id'], r['name'], r['video_filename']) for r in orphans]
        print_table(headers, rows)
    else:
        print("  ✅ All video locations have corresponding logs")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n📊 SurveillanceLog Data Summary:")
try:
    cursor.execute("""
        SELECT 
            COUNT(*) as total_logs,
            COUNT(DISTINCT location_id) as unique_locations,
            MIN(people_count) as min_count,
            MAX(people_count) as max_count,
            ROUND(AVG(people_count)::numeric, 2) as avg_count,
            COUNT(CASE WHEN confidence_avg IS NULL THEN 1 END) as null_confidence
        FROM surveillance_logs;
    """)
    result = cursor.fetchone()
    
    print(f"  Total logs: {result['total_logs']}")
    print(f"  Unique locations covered: {result['unique_locations']}")
    if result['total_logs'] > 0:
        print(f"  People count range: {result['min_count']} - {result['max_count']}")
        print(f"  Average count: {result['avg_count']}")
        print(f"  Missing confidence values: {result['null_confidence']}")
    else:
        print("  ⚠️  No surveillance logs found yet")
except Exception as e:
    print(f"  ❌ Error: {e}")

# ============================================================================
# 4. ALL LOCATIONS INVENTORY
# ============================================================================

print_section("4. CURRENT LOCATIONS INVENTORY")

try:
    cursor.execute("""
        SELECT id, name, district, latitude, longitude, video_filename, is_active
        FROM locations
        ORDER BY id;
    """)
    locations = cursor.fetchall()
    
    if locations:
        headers = ['ID', 'Name', 'District', 'Latitude', 'Longitude', 'Video', 'Active']
        rows = [(
            l['id'], 
            l['name'], 
            l['district'],
            f"{l['latitude']:.4f}",
            f"{l['longitude']:.4f}",
            l['video_filename'][:20] + '...' if len(l['video_filename']) > 20 else l['video_filename'],
            '✓' if l['is_active'] else '✗'
        ) for l in locations]
        print_table(headers, rows)
    else:
        print("❌ No locations found in database")
except Exception as e:
    print(f"❌ Error: {e}")

cursor.close()
conn.close()

# ============================================================================
# 5. RECOMMENDATIONS & SQL COMMANDS
# ============================================================================

print_section("5. REMEDIATION & SETUP INSTRUCTIONS")

if missing_columns:
    print("🔧 MISSING COLUMNS - ALTER TABLE Commands:\n")
    print("Run these SQL commands to add critical columns:\n")
    
    alter_commands = []
    if 'type' in missing_columns:
        alter_commands.append("ALTER TABLE locations ADD COLUMN type VARCHAR(100);")
    if 'max_capacity' in missing_columns:
        alter_commands.append("ALTER TABLE locations ADD COLUMN max_capacity INTEGER DEFAULT 100;")
    if 'environment' in missing_columns:
        alter_commands.append("ALTER TABLE locations ADD COLUMN environment VARCHAR(50);")
    
    for i, cmd in enumerate(alter_commands, 1):
        print(f"{i}. {cmd}")
    
    print("\n" + "="*70)
    print("Execute in psql:")
    print("="*70)
    for cmd in alter_commands:
        print(f"  {cmd}")
else:
    print("✅ No ALTER TABLE commands needed - all columns present")

print("\n" + "="*70)
print("TEMPLATE SQL UPDATE SCRIPT FOR BAGUIO LOCATIONS")
print("="*70)
print("""
After running ALTER TABLE commands, update your locations with proper data:

-- Update Baguio Night Market
UPDATE locations 
SET type = 'Dining & Shopping', 
    max_capacity = 150,
    environment = 'Outdoor'
WHERE id = 1 AND name = 'Baguio Night Market';

-- Update The Mansion
UPDATE locations 
SET type = 'Culture & History', 
    max_capacity = 200,
    environment = 'Indoor'
WHERE id = 2 AND name = 'The Mansion';

-- Update The Mansion Entrance
UPDATE locations 
SET type = 'Culture', 
    max_capacity = 100,
    environment = 'Outdoor'
WHERE id = 3 AND name = 'The Mansion Entrance';

-- Update Baguio Cathedral
UPDATE locations 
SET type = 'Culture & Religion', 
    max_capacity = 500,
    environment = 'Indoor'
WHERE id = 4 AND name = 'Baguio Cathedral';

-- Update Melvin Jones Burnham Park
UPDATE locations 
SET type = 'Nature & Recreation', 
    max_capacity = 500,
    environment = 'Outdoor'
WHERE id = 5 AND name = 'Melvin Jones Burnham Park';

-- VERIFY: Check the updates
SELECT id, name, type, max_capacity, environment FROM locations;
""")

print("\n" + "="*70)
print("DEPLOYMENT CHECKLIST FOR TOPSIS-READINESS")
print("="*70)
print("""
□ 1. Run ALTER TABLE commands to add missing columns
□ 2. Execute UPDATE statements to populate location metadata
□ 3. Verify coordinates are within valid bounds (done automatically above)
□ 4. Ensure SurveillanceLog table has recent entries from vision_worker
□ 5. Test TOPSIS endpoint: POST /api/redirection
□ 6. Monitor logs for [API] prefix messages

All checks complete! ✓
""")

print("\n")
