from upstash_redis import Redis
from app.config import settings
import json
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

# Initialize Redis client (lazy loading)
redis_client: Optional[Redis] = None

def get_redis():
    """Get or create Redis client (singleton pattern)"""
    global redis_client
    
    if redis_client is None and settings.UPSTASH_REDIS_REST_URL and settings.CACHE_ENABLED:
        try:
            redis_client = Redis(
                url=settings.UPSTASH_REDIS_REST_URL,
                token=settings.UPSTASH_REDIS_REST_TOKEN
            )
            # Test connection
            redis_client.ping()
            logger.info("✅ Redis cache connected (Upstash - eduvate)")
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable: {e}")
            redis_client = None
    
    return redis_client

def cache_get(key: str) -> Optional[Any]:
    """
    Get cached data by key
    
    Args:
        key: Cache key (e.g., "stats:user123")
    
    Returns:
        Cached data if exists, None otherwise
    """
    if not settings.CACHE_ENABLED:
        return None
    
    client = get_redis()
    if not client:
        return None
    
    try:
        data = client.get(key)
        if data:
            logger.info(f"🎯 Cache HIT: {key}")
            return json.loads(data)
    except Exception as e:
        logger.error(f"❌ Cache get error for {key}: {e}")
    
    return None

def cache_set(key: str, value: Any, ttl: int = 300):
    """
    Set cached data with TTL
    
    Args:
        key: Cache key
        value: Data to cache (will be JSON serialized)
        ttl: Time to live in seconds (default 5 minutes)
    """
    if not settings.CACHE_ENABLED:
        return
    
    client = get_redis()
    if not client:
        return
    
    try:
        client.setex(key, ttl, json.dumps(value))
        logger.info(f"💾 Cache SET: {key} (TTL: {ttl}s)")
    except Exception as e:
        logger.error(f"❌ Cache set error for {key}: {e}")

def cache_delete(key: str):
    """
    Delete cached data by key
    
    Args:
        key: Cache key to delete
    """
    if not settings.CACHE_ENABLED:
        return
    
    client = get_redis()
    if not client:
        return
    
    try:
        client.delete(key)
        logger.info(f"🗑️ Cache DELETE: {key}")
    except Exception as e:
        logger.error(f"❌ Cache delete error for {key}: {e}")

def cache_delete_pattern(pattern: str):
    """
    Delete multiple cache keys matching a pattern
    
    Args:
        pattern: Pattern to match (e.g., "user:123:*")
    
    Note: Upstash Redis REST API doesn't support SCAN,
    so you need to track and delete keys individually
    """
    if not settings.CACHE_ENABLED:
        return
    
    logger.info(f"⚠️ Pattern delete not fully supported: {pattern}")
    # For now, delete known keys manually in invalidate functions

def invalidate_user_cache(user_id: str):
    """
    Invalidate all cache for a specific user
    
    Args:
        user_id: User ID to invalidate cache for
    """
    cache_delete(f"stats:{user_id}")
    cache_delete(f"progress:{user_id}")
    cache_delete(f"dashboard:{user_id}")
    cache_delete(f"topic_understanding:{user_id}")
    cache_delete(f"quiz_performance:{user_id}")
    cache_delete(f"xp_history:{user_id}")
    logger.info(f"🧹 Invalidated all cache for user: {user_id}")

def invalidate_topic_cache(user_id: str, topic_id: str):
    """
    Invalidate cache related to a specific topic
    
    Args:
        user_id: User ID
        topic_id: Topic ID
    """
    cache_delete(f"topic:{topic_id}")
    cache_delete(f"topic_understanding:{user_id}")
    cache_delete(f"dashboard:{user_id}")
    logger.info(f"🧹 Invalidated cache for topic: {topic_id}")

def invalidate_quiz_cache(user_id: str, quiz_id: str):
    """
    Invalidate cache related to quiz submissions
    
    Args:
        user_id: User ID
        quiz_id: Quiz ID
    """
    cache_delete(f"quiz:{quiz_id}")
    invalidate_user_cache(user_id)  # Stats affected
    logger.info(f"🧹 Invalidated cache for quiz: {quiz_id}")
