import mysql.connector
from app.core.config import settings

def create_database():
    try:
        conn = mysql.connector.connect(
            host=settings.MYSQL_SERVER,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            port=settings.MYSQL_PORT
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB}")
        print(f"Database {settings.MYSQL_DB} created successfully.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    create_database()
