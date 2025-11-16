import mysql.connector
from mysql.connector import pooling
from app.config import settings

# Create MySQL connection pool
connection_pool = pooling.MySQLConnectionPool(
    pool_name="asked_pool",
    pool_size=20,  # Increased to handle concurrent dashboard API requests
    pool_reset_session=True,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    user=settings.DB_USER,
    password=settings.DB_PASSWORD,
    database=settings.DB_NAME
)

def get_db_connection():
    """
    Get connection from pool
    """
    try:
        connection = connection_pool.get_connection()
        return connection
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise

def get_db():
    """
    Dependency untuk FastAPI routes
    Usage: def my_route(db = Depends(get_db))
    """
    connection = get_db_connection()
    try:
        yield connection
    finally:
        connection.close()
