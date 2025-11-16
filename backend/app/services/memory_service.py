"""
AI Memory Service - Long-term user memory management with semantic search
"""
import logging
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import httpx

from app.models.mongo_models import (
    UserMemoryDocument,
    MemoryCreateRequest,
    MemoryUpdateRequest,
    MemorySearchRequest,
    MemoryExtractionRequest,
    MessageDocument
)
from app.core.config import settings
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing user long-term memories with AI-powered extraction."""

    def __init__(self):
        self._memories_collection = None
        self._messages_collection = None

    @property
    def memories_collection(self):
        """Lazy load memories collection."""
        if self._memories_collection is None:
            from app.db.mongodb import mongodb_manager
            db = mongodb_manager.get_database()
            self._memories_collection = db["user_memories"]
        return self._memories_collection

    @property
    def messages_collection(self):
        """Lazy load messages collection."""
        if self._messages_collection is None:
            from app.db.mongodb import get_messages_collection
            self._messages_collection = get_messages_collection()
        return self._messages_collection

    async def create_memory(
        self, 
        user_id: str, 
        request: MemoryCreateRequest,
        skip_limit_check: bool = False
    ) -> UserMemoryDocument:
        """
        Create a new memory for a user with semantic embedding.
        
        Args:
            user_id: User ID
            request: Memory creation request
            skip_limit_check: Skip memory limit validation (for system-created memories)
            
        Raises:
            ValueError: If user has exceeded memory limit
        """
        # Check user memory limit (soft limit: 1000, hard limit: 2000)
        if not skip_limit_check:
            memory_count = await self.memories_collection.count_documents({"user_id": user_id})
            
            if memory_count >= 2000:
                logger.error(f"User {user_id} exceeded hard memory limit: {memory_count}/2000")
                raise ValueError(
                    "Memory limit exceeded (2000). Please delete some old memories before creating new ones."
                )
            elif memory_count >= 1000:
                logger.warning(f"User {user_id} approaching memory limit: {memory_count}/1000")
        
        # Generate embedding for semantic search
        embedding_service = get_embedding_service()
        embedding = embedding_service.generate_embedding(request.content)
        
        memory_doc = UserMemoryDocument(
                        user_id=user_id,
                        content=mem_data["content"],
                        memory_type=mem_data["type"],
                        importance=mem_data.get("importance", 0.5),
                        confidence=mem_data.get("confidence", 0.8),
                        tags=mem_data.get("tags", []),
                        category=mem_data.get("category"),
                        contexts=mem_data.get("contexts", []),
                        time_context=time_context,
                        location_context=mem_data.get("location_context", "unknown"),
                        embedding=embedding,
                        source_session_id=session_id,
                        extraction_method="ai_extraction",
                        status="pending",  # New memories require verification
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )

        try:
            result = await self.memories_collection.insert_one(
                memory.model_dump(by_alias=True, exclude_none=True)
            )
            memory.id = str(result.inserted_id)
            logger.info(f"Created memory {memory.id} for user {user_id}: {request.memory_type}")
            return memory

        except Exception as e:
            logger.error(f"Failed to create memory for user {user_id}: {e}")
            raise

    async def get_memory(self, user_id: str, memory_id: str) -> Optional[UserMemoryDocument]:
        """Get a specific memory by ID."""
        try:
            from bson import ObjectId
            doc = await self.memories_collection.find_one({
                "_id": ObjectId(memory_id),
                "user_id": user_id
            })

            if doc:
                # Update access tracking
                await self.memories_collection.update_one(
                    {"_id": ObjectId(memory_id)},
                    {
                        "$inc": {"access_count": 1},
                        "$set": {"last_accessed": datetime.utcnow()}
                    }
                )
                return UserMemoryDocument(**doc)
            return None

        except Exception as e:
            logger.error(f"Failed to get memory {memory_id} for user {user_id}: {e}")
            return None

    async def update_memory(
        self,
        user_id: str,
        memory_id: str,
        request: MemoryUpdateRequest
    ) -> bool:
        """Update an existing memory and regenerate embedding if content changes."""
        try:
            from bson import ObjectId
            update_data = {"updated_at": datetime.utcnow()}

            if request.content is not None:
                update_data["content"] = request.content
                # Regenerate embedding when content changes
                embedding_service = get_embedding_service()
                update_data["embedding"] = embedding_service.generate_embedding(request.content)
                
            if request.importance is not None:
                update_data["importance"] = request.importance
            if request.confidence is not None:
                update_data["confidence"] = request.confidence
            if request.tags is not None:
                update_data["tags"] = request.tags
            if request.category is not None:
                update_data["category"] = request.category

            result = await self.memories_collection.update_one(
                {"_id": ObjectId(memory_id), "user_id": user_id},
                {"$set": update_data}
            )

            success = result.modified_count > 0
            if success:
                logger.info(f"Updated memory {memory_id} for user {user_id}")
            return success

        except Exception as e:
            logger.error(f"Failed to update memory {memory_id}: {e}")
            return False

    async def delete_memory(self, user_id: str, memory_id: str) -> bool:
        """Delete a memory."""
        try:
            from bson import ObjectId
            result = await self.memories_collection.delete_one({
                "_id": ObjectId(memory_id),
                "user_id": user_id
            })

            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted memory {memory_id} for user {user_id}")
            return success

        except Exception as e:
            logger.error(f"Failed to delete memory {memory_id}: {e}")
            return False

    async def search_memories(
        self,
        user_id: str,
        request: MemorySearchRequest
    ) -> List[UserMemoryDocument]:
        """Search user memories with filtering."""
        try:
            query = {"user_id": user_id}

            # Apply filters
            if request.memory_type:
                query["memory_type"] = request.memory_type
            if request.category:
                query["category"] = request.category
            if request.tags:
                query["tags"] = {"$in": request.tags}
            if request.min_importance > 0:
                query["importance"] = {"$gte": request.min_importance}
            if request.min_confidence > 0:
                query["confidence"] = {"$gte": request.min_confidence}

            # Text search if query provided
            if request.query:
                query["$text"] = {"$search": request.query}

            # Sort and paginate
            sort_order = -1 if request.sort_order == "desc" else 1
            cursor = self.memories_collection.find(query).sort(
                request.sort_by, sort_order
            ).skip(request.skip).limit(request.limit)

            memories = []
            async for doc in cursor:
                memories.append(UserMemoryDocument(**doc))

            return memories

        except Exception as e:
            logger.error(f"Failed to search memories for user {user_id}: {e}")
            return []

    async def get_relevant_memories(
        self,
        user_id: str,
        context: str,
        limit: int = 5,
        min_importance: float = 0.3,
        use_semantic_search: bool = True,
        conversation_contexts: Optional[List[str]] = None  # Phase 2: Context filtering
    ) -> List[UserMemoryDocument]:
        """
        Get memories relevant to the current context using SEMANTIC SEARCH.
        
        Phase 2 Implementation:
        - Generates embedding for query context
        - Finds memories with highest cosine similarity
        - Falls back to keyword matching if embeddings unavailable
        
        Args:
            user_id: User ID
            context: Query context to find relevant memories for
            limit: Maximum number of memories to return
            min_importance: Minimum importance threshold
            use_semantic_search: If True, use semantic search; if False, use keywords
        """
        try:
            # Get all user memories above importance threshold, exclude rejected
            query = {
                "user_id": user_id,
                "importance": {"$gte": min_importance},
                "status": {"$ne": "rejected"}  # Exclude rejected memories
            }
            
            cursor = self.memories_collection.find(query)
            all_memories = []
            async for doc in cursor:
                all_memories.append(UserMemoryDocument(**doc))
            
            if not all_memories:
                logger.info(f"No memories found for user {user_id}")
                return []
            
            # Use semantic search if enabled and embeddings available
            if use_semantic_search:
                try:
                    embedding_service = get_embedding_service()
                    
                    # Generate embedding for query context
                    query_embedding = embedding_service.generate_embedding(context)
                    
                    # Calculate similarity scores
                    scored_memories = []
                    for memory in all_memories:
                        if memory.embedding and len(memory.embedding) > 0:
                            # Semantic similarity
                            similarity = embedding_service.cosine_similarity(
                                query_embedding,
                                memory.embedding
                            )
                            # Boost score by importance, relevance, verification status, and context match
                            status_multiplier = {
                                "confirmed": 1.2,    # Boost confirmed memories
                                "corrected": 1.1,    # Boost corrected memories
                                "pending": 1.0,      # Normal score for pending
                                "rejected": 0.0      # Should be filtered out already
                            }.get(memory.status, 1.0)
                            
                            # Phase 2: Context matching boost
                            context_multiplier = 1.0
                            if conversation_contexts and memory.contexts:
                                # Boost memories that match current conversation context
                                matching_contexts = set(conversation_contexts) & set(memory.contexts)
                                if matching_contexts:
                                    # 15% boost per matching context (max 1.45x for 3 matches)
                                    context_multiplier = 1.0 + (0.15 * len(matching_contexts))
                            
                            final_score = similarity * memory.importance * memory.relevance_score * status_multiplier * context_multiplier
                            scored_memories.append((memory, final_score, similarity))
                        else:
                            # Fallback to keyword matching for memories without embeddings
                            keyword_score = self._keyword_relevance(context, memory)
                            status_multiplier = {
                                "confirmed": 1.2,
                                "corrected": 1.1,
                                "pending": 1.0,
                                "rejected": 0.0
                            }.get(memory.status, 1.0)
                            
                            # Phase 2: Context matching boost for keyword search too
                            context_multiplier = 1.0
                            if conversation_contexts and memory.contexts:
                                matching_contexts = set(conversation_contexts) & set(memory.contexts)
                                if matching_contexts:
                                    context_multiplier = 1.0 + (0.15 * len(matching_contexts))
                            
                            final_score = keyword_score * memory.importance * memory.relevance_score * status_multiplier * context_multiplier
                            scored_memories.append((memory, final_score, keyword_score))
                    
                    # Sort by final score (descending)
                    scored_memories.sort(key=lambda x: x[1], reverse=True)
                    
                    # Get top N memories
                    top_memories = scored_memories[:limit]
                    
                    logger.info(
                        f"Semantic search found {len(top_memories)} relevant memories for user {user_id}. "
                        f"Top similarities: {[f'{m[2]:.3f}' for m in top_memories[:3]]}"
                    )
                    
                    # Update access tracking for returned memories
                    for memory, score, similarity in top_memories:
                        from bson import ObjectId
                        await self.memories_collection.update_one(
                            {"_id": ObjectId(memory.id)},
                            {
                                "$inc": {"access_count": 1},
                                "$set": {"last_accessed": datetime.utcnow()}
                            }
                        )
                    
                    return [m[0] for m in top_memories]
                    
                except Exception as e:
                    logger.warning(f"Semantic search failed, falling back to keywords: {e}")
                    use_semantic_search = False
            
            # Fallback: Keyword-based search
            if not use_semantic_search:
                logger.info(f"Using keyword-based search for user {user_id}")
                
                # Score memories by keyword relevance
                scored_memories = []
                for memory in all_memories:
                    keyword_score = self._keyword_relevance(context, memory)
                    if keyword_score > 0:
                        final_score = keyword_score * memory.importance * memory.relevance_score
                        scored_memories.append((memory, final_score))
                
                # Sort and get top N
                scored_memories.sort(key=lambda x: x[1], reverse=True)
                top_memories = scored_memories[:limit]
                
                # Update access tracking
                for memory, score in top_memories:
                    from bson import ObjectId
                    await self.memories_collection.update_one(
                        {"_id": ObjectId(memory.id)},
                        {
                            "$inc": {"access_count": 1},
                            "$set": {"last_accessed": datetime.utcnow()}
                        }
                    )
                
                return [m[0] for m in top_memories]

        except Exception as e:
            logger.error(f"Failed to get relevant memories for user {user_id}: {e}")
            return []
    
    def _keyword_relevance(self, context: str, memory: UserMemoryDocument) -> float:
        """Calculate keyword-based relevance score (0-1)."""
        context_lower = context.lower()
        content_lower = memory.content.lower()
        
        # Check for exact phrase match
        if context_lower in content_lower:
            return 1.0
        
        # Check for keyword matches
        context_words = set(context_lower.split())
        content_words = set(content_lower.split())
        tag_words = set([tag.lower() for tag in memory.tags]) if memory.tags else set()
        
        # Calculate word overlap
        word_overlap = len(context_words & (content_words | tag_words))
        if len(context_words) > 0:
            return word_overlap / len(context_words)
        
        return 0.0
    
    async def _is_duplicate_memory(
        self,
        user_id: str,
        new_content: str,
        new_embedding: List[float],
        similarity_threshold: float = 0.90
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if memory is semantically duplicate of existing memory.
        
        Args:
            user_id: User ID
            new_content: New memory content
            new_embedding: Embedding vector for new memory
            similarity_threshold: Similarity threshold (default 0.90 = 90% similar)
            
        Returns:
            Tuple of (is_duplicate, existing_memory_id)
        """
        try:
            # First check exact content match (fast)
            exact_match = await self.memories_collection.find_one({
                "user_id": user_id,
                "content": new_content
            })
            if exact_match:
                return True, str(exact_match["_id"])
            
            # Check recent memories (last 7 days) for semantic duplicates
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            cursor = self.memories_collection.find({
                "user_id": user_id,
                "created_at": {"$gte": cutoff_date}
            })
            
            embedding_service = get_embedding_service()
            
            async for doc in cursor:
                if doc.get("embedding") and len(doc["embedding"]) > 0:
                    similarity = embedding_service.cosine_similarity(
                        new_embedding,
                        doc["embedding"]
                    )
                    
                    if similarity >= similarity_threshold:
                        logger.info(
                            f"Duplicate memory detected: {similarity:.2%} similar to existing memory. "
                            f"New: '{new_content[:50]}...' | Existing: '{doc['content'][:50]}...'"
                        )
                        return True, str(doc["_id"])
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking duplicate memory: {e}")
            # On error, fall back to allowing the memory (fail open)
            return False, None

    async def extract_memories_from_conversation(
        self,
        user_id: str,
        session_id: str,
        message_limit: int = 50
    ) -> List[UserMemoryDocument]:
        """
        Extract memories from a conversation using AI.
        Analyzes recent messages and identifies key facts, preferences, and topics.
        """
        try:
            # Get recent messages from the session
            cursor = self.messages_collection.find({
                "user_id": user_id,
                "session_id": session_id
            }).sort("created_at", -1).limit(message_limit)

            messages = []
            async for doc in cursor:
                messages.append(MessageDocument(**doc))

            if not messages:
                logger.info(f"No messages found for session {session_id}")
                return []

            # Reverse to chronological order
            messages = list(reversed(messages))

            # Build conversation context
            conversation = "\n".join([
                f"{msg.role}: {msg.content}"
                for msg in messages
            ])

            # Use AI to extract memories
            extracted_memories = await self._ai_extract_memories(
                conversation, user_id, session_id
            )

            logger.info(
                f"Extracted {len(extracted_memories)} memories from session {session_id}"
            )
            return extracted_memories

        except Exception as e:
            logger.error(
                f"Failed to extract memories from session {session_id}: {e}"
            )
            return []

    async def _ai_extract_memories(
        self,
        conversation: str,
        user_id: str,
        session_id: str
    ) -> List[UserMemoryDocument]:
        """
        Use AI to extract structured memories from conversation.
        Uses Groq (fast and free) for memory extraction.
        """
        # Get current time context for classification
        current_hour = datetime.utcnow().hour
        time_context = (
            "morning_routine" if 5 <= current_hour < 9 else
            "work_hours" if 9 <= current_hour < 17 else
            "evening" if 17 <= current_hour < 22 else
            "night"
        )
        
        extraction_prompt = f"""Analyze this conversation and extract important information about the user that should be remembered for future interactions.

Extract memories in these categories:
1. PREFERENCES: User's likes, dislikes, preferred tools, coding styles, etc.
2. FACTS: Concrete facts about the user (profession, projects, skills, etc.)
3. TOPICS: Topics the user is interested in or frequently discusses
4. INTERACTION_PATTERNS: How the user likes to communicate or work

Conversation:
{conversation}

Return ONLY a JSON array of memories. Each memory should have:
- memory_type: one of ["preference", "fact", "topic", "interaction_pattern"]
- content: clear, concise description (one sentence)
- importance: 0.0 to 1.0 (how important is this to remember)
- confidence: 0.0 to 1.0 (how confident are you about this)
- tags: array of relevant keywords
- category: general category (e.g., "coding", "personal", "professional")
- contexts: array of applicable contexts ["work", "personal", "technical", "casual", "learning", "creative", "problem_solving"]
- location_context: where this memory applies ("home", "office", "travel", "unknown")

Example format:
[
  {{
    "memory_type": "preference",
    "content": "Prefers Python over JavaScript for backend development",
    "importance": 0.8,
    "confidence": 0.9,
    "tags": ["python", "javascript", "backend"],
    "category": "coding",
    "contexts": ["work", "technical", "learning"],
    "location_context": "office"
  }},
  {{
    "memory_type": "fact",
    "content": "Working on a ChatBot project using FastAPI and Next.js",
    "importance": 0.9,
    "confidence": 1.0,
    "tags": ["chatbot", "fastapi", "nextjs", "project"],
    "category": "professional"
  }}
]

IMPORTANT: Return ONLY the JSON array, no other text."""

        try:
            # Use Groq for fast, free extraction
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.AI_SERVICES__GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a memory extraction AI. Extract structured memories from conversations in JSON format only."
                            },
                            {
                                "role": "user",
                                "content": extraction_prompt
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 2000
                    }
                )

                if response.status_code != 200:
                    logger.error(f"AI extraction failed: {response.status_code}")
                    return []

                result = response.json()
                content = result["choices"][0]["message"]["content"].strip()

                # Parse JSON response
                # Remove markdown code blocks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()

                memories_data = json.loads(content)

                # Create memory documents with batch embedding generation and semantic duplicate detection
                created_memories = []
                embedding_service = get_embedding_service()
                
                # Extract all content strings for batch embedding
                contents = [mem_data["content"] for mem_data in memories_data]
                
                # Generate embeddings in batch (much faster than one-by-one)
                embeddings = embedding_service.generate_embeddings_batch(contents)
                logger.info(f"Generated {len(embeddings)} embeddings in batch for extraction")
                
                # Process each memory with its embedding
                for mem_data, embedding in zip(memories_data, embeddings):
                    content = mem_data["content"]
                    
                    # Check for semantic duplicates
                    is_duplicate, existing_id = await self._is_duplicate_memory(
                        user_id, content, embedding, similarity_threshold=0.90
                    )
                    
                    if is_duplicate:
                        logger.info(f"Semantic duplicate skipped: {content[:50]}...")
                        # Reinforce existing memory instead of creating duplicate
                        if existing_id:
                            await self.reinforce_memory(user_id, existing_id)
                        continue
                    
                    # Create new memory (pending verification)
                    memory = UserMemoryDocument(
                        user_id=user_id,
                        memory_type=mem_data["memory_type"],
                        content=content,
                        embedding=embedding,
                        importance=mem_data.get("importance", 0.5),
                        confidence=mem_data.get("confidence", 0.8),
                        tags=mem_data.get("tags", []),
                        category=mem_data.get("category"),
                        contexts=mem_data.get("contexts", []),  # Phase 2: Context classification
                        time_context=time_context,  # Phase 2: Time-based context
                        location_context=mem_data.get("location_context", "unknown"),  # Phase 2: Location context
                        source_session_id=session_id,
                        extraction_method="ai_extraction",
                        status="pending",  # AI-extracted memories need verification
                        relevance_score=1.0,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )

                    result = await self.memories_collection.insert_one(
                        memory.model_dump(by_alias=True, exclude_none=True)
                    )
                    memory.id = str(result.inserted_id)
                    created_memories.append(memory)
                    logger.info(f"Created memory: {content[:50]}...")
                
                # Phase 3: Auto-detect relationships between new memories and existing ones
                if created_memories:
                    await self._auto_link_related_memories(user_id, created_memories)

                return created_memories

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"AI response was: {content[:500]}")
            return []
        except Exception as e:
            logger.error(f"AI memory extraction failed: {e}")
            return []

    async def reinforce_memory(self, user_id: str, memory_id: str) -> bool:
        """
        Reinforce a memory (increases relevance when confirmed/used).
        """
        try:
            from bson import ObjectId
            result = await self.memories_collection.update_one(
                {"_id": ObjectId(memory_id), "user_id": user_id},
                {
                    "$set": {
                        "last_reinforced": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    },
                    "$inc": {"relevance_score": 0.1}  # Increase relevance
                }
            )

            if result.modified_count > 0:
                # Cap relevance_score at 1.0
                await self.memories_collection.update_one(
                    {"_id": ObjectId(memory_id), "relevance_score": {"$gt": 1.0}},
                    {"$set": {"relevance_score": 1.0}}
                )
                logger.info(f"Reinforced memory {memory_id}")
                return True
            return False

        except Exception as e:
            logger.error(f"Failed to reinforce memory {memory_id}: {e}")
            return False

    async def verify_memory(
        self,
        user_id: str,
        memory_id: str,
        action: str,
        corrected_content: Optional[str] = None,
        corrected_importance: Optional[float] = None,
        corrected_tags: Optional[List[str]] = None,
        feedback: Optional[str] = None
    ) -> bool:
        """
        Verify a memory: confirm, reject, or correct it.
        
        Args:
            user_id: User ID
            memory_id: Memory ID to verify
            action: "confirm", "reject", or "correct"
            corrected_content: New content if correcting
            corrected_importance: New importance if correcting
            corrected_tags: New tags if correcting
            feedback: User feedback
            
        Returns:
            True if verification successful
        """
        try:
            from bson import ObjectId
            
            logger.info(f"Attempting to verify memory {memory_id} with action '{action}' for user {user_id}")
            
            # Validate ObjectId format
            if not ObjectId.is_valid(memory_id):
                logger.error(f"Invalid ObjectId format: {memory_id}")
                return False
            
            # Get existing memory
            memory = await self.get_memory(user_id, memory_id)
            if not memory:
                logger.error(f"Memory {memory_id} not found for user {user_id} during verification")
                return False
            
            logger.info(f"Found memory {memory_id}, current status: {memory.status}")
            
            # Create verification history entry
            verification_entry = {
                "timestamp": datetime.utcnow(),
                "action": action,
                "feedback": feedback,
                "previous_content": memory.content if action == "correct" else None
            }
            
            # Prepare update operations - separate $set and $push
            set_data = {
                "verified_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if action == "confirm":
                # Increase confidence and relevance
                set_data["status"] = "confirmed"
                set_data["confidence"] = 1.0
                set_data["relevance_score"] = min(memory.relevance_score + 0.2, 1.0)
                logger.info(f"Memory {memory_id} confirmed by user")
                
            elif action == "reject":
                # Mark as rejected, decrease confidence
                set_data["status"] = "rejected"
                set_data["confidence"] = 0.0
                set_data["relevance_score"] = 0.0
                logger.info(f"Memory {memory_id} rejected by user")
                
            elif action == "correct":
                # Update content and mark as corrected
                if not corrected_content:
                    logger.error("Corrected content required for 'correct' action")
                    return False
                
                set_data["status"] = "corrected"
                set_data["content"] = corrected_content
                set_data["confidence"] = 0.9  # Slightly lower than perfect
                
                # Regenerate embedding for corrected content
                embedding_service = get_embedding_service()
                set_data["embedding"] = embedding_service.generate_embedding(corrected_content)
                
                if corrected_importance is not None:
                    set_data["importance"] = corrected_importance
                if corrected_tags is not None:
                    set_data["tags"] = corrected_tags
                
                logger.info(f"Memory {memory_id} corrected by user")
            else:
                logger.error(f"Invalid verification action: {action}")
                return False
            
            # Apply update with proper MongoDB operators
            update_operations = {
                "$set": set_data,
                "$push": {"verification_history": verification_entry}
            }
            
            logger.info(f"Applying verification update to memory {memory_id}")
            result = await self.memories_collection.update_one(
                {"_id": ObjectId(memory_id), "user_id": user_id},
                update_operations
            )
            
            logger.info(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
            
            if result.matched_count == 0:
                logger.error(f"Memory {memory_id} not found or doesn't belong to user {user_id}")
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to verify memory {memory_id}: {e}")
            return False
    
    async def get_pending_memories(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[UserMemoryDocument]:
        """
        Get memories pending verification.
        
        Args:
            user_id: User ID
            limit: Maximum number of memories to return
            
        Returns:
            List of pending memories
        """
        try:
            cursor = self.memories_collection.find({
                "user_id": user_id,
                "status": "pending"
            }).sort("created_at", -1).limit(limit)
            
            memories = []
            async for doc in cursor:
                memories.append(UserMemoryDocument(**doc))
            
            logger.info(f"Found {len(memories)} pending memories for user {user_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Failed to get pending memories for user {user_id}: {e}")
            return []

    async def decay_memories(self, user_id: str, decay_rate: float = 0.01) -> int:
        """
        Apply temporal decay to memories that haven't been accessed recently.
        Memories become less relevant over time if not reinforced.
        """
        try:
            # Calculate cutoff date (memories not accessed in 30 days)
            cutoff_date = datetime.utcnow() - timedelta(days=30)

            result = await self.memories_collection.update_many(
                {
                    "user_id": user_id,
                    "$or": [
                        {"last_accessed": {"$lt": cutoff_date}},
                        {"last_accessed": None}
                    ],
                    "relevance_score": {"$gt": 0.1}  # Don't decay below 0.1
                },
                {
                    "$inc": {"relevance_score": -decay_rate},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"Applied decay to {result.modified_count} memories for user {user_id}")

            return result.modified_count

        except Exception as e:
            logger.error(f"Failed to decay memories for user {user_id}: {e}")
            return 0

    async def get_memory_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary statistics about user's memories."""
        try:
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$memory_type",
                    "count": {"$sum": 1},
                    "avg_importance": {"$avg": "$importance"},
                    "avg_confidence": {"$avg": "$confidence"}
                }}
            ]

            cursor = self.memories_collection.aggregate(pipeline)
            type_stats = {}
            async for doc in cursor:
                type_stats[doc["_id"]] = {
                    "count": doc["count"],
                    "avg_importance": round(doc["avg_importance"], 2),
                    "avg_confidence": round(doc["avg_confidence"], 2)
                }

            # Get total count
            total = await self.memories_collection.count_documents({"user_id": user_id})
            
            # Get verification status breakdown
            status_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }}
            ]
            
            cursor_status = self.memories_collection.aggregate(status_pipeline)
            status_stats = {}
            async for doc in cursor_status:
                status_stats[doc["_id"]] = doc["count"]

            return {
                "total_memories": total,
                "by_type": type_stats,
                "by_status": status_stats,
                "verification_rate": round(
                    (status_stats.get("confirmed", 0) + status_stats.get("corrected", 0)) / total * 100, 1
                ) if total > 0 else 0,
                "pending_verification": status_stats.get("pending", 0),
                "memory_limit_status": self._get_memory_limit_status(total),
                "last_updated": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to get memory summary for user {user_id}: {e}")
            return {"total_memories": 0, "by_type": {}}
    
    async def detect_conversation_context(
        self,
        message: str,
        recent_messages: Optional[List[MessageDocument]] = None
    ) -> List[str]:
        """
        Phase 2: AI-powered context detection for conversations.
        
        Analyzes the current message and recent conversation to determine
        applicable contexts for better memory retrieval.
        
        Args:
            message: Current user message
            recent_messages: Recent conversation history (last 5 messages)
            
        Returns:
            List of detected contexts (e.g., ["work", "technical", "problem_solving"])
        """
        try:
            # Build context from recent conversation
            conversation_snippet = message
            if recent_messages:
                conversation_snippet = "\\n".join([
                    f"{msg.role}: {msg.content[:100]}"
                    for msg in recent_messages[-3:]
                ]) + f"\\nuser: {message}"
            
            # Use fast heuristic-based detection with keyword matching
            contexts = set()
            
            # Technical indicators
            technical_keywords = [
                r"\\bcode\\b", r"\\bapi\\b", r"\\bbug\\b", r"\\berror\\b", r"\\bfunction\\b",
                r"\\bdatabase\\b", r"\\balgorithm\\b", r"\\bserver\\b", r"\\bframework\\b",
                r"\\bpython\\b", r"\\bjavascript\\b", r"\\breact\\b", r"\\bfastapi\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in technical_keywords):
                contexts.add("technical")
            
            # Work indicators
            work_keywords = [
                r"\\bproject\\b", r"\\bdeadline\\b", r"\\bmeeting\\b", r"\\bclient\\b",
                r"\\bproduction\\b", r"\\bdeployment\\b", r"\\btask\\b", r"\\bwork\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in work_keywords):
                contexts.add("work")
            
            # Learning indicators
            learning_keywords = [
                r"\\blearn\\b", r"\\btutorial\\b", r"\\bexample\\b", r"\\bwhat is\\b",
                r"\\bhow to\\b", r"\\bexplain\\b", r"\\bunderstand\\b", r"\\bteach\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in learning_keywords):
                contexts.add("learning")
            
            # Problem-solving indicators
            problem_keywords = [
                r"\\bhelp\\b", r"\\bissue\\b", r"\\bproblem\\b", r"\\bfix\\b", r"\\bdebug\\b",
                r"\\bnot working\\b", r"\\bfailed\\b", r"\\berror\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in problem_keywords):
                contexts.add("problem_solving")
            
            # Creative indicators
            creative_keywords = [
                r"\\bdesign\\b", r"\\bcreate\\b", r"\\bbuild\\b", r"\\bidea\\b",
                r"\\bbrainstorm\\b", r"\\binnovate\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in creative_keywords):
                contexts.add("creative")
            
            # Casual vs formal tone detection
            casual_indicators = [r"\\blol\\b", r"\\bthanks\\b", r"\\bhey\\b", r"\\bcool\\b", r"!+", r"\\?+"]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in casual_indicators):
                contexts.add("casual")
            else:
                # Default to casual if no strong work indicators
                if "work" not in contexts and "technical" not in contexts:
                    contexts.add("casual")
            
            # Personal indicators
            personal_keywords = [
                r"\\bI like\\b", r"\\bI prefer\\b", r"\\bmy \\b", r"\\bpersonal\\b",
                r"\\bhobby\\b", r"\\bfavorite\\b"
            ]
            if any(re.search(pattern, conversation_snippet, re.IGNORECASE) for pattern in personal_keywords):
                contexts.add("personal")
            
            detected = list(contexts) if contexts else ["casual"]
            logger.info(f"Detected contexts: {detected}")
            return detected
            
        except Exception as e:
            logger.error(f"Failed to detect conversation context: {e}")
            return ["casual"]  # Default fallback
    
    def _get_memory_limit_status(self, count: int) -> Dict[str, Any]:
        """Get memory limit status for a user."""
        soft_limit = 1000
        hard_limit = 2000
        
        status = "healthy"
        warning = None
        
        if count >= hard_limit:
            status = "exceeded"
            warning = "Hard limit reached. Cannot create new memories."
        elif count >= soft_limit:
            status = "warning"
            warning = f"Approaching limit. Consider cleaning up old memories. ({count}/{soft_limit})"
        
        return {
            "count": count,
            "soft_limit": soft_limit,
            "hard_limit": hard_limit,
            "status": status,
            "warning": warning,
            "percentage_used": round((count / soft_limit) * 100, 1)
        }
    
    async def cleanup_old_memories(
        self,
        user_id: str,
        keep_count: int = 500,
        min_importance: float = 0.3
    ) -> int:
        """
        Clean up old, low-relevance memories for users approaching limit.
        
        Args:
            user_id: User ID
            keep_count: Number of memories to keep (keeps most relevant)
            min_importance: Minimum importance to keep regardless of count
            
        Returns:
            Number of memories deleted
        """
        try:
            # Find memories to delete (low relevance, old, unimportant)
            pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$addFields": {
                        "score": {
                            "$multiply": [
                                "$relevance_score",
                                "$importance",
                                {"$ifNull": ["$access_count", 0]}
                            ]
                        }
                    }
                },
                {"$sort": {"score": -1}},
                {"$skip": keep_count}
            ]
            
            cursor = self.memories_collection.aggregate(pipeline)
            to_delete = []
            
            async for doc in cursor:
                # Don't delete important memories
                if doc.get("importance", 0) < min_importance:
                    to_delete.append(doc["_id"])
            
            if to_delete:
                from bson import ObjectId
                result = await self.memories_collection.delete_many({
                    "_id": {"$in": to_delete}
                })
                logger.info(f"Cleaned up {result.deleted_count} old memories for user {user_id}")
                return result.deleted_count
            
            return 0

        except Exception as e:
            logger.error(f"Failed to cleanup memories for user {user_id}: {e}")
            return 0
    
    async def link_memories(
        self,
        user_id: str,
        source_memory_id: str,
        target_memory_id: str,
        relationship_type: str,
        strength: float = 0.8,
        bidirectional: bool = True
    ) -> bool:
        """
        Phase 3: Create a relationship between two memories.
        
        Args:
            user_id: User ID (for validation)
            source_memory_id: Source memory ID
            target_memory_id: Target memory ID
            relationship_type: Type of relationship (relates_to, supersedes, part_of, etc.)
            strength: Relationship strength (0.0-1.0)
            bidirectional: If True, create reverse relationship
            
        Returns:
            True if successful
        """
        try:
            from bson import ObjectId
            
            # Validate both memories exist and belong to user
            source_mem = await self.memories_collection.find_one({
                "_id": ObjectId(source_memory_id),
                "user_id": user_id
            })
            target_mem = await self.memories_collection.find_one({
                "_id": ObjectId(target_memory_id),
                "user_id": user_id
            })
            
            if not source_mem or not target_mem:
                logger.error(f"Memory not found or access denied: {source_memory_id} -> {target_memory_id}")
                return False
            
            # Create relationship object
            relationship = {
                "memory_id": target_memory_id,
                "type": relationship_type,
                "strength": strength,
                "created_at": datetime.utcnow()
            }
            
            # Add to source memory
            await self.memories_collection.update_one(
                {"_id": ObjectId(source_memory_id)},
                {
                    "$addToSet": {
                        "relationships": relationship,
                        "related_memories": target_memory_id  # Backward compatibility
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Create reverse relationship if bidirectional
            if bidirectional:
                reverse_type = self._get_reverse_relationship_type(relationship_type)
                reverse_relationship = {
                    "memory_id": source_memory_id,
                    "type": reverse_type,
                    "strength": strength,
                    "created_at": datetime.utcnow()
                }
                
                await self.memories_collection.update_one(
                    {"_id": ObjectId(target_memory_id)},
                    {
                        "$addToSet": {
                            "relationships": reverse_relationship,
                            "related_memories": source_memory_id
                        },
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
            
            logger.info(
                f"Linked memories: {source_memory_id} --[{relationship_type}]--> {target_memory_id} "
                f"(bidirectional: {bidirectional})"
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to link memories: {e}")
            return False
    
    def _get_reverse_relationship_type(self, relationship_type: str) -> str:
        """Get the reverse relationship type for bidirectional links."""
        reverse_map = {
            "supersedes": "superseded_by",
            "superseded_by": "supersedes",
            "part_of": "contains",
            "contains": "part_of",
            "supports": "supported_by",
            "supported_by": "supports",
            "contradicts": "contradicts",  # Symmetric
            "relates_to": "relates_to",  # Symmetric
            "similar_to": "similar_to"  # Symmetric
        }
        return reverse_map.get(relationship_type, "relates_to")
    
    async def _auto_link_related_memories(
        self,
        user_id: str,
        new_memories: List[UserMemoryDocument]
    ) -> None:
        """
        Phase 3: Automatically detect and link related memories.
        
        Uses semantic similarity to find related memories and creates relationships.
        Only links memories with high similarity (>0.75) to avoid noise.
        """
        try:
            embedding_service = get_embedding_service()
            
            # Get all existing memories for this user (exclude the new ones)
            new_memory_ids = {mem.id for mem in new_memories}
            cursor = self.memories_collection.find({
                "user_id": user_id,
                "_id": {"$nin": [ObjectId(mid) for mid in new_memory_ids if mid]}
            })
            
            existing_memories = []
            async for doc in cursor:
                existing_memories.append(UserMemoryDocument(**doc))
            
            if not existing_memories:
                return
            
            # For each new memory, find related existing memories
            for new_mem in new_memories:
                if not new_mem.embedding or not new_mem.id:
                    continue
                
                related_found = 0
                for existing_mem in existing_memories:
                    if not existing_mem.embedding or not existing_mem.id:
                        continue
                    
                    # Calculate semantic similarity
                    similarity = embedding_service.cosine_similarity(
                        new_mem.embedding,
                        existing_mem.embedding
                    )
                    
                    # Link if highly similar (0.75-0.89 = relates_to, 0.90+ = similar_to)
                    if similarity >= 0.90:
                        # Very similar - create "similar_to" relationship
                        await self.link_memories(
                            user_id=user_id,
                            source_memory_id=new_mem.id,
                            target_memory_id=existing_mem.id,
                            relationship_type="similar_to",
                            strength=similarity,
                            bidirectional=True
                        )
                        related_found += 1
                    elif similarity >= 0.75:
                        # Related but not identical - create "relates_to" relationship
                        await self.link_memories(
                            user_id=user_id,
                            source_memory_id=new_mem.id,
                            target_memory_id=existing_mem.id,
                            relationship_type="relates_to",
                            strength=similarity,
                            bidirectional=True
                        )
                        related_found += 1
                    
                    # Limit relationships per memory to avoid clutter
                    if related_found >= 5:
                        break
                
                if related_found > 0:
                    logger.info(f"Auto-linked {related_found} related memories for: {new_mem.content[:50]}...")
        
        except Exception as e:
            logger.error(f"Failed to auto-link related memories: {e}")
    
    async def get_memory_graph(
        self,
        user_id: str,
        memory_id: str,
        max_depth: int = 2
    ) -> Dict[str, Any]:
        """
        Phase 3: Get memory relationship graph (breadth-first traversal).
        
        Args:
            user_id: User ID
            memory_id: Starting memory ID
            max_depth: Maximum traversal depth (default: 2)
            
        Returns:
            Graph structure with nodes and edges
        """
        try:
            from bson import ObjectId
            
            # Get root memory
            root_mem = await self.memories_collection.find_one({
                "_id": ObjectId(memory_id),
                "user_id": user_id
            })
            
            if not root_mem:
                return {"nodes": [], "edges": []}
            
            # BFS traversal
            visited = set()
            nodes = []
            edges = []
            queue = [(memory_id, 0)]  # (memory_id, depth)
            
            while queue:
                current_id, depth = queue.pop(0)
                
                if current_id in visited or depth > max_depth:
                    continue
                
                visited.add(current_id)
                
                # Get current memory
                mem_doc = await self.memories_collection.find_one({
                    "_id": ObjectId(current_id),
                    "user_id": user_id
                })
                
                if not mem_doc:
                    continue
                
                # Add node
                nodes.append({
                    "id": str(mem_doc["_id"]),
                    "content": mem_doc["content"],
                    "type": mem_doc["memory_type"],
                    "importance": mem_doc.get("importance", 0.5),
                    "depth": depth
                })
                
                # Process relationships
                relationships = mem_doc.get("relationships", [])
                for rel in relationships:
                    target_id = rel["memory_id"]
                    
                    # Add edge
                    edges.append({
                        "source": current_id,
                        "target": target_id,
                        "type": rel["type"],
                        "strength": rel.get("strength", 0.8)
                    })
                    
                    # Add to queue if not visited
                    if target_id not in visited:
                        queue.append((target_id, depth + 1))
            
            logger.info(
                f"Memory graph for {memory_id}: {len(nodes)} nodes, {len(edges)} edges "
                f"(depth: {max_depth})"
            )
            
            return {
                "root_id": memory_id,
                "nodes": nodes,
                "edges": edges,
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
            
        except Exception as e:
            logger.error(f"Failed to get memory graph: {e}")
            return {"nodes": [], "edges": []}
    
    async def find_related_memories(
        self,
        user_id: str,
        memory_id: str,
        relationship_types: Optional[List[str]] = None,
        min_strength: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Phase 3: Find memories related to a given memory.
        
        Args:
            user_id: User ID
            memory_id: Source memory ID
            relationship_types: Filter by relationship types (None = all types)
            min_strength: Minimum relationship strength
            
        Returns:
            List of related memories with relationship info
        """
        try:
            from bson import ObjectId
            
            # Get source memory with relationships
            source_mem = await self.memories_collection.find_one({
                "_id": ObjectId(memory_id),
                "user_id": user_id
            })
            
            if not source_mem:
                return []
            
            relationships = source_mem.get("relationships", [])
            
            # Filter by type and strength
            filtered_rels = []
            for rel in relationships:
                if rel.get("strength", 1.0) < min_strength:
                    continue
                if relationship_types and rel["type"] not in relationship_types:
                    continue
                filtered_rels.append(rel)
            
            if not filtered_rels:
                return []
            
            # Fetch related memories
            related_ids = [ObjectId(rel["memory_id"]) for rel in filtered_rels]
            cursor = self.memories_collection.find({
                "_id": {"$in": related_ids},
                "user_id": user_id
            })
            
            # Build result with relationship info
            result = []
            memory_map = {}
            
            async for doc in cursor:
                memory_map[str(doc["_id"])] = doc
            
            for rel in filtered_rels:
                target_id = rel["memory_id"]
                if target_id in memory_map:
                    mem_doc = memory_map[target_id]
                    result.append({
                        "memory": UserMemoryDocument(**mem_doc),
                        "relationship_type": rel["type"],
                        "relationship_strength": rel.get("strength", 0.8),
                        "created_at": rel.get("created_at")
                    })
            
            logger.info(f"Found {len(result)} related memories for {memory_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to find related memories: {e}")
            return []
    
    async def detect_conflicts(
        self,
        user_id: str,
        memory_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Phase 4: Detect contradicting memories.
        
        If memory_id is provided, checks only that memory.
        Otherwise, checks all memories for conflicts.
        
        Args:
            user_id: User ID
            memory_id: Optional specific memory to check
            
        Returns:
            List of conflict pairs with details
        """
        try:
            from bson import ObjectId
            
            conflicts = []
            
            # Get memories to check
            if memory_id:
                target_mem = await self.memories_collection.find_one({
                    "_id": ObjectId(memory_id),
                    "user_id": user_id
                })
                if not target_mem:
                    return []
                memories_to_check = [UserMemoryDocument(**target_mem)]
            else:
                # Check all active memories
                cursor = self.memories_collection.find({
                    "user_id": user_id,
                    "status": {"$ne": "rejected"}
                })
                memories_to_check = [UserMemoryDocument(**doc) async for doc in cursor]
            
            if not memories_to_check:
                return []
            
            # Use AI to detect contradictions
            embedding_service = get_embedding_service()
            
            for mem in memories_to_check:
                if not mem.embedding or not mem.id:
                    continue
                
                # Find semantically similar memories (potential conflicts)
                cursor = self.memories_collection.find({
                    "user_id": user_id,
                    "_id": {"$ne": ObjectId(mem.id)},
                    "status": {"$ne": "rejected"}
                })
                
                similar_memories = []
                async for doc in cursor:
                    other_mem = UserMemoryDocument(**doc)
                    if not other_mem.embedding:
                        continue
                    
                    similarity = embedding_service.cosine_similarity(
                        mem.embedding,
                        other_mem.embedding
                    )
                    
                    # High similarity but potentially contradicting (0.70-0.85)
                    if 0.70 <= similarity < 0.85:
                        similar_memories.append((other_mem, similarity))
                
                # Check for contradictions using keyword analysis
                for other_mem, similarity in similar_memories:
                    is_conflict = self._check_contradiction(mem.content, other_mem.content)
                    
                    if is_conflict:
                        conflicts.append({
                            "memory1": {
                                "id": mem.id,
                                "content": mem.content,
                                "importance": mem.importance,
                                "confidence": mem.confidence,
                                "created_at": mem.created_at
                            },
                            "memory2": {
                                "id": other_mem.id,
                                "content": other_mem.content,
                                "importance": other_mem.importance,
                                "confidence": other_mem.confidence,
                                "created_at": other_mem.created_at
                            },
                            "similarity": similarity,
                            "conflict_type": "contradiction"
                        })
                        
                        # Mark memories as having conflicts
                        await self.memories_collection.update_one(
                            {"_id": ObjectId(mem.id)},
                            {
                                "$set": {
                                    "conflict_detected": True,
                                    "last_conflict_check": datetime.utcnow()
                                },
                                "$addToSet": {"conflict_ids": other_mem.id}
                            }
                        )
                        await self.memories_collection.update_one(
                            {"_id": ObjectId(other_mem.id)},
                            {
                                "$set": {
                                    "conflict_detected": True,
                                    "last_conflict_check": datetime.utcnow()
                                },
                                "$addToSet": {"conflict_ids": mem.id}
                            }
                        )
            
            logger.info(f"Detected {len(conflicts)} conflicts for user {user_id}")
            return conflicts
            
        except Exception as e:
            logger.error(f"Failed to detect conflicts: {e}")
            return []
    
    def _check_contradiction(self, content1: str, content2: str) -> bool:
        """
        Check if two memory contents contradict each other using keyword analysis.
        """
        # Normalize content
        c1 = content1.lower()
        c2 = content2.lower()
        
        # Contradiction patterns
        negation_pairs = [
            (r"\\bprefers?\\b", r"\\b(dislikes?|hates?|avoids?)\\b"),
            (r"\\blikes?\\b", r"\\b(dislikes?|hates?)\\b"),
            (r"\\buses?\\b", r"\\b(doesn't use|never uses?)\\b"),
            (r"\\bworks? (at|for)\\b", r"\\b(left|quit|fired from)\\b"),
            (r"\\bexpert (in|at)\\b", r"\\b(beginner|new to|learning)\\b"),
            (r"\\byes\\b", r"\\bno\\b"),
            (r"\\btrue\\b", r"\\bfalse\\b"),
            (r"\\balways\\b", r"\\bnever\\b")
        ]
        
        for pattern1, pattern2 in negation_pairs:
            if re.search(pattern1, c1) and re.search(pattern2, c2):
                return True
            if re.search(pattern2, c1) and re.search(pattern1, c2):
                return True
        
        return False
    
    async def consolidate_memories(
        self,
        user_id: str,
        memory_ids: List[str],
        consolidated_content: Optional[str] = None
    ) -> Optional[UserMemoryDocument]:
        """
        Phase 4: Consolidate multiple similar memories into one.
        
        Args:
            user_id: User ID
            memory_ids: List of memory IDs to consolidate (min 2)
            consolidated_content: Optional custom content for consolidated memory
            
        Returns:
            Consolidated memory or None if failed
        """
        try:
            from bson import ObjectId
            
            if len(memory_ids) < 2:
                logger.error("Need at least 2 memories to consolidate")
                return None
            
            # Fetch all memories
            cursor = self.memories_collection.find({
                "_id": {"$in": [ObjectId(mid) for mid in memory_ids]},
                "user_id": user_id
            })
            
            memories = [UserMemoryDocument(**doc) async for doc in cursor]
            
            if len(memories) < 2:
                logger.error("Could not find all memories to consolidate")
                return None
            
            # Sort by importance and confidence
            memories.sort(key=lambda m: (m.importance, m.confidence), reverse=True)
            
            # Use highest importance memory as base
            base_memory = memories[0]
            
            # Generate consolidated content if not provided
            if not consolidated_content:
                # Combine contents intelligently
                contents = [m.content for m in memories]
                consolidated_content = f"Consolidated: {'; '.join(contents)}"
            
            # Merge metadata
            all_tags = set()
            all_contexts = set()
            max_importance = 0.0
            avg_confidence = 0.0
            
            for mem in memories:
                all_tags.update(mem.tags)
                all_contexts.update(mem.contexts)
                max_importance = max(max_importance, mem.importance)
                avg_confidence += mem.confidence
            
            avg_confidence /= len(memories)
            
            # Generate embedding for consolidated content
            embedding_service = get_embedding_service()
            consolidated_embedding = embedding_service.generate_embedding(consolidated_content)
            
            # Create consolidated memory
            consolidated_memory = UserMemoryDocument(
                user_id=user_id,
                content=consolidated_content,
                memory_type=base_memory.memory_type,
                importance=min(max_importance + 0.1, 1.0),  # Slight boost
                confidence=avg_confidence,
                tags=list(all_tags),
                contexts=list(all_contexts),
                category=base_memory.category,
                embedding=consolidated_embedding,
                extraction_method="consolidation",
                status="confirmed",  # Consolidated memories are pre-confirmed
                is_consolidated=True,
                consolidation_count=len(memories),
                consolidated_from=memory_ids,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Insert consolidated memory
            result = await self.memories_collection.insert_one(
                consolidated_memory.model_dump(by_alias=True, exclude_none=True)
            )
            consolidated_memory.id = str(result.inserted_id)
            
            # Mark original memories as superseded
            for mem in memories:
                await self.memories_collection.update_one(
                    {"_id": ObjectId(mem.id)},
                    {
                        "$set": {
                            "superseded_by": consolidated_memory.id,
                            "relevance_score": 0.1,  # Lower relevance
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            logger.info(
                f"Consolidated {len(memories)} memories into {consolidated_memory.id}: "
                f"{consolidated_content[:50]}..."
            )
            
            return consolidated_memory
            
        except Exception as e:
            logger.error(f"Failed to consolidate memories: {e}")
            return None
    
    async def classify_expiration_type(
        self,
        user_id: str,
        memory_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Phase 4: Classify memories as temporary, seasonal, or permanent.
        
        Args:
            user_id: User ID
            memory_id: Optional specific memory to classify
            
        Returns:
            Classification results
        """
        try:
            from bson import ObjectId
            
            # Get memories to classify
            if memory_id:
                cursor = self.memories_collection.find({
                    "_id": ObjectId(memory_id),
                    "user_id": user_id
                })
            else:
                cursor = self.memories_collection.find({
                    "user_id": user_id,
                    "expiration_type": "permanent"  # Reclassify unclassified
                })
            
            classified = {"temporary": 0, "seasonal": 0, "permanent": 0}
            
            async for doc in cursor:
                memory = UserMemoryDocument(**doc)
                
                # Classify based on content patterns
                content_lower = memory.content.lower()
                
                expiration_type = "permanent"  # Default
                expires_at = None
                
                # Temporary indicators (30-90 days)
                temporary_keywords = [
                    r"\\bcurrently\\b", r"\\bright now\\b", r"\\bthis week\\b",
                    r"\\bthis month\\b", r"\\btemporary\\b", r"\\bfor now\\b",
                    r"\\btrying out\\b", r"\\btesting\\b"
                ]
                if any(re.search(kw, content_lower) for kw in temporary_keywords):
                    expiration_type = "temporary"
                    expires_at = datetime.utcnow() + timedelta(days=90)
                
                # Seasonal indicators (1 year)
                seasonal_keywords = [
                    r"\\bthis year\\b", r"\\bthis quarter\\b", r"\\bthis season\\b",
                    r"\\b(spring|summer|fall|winter)\\b", r"\\bholiday\\b"
                ]
                if any(re.search(kw, content_lower) for kw in seasonal_keywords):
                    expiration_type = "seasonal"
                    expires_at = datetime.utcnow() + timedelta(days=365)
                
                # Update memory
                await self.memories_collection.update_one(
                    {"_id": ObjectId(memory.id)},
                    {
                        "$set": {
                            "expiration_type": expiration_type,
                            "expires_at": expires_at,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                classified[expiration_type] += 1
            
            logger.info(f"Classified memories: {classified}")
            return classified
            
        except Exception as e:
            logger.error(f"Failed to classify expiration types: {e}")
            return {"temporary": 0, "seasonal": 0, "permanent": 0}
    
    async def suggest_consolidations(
        self,
        user_id: str,
        min_similarity: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Phase 4: Find groups of similar memories that should be consolidated.
        
        Args:
            user_id: User ID
            min_similarity: Minimum similarity for consolidation suggestion
            
        Returns:
            List of consolidation suggestions
        """
        try:
            # Get all active memories
            cursor = self.memories_collection.find({
                "user_id": user_id,
                "status": {"$ne": "rejected"},
                "superseded_by": None,  # Not already superseded
                "is_consolidated": False  # Not already a consolidated memory
            })
            
            memories = [UserMemoryDocument(**doc) async for doc in cursor]
            
            if len(memories) < 2:
                return []
            
            embedding_service = get_embedding_service()
            suggestions = []
            processed = set()
            
            # Find similar memory clusters
            for i, mem1 in enumerate(memories):
                if not mem1.embedding or mem1.id in processed:
                    continue
                
                cluster = [mem1]
                
                for mem2 in memories[i+1:]:
                    if not mem2.embedding or mem2.id in processed:
                        continue
                    
                    similarity = embedding_service.cosine_similarity(
                        mem1.embedding,
                        mem2.embedding
                    )
                    
                    if similarity >= min_similarity:
                        cluster.append(mem2)
                        processed.add(mem2.id)
                
                if len(cluster) >= 2:
                    processed.add(mem1.id)
                    suggestions.append({
                        "memories": [
                            {
                                "id": m.id,
                                "content": m.content,
                                "importance": m.importance
                            }
                            for m in cluster
                        ],
                        "cluster_size": len(cluster),
                        "suggestion": "These memories are very similar and could be consolidated"
                    })
            
            logger.info(f"Found {len(suggestions)} consolidation suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to suggest consolidations: {e}")
            return []
    
    async def get_analytics_dashboard(self, user_id: str) -> Dict[str, Any]:
        """
        Phase 5: Get comprehensive analytics dashboard.
        
        Returns overview metrics, trends, and insights.
        """
        try:
            from collections import defaultdict
            
            # Basic counts
            total_memories = await self.memories_collection.count_documents({"user_id": user_id})
            
            if total_memories == 0:
                return {
                    "overview": {"total_memories": 0, "health_score": 100},
                    "message": "No memories yet. Start chatting to build your memory system!"
                }
            
            # Status breakdown
            status_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            status_cursor = self.memories_collection.aggregate(status_pipeline)
            status_breakdown = {}
            async for doc in status_cursor:
                status_breakdown[doc["_id"]] = doc["count"]
            
            # Type breakdown with averages
            type_pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$group": {
                        "_id": "$memory_type",
                        "count": {"$sum": 1},
                        "avg_importance": {"$avg": "$importance"},
                        "avg_access": {"$avg": "$access_count"}
                    }
                }
            ]
            type_cursor = self.memories_collection.aggregate(type_pipeline)
            type_breakdown = {}
            async for doc in type_cursor:
                type_breakdown[doc["_id"]] = {
                    "count": doc["count"],
                    "avg_importance": round(doc["avg_importance"], 2),
                    "avg_access_count": round(doc["avg_access"], 1)
                }
            
            # Context breakdown (top 10)
            context_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$unwind": "$contexts"},
                {"$group": {"_id": "$contexts", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            context_cursor = self.memories_collection.aggregate(context_pipeline)
            context_breakdown = {}
            async for doc in context_cursor:
                context_breakdown[doc["_id"]] = doc["count"]
            
            # Quality metrics
            quality_pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$group": {
                        "_id": None,
                        "avg_importance": {"$avg": "$importance"},
                        "avg_confidence": {"$avg": "$confidence"},
                        "avg_relevance": {"$avg": "$relevance_score"},
                        "total_access_count": {"$sum": "$access_count"},
                        "max_access": {"$max": "$access_count"}
                    }
                }
            ]
            quality_cursor = self.memories_collection.aggregate(quality_pipeline)
            quality_metrics = {
                "avg_importance": 0.0,
                "avg_confidence": 0.0,
                "avg_relevance": 0.0,
                "total_accesses": 0,
                "max_accesses": 0
            }
            async for doc in quality_cursor:
                quality_metrics = {
                    "avg_importance": round(doc.get("avg_importance", 0.0), 2),
                    "avg_confidence": round(doc.get("avg_confidence", 0.0), 2),
                    "avg_relevance": round(doc.get("avg_relevance", 0.0), 2),
                    "total_accesses": doc.get("total_access_count", 0),
                    "max_accesses": doc.get("max_access", 0)
                }
            
            # Advanced stats
            relationship_count = await self.memories_collection.count_documents({
                "user_id": user_id,
                "relationships": {"$exists": True, "$ne": []}
            })
            
            conflict_count = await self.memories_collection.count_documents({
                "user_id": user_id,
                "conflict_detected": True
            })
            
            consolidated_count = await self.memories_collection.count_documents({
                "user_id": user_id,
                "is_consolidated": True
            })
            
            expiration_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {"_id": "$expiration_type", "count": {"$sum": 1}}}
            ]
            expiration_cursor = self.memories_collection.aggregate(expiration_pipeline)
            expiration_breakdown = {}
            async for doc in expiration_cursor:
                expiration_breakdown[doc["_id"]] = doc["count"]
            
            # Calculate health score
            health_score = self._calculate_health_score(
                total_memories, status_breakdown, quality_metrics, conflict_count
            )
            
            # Generate insights
            insights = self._generate_insights(
                total_memories, status_breakdown, quality_metrics,
                conflict_count, health_score
            )
            
            return {
                "overview": {
                    "total_memories": total_memories,
                    "health_score": health_score,
                    "total_accesses": quality_metrics["total_accesses"],
                    "avg_importance": quality_metrics["avg_importance"],
                    "avg_confidence": quality_metrics["avg_confidence"],
                    "avg_relevance": quality_metrics["avg_relevance"]
                },
                "breakdown": {
                    "by_status": status_breakdown,
                    "by_type": type_breakdown,
                    "by_context": context_breakdown,
                    "by_expiration": expiration_breakdown
                },
                "features": {
                    "relationships": {
                        "count": relationship_count,
                        "percentage": round((relationship_count / total_memories * 100), 1)
                    },
                    "conflicts": {
                        "count": conflict_count,
                        "needs_attention": conflict_count > 0
                    },
                    "consolidations": {
                        "count": consolidated_count
                    }
                },
                "insights": insights,
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Failed to get analytics dashboard: {e}")
            return {"error": str(e)}
    
    def _calculate_health_score(
        self,
        total_memories: int,
        status_breakdown: Dict[str, int],
        quality_metrics: Dict[str, float],
        conflict_count: int
    ) -> int:
        """Calculate overall memory system health score (0-100)."""
        score = 100
        
        # Penalty for too many pending
        pending = status_breakdown.get("pending", 0)
        if total_memories > 0:
            pending_ratio = pending / total_memories
            if pending_ratio > 0.3:
                score -= 20
            elif pending_ratio > 0.2:
                score -= 10
        
        # Penalty for rejected memories
        rejected = status_breakdown.get("rejected", 0)
        if rejected > 10:
            score -= 10
        
        # Penalty for low confidence
        if quality_metrics["avg_confidence"] < 0.6:
            score -= 15
        elif quality_metrics["avg_confidence"] < 0.7:
            score -= 5
        
        # Penalty for low relevance
        if quality_metrics["avg_relevance"] < 0.6:
            score -= 15
        elif quality_metrics["avg_relevance"] < 0.7:
            score -= 5
        
        # Penalty for conflicts
        if conflict_count > 0:
            score -= min(conflict_count * 5, 20)
        
        # Bonus for high quality
        if quality_metrics["avg_importance"] > 0.7 and quality_metrics["avg_confidence"] > 0.8:
            score += 10
        
        return max(0, min(100, score))
    
    def _generate_insights(
        self,
        total_memories: int,
        status_breakdown: Dict[str, int],
        quality_metrics: Dict[str, float],
        conflict_count: int,
        health_score: int
    ) -> List[Dict[str, Any]]:
        """Generate actionable insights."""
        insights = []
        
        # Pending verification
        pending = status_breakdown.get("pending", 0)
        if pending > 10:
            insights.append({
                "type": "action_required",
                "priority": "high",
                "title": "Many memories awaiting verification",
                "message": f"{pending} memories need review. Verify them to improve accuracy.",
                "action_endpoint": "/api/v1/memory/pending"
            })
        
        # Conflicts
        if conflict_count > 0:
            insights.append({
                "type": "warning",
                "priority": "medium",
                "title": "Memory conflicts detected",
                "message": f"Found {conflict_count} contradicting memories. Resolve to avoid confusion.",
                "action_endpoint": "/api/v1/memory/conflicts/detect"
            })
        
        # Low confidence
        if quality_metrics["avg_confidence"] < 0.7:
            insights.append({
                "type": "warning",
                "priority": "medium",
                "title": "Low memory confidence",
                "message": f"Average confidence is {quality_metrics['avg_confidence']:.0%}. Review uncertain memories.",
                "action_endpoint": "/api/v1/memory/search"
            })
        
        # Low relevance (stale)
        if quality_metrics["avg_relevance"] < 0.6:
            insights.append({
                "type": "info",
                "priority": "low",
                "title": "Stale memories detected",
                "message": "Many memories have low relevance. Consider cleanup.",
                "action_endpoint": "/api/v1/memory/decay"
            })
        
        # Consolidation opportunity
        if total_memories > 100:
            insights.append({
                "type": "optimization",
                "priority": "low",
                "title": "Consolidation opportunity",
                "message": "Consider consolidating similar memories.",
                "action_endpoint": "/api/v1/memory/consolidate/suggestions"
            })
        
        # Health status
        if health_score >= 90:
            insights.append({
                "type": "success",
                "priority": "info",
                "title": "Excellent memory health",
                "message": f"Your memory system is in great shape ({health_score}/100)!",
                "action_endpoint": None
            })
        elif health_score < 70:
            insights.append({
                "type": "warning",
                "priority": "high",
                "title": "Memory health needs attention",
                "message": f"Health score is {health_score}/100. Address pending issues.",
                "action_endpoint": "/api/v1/memory/analytics/dashboard"
            })
        
        return insights
    
    async def export_memories(
        self,
        user_id: str,
        format: str = "json",
        include_relationships: bool = True,
        include_embeddings: bool = False,
        filter_by_status: Optional[List[str]] = None,
        filter_by_type: Optional[List[str]] = None,
        filter_by_context: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Phase 6: Export user memories to JSON or CSV format.
        
        Args:
            user_id: User ID
            format: Export format ("json" or "csv")
            include_relationships: Include relationship data
            include_embeddings: Include vector embeddings (large!)
            filter_by_status: Filter by status list
            filter_by_type: Filter by memory type list
            filter_by_context: Filter by context list
            
        Returns:
            Dictionary with export data and metadata
        """
        try:
            from app.models.mongo_models import UserMemoryDocument
            import csv
            from io import StringIO
            
            # Build query
            query = {"user_id": user_id}
            
            if filter_by_status:
                query["status"] = {"$in": filter_by_status}
            if filter_by_type:
                query["memory_type"] = {"$in": filter_by_type}
            if filter_by_context:
                query["contexts"] = {"$in": filter_by_context}
            
            # Fetch memories
            cursor = self.memories_collection.find(query).sort("created_at", -1)
            memories = []
            async for doc in cursor:
                memories.append(UserMemoryDocument(**doc))
            
            if format == "json":
                export_data = []
                for mem in memories:
                    mem_dict = {
                        "id": mem.id,
                        "content": mem.content,
                        "memory_type": mem.memory_type,
                        "importance": mem.importance,
                        "confidence": mem.confidence,
                        "tags": mem.tags,
                        "category": mem.category,
                        "contexts": mem.contexts,
                        "time_context": mem.time_context,
                        "location_context": mem.location_context,
                        "status": mem.status,
                        "verified_at": mem.verified_at.isoformat() if mem.verified_at else None,
                        "expiration_type": mem.expiration_type,
                        "expires_at": mem.expires_at.isoformat() if mem.expires_at else None,
                        "access_count": mem.access_count,
                        "relevance_score": mem.relevance_score,
                        "created_at": mem.created_at.isoformat(),
                        "updated_at": mem.updated_at.isoformat()
                    }
                    
                    if include_relationships:
                        mem_dict["relationships"] = mem.relationships
                        mem_dict["related_memories"] = mem.related_memories
                    
                    if include_embeddings:
                        mem_dict["embedding"] = mem.embedding
                    
                    export_data.append(mem_dict)
                
                return {
                    "format": "json",
                    "count": len(memories),
                    "data": export_data,
                    "exported_at": datetime.utcnow().isoformat(),
                    "filters": {
                        "status": filter_by_status,
                        "type": filter_by_type,
                        "context": filter_by_context
                    }
                }
            
            elif format == "csv":
                output = StringIO()
                writer = csv.writer(output)
                
                # Header
                headers = [
                    "id", "content", "type", "importance", "confidence",
                    "tags", "category", "contexts", "status", "expiration_type",
                    "access_count", "relevance_score", "created_at"
                ]
                writer.writerow(headers)
                
                # Rows
                for mem in memories:
                    writer.writerow([
                        mem.id,
                        mem.content,
                        mem.memory_type,
                        mem.importance,
                        mem.confidence,
                        "|".join(mem.tags),
                        mem.category or "",
                        "|".join(mem.contexts),
                        mem.status,
                        mem.expiration_type,
                        mem.access_count,
                        mem.relevance_score,
                        mem.created_at.isoformat()
                    ])
                
                csv_data = output.getvalue()
                output.close()
                
                return {
                    "format": "csv",
                    "count": len(memories),
                    "data": csv_data,
                    "exported_at": datetime.utcnow().isoformat()
                }
            
            else:
                raise ValueError(f"Unsupported format: {format}")
            
        except Exception as e:
            logger.error(f"Failed to export memories: {e}")
            raise
    
    async def import_memories(
        self,
        user_id: str,
        data: List[Dict[str, Any]],
        format: str = "json",
        merge_strategy: str = "skip_duplicates",
        validate_before_import: bool = True
    ) -> Dict[str, Any]:
        """
        Phase 6: Import memories from external data.
        
        Args:
            user_id: User ID
            data: List of memory dictionaries
            format: Import format ("json" or "csv")
            merge_strategy: How to handle duplicates
            validate_before_import: Validate data before importing
            
        Returns:
            Import statistics and results
        """
        try:
            from app.models.mongo_models import UserMemoryDocument
            from bson import ObjectId
            
            embedding_service = get_embedding_service()
            
            imported = 0
            skipped = 0
            updated = 0
            errors = []
            
            for i, mem_data in enumerate(data):
                try:
                    # Validate required fields
                    if validate_before_import:
                        if not mem_data.get("content"):
                            errors.append(f"Row {i}: Missing content")
                            skipped += 1
                            continue
                        if not mem_data.get("memory_type"):
                            errors.append(f"Row {i}: Missing memory_type")
                            skipped += 1
                            continue
                    
                    content = mem_data["content"]
                    
                    # Check for duplicates
                    existing = await self.memories_collection.find_one({
                        "user_id": user_id,
                        "content": content
                    })
                    
                    if existing:
                        if merge_strategy == "skip_duplicates":
                            skipped += 1
                            continue
                        elif merge_strategy == "update":
                            # Update existing memory
                            update_data = {
                                "importance": mem_data.get("importance", existing.get("importance", 0.5)),
                                "confidence": mem_data.get("confidence", existing.get("confidence", 1.0)),
                                "tags": mem_data.get("tags", existing.get("tags", [])),
                                "updated_at": datetime.utcnow()
                            }
                            await self.memories_collection.update_one(
                                {"_id": existing["_id"]},
                                {"$set": update_data}
                            )
                            updated += 1
                            continue
                        # else: create_new - fall through
                    
                    # Generate embedding if not provided
                    embedding = mem_data.get("embedding")
                    if not embedding:
                        embedding = embedding_service.generate_embedding(content)
                    
                    # Create new memory
                    new_memory = UserMemoryDocument(
                        user_id=user_id,
                        content=content,
                        memory_type=mem_data.get("memory_type", "fact"),
                        importance=mem_data.get("importance", 0.5),
                        confidence=mem_data.get("confidence", 0.8),
                        tags=mem_data.get("tags", []),
                        category=mem_data.get("category"),
                        contexts=mem_data.get("contexts", []),
                        time_context=mem_data.get("time_context"),
                        location_context=mem_data.get("location_context"),
                        embedding=embedding,
                        extraction_method="import",
                        status="confirmed",  # Imported memories are pre-confirmed
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    await self.memories_collection.insert_one(
                        new_memory.model_dump(by_alias=True, exclude_none=True)
                    )
                    imported += 1
                    
                except Exception as e:
                    errors.append(f"Row {i}: {str(e)}")
                    logger.error(f"Import error for row {i}: {e}")
            
            logger.info(
                f"Import completed: {imported} imported, {updated} updated, "
                f"{skipped} skipped, {len(errors)} errors"
            )
            
            return {
                "success": True,
                "imported": imported,
                "updated": updated,
                "skipped": skipped,
                "errors": errors,
                "total_processed": len(data)
            }
            
        except Exception as e:
            logger.error(f"Failed to import memories: {e}")
            raise
    
    async def set_privacy_settings(
        self,
        user_id: str,
        memory_ids: List[str],
        is_private: bool,
        shared_with: Optional[List[str]] = None
    ) -> int:
        """
        Phase 6: Update privacy settings for memories.
        
        Args:
            user_id: User ID
            memory_ids: List of memory IDs to update
            is_private: Mark as private
            shared_with: Optional list of user IDs to share with
            
        Returns:
            Number of memories updated
        """
        try:
            from bson import ObjectId
            
            update_data = {
                "is_private": is_private,
                "updated_at": datetime.utcnow()
            }
            
            if shared_with is not None:
                update_data["shared_with"] = shared_with
            
            result = await self.memories_collection.update_many(
                {
                    "_id": {"$in": [ObjectId(mid) for mid in memory_ids]},
                    "user_id": user_id
                },
                {"$set": update_data}
            )
            
            logger.info(
                f"Updated privacy for {result.modified_count} memories "
                f"(private: {is_private})"
            )
            
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Failed to update privacy settings: {e}")
            return 0
    
    async def bulk_delete(
        self,
        user_id: str,
        memory_ids: Optional[List[str]] = None,
        filter_criteria: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Phase 6: Bulk delete memories.
        
        Args:
            user_id: User ID
            memory_ids: Optional list of specific memory IDs
            filter_criteria: Optional filter (e.g., {"status": "rejected"})
            
        Returns:
            Number of memories deleted
        """
        try:
            from bson import ObjectId
            
            query = {"user_id": user_id}
            
            if memory_ids:
                query["_id"] = {"$in": [ObjectId(mid) for mid in memory_ids]}
            
            if filter_criteria:
                query.update(filter_criteria)
            
            result = await self.memories_collection.delete_many(query)
            
            logger.info(f"Bulk deleted {result.deleted_count} memories for user {user_id}")
            
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to bulk delete memories: {e}")
            return 0


# Global instance
memory_service = MemoryService()


async def get_memory_service():
    """Dependency injection for memory service."""
    return memory_service
