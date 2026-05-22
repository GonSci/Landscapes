import psycopg2
import getpass
import os
import sys

# Add current directory to path so we can import from backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def setup_postgres_db():
    print("Step 1: Setting up PostgreSQL Database and User...")
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="", # Try no password first
            host="localhost"
        )
    except psycopg2.Error as e:
        print(f"  -> Could not connect using user 'postgres': {e}")
        try:
            # Try connecting with the current macOS username
            current_user = getpass.getuser()
            conn = psycopg2.connect(
                dbname="postgres",
                user=current_user,
                host="localhost"
            )
        except psycopg2.Error as e:
            print(f"  -> Could not connect using user {current_user}: {e}")
            print("  -> ERROR: Failed to connect to PostgreSQL. Is PostgreSQL running?")
            return False
            
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='landscapes'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE DATABASE landscapes")
            print("  -> Database 'landscapes' created successfully.")
        else:
            print("  -> Database 'landscapes' already exists.")
            
        # Check if user exists
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='landscapes_user'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE USER landscapes_user WITH PASSWORD 'landscapes_pass123'")
            print("  -> User 'landscapes_user' created successfully.")
        else:
            print("  -> User 'landscapes_user' already exists.")
            
        # Grant privileges
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE landscapes TO landscapes_user")
        print("  -> Privileges granted to 'landscapes_user'.")
        
    except psycopg2.Error as e:
        print(f"  -> Database setup error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
    return True

def fix_schema_permissions():
    print("Step 2: Fixing Schema Permissions...")
    try:
        current_user = getpass.getuser()
        try:
            conn = psycopg2.connect(
                dbname="landscapes",
                user=current_user,
                host="localhost"
            )
        except psycopg2.Error:
            conn = psycopg2.connect(
                dbname="landscapes",
                user="postgres",
                password="",
                host="localhost"
            )
            
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute("GRANT ALL ON SCHEMA public TO landscapes_user;")
        print("  -> Successfully granted schema permissions to landscapes_user.")
        
    except psycopg2.Error as e:
        print(f"  -> Permission setup error: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            
    return True

def create_tables():
    print("Step 3: Creating and Updating Database Tables...")
    try:
        # Import the Flask app and database instance
        from api_server import app, db
        
        with app.app_context():
            # This creates all tables defined in models.py that don't exist yet
            db.create_all()
            print("  -> Tables created/verified successfully via SQLAlchemy.")
            
            # Note: For schema updates (e.g., altered columns) on existing tables,
            # you would typically use Alembic/Flask-Migrate. For a fresh install, 
            # create_all() is sufficient to ensure complete tables.
            
    except ImportError as e:
        print(f"  -> Failed to import application modules: {e}")
        return False
    except Exception as e:
        print(f"  -> Error creating tables: {e}")
        return False
        
    return True

def update_existing_schema():
    print("Step 3.5: Checking for missing columns in existing tables...")
    try:
        from api_server import app, db
        from sqlalchemy import inspect, text
        
        with app.app_context():
            engine = db.engine
            inspector = inspect(engine)
            
            if inspector.has_table('locations'):
                columns = [col['name'] for col in inspector.get_columns('locations')]
                
                with engine.connect() as conn:
                    if 'type' not in columns:
                        conn.execute(text("ALTER TABLE locations ADD COLUMN type VARCHAR(100);"))
                        print("  -> Added 'type' column to existing locations table.")
                    
                    if 'fov_area_m2' not in columns:
                        conn.execute(text("ALTER TABLE locations ADD COLUMN fov_area_m2 FLOAT DEFAULT 100.0;"))
                        print("  -> Added 'fov_area_m2' column to existing locations table.")
                        
                    if 'environment' not in columns:
                        conn.execute(text("ALTER TABLE locations ADD COLUMN environment VARCHAR(50);"))
                        print("  -> Added 'environment' column to existing locations table.")
                    
                    conn.commit()
                print("  -> Existing schema check complete.")
            else:
                print("  -> Locations table not found (this is normal for fresh installs).")
                
    except Exception as e:
        print(f"  -> Error updating existing schema: {e}")
        # We don't return False here so the script doesn't completely halt if there's a minor inspector issue
        
    return True

def seed_database():
    print("Step 4: Seeding Database with Initial Locations...")
    try:
        from api_server import app, db
        from models import Location
        
        initial_locations = [
            {"name": "Baguio Night Market", "district": "Harrison Rd", "latitude": 16.412636778797182, "longitude": 120.59486565746745, "video_filename": "night_market.mp4", "is_active": True, "type": "Shopping & Retail", "fov_area_m2": 198.14, "environment": "Outdoor"},
            {"name": "Wright Park", "district": "Leonard Wood", "latitude": 16.415751141767018, "longitude": 120.61722329568951, "video_filename": "wright.mp4", "is_active": False, "type": "Nature & Outdoors", "fov_area_m2": 539.63, "environment": "Outdoor"},
            {"name": "The Mansion", "district": "Leonard Wood", "latitude": 16.412562788411517, "longitude": 120.62142689397253, "video_filename": "mansion_entrance.mp4", "is_active": False, "type": "Museums & Arts", "fov_area_m2": 131.06, "environment": "Outdoor"},
            {"name": "Baguio Cathedral", "district": "Session Rd", "latitude": 16.4126858216588, "longitude": 120.59866701117055, "video_filename": "cathedral.mp4", "is_active": False, "type": "Museums & Arts", "fov_area_m2": 457.50, "environment": "Indoor"},
            {"name": "Melvin Jones Burnham Park", "district": "Burnham Park", "latitude": 16.411978471957262, "longitude": 120.59591172304951, "video_filename": "burnham.mp4", "is_active": False, "type": "Nature & Outdoors", "fov_area_m2": 1481.79, "environment": "Outdoor"},
            {"name": "Mt. Cloud Bookshop", "district": "Asin Rd", "latitude": 16.415853161865124, "longitude": 120.60853416441887, "video_filename": "mt_cloud_bookshop.mp4", "is_active": False, "type": "Shopping & Retail", "fov_area_m2": None, "environment": "Indoor"},
            {"name": "Ili-Likha Arts & Village", "district": "Chuntug Rd", "latitude": 16.4138531557859, "longitude": 120.5974293481474, "video_filename": "ili_likha_arts.mp4", "is_active": False, "type": "Museums & Arts", "fov_area_m2": None, "environment": "Indoor"},
            {"name": "Cafe by the Ruins", "district": "Chuntug Rd", "latitude": 16.412952681792103, "longitude": 120.5916397052069, "video_filename": "cafe_ruins.mp4", "is_active": False, "type": "Dining & Food", "fov_area_m2": None, "environment": "Indoor"},
            {"name": "Gypsy Baguio by Chef Waya", "district": "Upper Gen. Luna", "latitude": 16.413264927701736, "longitude": 120.58258758316477, "video_filename": "gypsy_baguio.mp4", "is_active": False, "type": "Dining & Food", "fov_area_m2": None, "environment": "Indoor"},
            {"name": "Baguio Orchidarium", "district": "Leonard Wood", "latitude": 16.410979486415332, "longitude": 120.5924255500515, "video_filename": "orchidarium.mp4", "is_active": False, "type": "Nature & Outdoors", "fov_area_m2": None, "environment": "Outdoor"},
            {"name": "Heritage Hill", "district": "Bokawkan Rd", "latitude": 16.403957133004596, "longitude": 120.58665803918751, "video_filename": "heritage_hill.mp4", "is_active": False, "type": "Museums & Arts", "fov_area_m2": None, "environment": "Indoor"}
        ]
        
        with app.app_context():
            added_count = 0
            for loc_data in initial_locations:
                # Check if location already exists by name
                existing_loc = Location.query.filter_by(name=loc_data["name"]).first()
                if not existing_loc:
                    new_loc = Location(**loc_data)
                    db.session.add(new_loc)
                    added_count += 1
            
            if added_count > 0:
                db.session.commit()
                print(f"  -> Successfully added {added_count} initial locations.")
            else:
                print("  -> Locations table already has the initial data.")
                
    except Exception as e:
        print(f"  -> Error seeding database: {e}")
        return False
        
    return True

if __name__ == "__main__":
    print("==================================================")
    print("      Landscapes Database Setup & Integration     ")
    print("==================================================")
    
    if setup_postgres_db():
        if fix_schema_permissions():
            if create_tables():
                update_existing_schema()
                if seed_database():
                    print("==================================================")
                    print("SUCCESS: Database and tables are fully set up!")
                    print("You can now run the backend services.")
                    print("==================================================")
                else:
                    print("FAILED at Step 4: Database seeding.")
            else:
                print("FAILED at Step 3: Table creation.")
        else:
            print("FAILED at Step 2: Permission fix.")
    else:
        print("FAILED at Step 1: Database creation.")
