"""
MongoDB connection and management
"""
import logging
import asyncio
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Simple circuit breaker for MongoDB operations."""
    
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half-open
    
    def can_execute(self):
        if self.state == 'closed':
            return True
        elif self.state == 'open':
            if asyncio.get_event_loop().time() - self.last_failure_time > self.recovery_timeout:
                self.state = 'half-open'
                return True
            return False
        elif self.state == 'half-open':
            return True
        return False
    
    def record_success(self):
        self.failure_count = 0
        self.state = 'closed'
    
    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = asyncio.get_event_loop().time()
        if self.failure_count >= self.failure_threshold:
            self.state = 'open'


class MongoDBManager:
    """MongoDB connection manager with async support and circuit breaker."""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self._is_connected = False
        self.circuit_breaker = CircuitBreaker()
        self.connection_attempts = 0
        self.max_connection_attempts = 10

    async def connect(self) -> None:
        """Establish connection to MongoDB Atlas with circuit breaker."""
        if not self.circuit_breaker.can_execute():
            raise ConnectionError("Circuit breaker is open - MongoDB temporarily unavailable")

        try:
            if not settings.MONGO_URI:
                logger.warning("MONGO_URI not configured - MongoDB features will be disabled")
                self._is_connected = False
                return

            logger.info("Attempting to connect to MongoDB Atlas...")

            self.client = AsyncIOMotorClient(
                settings.MONGO_URI,
                serverSelectionTimeoutMS=30000,
                connectTimeoutMS=30000,
                socketTimeoutMS=45000,
                maxPoolSize=10,
                minPoolSize=2,
                maxIdleTimeMS=30000,
                retryWrites=True,
                retryReads=True,
                readPreference='primaryPreferred',
                tls=True,
                tlsAllowInvalidCertificates=False,
                heartbeatFrequencyMS=10000,
                appName='ChatBot'
            )

            # Test connection with retry
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    logger.info(f"Connection attempt {attempt + 1}/{max_retries}")
                    await self.client.admin.command('ping')
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"Connection attempt {attempt + 1} failed, retrying... {e}")
                    await asyncio.sleep(2)

            logger.info("Successfully connected to MongoDB Atlas")

            self.database = self.client.chatbot_db
            self._is_connected = True
            self.connection_attempts = 0
            self.circuit_breaker.record_success()

            await self._create_indexes()

        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self._is_connected = False
            self.connection_attempts += 1
            self.circuit_breaker.record_failure()
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            self._is_connected = False
            self.circuit_breaker.record_failure()
            raise

    async def disconnect(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
        self._is_connected = False

    async def _create_indexes(self) -> None:
        """Create necessary database indexes for performance."""
        try:
            # User collection indexes
            users_collection = self.database.users
            await users_collection.create_index("email", unique=True, name="email_unique")
            await users_collection.create_index([
                ("email", 1),
                ("is_active", 1)
            ], name="email_active")
            
            # Revoked tokens collection indexes
            revoked_tokens_collection = self.database.revoked_tokens
            await revoked_tokens_collection.create_index("token", unique=True, name="token_unique")
            await revoked_tokens_collection.create_index([
                ("token", 1),
                ("expires_at", 1)
            ], name="token_expires")
            await revoked_tokens_collection.create_index(
                "expires_at",
                expireAfterSeconds=0,
                name="token_ttl"
            )  # TTL index to auto-delete expired tokens
            
            # Message collection indexes
            messages_collection = self.database.messages
            await messages_collection.create_index([
                ("user_id", 1),
                ("session_id", 1),
                ("created_at", -1)
            ], name="user_session_created")

            await messages_collection.create_index([
                ("session_id", 1),
                ("created_at", -1)
            ], name="session_created")

            await messages_collection.create_index([
                ("content", "text"),
                ("user_id", 1)
            ], name="content_text_user")

            # Session collection indexes
            sessions_collection = self.database.sessions
            await sessions_collection.create_index([
                ("user_id", 1),
                ("last_activity", -1)
            ], name="user_last_activity")

            await sessions_collection.create_index([
                ("session_id", 1),
                ("user_id", 1)
            ], unique=True, name="session_user_unique")

            await sessions_collection.create_index([
                ("title", "text"),
                ("description", "text"),
                ("user_id", 1)
            ], name="title_description_text_user")

            logger.info("Database indexes created successfully")

        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")

    async def health_check(self) -> bool:
        """Perform a health check on the MongoDB connection."""
        if not self.circuit_breaker.can_execute():
            return False

        try:
            if self.client and self.database:
                await self.client.admin.command('ping')
                return True
            return False
        except Exception as e:
            logger.warning(f"MongoDB health check failed: {e}")
            self.circuit_breaker.record_failure()
            return False

    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._is_connected and self.circuit_breaker.state != 'open'

    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if not settings.MONGO_URI:
            raise ConnectionError("MongoDB is not configured. Please set MONGO_URI in your environment.")
        if self.database is None or not self.is_connected:
            raise ConnectionError("Database not connected or circuit breaker is open. MongoDB may be unavailable.")
        return self.database

    def get_collection(self, collection_name: str):
        """Get collection instance."""
        db = self.get_database()
        return db[collection_name]


# Global MongoDB manager instance
mongodb_manager = MongoDBManager()


async def get_mongodb_manager() -> MongoDBManager:
    """Dependency injection for MongoDB manager."""
    return mongodb_manager


async def init_mongodb():
    """Initialize MongoDB connection."""
    await mongodb_manager.connect()


async def close_mongodb():
    """Close MongoDB connection."""
    await mongodb_manager.disconnect()


# Collection helpers
def get_users_collection():
    """Get users collection."""
    return mongodb_manager.get_collection("users")


def get_revoked_tokens_collection():
    """Get revoked tokens collection."""
    return mongodb_manager.get_collection("revoked_tokens")


def get_messages_collection():
    """Get messages collection."""
    return mongodb_manager.get_collection("messages")


def get_sessions_collection():
    """Get sessions collection."""
    return mongodb_manager.get_collection("sessions")


def get_analytics_collection():
    """Get analytics collection."""
    return mongodb_manager.get_collection("analytics")
