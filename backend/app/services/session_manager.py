import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import asyncio
import time

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import (
    ConnectionFailure, 
    ServerSelectionTimeoutError, 
    NetworkTimeout, 
    DuplicateKeyError, 
    OperationFailure
)

from app.db.mongodb import get_messages_collection, get_sessions_collection, get_analytics_collection, CircuitBreaker
from app.models.mongo_models import (
    SessionDocument, MessageDocument, ConversationAnalytics, UserAnalytics,
    SessionCreateRequest, SessionUpdateRequest, MessageSearchRequest, SessionSearchRequest
)
from app.utils.exceptions import (
    DatabaseConnectionError, 
    DatabaseTimeoutError, 
    DatabaseValidationError, 
    DatabaseDuplicateError,
    DatabaseError,
    SessionNotFoundError,
    MessageValidationError
)

logger = logging.getLogger(__name__)

# Performance logging decorator
def log_performance(operation_name: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = (time.time() - start_time) * 1000
                logger.info(f"PERF: {operation_name} completed in {duration:.2f}ms")
                return result
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                logger.warning(f"PERF: {operation_name} failed after {duration:.2f}ms - {str(e)}")
                raise
        return wrapper
    return decorator


class SessionManager:
    """Advanced session management service with MongoDB backend."""

    def __init__(self):
        self._messages_collection = None
        self._sessions_collection = None
        self._analytics_collection = None
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60)

    async def cleanup(self):
        """Cleanup resources and close active cursors."""
        # Clear cached collections to allow fresh connections
        self._messages_collection = None
        self._sessions_collection = None
        self._analytics_collection = None

    async def _execute_with_circuit_breaker(self, operation, *args, **kwargs):
        """Execute MongoDB operation with circuit breaker protection."""
        if not self.circuit_breaker.can_execute():
            raise DatabaseConnectionError("Circuit breaker is open - MongoDB temporarily unavailable")
        
        try:
            result = await operation(*args, **kwargs)
            self.circuit_breaker.record_success()
            return result
        except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout) as e:
            self.circuit_breaker.record_failure()
            logger.error(f"MongoDB operation failed, circuit breaker updated: {e}")
            raise DatabaseConnectionError(f"Database connection error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in MongoDB operation: {e}")
            raise

    @property
    def messages_collection(self):
        if self._messages_collection is None:
            from app.db.mongodb import get_messages_collection
            self._messages_collection = get_messages_collection()
        return self._messages_collection

    @property
    def sessions_collection(self):
        if self._sessions_collection is None:
            from app.db.mongodb import get_sessions_collection
            self._sessions_collection = get_sessions_collection()
        return self._sessions_collection

    @property
    def analytics_collection(self):
        if self._analytics_collection is None:
            from app.db.mongodb import get_analytics_collection
            self._analytics_collection = get_analytics_collection()
        return self._analytics_collection

    @property
    def db(self):
        """Get MongoDB database instance."""
        from app.db.mongodb import mongodb_manager
        return mongodb_manager.get_database()

    @log_performance("create_session")
    async def create_session(self, user_id: str, request: SessionCreateRequest) -> SessionDocument:
        """Create a new conversation session."""
        import uuid

        session_id = str(uuid.uuid4())

        # Generate title if not provided
        if not request.title:
            request.title = f"Conversation {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

        session_doc = SessionDocument(
            user_id=user_id,
            session_id=session_id,
            title=request.title,
            category=request.category,
            tags=request.tags,
            status="active",
            message_count=0,
            user_message_count=0,
            assistant_message_count=0,
            total_tokens=0,
            last_activity=datetime.utcnow()
        )

        try:
            # Insert into database
            # Exclude None values (especially _id) so MongoDB will generate ObjectId
            result = await self.sessions_collection.insert_one(
                session_doc.model_dump(by_alias=True, exclude_none=True)
            )

            # Verify insertion was successful
            if not result.acknowledged:
                raise DatabaseError("Database insertion was not acknowledged")

            # inserted_id may be None in some rare cases; assign only if present
            if getattr(result, 'inserted_id', None) is not None:
                # Assign as string to match model validator
                session_doc.id = str(result.inserted_id)

            logger.info(f"Created new session {session_id} for user {user_id}")
            return session_doc

        except ConnectionFailure as e:
            logger.error(f"Database connection failed while creating session {session_id} for user {user_id}: {e}")
            raise DatabaseConnectionError(f"Failed to connect to database: {str(e)}")
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            logger.error(f"Database timeout while creating session {session_id} for user {user_id}: {e}")
            raise DatabaseTimeoutError(f"Database operation timed out: {str(e)}")
        except DuplicateKeyError as e:
            logger.error(f"Duplicate session ID {session_id} for user {user_id}: {e}")
            raise DatabaseDuplicateError(f"Session ID conflict: {str(e)}")
        except OperationFailure as e:
            logger.error(f"Validation error while creating session {session_id} for user {user_id}: {e}")
            raise DatabaseValidationError(f"Invalid session data: {str(e)}")
        except OperationFailure as e:
            logger.error(f"Database operation failed while creating session {session_id} for user {user_id}: {e}")
            raise DatabaseError(f"Database operation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error while creating session {session_id} for user {user_id}: {e}")
            raise DatabaseError(f"Failed to create session: {str(e)}")

    @log_performance("get_session")
    async def get_session(self, user_id: str, session_id: str) -> Optional[SessionDocument]:
        """Get a session by ID."""
        try:
            doc = await self.sessions_collection.find_one({
                "user_id": user_id,
                "session_id": session_id
            })

            if doc:
                return SessionDocument(**doc)
            return None

        except ConnectionFailure as e:
            logger.error(f"Database connection failed while getting session {session_id} for user {user_id}: {e}")
            raise DatabaseConnectionError(f"Failed to connect to database: {str(e)}")
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            logger.error(f"Database timeout while getting session {session_id} for user {user_id}: {e}")
            raise DatabaseTimeoutError(f"Database operation timed out: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error while getting session {session_id} for user {user_id}: {e}")
            raise DatabaseError(f"Failed to retrieve session: {str(e)}")

    async def update_session(self, user_id: str, session_id: str, request: SessionUpdateRequest) -> bool:
        """Update session metadata."""
        # Validate session exists
        session = await self.get_session(user_id, session_id)
        if not session:
            logger.warning(f"Attempted to update non-existent session {session_id} for user {user_id}")
            return False

        update_data = {}

        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.category is not None:
            update_data["category"] = request.category
        if request.tags is not None:
            update_data["tags"] = request.tags
        if request.is_pinned is not None:
            update_data["is_pinned"] = request.is_pinned
        if request.is_favorite is not None:
            update_data["is_favorite"] = request.is_favorite
        if request.status is not None:
            update_data["status"] = request.status

        if update_data:
            update_data["updated_at"] = datetime.utcnow()

            result = await self.sessions_collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {"$set": update_data}
            )

            success = result.modified_count > 0
            if success:
                logger.info(f"Updated session {session_id} for user {user_id}")
            return success

        return False

    async def delete_session(self, user_id: str, session_id: str) -> bool:
        """Delete a session and all its messages."""
        # First validate session exists
        try:
            session = await self.get_session(user_id, session_id)
            if not session:
                return False
        except (DatabaseConnectionError, DatabaseTimeoutError, DatabaseError):
            # Re-raise database errors as-is
            raise
        except Exception as e:
            logger.error(f"Error validating session {session_id} for deletion by user {user_id}: {e}")
            raise DatabaseError(f"Failed to validate session for deletion: {str(e)}")

        try:
            # Delete all messages in the session first (safer order)
            messages_result = await self.messages_collection.delete_many({
                "user_id": user_id,
                "session_id": session_id
            })

            # Only delete session document if message deletion succeeded
            session_result = await self.sessions_collection.delete_one({
                "user_id": user_id,
                "session_id": session_id
            })

            success = session_result.deleted_count > 0
            if success:
                logger.info(f"Deleted session {session_id} and {messages_result.deleted_count} messages for user {user_id}")
            else:
                # If session deletion failed but messages were deleted, this is a serious inconsistency
                logger.error(f"CRITICAL: Messages deleted but session {session_id} deletion failed for user {user_id}")
                # In a production system, this would require manual intervention or a recovery mechanism
                raise DatabaseError("Session deletion failed after messages were removed")

            return success

        except ConnectionFailure as e:
            logger.error(f"Database connection failed during session deletion for {session_id}, user {user_id}: {e}")
            raise DatabaseConnectionError(f"Failed to connect to database: {str(e)}")
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            logger.error(f"Database timeout during session deletion for {session_id}, user {user_id}: {e}")
            raise DatabaseTimeoutError(f"Database operation timed out: {str(e)}")
        except OperationFailure as e:
            logger.error(f"Database operation failed during session deletion for {session_id}, user {user_id}: {e}")
            raise DatabaseError(f"Database operation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during session deletion for {session_id}, user {user_id}: {e}")
            raise DatabaseError(f"Failed to delete session: {str(e)}")

    async def archive_session(self, user_id: str, session_id: str) -> bool:
        """Archive a session."""
        result = await self.sessions_collection.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$set": {"status": "archived", "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def tag_session(self, user_id: str, session_id: str, tag: str) -> bool:
        """Add a tag to a session (idempotent).

        Returns True if the session was updated (tag added), False otherwise.
        """
        if not tag:
            return False

        # Validate session exists
        session = await self.get_session(user_id, session_id)
        if not session:
            logger.warning(f"Attempted to tag non-existent session {session_id} for user {user_id}")
            return False

        result = await self.sessions_collection.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$addToSet": {"tags": tag}, "$set": {"updated_at": datetime.utcnow()}}
        )

        success = result.modified_count > 0
        if success:
            logger.info(f"Added tag '{tag}' to session {session_id} for user {user_id}")
        return success

    async def untag_session(self, user_id: str, session_id: str, tag: str) -> bool:
        """Remove a tag from a session.

        Returns True if the session was updated (tag removed), False otherwise.
        """
        if not tag:
            return False

        # Validate session exists
        session = await self.get_session(user_id, session_id)
        if not session:
            logger.warning(f"Attempted to untag non-existent session {session_id} for user {user_id}")
            return False

        result = await self.sessions_collection.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$pull": {"tags": tag}, "$set": {"updated_at": datetime.utcnow()}}
        )

        success = result.modified_count > 0
        if success:
            logger.info(f"Removed tag '{tag}' from session {session_id} for user {user_id}")
        return success

    @log_performance("add_message")
    async def add_message(self, message: MessageDocument) -> str:
        """Add a message to a session and update session statistics."""
        # Validate message data
        if not message.content or not message.content.strip():
            raise MessageValidationError("Message content cannot be empty")

        if len(message.content) > 100000:  # 100KB limit
            raise MessageValidationError("Message content exceeds maximum length (100KB)")

        if message.role not in ["user", "assistant", "system"]:
            raise MessageValidationError(f"Invalid message role: {message.role}")

        # Validate that the session exists before adding message
        try:
            session = await self.get_session(message.user_id, message.session_id)
            if not session:
                raise SessionNotFoundError(message.session_id)
        except (DatabaseConnectionError, DatabaseTimeoutError, DatabaseError):
            # Re-raise database errors as-is
            raise
        except Exception as e:
            logger.error(f"Error validating session {message.session_id} for user {message.user_id}: {e}")
            raise DatabaseError(f"Failed to validate session: {str(e)}")

        try:
            # Insert message
            # Exclude None values to avoid sending _id: None
            result = await self.messages_collection.insert_one(
                message.model_dump(by_alias=True, exclude_none=True)
            )

            if not result.acknowledged:
                raise DatabaseError("Message insertion was not acknowledged")

            message_id = str(result.inserted_id)

            # Update session statistics (this may fail but message is already stored)
            try:
                await self._update_session_stats(message.user_id, message.session_id)
            except Exception as stats_error:
                logger.warning(f"Failed to update session stats for {message.session_id}, but message was stored: {stats_error}")
                # Don't fail the entire operation for stats update failure

            logger.info(f"Added message {message_id} to session {message.session_id}")
            return message_id

        except ConnectionFailure as e:
            logger.error(f"Database connection failed while adding message to session {message.session_id}: {e}")
            raise DatabaseConnectionError(f"Failed to connect to database: {str(e)}")
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            logger.error(f"Database timeout while adding message to session {message.session_id}: {e}")
            raise DatabaseTimeoutError(f"Database operation timed out: {str(e)}")
        except DuplicateKeyError as e:
            logger.error(f"Duplicate message ID in session {message.session_id}: {e}")
            raise DatabaseDuplicateError(f"Message ID conflict: {str(e)}")
        except OperationFailure as e:
            logger.error(f"Validation error while adding message to session {message.session_id}: {e}")
            raise DatabaseValidationError(f"Invalid message data: {str(e)}")
        except OperationFailure as e:
            logger.error(f"Database operation failed while adding message to session {message.session_id}: {e}")
            raise DatabaseError(f"Database operation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error while adding message to session {message.session_id}: {e}")
            raise DatabaseError(f"Failed to add message: {str(e)}")

    @log_performance("get_messages")
    async def get_messages(self, user_id: str, session_id: str, limit: int = 50, skip: int = 0) -> List[MessageDocument]:
        """Get messages for a session."""
        cursor = self.messages_collection.find(
            {"user_id": user_id, "session_id": session_id}
        ).sort("created_at", 1).skip(skip).limit(limit)

        # Track cursor for cleanup

        try:
            messages = []
            async for doc in cursor:
                messages.append(MessageDocument(**doc))
            return messages
        finally:
            # Always remove from active cursors and close
            try:
                await cursor.close()
            except Exception:
                pass  # Cursor might already be closed

    async def get_recent_messages(self, user_id: str, session_id: str, limit: int = 10) -> List[MessageDocument]:
        """Get recent messages for context (most recent first)."""
        cursor = self.messages_collection.find(
            {"user_id": user_id, "session_id": session_id}
        ).sort("created_at", -1).limit(limit)

        # Track cursor for cleanup

        try:
            messages = []
            async for doc in cursor:
                messages.append(MessageDocument(**doc))

            # Reverse to get chronological order
            return list(reversed(messages))
        finally:
            # Always remove from active cursors and close
            try:
                await cursor.close()
            except Exception:
                pass  # Cursor might already be closed

    async def search_messages(self, user_id: str, request: MessageSearchRequest) -> List[MessageDocument]:
        """Search messages with advanced filtering."""
        query = {"user_id": user_id}

        if request.session_id:
            query["session_id"] = request.session_id

        if request.date_from or request.date_to:
            date_query = {}
            if request.date_from:
                date_query["$gte"] = request.date_from
            if request.date_to:
                date_query["$lte"] = request.date_to
            query["created_at"] = date_query

        # Text search
        if request.query:
            query["$text"] = {"$search": request.query}

        cursor = self.messages_collection.find(query).sort("created_at", -1).skip(request.skip).limit(request.limit)

        # Track cursor for cleanup

        try:
            messages = []
            async for doc in cursor:
                messages.append(MessageDocument(**doc))
            return messages
        finally:
            # Always remove from active cursors and close
            try:
                await cursor.close()
            except Exception:
                pass  # Cursor might already be closed

    async def get_user_sessions_with_content_search(
        self, 
        user_id: str, 
        request: SessionSearchRequest,
        search_mode: str = "all",
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[SessionDocument]:
        """Get user's sessions with advanced search including content search."""
        try:
            query = {"user_id": user_id}

            if request.status:
                query["status"] = request.status

            if request.category:
                query["category"] = request.category

            if request.tags:
                query["tags"] = {"$in": request.tags}

            if request.is_pinned is not None:
                query["is_pinned"] = request.is_pinned

            if request.is_favorite is not None:
                query["is_favorite"] = request.is_favorite

            # Date filtering
            if date_from or date_to:
                date_query = {}
                if date_from:
                    date_query["$gte"] = date_from
                if date_to:
                    date_query["$lte"] = date_to
                query["last_activity" if not request.query else "$or"] = date_query

            # Text search
            if request.query:
                search_term = request.query.strip()
                # Escape special regex characters to prevent injection
                escaped_search_term = re.escape(search_term)
                if search_mode == "title":
                    # Search only in session titles
                    query["title"] = {"$regex": escaped_search_term, "$options": "i"}
                elif search_mode == "content":
                    # Search only in message content - need to find sessions that have messages matching the query
                    # This requires a more complex aggregation pipeline
                    return await self._search_sessions_by_content(user_id, escaped_search_term, request, date_from, date_to)
                else:  # "all" - search both title and content
                    # First try title search
                    title_query = query.copy()
                    title_query["title"] = {"$regex": escaped_search_term, "$options": "i"}
                    
                    # Then try content search
                    content_sessions = await self._search_sessions_by_content(user_id, search_term, request, date_from, date_to)
                    
                    # Get title matches
                    title_cursor = self.sessions_collection.find(title_query).sort(request.sort_by, -1 if request.sort_order == "desc" else 1).skip(request.skip).limit(request.limit)

                    try:
                        title_sessions = []
                        async for doc in title_cursor:
                            title_sessions.append(SessionDocument(**doc))
                    finally:
                        try:
                            await title_cursor.close()
                        except Exception:
                            pass
                    
                    # Combine and deduplicate
                    all_sessions = title_sessions.copy()
                    title_session_ids = {s.session_id for s in title_sessions}
                    
                    for session in content_sessions:
                        if session.session_id not in title_session_ids:
                            all_sessions.append(session)
                    
                    # Sort combined results
                    all_sessions.sort(key=lambda s: getattr(s, request.sort_by), reverse=(request.sort_order == "desc"))
                    return all_sessions[:request.limit]

            # Sorting
            sort_field = request.sort_by
            sort_order = -1 if request.sort_order == "desc" else 1

            cursor = self.sessions_collection.find(query).sort(sort_field, sort_order).skip(request.skip).limit(request.limit)

            try:
                sessions = []
                async for doc in cursor:
                    sessions.append(SessionDocument(**doc))
                return sessions
            finally:
                try:
                    await cursor.close()
                except Exception:
                    pass
        
        except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout) as e:
            logger.error(f"Database connection error while getting sessions for user {user_id}: {e}")
            raise DatabaseConnectionError(f"Unable to connect to database. Please try again later.")
        except Exception as e:
            logger.error(f"Unexpected error while getting sessions for user {user_id}: {e}")
            raise DatabaseError(f"Failed to retrieve sessions: {str(e)}")

    async def _search_sessions_by_content(
        self, 
        user_id: str, 
        search_term: str, 
        request: SessionSearchRequest,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[SessionDocument]:
        """Search sessions by message content."""
        # Build message search query - search_term is already escaped by caller
        message_query = {"user_id": user_id, "content": {"$regex": search_term, "$options": "i"}}
        
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            message_query["created_at"] = date_query

        # Find sessions that have messages matching the search
        pipeline = [
            {"$match": message_query},
            {"$group": {"_id": "$session_id"}},
            {"$project": {"session_id": "$_id"}}
        ]

        # Use aggregation cursor
        agg_cursor = self.messages_collection.aggregate(pipeline)

        try:
            matching_sessions = await agg_cursor.to_list(length=None)
            session_ids = [doc["session_id"] for doc in matching_sessions]
        finally:
            try:
                await agg_cursor.close()
            except Exception:
                pass

        if not session_ids:
            return []

        # Now get the actual session documents
        session_query = {"user_id": user_id, "session_id": {"$in": session_ids}}
        
        # Apply additional session filters
        if request.status:
            session_query["status"] = request.status
        if request.category:
            session_query["category"] = request.category
        if request.tags:
            session_query["tags"] = {"$in": request.tags}
        if request.is_pinned is not None:
            session_query["is_pinned"] = request.is_pinned
        if request.is_favorite is not None:
            session_query["is_favorite"] = request.is_favorite

        cursor = self.sessions_collection.find(session_query).sort(request.sort_by, -1 if request.sort_order == "desc" else 1).skip(request.skip).limit(request.limit)

        try:
            sessions = []
            async for doc in cursor:
                sessions.append(SessionDocument(**doc))
            return sessions
        finally:
            try:
                await cursor.close()
            except Exception:
                pass

    async def generate_session_title(self, user_id: str, session_id: str) -> Optional[str]:
        """Generate an intelligent title for a session based on its content."""
        # Get first few messages
        messages = await self.get_messages(user_id, session_id, limit=5)

        if not messages:
            return None

        # Extract key topics from first user message
        first_user_message = next((msg for msg in messages if msg.role == "user"), None)
        if not first_user_message:
            return None

        content = first_user_message.content[:200]  # First 200 chars

        # Simple title generation logic
        if "code" in content.lower() or "function" in content.lower() or "programming" in content.lower():
            return "Coding Discussion"
        elif "help" in content.lower() or "how" in content.lower():
            return "Help & Support"
        elif "write" in content.lower() or "article" in content.lower():
            return "Writing Assistance"
        elif "analyze" in content.lower() or "analysis" in content.lower():
            return "Data Analysis"
        else:
            # Extract first meaningful sentence
            sentences = re.split(r'[.!?]+', content.strip())
            if sentences:
                title = sentences[0].strip()[:50]
                return title if len(title) > 10 else f"Conversation about {title}"

        return None

    async def get_session_summary(self, user_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive session summary with analytics."""
        session = await self.get_session(user_id, session_id)
        if not session:
            return None

        # Get message statistics
        pipeline = [
            {"$match": {"user_id": user_id, "session_id": session_id}},
            {"$group": {
                "_id": None,
                "total_messages": {"$sum": 1},
                "user_messages": {"$sum": {"$cond": [{"$eq": ["$role", "user"]}, 1, 0]}},
                "assistant_messages": {"$sum": {"$cond": [{"$eq": ["$role", "assistant"]}, 1, 0]}},
                "total_tokens": {"$sum": {"$ifNull": ["$token_count", 0]}},
                "first_message": {"$min": "$created_at"},
                "last_message": {"$max": "$created_at"}
            }}
        ]

        agg_cursor = self.messages_collection.aggregate(pipeline)

        try:
            stats_result = await agg_cursor.to_list(length=1)
        finally:
            try:
                await agg_cursor.close()
            except Exception:
                pass

        if stats_result:
            stats = stats_result[0]
            return {
                "session_id": session_id,
                "title": session.title,
                "description": session.description,
                "category": session.category,
                "tags": session.tags,
                "status": session.status,
                "message_count": stats["total_messages"],
                "user_messages": stats["user_messages"],
                "assistant_messages": stats["assistant_messages"],
                "total_tokens": stats["total_tokens"],
                "first_message_at": stats["first_message"].isoformat(),
                "last_message_at": stats["last_message"].isoformat(),
                "created_at": session.created_at.isoformat(),
                "key_topics": session.key_topics,
                "sentiment_score": session.sentiment_score
            }

        return None

    async def get_user_analytics(self, user_id: str) -> UserAnalytics:
        """Get comprehensive user analytics."""
        # Get session statistics
        sessions_pipeline = [
            {"$match": {"user_id": user_id, "status": "active"}},
            {"$group": {
                "_id": None,
                "total_sessions": {"$sum": 1},
                "total_messages": {"$sum": "$message_count"},
                "total_tokens": {"$sum": "$total_tokens"}
            }}
        ]

        sessions_agg = self.sessions_collection.aggregate(sessions_pipeline)

        try:
            sessions_stats = await sessions_agg.to_list(length=1)
        finally:
            try:
                await sessions_agg.close()
            except Exception:
                pass

        # Get message statistics
        messages_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$model_used",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]

        messages_agg = self.messages_collection.aggregate(messages_pipeline)

        try:
            model_stats = await messages_agg.to_list(length=None)
        finally:
            try:
                await messages_agg.close()
            except Exception:
                pass

        # Calculate analytics
        total_sessions = sessions_stats[0]["total_sessions"] if sessions_stats else 0
        total_messages = sessions_stats[0]["total_messages"] if sessions_stats else 0
        total_tokens = sessions_stats[0]["total_tokens"] if sessions_stats else 0

        preferred_models = [stat["_id"] for stat in model_stats if stat["_id"]] if model_stats else []

        return UserAnalytics(
            user_id=user_id,
            total_sessions=total_sessions,
            total_messages=total_messages,
            total_tokens=total_tokens,
            preferred_models=preferred_models
        )

    async def _update_session_stats(self, user_id: str, session_id: str) -> None:
        """Update session statistics after adding a message."""
        # Use atomic operations to prevent race conditions
        # First, get current stats atomically
        session = await self.get_session(user_id, session_id)
        if not session:
            logger.warning(f"Cannot update stats for non-existent session {session_id}")
            return

        # Get fresh message statistics
        pipeline = [
            {"$match": {"user_id": user_id, "session_id": session_id}},
            {"$group": {
                "_id": None,
                "message_count": {"$sum": 1},
                "user_message_count": {"$sum": {"$cond": [{"$eq": ["$role", "user"]}, 1, 0]}},
                "assistant_message_count": {"$sum": {"$cond": [{"$eq": ["$role", "assistant"]}, 1, 0]}},
                "total_tokens": {"$sum": {"$ifNull": ["$token_count", 0]}},
                "last_activity": {"$max": "$created_at"}
            }}
        ]

        stats_agg = self.messages_collection.aggregate(pipeline)

        try:
            stats_result = await stats_agg.to_list(length=1)
        finally:
            try:
                await stats_agg.close()
            except Exception:
                pass

        if stats_result:
            stats = stats_result[0]
            update_data = {
                "message_count": stats["message_count"],
                "user_message_count": stats["user_message_count"],
                "assistant_message_count": stats["assistant_message_count"],
                "total_tokens": stats["total_tokens"],
                "last_activity": stats["last_activity"],
                "updated_at": datetime.utcnow()
            }

            # Use atomic update with optimistic locking
            # Include the current updated_at to ensure we don't overwrite concurrent updates
            result = await self.sessions_collection.update_one(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "updated_at": session.updated_at  # Optimistic lock
                },
                {"$set": update_data}
            )

            if result.modified_count == 0:
                logger.warning(f"Concurrent update detected for session {session_id}, stats may be slightly off")
                # In high-concurrency scenarios, we might need to retry or use a different strategy

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup resources."""
        await self.cleanup()

    def __del__(self):
        """Destructor - attempt cleanup if not already done."""
        # Note: __del__ is not guaranteed to be called, and it's not async
        # This is a fallback, but proper cleanup should use async context manager
        logger.debug("SessionManager destructor called. "
                     "Consider using async context manager for proper cleanup.")
# Global session manager instance
session_manager = SessionManager()


async def get_session_manager():
    """
    Dependency injection for session manager with proper resource cleanup.
    Uses the global singleton with cleanup.
    """
    try:
        yield session_manager
    finally:
        # Cleanup is handled by the context manager, but we ensure cursors are closed
        await session_manager.cleanup()


async def get_fresh_session_manager():
    """Get a fresh session manager instance for use with context managers."""
    async with SessionManager() as manager:
        yield manager
