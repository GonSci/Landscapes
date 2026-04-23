import psycopg2
from psycopg2 import sql

def create_database():
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="", # Try no password first
            host="localhost"
        )
    except psycopg2.Error as e:
        print(f"Could not connect using user 'postgres': {e}")
        try:
            # Try connecting with the current macOS username
            import getpass
            current_user = getpass.getuser()
            conn = psycopg2.connect(
                dbname="postgres",
                user=current_user,
                host="localhost"
            )
        except psycopg2.Error as e:
            print(f"Could not connect using user {current_user}: {e}")
            return
            
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='landscapes'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE DATABASE landscapes")
            print("Database 'landscapes' created.")
        else:
            print("Database 'landscapes' already exists.")
            
        # Check if user exists
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='landscapes_user'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE USER landscapes_user WITH PASSWORD 'landscapes_pass123'")
            print("User 'landscapes_user' created.")
        else:
            print("User 'landscapes_user' already exists.")
            
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE landscapes TO landscapes_user")
        print("Privileges granted.")
        
    except psycopg2.Error as e:
        print(f"Database setup error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_database()
