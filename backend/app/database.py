import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from psycopg2 import OperationalError
from app.config import settings
import logging
import time

logger = logging.getLogger(__name__)

# Parse connection string to add connection parameters
# Add keepalives, timeout, and other resilience settings
connection_params = settings.DATABASE_URL

# Create PostgreSQL connection pool with better settings for Supabase
try:
    connection_pool = pool.ThreadedConnectionPool(
        minconn=2,  # Keep minimum connections alive
        maxconn=10,  # Reduced from 20 for Supabase limits (free tier: 60 connections)
        dsn=connection_params,
        # Connection health settings
        connect_timeout=10,  # Timeout after 10 seconds
        keepalives=1,  # Enable TCP keepalives
        keepalives_idle=30,  # Start keepalive after 30s idle
        keepalives_interval=10,  # Send keepalive every 10s
        keepalives_count=5,  # 5 failed keepalives = connection dead
        # Application name for debugging
        application_name='eduvate_backend'
    )
    logger.info("✅ Database connection pool initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize database pool: {e}")
    raise

def get_db_connection():
    """
    Get connection from pool with retry logic
    """
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            connection = connection_pool.getconn()

            # Test if connection is alive
            try:
                with connection.cursor() as test_cursor:
                    test_cursor.execute("SELECT 1")
                logger.debug(f"✅ Got healthy connection from pool (attempt {attempt + 1})")
                return connection
            except (OperationalError, psycopg2.InterfaceError) as e:
                # Connection is bad, close it and get a new one
                logger.warning(f"⚠️  Connection test failed, closing bad connection: {e}")
                try:
                    connection_pool.putconn(connection, close=True)
                except:
                    pass
                raise  # Trigger retry

        except (psycopg2.OperationalError, psycopg2.InterfaceError) as err:
            logger.warning(f"⚠️  Database connection attempt {attempt + 1}/{max_retries} failed: {err}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"❌ All {max_retries} connection attempts failed")
                raise Exception(f"Database connection error after {max_retries} attempts: {str(err)}")

def get_dict_cursor(connection):
    """
    Helper to get dictionary cursor (like MySQL dictionary=True)
    """
    return connection.cursor(cursor_factory=RealDictCursor)

def get_db():
    """
    Dependency untuk FastAPI routes with better error handling
    Usage: def my_route(db = Depends(get_db))
    """
    connection = None
    try:
        connection = get_db_connection()
        yield connection
    except Exception as e:
        logger.error(f"❌ Database dependency error: {e}")
        if connection:
            try:
                connection.rollback()
            except:
                pass
        raise
    finally:
        if connection:
            try:
                # Return connection to pool (don't close it)
                connection_pool.putconn(connection)
                logger.debug("✅ Connection returned to pool")
            except Exception as e:
                logger.error(f"❌ Error returning connection to pool: {e}")
