import psycopg2

def fix_permissions():
    try:
        # Try connecting with the current macOS username first as superuser
        import getpass
        current_user = getpass.getuser()
        try:
            conn = psycopg2.connect(
                dbname="landscapes",
                user=current_user,
                host="localhost"
            )
        except psycopg2.Error:
            # Fallback to postgres
            conn = psycopg2.connect(
                dbname="landscapes",
                user="postgres",
                password="",
                host="localhost"
            )
            
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute("GRANT ALL ON SCHEMA public TO landscapes_user;")
        print("Successfully granted schema permissions to landscapes_user!")
        
    except psycopg2.Error as e:
        print(f"Database setup error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_permissions()
