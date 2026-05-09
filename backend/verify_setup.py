import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_health_checks():
    print("==================================================")
    print("           System Health & Setup Verification      ")
    print("==================================================")
    
    all_passed = True
    
    # 1. Check Python Dependencies
    print("\n[1] Checking Core Dependencies...")
    try:
        import flask
        import flask_sqlalchemy
        import psycopg2
        import ultralytics
        print("  ✅ Core dependencies (Flask, SQLAlchemy, Psycopg2, YOLO) are installed.")
    except ImportError as e:
        print(f"  ❌ Missing dependency: {e}")
        all_passed = False

    # 2. Check Database Connection & Tables
    print("\n[2] Checking Database Status...")
    try:
        from api_server import app, db
        from models import Location, User, SurveillanceLog
        from sqlalchemy import inspect
        
        with app.app_context():
            # Check connection
            db.session.execute(db.text('SELECT 1'))
            print("  ✅ PostgreSQL Database is connected.")
            
            # Check tables
            engine = db.engine
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            expected_tables = ['locations', 'users', 'surveillance_logs']
            missing_tables = [t for t in expected_tables if t not in tables]
            
            if not missing_tables:
                print("  ✅ All required tables exist.")
                
                # Check data
                loc_count = Location.query.count()
                if loc_count > 0:
                    print(f"  ✅ Locations table is seeded with {loc_count} records.")
                else:
                    print("  ⚠️ Locations table is empty. Did you run setup_database.py?")
                    all_passed = False
            else:
                print(f"  ❌ Missing tables: {missing_tables}")
                all_passed = False
                
    except Exception as e:
        print(f"  ❌ Database check failed: {e}")
        all_passed = False

    # 3. Check YOLO Model File
    print("\n[3] Checking AI Models...")
    yolo_model_path = os.path.join(os.path.dirname(__file__), 'best.pt')
    if os.path.exists(yolo_model_path):
        print("  ✅ YOLO model (best.pt) is present.")
    else:
        print("  ❌ YOLO model (best.pt) is missing from the backend directory.")
        all_passed = False

    print("\n==================================================")
    if all_passed:
        print("🎉 ALL SYSTEMS GO! The environment is fully ready.")
    else:
        print("⚠️ SOME CHECKS FAILED. Please review the errors above.")
    print("==================================================")

if __name__ == "__main__":
    run_health_checks()
