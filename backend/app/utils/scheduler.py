"""
Background scheduler for periodic tasks using APScheduler
"""
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class BackgroundScheduler:
    """Background task scheduler for memory maintenance and other periodic jobs."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._is_started = False
    
    def start(self):
        """Start the scheduler."""
        if not self._is_started:
            self.scheduler.start()
            self._is_started = True
            logger.info("Background scheduler started")
    
    def shutdown(self):
        """Shutdown the scheduler."""
        if self._is_started:
            self.scheduler.shutdown()
            self._is_started = False
            logger.info("Background scheduler shutdown")
    
    def add_job(self, func, trigger, **kwargs):
        """Add a job to the scheduler."""
        return self.scheduler.add_job(func, trigger, **kwargs)
    
    async def run_memory_decay(self):
        """
        Periodic task: Apply temporal decay to stale memories.
        Runs daily at 3 AM.
        """
        try:
            from app.services.memory_service import memory_service
            from app.db.mongodb import mongodb_manager
            
            logger.info("Starting scheduled memory decay task...")
            
            # Get all unique user IDs
            db = mongodb_manager.get_database()
            users_collection = db["users"]
            
            cursor = users_collection.find({}, {"_id": 1})
            user_ids = [str(doc["_id"]) async for doc in cursor]
            
            total_decayed = 0
            for user_id in user_ids:
                count = await memory_service.decay_memories(user_id, decay_rate=0.01)
                total_decayed += count
            
            logger.info(
                f"Memory decay task completed. "
                f"Processed {len(user_ids)} users, decayed {total_decayed} memories"
            )
            
        except Exception as e:
            logger.error(f"Memory decay task failed: {e}")
    
    async def run_memory_cleanup(self):
        """
        Periodic task: Clean up memories for users approaching limits.
        Runs weekly on Sunday at 4 AM.
        """
        try:
            from app.services.memory_service import memory_service
            from app.db.mongodb import mongodb_manager
            
            logger.info("Starting scheduled memory cleanup task...")
            
            # Find users with > 800 memories (approaching soft limit)
            db = mongodb_manager.get_database()
            user_memories_collection = db["user_memories"]
            
            pipeline = [
                {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gte": 800}}}
            ]
            
            cursor = user_memories_collection.aggregate(pipeline)
            users_over_limit = []
            async for doc in cursor:
                users_over_limit.append({
                    "user_id": doc["_id"],
                    "count": doc["count"]
                })
            
            total_cleaned = 0
            for user_info in users_over_limit:
                user_id = user_info["user_id"]
                count = user_info["count"]
                
                logger.info(f"Cleaning up memories for user {user_id} ({count} memories)")
                deleted = await memory_service.cleanup_old_memories(
                    user_id,
                    keep_count=700,  # Keep top 700 most relevant
                    min_importance=0.5  # Always keep important memories
                )
                total_cleaned += deleted
            
            logger.info(
                f"Memory cleanup task completed. "
                f"Processed {len(users_over_limit)} users, cleaned {total_cleaned} memories"
            )
            
        except Exception as e:
            logger.error(f"Memory cleanup task failed: {e}")
    
    async def run_conflict_detection(self):
        """
        Phase 4: Periodic task to detect contradicting memories.
        Runs weekly on Monday at 2 AM.
        """
        try:
            from app.services.memory_service import memory_service
            from app.db.mongodb import mongodb_manager
            
            logger.info("Starting scheduled conflict detection task...")
            
            # Get all unique user IDs
            db = mongodb_manager.get_database()
            users_collection = db["users"]
            
            cursor = users_collection.find({}, {"_id": 1})
            user_ids = [str(doc["_id"]) async for doc in cursor]
            
            total_conflicts = 0
            for user_id in user_ids:
                conflicts = await memory_service.detect_conflicts(user_id)
                total_conflicts += len(conflicts)
            
            logger.info(
                f"Conflict detection task completed. "
                f"Processed {len(user_ids)} users, found {total_conflicts} conflicts"
            )
            
        except Exception as e:
            logger.error(f"Conflict detection task failed: {e}")
    
    async def run_expiration_classification(self):
        """
        Phase 4: Periodic task to classify memory expiration types.
        Runs monthly on the 1st at 1 AM.
        """
        try:
            from app.services.memory_service import memory_service
            from app.db.mongodb import mongodb_manager
            
            logger.info("Starting scheduled expiration classification task...")
            
            # Get all unique user IDs
            db = mongodb_manager.get_database()
            users_collection = db["users"]
            
            cursor = users_collection.find({}, {"_id": 1})
            user_ids = [str(doc["_id"]) async for doc in cursor]
            
            total_classified = {"temporary": 0, "seasonal": 0, "permanent": 0}
            for user_id in user_ids:
                result = await memory_service.classify_expiration_type(user_id)
                for key in total_classified:
                    total_classified[key] += result.get(key, 0)
            
            logger.info(
                f"Expiration classification task completed. "
                f"Processed {len(user_ids)} users, classified {sum(total_classified.values())} memories: "
                f"{total_classified}"
            )
            
        except Exception as e:
            logger.error(f"Expiration classification task failed: {e}")
    
    def schedule_memory_maintenance(self):
        """Schedule all memory maintenance tasks."""
        # Daily decay at 3 AM
        self.add_job(
            self.run_memory_decay,
            CronTrigger(hour=3, minute=0),
            id="memory_decay",
            name="Daily Memory Decay",
            replace_existing=True
        )
        logger.info("Scheduled daily memory decay task (3 AM)")
        
        # Weekly cleanup on Sunday at 4 AM
        self.add_job(
            self.run_memory_cleanup,
            CronTrigger(day_of_week='sun', hour=4, minute=0),
            id="memory_cleanup",
            name="Weekly Memory Cleanup",
            replace_existing=True
        )
        logger.info("Scheduled weekly memory cleanup task (Sunday 4 AM)")
        
        # Phase 4: Weekly conflict detection on Monday at 2 AM
        self.add_job(
            self.run_conflict_detection,
            CronTrigger(day_of_week='mon', hour=2, minute=0),
            id="conflict_detection",
            name="Weekly Conflict Detection",
            replace_existing=True
        )
        logger.info("Scheduled weekly conflict detection task (Monday 2 AM)")
        
        # Phase 4: Monthly expiration classification on 1st at 1 AM
        self.add_job(
            self.run_expiration_classification,
            CronTrigger(day=1, hour=1, minute=0),
            id="expiration_classification",
            name="Monthly Expiration Classification",
            replace_existing=True
        )
        logger.info("Scheduled monthly expiration classification task (1st of month, 1 AM)")


# Global scheduler instance
background_scheduler = BackgroundScheduler()


def get_scheduler() -> BackgroundScheduler:
    """Get global scheduler instance."""
    return background_scheduler
