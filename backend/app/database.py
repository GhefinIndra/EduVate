import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from app.config import settings

# Create PostgreSQL connection pool
connection_pool = pool.SimpleConnectionPool(
    1,  # minconn
    20,  # maxconn - handle concurrent requests
    settings.DATABASE_URL
)

def get_db_connection():
    """
    Get connection from pool
    """
    try:
        connection = connection_pool.getconn()
        return connection
    except psycopg2.Error as err:
        print(f"Database connection error: {err}")
        raise

def get_dict_cursor(connection):
    """
    Helper to get dictionary cursor (like MySQL dictionary=True)
    """
    return connection.cursor(cursor_factory=RealDictCursor)

def get_db():
    """
    Dependency untuk FastAPI routes
    Usage: def my_route(db = Depends(get_db))
    """
    connection = get_db_connection()
    try:
        yield connection
    finally:
        connection_pool.putconn(connection)
