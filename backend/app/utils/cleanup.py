"""
Cleanup utilities for database maintenance

Note: MongoDB Atlas with TTL indexes automatically cleans up expired tokens.
This file is kept for potential future cleanup tasks.
"""
import logging
from datetime import datetime
import asyncio
from app.db.mongodb import get_revoked_tokens_collection

logger = logging.getLogger(__name__)


async def cleanup_expired_tokens() -> int:
    """
    Manual cleanup of expired tokens from MongoDB.
    
    Note: This is not necessary as MongoDB's TTL index automatically
    removes expired tokens. This function is provided for manual cleanup
    if needed.
    
    Returns:
        Number of tokens deleted
    """
    try:
        revoked_tokens_collection = get_revoked_tokens_collection()
        
        # Delete tokens where expires_at is in the past
        result = await revoked_tokens_collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        
        deleted_count = result.deleted_count
        logger.info(f"Manually cleaned up {deleted_count} expired tokens")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error cleaning up expired tokens: {e}")
        return 0


async def get_token_stats() -> dict:
    """
    Get statistics about revoked tokens.
    
    Returns:
        Dictionary with token statistics
    """
    try:
        revoked_tokens_collection = get_revoked_tokens_collection()
        
        total = await revoked_tokens_collection.count_documents({})
        expired = await revoked_tokens_collection.count_documents({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        active = total - expired
        
        return {
            "total_revoked": total,
            "expired": expired,
            "active": active
        }
        
    except Exception as e:
        logger.error(f"Error getting token stats: {e}")
        return {
            "total_revoked": 0,
            "expired": 0,
            "active": 0,
            "error": str(e)
        }


if __name__ == "__main__":
    # Can be run as a standalone script
    async def main():
        from app.db.mongodb import init_mongodb, close_mongodb
        
        await init_mongodb()
        
        print("\n=== Revoked Token Statistics ===")
        stats = await get_token_stats()
        print(f"Total revoked tokens: {stats['total_revoked']}")
        print(f"Expired tokens: {stats['expired']}")
        print(f"Active revoked tokens: {stats['active']}")
        
        if stats['expired'] > 0:
            print(f"\nNote: {stats['expired']} expired tokens will be automatically")
            print("removed by MongoDB's TTL index within 60 seconds.")
            
            # Manual cleanup (optional)
            response = input("\nManually cleanup expired tokens now? (y/n): ")
            if response.lower() == 'y':
                count = await cleanup_expired_tokens()
                print(f"✅ Manually cleaned up {count} expired tokens")
        
        await close_mongodb()
    
    asyncio.run(main())
