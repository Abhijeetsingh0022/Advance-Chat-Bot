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
