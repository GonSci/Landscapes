import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://landscapes_user:landscapes_pass123@localhost:5432/landscapes')

def run_migration():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("Starting migration...")
        
        # BEGIN is implicit in psycopg2 unless autocommit=True
        
        # 1. Create locations table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS locations (
                id             SERIAL PRIMARY KEY,
                name           VARCHAR(150) NOT NULL UNIQUE,
                district       VARCHAR(100) NOT NULL,
                latitude       FLOAT NOT NULL,
                longitude      FLOAT NOT NULL,
                video_filename VARCHAR(255) NOT NULL UNIQUE,
                description    TEXT,
                is_active      BOOLEAN DEFAULT FALSE
            );
        """)
        
        # 2. Seed actual footage locations
        # [name, district, lat, long, video]
        locations = [
            ('Baguio Night Market',       'Harrison Rd', 16.415, 120.596, 'night_market.mp4'),
            ('The Mansion',               'Leonard Wood', 16.414, 120.612, 'mansion.mp4'),
            ('The Mansion Entrance',      'Leonard Wood', 16.414, 120.613, 'mansion_entrance.mp4'),
            ('Baguio Cathedral',          'Session Rd',  16.412, 120.598, 'cathedral.mp4'),
            ('Melvin Jones Burnham Park', 'Burnham Park', 16.411, 120.594, 'burnham.mp4')
        ]
        
        for name, district, lat, lon, video in locations:
            cur.execute("""
                INSERT INTO locations (name, district, latitude, longitude, video_filename) 
                VALUES (%s, %s, %s, %s, %s) 
                ON CONFLICT (name) DO UPDATE SET
                    district = EXCLUDED.district,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    video_filename = EXCLUDED.video_filename;
            """, (name, district, lat, lon, video))
            
        # 3. Update surveillance_logs
        cur.execute("""
            ALTER TABLE surveillance_logs 
            ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
        """)
        
        # Backfill location_id for any existing logs (default to Night Market/ID 1 if exists)
        cur.execute("""
            UPDATE surveillance_logs SET location_id = 1 WHERE location_id IS NULL;
        """)
        
        cur.execute("""
            ALTER TABLE surveillance_logs 
            ALTER COLUMN location_id SET NOT NULL;
        """)

        cur.execute("""
            ALTER TABLE surveillance_logs 
            ADD COLUMN IF NOT EXISTS confidence_avg FLOAT;
        """)

        # 4. Create Index on timestamp
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON surveillance_logs (timestamp);
        """)
        
        conn.commit()
        print("Migration completed successfully!")
        
        # Verification
        cur.execute("SELECT id, name, video_filename FROM locations;")
        rows = cur.fetchall()
        print("\nLocations in database:")
        for row in rows:
            print(f"ID: {row[0]}, Name: {row[1]}, Video: {row[2]}")
            
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'surveillance_logs';
        """)
        columns = cur.fetchall()
        print("\nSurveillance Logs columns:")
        for col in columns:
            print(f"Column: {col[0]}, Type: {col[1]}")
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    run_migration()
