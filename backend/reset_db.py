from api_server import app, db

def reset_database():
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("All tables dropped successfully.")
        
if __name__ == '__main__':
    reset_database()
