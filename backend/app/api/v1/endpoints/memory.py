"""
Memory Management API Endpoints
"""
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.mongo_models import (
    UserMemoryDocument,
    MemoryCreateRequest,
    MemoryUpdateRequest,
    MemorySearchRequest,
    MemoryExtractionRequest,
    MemoryVerificationRequest,
    MemoryRelationshipRequest,
    ConflictResolutionRequest,
    MemoryExportRequest,
    MemoryImportRequest
)
from app.services.memory_service import MemoryService, get_memory_service
from app.core.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/memory", tags=["memory"])


@router.post("/", response_model=UserMemoryDocument, status_code=status.HTTP_201_CREATED)
async def create_memory(
    request: MemoryCreateRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Create a new memory for the current user.
    
    Memory types:
    - preference: User preferences and likes/dislikes
    - fact: Concrete facts about the user
    - topic: Topics of interest
    - interaction_pattern: Communication patterns
    - skill: User skills and expertise
    - context: Contextual information
    """
    try:
        memory = await memory_service.create_memory(current_user_id, request)
        return memory
    except Exception as e:
        logger.error(f"Failed to create memory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create memory: {str(e)}"
        )


@router.get("/", response_model=List[UserMemoryDocument])
async def list_memories(
    include_expired: bool = False,
    memory_type: str = None,
    category: str = None,
    limit: int = 100,
    skip: int = 0,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    List all memories for the current user with optional filters.
    
    Query Parameters:
    - include_expired: Include expired memories (default: False)
    - memory_type: Filter by memory type (preference, fact, topic, etc.)
    - category: Filter by category
    - limit: Maximum number of results (default: 100, max: 500)
    - skip: Number of results to skip for pagination
    """
    # Build search request from query parameters
    search_request = MemorySearchRequest(
        query=None,  # No text search, just filtering
        memory_type=memory_type,
        category=category,
        limit=min(limit, 500),  # Cap at 500
        skip=skip,
        include_expired=include_expired
    )
    
    memories = await memory_service.search_memories(current_user_id, search_request)
    return memories


@router.get("/pending")
async def get_pending_memories(
    limit: int = 10,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Get memories pending user verification.
    
    These are typically AI-extracted memories that need user confirmation.
    
    Query Parameters:
    - limit: Maximum number of pending memories to return (default: 10)
    """
    memories = await memory_service.get_pending_memories(current_user_id, limit)
    
    # Explicitly serialize to ensure 'id' field is used instead of '_id'
    return [memory.model_dump(mode='json', by_alias=False) for memory in memories]


@router.get("/{memory_id}", response_model=UserMemoryDocument)
async def get_memory(
    memory_id: str,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """Get a specific memory by ID."""
    memory = await memory_service.get_memory(current_user_id, memory_id)
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    return memory


@router.put("/{memory_id}", response_model=Dict[str, Any])
async def update_memory(
    memory_id: str,
    request: MemoryUpdateRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """Update an existing memory."""
    success = await memory_service.update_memory(
        current_user_id, memory_id, request
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found or update failed"
        )
    
    return {"success": True, "message": "Memory updated successfully"}


@router.delete("/{memory_id}", response_model=Dict[str, Any])
async def delete_memory(
    memory_id: str,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """Delete a memory."""
    success = await memory_service.delete_memory(current_user_id, memory_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    return {"success": True, "message": "Memory deleted successfully"}


@router.post("/search", response_model=List[UserMemoryDocument])
async def search_memories(
    request: MemorySearchRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Search user memories with filtering.
    
    Supports:
    - Text search (full-text)
    - Filter by type, category, tags
    - Minimum importance/confidence thresholds
    - Sorting and pagination
    """
    memories = await memory_service.search_memories(current_user_id, request)
    return memories


@router.get("/relevant/{context}", response_model=List[UserMemoryDocument])
async def get_relevant_memories(
    context: str,
    limit: int = 5,
    min_importance: float = 0.3,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Get memories relevant to a given context.
    Currently uses keyword matching; will upgrade to semantic search in Phase 2.
    """
    memories = await memory_service.get_relevant_memories(
        current_user_id, context, limit, min_importance
    )
    return memories


@router.post("/extract", response_model=List[UserMemoryDocument])
async def extract_memories(
    request: MemoryExtractionRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Extract memories from a conversation using AI.
    
    Analyzes recent messages in a session and automatically identifies:
    - User preferences
    - Important facts
    - Topics of interest
    - Interaction patterns
    
    Uses Groq (Llama 3.1 8B) for fast, free extraction.
    """
    memories = await memory_service.extract_memories_from_conversation(
        current_user_id,
        request.session_id,
        request.message_limit
    )
    return memories


@router.post("/{memory_id}/reinforce", response_model=Dict[str, Any])
async def reinforce_memory(
    memory_id: str,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Reinforce a memory (increases relevance when confirmed/used).
    Call this when a memory proves useful or is confirmed by the user.
    """
    success = await memory_service.reinforce_memory(current_user_id, memory_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    return {"success": True, "message": "Memory reinforced successfully"}


@router.post("/{memory_id}/verify", response_model=Dict[str, Any])
async def verify_memory(
    memory_id: str,
    request: MemoryVerificationRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Verify a memory: confirm, reject, or correct it.
    
    Actions:
    - confirm: Mark memory as accurate (confidence = 1.0)
    - reject: Mark memory as incorrect (will be hidden/deleted)
    - correct: Update memory content with corrections
    
    Body:
    - action: "confirm" | "reject" | "correct"
    - corrected_content: Required if action is "correct"
    - corrected_importance: Optional importance adjustment
    - corrected_tags: Optional tag updates
    - feedback: Optional user feedback
    """
    success = await memory_service.verify_memory(
        user_id=current_user_id,
        memory_id=memory_id,
        action=request.action,
        corrected_content=request.corrected_content,
        corrected_importance=request.corrected_importance,
        corrected_tags=request.corrected_tags,
        feedback=request.feedback
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found or verification failed"
        )
    
    action_messages = {
        "confirm": "Memory confirmed successfully",
        "reject": "Memory rejected successfully",
        "correct": "Memory corrected successfully"
    }
    
    return {
        "success": True,
        "message": action_messages.get(request.action, "Memory verified successfully")
    }


@router.get("/by-context/{context}", response_model=List[UserMemoryDocument])
async def get_memories_by_context(
    context: str,
    limit: int = 20,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 2: Get memories filtered by specific context.
    
    Contexts: work, personal, technical, casual, learning, creative, problem_solving
    
    Query Parameters:
    - context: Context to filter by (e.g., "work", "technical")
    - limit: Maximum memories to return (default: 20)
    """
    try:
        query = {
            "user_id": current_user_id,
            "contexts": context,
            "status": {"$ne": "rejected"}  # Exclude rejected
        }
        
        cursor = memory_service.memories_collection.find(query).sort([
            ("importance", -1),
            ("relevance_score", -1)
        ]).limit(limit)
        
        memories = []
        async for doc in cursor:
            memories.append(UserMemoryDocument(**doc))
        
        logger.info(f"Found {len(memories)} memories for context '{context}'")
        return memories
        
    except Exception as e:
        logger.error(f"Failed to get memories by context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve memories: {str(e)}"
        )


@router.post("/decay", response_model=Dict[str, Any])
async def decay_memories(
    decay_rate: float = 0.01,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Apply temporal decay to memories not accessed recently.
    Memories become less relevant over time if not reinforced.
    
    This should be called periodically (e.g., daily background job).
    """
    count = await memory_service.decay_memories(current_user_id, decay_rate)
    return {
        "success": True,
        "message": f"Applied decay to {count} memories"
    }


@router.get("/summary/stats", response_model=Dict[str, Any])
async def get_memory_summary(
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Get summary statistics about user's memories.
    
    Returns:
    - Total memory count
    - Breakdown by type (preference, fact, topic, etc.)
    - Average importance and confidence by type
    """
    summary = await memory_service.get_memory_summary(current_user_id)
    return summary


@router.post("/{memory_id}/link", response_model=Dict[str, Any])
async def link_memories(
    memory_id: str,
    request: MemoryRelationshipRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 3: Create a relationship between two memories.
    
    Relationship types:
    - relates_to: General relationship between memories
    - supersedes: This memory replaces/updates another memory
    - part_of: This memory is a component of a larger concept
    - contradicts: This memory contradicts another memory
    - supports: This memory provides evidence for another
    - similar_to: Memories are very similar in content
    
    Query Parameters:
    - bidirectional: If True (default), creates reverse relationship
    """
    success = await memory_service.link_memories(
        user_id=current_user_id,
        source_memory_id=memory_id,
        target_memory_id=request.target_memory_id,
        relationship_type=request.relationship_type,
        strength=request.strength,
        bidirectional=request.bidirectional
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found or linking failed"
        )
    
    return {
        "success": True,
        "message": f"Memories linked with relationship: {request.relationship_type}"
    }


@router.get("/{memory_id}/related", response_model=List[Dict[str, Any]])
async def get_related_memories(
    memory_id: str,
    relationship_types: str = None,  # Comma-separated types
    min_strength: float = 0.5,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 3: Get memories related to a specific memory.
    
    Query Parameters:
    - relationship_types: Comma-separated list of types to filter (e.g., "relates_to,similar_to")
    - min_strength: Minimum relationship strength (0.0-1.0)
    
    Returns list of related memories with relationship information.
    """
    # Parse relationship types
    types_filter = None
    if relationship_types:
        types_filter = [t.strip() for t in relationship_types.split(",")]
    
    related = await memory_service.find_related_memories(
        user_id=current_user_id,
        memory_id=memory_id,
        relationship_types=types_filter,
        min_strength=min_strength
    )
    
    # Convert UserMemoryDocument to dict for JSON serialization
    result = []
    for item in related:
        result.append({
            "memory": item["memory"].model_dump(by_alias=True),
            "relationship_type": item["relationship_type"],
            "relationship_strength": item["relationship_strength"],
            "created_at": item.get("created_at")
        })
    
    return result


@router.get("/{memory_id}/graph", response_model=Dict[str, Any])
async def get_memory_graph(
    memory_id: str,
    max_depth: int = 2,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 3: Get relationship graph for a memory (breadth-first traversal).
    
    Returns a graph structure with nodes (memories) and edges (relationships).
    Useful for visualizing memory connections.
    
    Query Parameters:
    - max_depth: Maximum traversal depth (default: 2)
    """
    graph = await memory_service.get_memory_graph(
        user_id=current_user_id,
        memory_id=memory_id,
        max_depth=max_depth
    )
    
    return graph


@router.get("/conflicts/detect", response_model=List[Dict[str, Any]])
async def detect_memory_conflicts(
    memory_id: str = None,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 4: Detect contradicting memories.
    
    Finds memories that contradict each other using semantic similarity
    and contradiction pattern matching.
    
    Query Parameters:
    - memory_id: Optional - check specific memory, or all if not provided
    """
    conflicts = await memory_service.detect_conflicts(
        user_id=current_user_id,
        memory_id=memory_id
    )
    
    return conflicts


@router.post("/consolidate", response_model=UserMemoryDocument)
async def consolidate_memories(
    memory_ids: List[str],
    consolidated_content: str = None,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 4: Consolidate multiple similar memories into one.
    
    Takes 2+ memory IDs and merges them into a single consolidated memory.
    Original memories are marked as superseded.
    
    Body:
    - memory_ids: List of memory IDs to consolidate (min 2)
    - consolidated_content: Optional custom content for merged memory
    """
    if len(memory_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Need at least 2 memories to consolidate"
        )
    
    consolidated = await memory_service.consolidate_memories(
        user_id=current_user_id,
        memory_ids=memory_ids,
        consolidated_content=consolidated_content
    )
    
    if not consolidated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to consolidate memories"
        )
    
    return consolidated


@router.get("/consolidate/suggestions", response_model=List[Dict[str, Any]])
async def get_consolidation_suggestions(
    min_similarity: float = 0.85,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 4: Get suggestions for memories that should be consolidated.
    
    Finds groups of very similar memories (similarity >= min_similarity)
    that could be merged into single memories.
    
    Query Parameters:
    - min_similarity: Minimum similarity threshold (default: 0.85)
    """
    suggestions = await memory_service.suggest_consolidations(
        user_id=current_user_id,
        min_similarity=min_similarity
    )
    
    return suggestions


@router.post("/classify-expiration", response_model=Dict[str, Any])
async def classify_memory_expiration(
    memory_id: str = None,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 4: Classify memories as temporary, seasonal, or permanent.
    
    Uses content analysis to determine appropriate expiration type:
    - temporary: expires in 90 days (currently, right now, this week)
    - seasonal: expires in 1 year (this year, this season, holiday)
    - permanent: no expiration (default)
    
    Query Parameters:
    - memory_id: Optional - classify specific memory, or all if not provided
    """
    result = await memory_service.classify_expiration_type(
        user_id=current_user_id,
        memory_id=memory_id
    )
    
    return {
        "success": True,
        "classified": result
    }


@router.get("/analytics/dashboard", response_model=Dict[str, Any])
async def get_analytics_dashboard(
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 5: Get comprehensive analytics dashboard.
    
    Returns:
    - Overview metrics (total, health score, averages)
    - Breakdown by status, type, context, expiration
    - Feature usage (relationships, conflicts, consolidations)
    - Actionable insights with priority levels
    
    Health Score (0-100):
    - 90-100: Excellent
    - 70-89: Good
    - 50-69: Needs attention
    - 0-49: Critical
    """
    dashboard = await memory_service.get_analytics_dashboard(current_user_id)
    return dashboard


@router.get("/analytics/top", response_model=List[Dict[str, Any]])
async def get_top_memories(
    metric: str = "access_count",
    limit: int = 10,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 5: Get top memories by various metrics.
    
    Query Parameters:
    - metric: Sort by (access_count, importance, relevance_score, confidence)
    - limit: Number of memories to return (default: 10, max: 50)
    
    Useful for finding:
    - Most accessed memories (access_count)
    - Most important memories (importance)
    - Most relevant memories (relevance_score)
    - Most confident memories (confidence)
    """
    if limit > 50:
        limit = 50
    
    from app.models.mongo_models import UserMemoryDocument
    from bson import ObjectId
    
    valid_metrics = ["access_count", "importance", "relevance_score", "confidence"]
    if metric not in valid_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric. Must be one of: {', '.join(valid_metrics)}"
        )
    
    cursor = memory_service.memories_collection.find({
        "user_id": current_user_id,
        "status": {"$ne": "rejected"}
    }).sort(metric, -1).limit(limit)
    
    top_memories = []
    async for doc in cursor:
        memory = UserMemoryDocument(**doc)
        top_memories.append({
            "id": memory.id,
            "content": memory.content,
            "type": memory.memory_type,
            "importance": memory.importance,
            "confidence": memory.confidence,
            "relevance_score": memory.relevance_score,
            "access_count": memory.access_count,
            "contexts": memory.contexts,
            "created_at": memory.created_at,
            "last_accessed": memory.last_accessed,
            "metric_value": getattr(memory, metric, 0)
        })
    
    return top_memories


@router.post("/export", response_model=Dict[str, Any])
async def export_memories(
    request: MemoryExportRequest,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 6: Export memories to JSON or CSV format.
    
    Body:
    - format: "json" or "csv"
    - include_relationships: Include relationship data (default: true)
    - include_embeddings: Include vector embeddings (default: false)
    - filter_by_status: Filter by status list
    - filter_by_type: Filter by memory type list
    - filter_by_context: Filter by context list
    """
    try:
        export_data = await memory_service.export_memories(
            user_id=current_user_id,
            format=request.format,
            include_relationships=request.include_relationships,
            include_embeddings=request.include_embeddings,
            filter_by_status=request.filter_by_status,
            filter_by_type=request.filter_by_type,
            filter_by_context=request.filter_by_context
        )
        return export_data
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/import", response_model=Dict[str, Any])
async def import_memories(
    data: List[Dict[str, Any]],
    format: str = "json",
    merge_strategy: str = "skip_duplicates",
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 6: Import memories from external data.
    
    Body: List of memory dictionaries
    
    Query Parameters:
    - format: "json" or "csv"
    - merge_strategy: "skip_duplicates", "update", "create_new"
    """
    try:
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided"
            )
        
        result = await memory_service.import_memories(
            user_id=current_user_id,
            data=data,
            format=format,
            merge_strategy=merge_strategy
        )
        return result
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


@router.post("/privacy", response_model=Dict[str, Any])
async def update_privacy_settings(
    memory_ids: List[str],
    is_private: bool,
    shared_with: List[str] = None,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 6: Update privacy settings for memories.
    """
    if not memory_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No memory IDs provided"
        )
    
    updated = await memory_service.set_privacy_settings(
        user_id=current_user_id,
        memory_ids=memory_ids,
        is_private=is_private,
        shared_with=shared_with
    )
    
    return {
        "success": True,
        "updated": updated
    }


@router.delete("/bulk", response_model=Dict[str, Any])
async def bulk_delete_memories(
    memory_ids: List[str] = None,
    filter_status: str = None,
    confirm: bool = False,
    current_user_id: str = Depends(get_current_user),
    memory_service: MemoryService = Depends(get_memory_service)
):
    """
    Phase 6: Bulk delete memories. Requires confirm=true.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true"
        )
    
    filter_criteria = {}
    if filter_status:
        filter_criteria["status"] = filter_status
    
    deleted = await memory_service.bulk_delete(
        user_id=current_user_id,
        memory_ids=memory_ids,
        filter_criteria=filter_criteria if filter_criteria else None
    )
    
    return {
        "success": True,
        "deleted": deleted
    }