"""
MongoDB document models using Pydantic
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, EmailStr
from bson import ObjectId


class UserDocument(BaseModel):
    """MongoDB document for user authentication and authorization."""
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    is_admin: bool = False
    verification_method: Optional[str] = None  # "otp" or "token"
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    verification_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            else:
                raise ValueError("Invalid ObjectId string")
        raise ValueError("Invalid ObjectId")

    model_config = {
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class RevokedTokenDocument(BaseModel):
    """MongoDB document for revoked tokens (logout functionality)."""
    id: Optional[str] = Field(default=None, alias="_id")
    token: str
    expires_at: Optional[datetime] = None
    revoked_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            else:
                raise ValueError("Invalid ObjectId string")
        raise ValueError("Invalid ObjectId")

    model_config = {
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class MessageDocument(BaseModel):
    """MongoDB document for chat messages."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str  # ObjectId string
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    content_type: str = "text"  # "text", "image", "file"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    token_count: Optional[int] = None
    model_used: Optional[str] = None
    provider_used: Optional[str] = None
    
    # Reactions and ratings
    reactions: Dict[str, int] = Field(default_factory=lambda: {"like": 0, "dislike": 0})
    user_reactions: Dict[str, str] = Field(default_factory=dict)  # user_id: reaction_type
    rating: Optional[int] = Field(default=None, ge=1, le=5)  # 1-5 star rating
    
    # Conversation branching
    parent_message_id: Optional[str] = None  # ID of message this branches from
    branch_id: Optional[str] = None  # Unique branch identifier
    is_edited: bool = False
    edit_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            else:
                raise ValueError("Invalid ObjectId string")
        raise ValueError("Invalid ObjectId")

    model_config = {
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class SessionDocument(BaseModel):
    """MongoDB document for conversation sessions."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str  # ObjectId string
    session_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    category: str = "general"
    status: str = "active"  # "active", "archived", "deleted"
    is_pinned: bool = False
    is_favorite: bool = False

    # Statistics
    message_count: int = 0
    user_message_count: int = 0
    assistant_message_count: int = 0
    total_tokens: int = 0
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    # Context and summary
    summary: Optional[str] = None
    key_topics: List[str] = Field(default_factory=list)
    sentiment_score: Optional[float] = None
    
    # Branching support
    branches: List[Dict[str, Any]] = Field(default_factory=list)  # List of branch metadata
    active_branch_id: Optional[str] = None  # Currently active branch

    # Memory extraction tracking
    last_memory_extraction: Optional[datetime] = None  # When memories were last extracted
    extraction_message_count: int = 0  # Message count at last extraction
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            else:
                raise ValueError("Invalid ObjectId string")
        raise ValueError("Invalid ObjectId")

    model_config = {
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class SessionCreateRequest(BaseModel):
    """Request model for creating a new session."""
    title: Optional[str] = None
    category: str = "general"
    tags: List[str] = Field(default_factory=list)


class SessionUpdateRequest(BaseModel):
    """Request model for updating a session."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    is_favorite: Optional[bool] = None
    status: Optional[str] = None


class SessionSearchRequest(BaseModel):
    """Request model for searching sessions."""
    query: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str = "active"
    is_pinned: Optional[bool] = None
    is_favorite: Optional[bool] = None
    limit: int = 20
    skip: int = 0
    sort_by: str = "last_activity"
    sort_order: str = "desc"


class BulkOperationRequest(BaseModel):
    """Request model for bulk operations on sessions."""
    session_ids: List[str]
    operation: str  # "archive", "delete", "tag", "untag"
    tag: Optional[str] = None


class MessageSearchRequest(BaseModel):
    """Request model for searching messages."""
    query: str
    session_id: Optional[str] = None
    limit: int = 50
    skip: int = 0


class ConversationAnalytics(BaseModel):
    """Analytics data for a conversation."""
    session_id: str
    message_count: int
    user_message_count: int
    assistant_message_count: int
    total_tokens: int
    average_tokens_per_message: float
    duration_seconds: Optional[float] = None
    key_topics: List[str] = Field(default_factory=list)
    sentiment_score: Optional[float] = None


class UserAnalytics(BaseModel):
    """Analytics data for a user."""
    user_id: str  # ObjectId string
    total_sessions: int
    total_messages: int
    total_tokens: int
    average_messages_per_session: float
    active_days: int
    last_activity: Optional[datetime] = None
    favorite_topics: List[str] = Field(default_factory=list)
    most_used_models: List[Dict[str, Any]] = Field(default_factory=list)


class MessageReactionRequest(BaseModel):
    """Request model for adding/updating message reactions."""
    reaction_type: str  # "like", "dislike", "love", "laugh", "confused"
    
    
class MessageRatingRequest(BaseModel):
    """Request model for rating a message."""
    rating: int = Field(ge=1, le=5)
    

class MessageBranchRequest(BaseModel):
    """Request model for creating a conversation branch."""
    new_content: str  # Edited message content
    branch_name: Optional[str] = None  # Optional branch name


class BranchResponse(BaseModel):
    """Response model for branch information."""
    branch_id: str
    parent_message_id: str
    branch_name: Optional[str] = None
    created_at: datetime
    message_count: int


class UserMemoryDocument(BaseModel):
    """MongoDB document for user long-term memories."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str  # ObjectId string
    memory_type: str  # "preference", "fact", "topic", "interaction_pattern", "skill", "context"
    content: str  # The actual memory content
    
    # Semantic search support
    embedding: Optional[List[float]] = None  # Vector embedding for semantic search
    
    # Memory metadata
    importance: float = Field(default=0.5, ge=0.0, le=1.0)  # 0.0 = low, 1.0 = critical
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)  # How confident we are about this memory
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None  # "coding", "personal", "professional", etc.
    
    # Contextual memory (Phase 2)
    contexts: List[str] = Field(default_factory=list)  # "work", "personal", "technical", "casual", "learning", etc.
    time_context: Optional[str] = None  # "morning_routine", "work_hours", "evening", "weekend", etc.
    location_context: Optional[str] = None  # "home", "office", "travel", etc.
    
    # Verification status
    status: str = "pending"  # "pending", "confirmed", "rejected", "corrected"
    verified_at: Optional[datetime] = None  # When user verified this memory
    verification_history: List[Dict[str, Any]] = Field(default_factory=list)  # Track changes
    
    # Source tracking
    source_session_id: Optional[str] = None  # Session where this memory was extracted
    source_message_id: Optional[str] = None  # Message where this memory was extracted
    extraction_method: str = "manual"  # "manual", "ai_extraction", "user_provided"
    
    # Usage tracking
    access_count: int = 0  # How many times this memory was used
    last_accessed: Optional[datetime] = None
    last_reinforced: Optional[datetime] = None  # When memory was reinforced/confirmed
    
    # Temporal decay
    relevance_score: float = 1.0  # Decreases over time if not accessed/reinforced
    expires_at: Optional[datetime] = None  # Optional expiration for temporary memories
    
    # Phase 4: Smart Memory Management
    expiration_type: str = "permanent"  # "temporary", "seasonal", "permanent"
    consolidation_count: int = 0  # Times this memory was merged from others
    is_consolidated: bool = False  # True if this is a consolidated memory
    consolidated_from: List[str] = Field(default_factory=list)  # IDs of memories merged into this one
    conflict_detected: bool = False  # True if conflicts with other memories
    conflict_ids: List[str] = Field(default_factory=list)  # IDs of conflicting memories
    last_conflict_check: Optional[datetime] = None  # When conflicts were last checked
    
    # Phase 6: Privacy and Advanced Features
    is_private: bool = False  # Private memories not shared/exported
    shared_with: List[str] = Field(default_factory=list)  # User IDs with access
    encryption_key_id: Optional[str] = None  # For end-to-end encryption
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Flexible metadata storage
    version: int = 1  # Schema version for migrations
    
    # Relationships (Phase 3: Knowledge Graph)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)  # Structured relationships
    # Relationship structure: {"memory_id": str, "type": str, "strength": float, "created_at": datetime}
    # Types: "relates_to", "supersedes", "part_of", "contradicts", "supports", "similar_to"
    related_memories: List[str] = Field(default_factory=list)  # IDs of related memories (backward compat)
    superseded_by: Optional[str] = None  # ID of memory that replaces this one
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', mode='before')
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            else:
                raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId")

    model_config = {
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "populate_by_name": True,  # Allow using both 'id' and '_id'
        "by_alias": False  # Serialize as 'id' not '_id' in JSON
    }


class MemoryCreateRequest(BaseModel):
    """Request model for creating a new memory."""
    memory_type: str
    content: str
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    source_session_id: Optional[str] = None
    extraction_method: str = "manual"


class MemoryUpdateRequest(BaseModel):
    """Request model for updating a memory."""
    content: Optional[str] = None
    importance: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    tags: Optional[List[str]] = None
    category: Optional[str] = None


class MemorySearchRequest(BaseModel):
    """Request model for searching memories."""
    query: Optional[str] = None  # Semantic search query
    memory_type: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    min_importance: float = 0.0
    min_confidence: float = 0.0
    limit: int = 20
    skip: int = 0
    sort_by: str = "relevance_score"
    sort_order: str = "desc"


class MemoryExtractionRequest(BaseModel):
    """Request model for extracting memories from conversation."""
    session_id: str
    message_limit: int = 50  # How many recent messages to analyze


class MemoryVerificationRequest(BaseModel):
    """Request model for verifying a memory."""
    action: str  # "confirm", "reject", "correct"
    corrected_content: Optional[str] = None
    corrected_importance: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    corrected_tags: Optional[List[str]] = None
    feedback: Optional[str] = None


class MemoryRelationshipRequest(BaseModel):
    """Request model for linking memories (Phase 3)."""
    target_memory_id: str  # Memory to link to
    relationship_type: str  # "relates_to", "supersedes", "part_of", "contradicts", "supports", "similar_to"
    strength: float = Field(default=0.8, ge=0.0, le=1.0)  # Relationship strength
    bidirectional: bool = True  # Create reverse relationship


class ConflictResolutionRequest(BaseModel):
    """Request model for resolving memory conflicts (Phase 4)."""
    winning_memory_id: str  # Memory to keep
    losing_memory_id: str  # Memory to deprecate/remove
    resolution_action: str  # "keep_winning", "merge", "mark_contradiction"


class MemoryExportRequest(BaseModel):
    """Request model for exporting memories (Phase 6)."""
    format: str = "json"  # "json" or "csv"
    include_relationships: bool = True
    include_embeddings: bool = False
    filter_by_status: Optional[List[str]] = None
    filter_by_type: Optional[List[str]] = None
    filter_by_context: Optional[List[str]] = None


class MemoryImportRequest(BaseModel):
    """Request model for importing memories (Phase 6)."""
    format: str = "json"  # "json" or "csv"
    merge_strategy: str = "skip_duplicates"  # "skip_duplicates", "update", "create_new"
    validate_before_import: bool = True
