# Advanced AI Chat Bot — FastAPI Backend

A production-ready FastAPI backend for an intelligent chat bot with advanced memory management, multi-provider AI routing, real-time streaming, and comprehensive analytics.

## 🌟 Key Features

### Core Capabilities
- **🔐 Secure Authentication**: JWT-based auth with bcrypt password hashing
- **💬 Multi-Turn Conversations**: Persistent chat sessions with context management
- **🤖 Multi-Provider AI**: OpenRouter, Gemini, Groq with intelligent routing
- **🧠 Advanced Memory System**: 6-phase semantic memory with verification workflow
- **⚡ Real-Time Streaming**: WebSocket and SSE support for token-by-token responses
- **🛠️ Function Calling**: Weather API, web search, and custom tool integration
- **📊 Analytics Dashboard**: User behavior tracking and memory insights
- **🔄 Session Branching**: Create conversation branches from any message
- **🎯 Smart Rate Limiting**: Per-user and per-endpoint rate limits
- **📧 Email Integration**: OTP verification and notifications

### Advanced Memory Features (6-Phase Implementation)
1. **Phase 1**: Memory extraction, storage, and verification workflow
2. **Phase 2**: Semantic search with embeddings (OpenAI text-embedding-3-small)
3. **Phase 3**: Memory relationships and knowledge graphs
4. **Phase 4**: Conflict detection and consolidation
5. **Phase 5**: Analytics dashboard and insights
6. **Phase 6**: Privacy controls, import/export, bulk operations

## 📋 Table of Contents

- [Quickstart](#quickstart)
- [Architecture Overview](#architecture-overview)
- [Environment Configuration](#environment-configuration)
- [Memory System](#memory-system)
- [AI Provider Integration](#ai-provider-integration)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🚀 Quickstart (5 minutes)

1. **Clone and navigate to the repository**:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Create and activate a Python virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Configuration below)
   ```

5. **Initialize the database**:
   ```bash
   # Run Alembic migrations for SQL database
   alembic upgrade head
   
   # MongoDB will auto-create collections on first use
   ```

6. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Access the API**:
   - Interactive docs: http://127.0.0.1:8000/docs
   - Alternative docs: http://127.0.0.1:8000/redoc
   - Health check: http://127.0.0.1:8000/api/v1/health

## 🏗️ Architecture Overview

### Technology Stack
- **Framework**: FastAPI 0.104+ (async/await, Pydantic v2)
- **Databases**: 
  - PostgreSQL/SQLite (user auth, sessions)
  - MongoDB (chat history, memories, analytics)
- **AI Providers**: OpenRouter, Google Gemini, Groq
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Authentication**: JWT (HS256) with bcrypt password hashing
- **Email**: Gmail SMTP with app passwords
- **Rate Limiting**: In-memory token bucket algorithm

### Project Structure
```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/      # API route handlers
│   │           ├── auth.py     # Registration, login, OTP
│   │           ├── chat.py     # Chat, streaming, branching
│   │           ├── memory.py   # Memory CRUD, search, verification
│   │           ├── analytics.py # User analytics dashboard
│   │           ├── settings.py # User settings management
│   │           ├── admin.py    # Admin operations
│   │           └── health.py   # Health check endpoint
│   ├── core/
│   │   ├── config.py           # Pydantic settings
│   │   ├── security.py         # JWT, password hashing
│   │   └── deps.py             # Dependency injection
│   ├── db/
│   │   ├── session.py          # SQL database session
│   │   └── mongodb.py          # MongoDB connection
│   ├── models/
│   │   ├── sql_models.py       # SQLAlchemy models (User)
│   │   └── mongo_models.py     # Pydantic models for MongoDB
│   ├── schemas/
│   │   ├── validation.py       # Request/response schemas
│   │   └── error.py            # Error response models
│   ├── services/
│   │   ├── ai_provider.py      # AI provider abstraction
│   │   ├── ai_provider_streaming.py # Streaming responses
│   │   ├── model_router.py     # Dynamic model selection
│   │   ├── memory_service.py   # Memory operations
│   │   ├── embedding_service.py # Vector embeddings
│   │   ├── analytics_service.py # Analytics tracking
│   │   ├── session_manager.py  # Chat session management
│   │   ├── email.py            # Email notifications
│   │   └── function_calling.py # Tool/function execution
│   ├── middleware/
│   │   ├── rate_limit.py       # Rate limiting middleware
│   │   └── analytics.py        # Analytics tracking middleware
│   ├── templates/
│   │   ├── otp_verification.html      # OTP email template
│   │   └── token_verification.html    # Token email template
│   └── utils/
│       ├── exceptions.py       # Custom exception classes
│       └── cleanup.py          # Background cleanup tasks
├── alembic/
│   ├── versions/               # Database migrations
│   └── env.py                  # Alembic configuration
├── requirements.txt            # Python dependencies
├── alembic.ini                 # Alembic config file
└── README.md                   # This file
```

## ⚙️ Environment Configuration

Create a `.env` file from `.env.example`. All configuration uses Pydantic Settings with validation.

### Required Variables

#### Database Configuration
```env
# SQL Database (User Auth, Sessions)
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
# or for development:
DATABASE_URL=sqlite:///./chatbot.db

# MongoDB (Chat History, Memories, Analytics)
MONGO_URI=mongodb://localhost:27017/chatbot
MONGO_DATABASE=chatbot
```

#### Security (CRITICAL)
```env
# JWT Configuration
SECRET_KEY=<generate-with-python-secrets-token-urlsafe-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# Generate secure key:
# python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Password Hashing
SECURITY__BCRYPT_ROUNDS=12  # Higher = more secure but slower
```

⚠️ **Security Warning**: The application will refuse to start if `SECRET_KEY` is not set or is too short (minimum 32 characters).

### AI Provider Configuration

#### OpenRouter (Primary Provider)
```env
AI_SERVICES__OPEN_ROUTER_API_KEY_1=sk-or-v1-...
AI_SERVICES__OPEN_ROUTER_API_KEY_2=sk-or-v1-...  # Optional: for load balancing
AI_SERVICES__OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_SERVICES__OPENROUTER_MODEL=openai/gpt-4-turbo-preview
```

#### Google Gemini
```env
AI_SERVICES__GEMINI_API_KEY=AIza...
AI_SERVICES__GEMINI_MODEL=gemini-1.5-pro-latest
```

#### Groq
```env
AI_SERVICES__GROQ_API_KEY=gsk_...
AI_SERVICES__GROQ_MODEL=llama-3.3-70b-versatile
```

#### OpenAI (for Embeddings)
```env
AI_SERVICES__OPENAI_API_KEY=sk-...
AI_SERVICES__EMBEDDING_MODEL=text-embedding-3-small
AI_SERVICES__EMBEDDING_DIMENSIONS=1536
```

### Email Configuration (Gmail SMTP)
```env
EMAIL__GMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL__GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # Generate from Google Account settings
EMAIL__SMTP_SERVER=smtp.gmail.com
EMAIL__SMTP_PORT=587
```

To generate Gmail App Password:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail"

### Function Calling / Tools
```env
# Weather API (WeatherAPI.com)
WEATHER_API_KEY=25aed9f5495c486ca4d173556251511
WEATHER_API_BASE_URL=http://api.weatherapi.com/v1

# Web Search (optional)
TAVILY_API_KEY=tvly-...
```

### Rate Limiting
```env
RATE_LIMIT__REQUESTS_PER_MINUTE=60
RATE_LIMIT__BURST_SIZE=10
```

### CORS Configuration
```env
CORS__ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
CORS__ALLOW_CREDENTIALS=true
```

## 🧠 Memory System

The memory system implements a 6-phase architecture for intelligent conversation memory.

### Phase 1: Memory Extraction & Verification

**Memory Types**:
- `preference`: User preferences (e.g., "I prefer dark mode")
- `fact`: Factual information (e.g., "I live in New York")
- `topic`: Topics of interest (e.g., "Interested in machine learning")
- `relationship`: Personal relationships (e.g., "My wife's name is Sarah")
- `goal`: User goals (e.g., "Learning Python")
- `experience`: Past experiences (e.g., "Visited Paris in 2020")

**Memory Status Flow**:
```
[pending] → [confirmed] → Active memory
         ↘ [rejected]  → Ignored
         ↘ [corrected] → Updated & confirmed
```

**Automatic Extraction**:
- AI analyzes each message for memorable information
- Extracts structured data: content, type, importance (0-1), confidence (0-1)
- Stores with status: `pending` (awaiting user verification)

**User Verification**:
```python
# Confirm memory
POST /api/v1/memory/{memory_id}/verify
{
  "action": "confirm"
}

# Reject memory
POST /api/v1/memory/{memory_id}/verify
{
  "action": "reject",
  "feedback": "This is incorrect"
}

# Correct memory
POST /api/v1/memory/{memory_id}/verify
{
  "action": "correct",
  "corrected_content": "I prefer dark blue, not dark mode",
  "corrected_importance": 0.7
}
```

### Phase 2: Semantic Search with Embeddings

**Embedding Pipeline**:
1. Generate embeddings using OpenAI text-embedding-3-small (1536 dims)
2. Store in MongoDB with embedding field
3. Create compound indexes for efficient retrieval

**Search Strategies**:
```python
# Semantic search (cosine similarity)
POST /api/v1/memory/search
{
  "query": "What do I like to eat?",
  "use_semantic_search": true,
  "limit": 5
}

# Keyword search (MongoDB text index)
POST /api/v1/memory/search
{
  "query": "pizza",
  "use_semantic_search": false
}

# Hybrid search (semantic + filters)
POST /api/v1/memory/search
{
  "query": "food preferences",
  "memory_type": "preference",
  "min_importance": 0.7,
  "use_semantic_search": true
}
```

**Context Retrieval**:
- Automatically retrieves relevant memories for each chat message
- Uses semantic similarity to find related memories
- Weights by importance and recency
- Includes in AI context for personalized responses

### Phase 3: Memory Relationships

**Relationship Types**:
- `relates_to`: General association
- `contradicts`: Conflicting information
- `supports`: Supporting evidence
- `caused_by`: Causal relationship
- `similar_to`: Similar content

**Knowledge Graph**:
```python
# Link memories
POST /api/v1/memory/link
{
  "source_id": "mem_123",
  "target_id": "mem_456",
  "relationship_type": "relates_to"
}

# Get related memories
GET /api/v1/memory/{memory_id}/related?relationship_type=relates_to&depth=2

# Get memory graph
GET /api/v1/memory/{memory_id}/graph?max_depth=3
```

**Response Format**:
```json
{
  "nodes": [
    {"id": "mem_123", "content": "Likes pizza", "type": "preference"},
    {"id": "mem_456", "content": "Italian restaurants", "type": "topic"}
  ],
  "edges": [
    {"source": "mem_123", "target": "mem_456", "type": "relates_to"}
  ]
}
```

### Phase 4: Conflict Detection & Consolidation

**Conflict Detection**:
- Identifies memories with high semantic similarity but different content
- Flags contradictory information (e.g., "I like cats" vs "I hate cats")
- Similarity threshold: 0.85 (cosine similarity)

```python
# Detect conflicts
GET /api/v1/memory/conflicts/detect?memory_id={id}

# Response
{
  "memory_id": "mem_123",
  "conflicting_memories": [
    {
      "id": "mem_456",
      "content": "Prefers tea over coffee",
      "similarity_score": 0.92,
      "conflict_type": "contradicts"
    }
  ]
}
```

**Memory Consolidation**:
- Merge similar/duplicate memories
- Resolve conflicts through user confirmation
- Preserve history of merged memories

```python
# Consolidate memories
POST /api/v1/memory/consolidate
{
  "memory_ids": ["mem_123", "mem_456", "mem_789"]
}

# Result: Creates new consolidated memory, marks originals as merged
```

**Consolidation Suggestions**:
```python
# Get AI suggestions
GET /api/v1/memory/consolidate/suggestions?limit=10

# Response
[
  {
    "memory_ids": ["mem_123", "mem_456"],
    "reason": "High similarity (0.95), same type",
    "suggested_content": "Enjoys Italian and French cuisine"
  }
]
```

### Phase 5: Analytics Dashboard

**Analytics Endpoints**:

```python
# Dashboard overview (30-day window)
GET /api/v1/memory/analytics/dashboard?time_range=30d

# Response
{
  "overview": {
    "total_memories": 127,
    "verified_count": 89,
    "pending_count": 23,
    "rejected_count": 15,
    "avg_confidence": 0.82,
    "avg_importance": 0.65
  },
  "by_type": {
    "preference": 45,
    "fact": 32,
    "topic": 28,
    "relationship": 12,
    "goal": 7,
    "experience": 3
  },
  "by_status": {
    "confirmed": 89,
    "pending": 23,
    "rejected": 15
  },
  "health_score": 85,
  "insights": [
    {
      "type": "low_verification_rate",
      "message": "23 memories pending verification",
      "priority": "high",
      "action": "Review pending memories"
    }
  ]
}
```

**Top Memories**:
```python
# Get most important/confident/recent memories
GET /api/v1/memory/analytics/top?metric=importance&limit=10

# Metrics: importance, confidence, access_frequency, recency
```

**Memory Health Score** (0-100):
- Verification rate: 40%
- Average confidence: 30%
- Memory diversity: 15%
- Recency: 15%

### Phase 6: Privacy & Bulk Operations

**Export Memories**:
```python
POST /api/v1/memory/export
{
  "format": "json",  # or "csv"
  "include_relationships": true,
  "filter_by_status": "confirmed",
  "filter_by_type": "preference"
}

# Downloads file with all memories
```

**Import Memories**:
```python
POST /api/v1/memory/import
{
  "memories": [...],
  "format": "json",
  "merge_strategy": "skip_duplicates"  # or "overwrite", "merge"
}

# Strategies:
# - skip_duplicates: Ignore if similar memory exists
# - overwrite: Replace existing memories
# - merge: Combine with existing data
```

**Privacy Settings**:
```python
POST /api/v1/memory/privacy
{
  "memory_ids": ["mem_123", "mem_456"],
  "is_private": true,
  "shared_with": ["user_789"]  # Optional: share with specific users
}
```

**Bulk Delete**:
```python
DELETE /api/v1/memory/bulk
{
  "memory_ids": ["mem_123", "mem_456"],
  # OR filter criteria:
  "filter_criteria": {
    "memory_type": "topic",
    "importance_lt": 0.3,
    "created_before": "2024-01-01"
  }
}
```

**Memory Expiration Classification**:
```python
# AI classifies memories as temporary vs permanent
POST /api/v1/memory/classify-expiration
{
  "memory_ids": ["mem_123", "mem_456"]
}

# Response
[
  {
    "memory_id": "mem_123",
    "should_expire": false,
    "expiration_date": null,
    "reason": "Permanent preference"
  },
  {
    "memory_id": "mem_456",
    "should_expire": true,
    "expiration_date": "2025-06-01",
    "reason": "Temporary goal"
  }
]
```

### Database Indexes (MongoDB)

```python
# Compound indexes for performance
memories.create_index([
    ("user_id", 1),
    ("status", 1),
    ("importance", -1),
    ("created_at", -1)
])

memories.create_index([
    ("user_id", 1),
    ("memory_type", 1),
    ("confidence", -1)
])

# Text index for keyword search
memories.create_index([("content", "text")])

# Vector index for semantic search (if using MongoDB Atlas)
memories.create_index([("embedding", "vector")])
```

## 🤖 AI Provider Integration

### Provider Architecture

The system uses an abstraction layer for AI providers with automatic failover and load balancing.

**Supported Providers**:
1. **OpenRouter** (Primary)
   - Multi-model access (OpenAI, Anthropic, Meta, etc.)
   - Automatic key rotation between API keys
   - Streaming and non-streaming support
   - Function calling support
   
2. **Google Gemini**
   - Gemini 1.5 Pro / Flash
   - Native function calling
   - Multimodal support (future)
   
3. **Groq**
   - LLaMA 3.3 70B Versatile
   - Ultra-fast inference
   - Function calling via non-streaming mode

### Model Routing

**Dynamic Model Selection**:
```python
# In chat request
POST /api/v1/chat
{
  "message": "Hello",
  "provider": "openrouter",  # or "gemini", "groq", "auto"
  "model": "openai/gpt-4-turbo-preview"  # Optional: override default
}
```

**Automatic Provider Selection**:
- Checks provider availability
- Falls back to working provider if primary fails
- Respects rate limits and quotas

**Provider-Specific Features**:

| Feature | OpenRouter | Gemini | Groq |
|---------|-----------|--------|------|
| Streaming | ✅ | ✅ | ✅ |
| Function Calling | ✅ | ✅ | ✅ (non-stream) |
| Token Counting | ✅ | ✅ | ✅ |
| Max Tokens | 128K+ | 1M+ | 32K |
| Speed | Medium | Medium | Very Fast |

### Function Calling / Tools

**Built-in Tools**:

1. **Weather API** (WeatherAPI.com)
   ```python
   # Available functions:
   - get_current_weather(location)
   - get_weather_forecast(location, days)
   - get_astronomy_data(location, date)
   - search_locations(query)
   ```

2. **Web Search** (Tavily - Optional)
   ```python
   - web_search(query, max_results)
   ```

**Function Calling Flow**:
```
User Message → AI analyzes → Determines function needed → 
Executes function → Gets result → AI formats response → 
Returns to user
```

**Example**:
```
User: "What's the weather in London?"

AI detects: needs get_current_weather()
Executes: get_current_weather("London")
Returns: {temp: 15°C, condition: "Partly cloudy", ...}

AI Response: "The weather in London is currently 15°C 
and partly cloudy with 65% humidity and winds at 10 km/h."
```

**Adding Custom Tools**:
```python
# In app/services/function_calling.py

def custom_tool(param1: str, param2: int) -> dict:
    """Tool description for AI"""
    # Your implementation
    return {"result": "data"}

# Register in AVAILABLE_FUNCTIONS
AVAILABLE_FUNCTIONS = {
    "custom_tool": custom_tool,
    # ... other tools
}
```

### Streaming Implementation

**WebSocket Streaming**:
```python
# Connect
ws = websocket.connect("ws://localhost:8000/api/v1/chat/stream")

# Send message
ws.send(json.dumps({
    "message": "Tell me a story",
    "session_id": "session_123"
}))

# Receive tokens
while True:
    data = json.loads(ws.recv())
    if data["type"] == "token":
        print(data["content"], end="")
    elif data["type"] == "done":
        break
```

**SSE (Server-Sent Events)**:
```bash
curl -N -H "Accept: text/event-stream" \
     -H "Authorization: Bearer <token>" \
     -X POST http://localhost:8000/api/v1/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello"}'
```

**Response Format**:
```
event: token
data: {"content": "Hello", "delta": " there"}

event: token
data: {"content": "Hello there", "delta": "!"}

event: done
data: {"usage": {"tokens": 45}, "model": "gpt-4"}
```

## 📚 API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response (201):
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Validation**:
- Email: Must be valid format
- Password: 8-128 characters, must contain uppercase, lowercase, number
- Name: 2-100 characters

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass123!

Response (200):
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>

Response (200):
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Request OTP Verification
```http
POST /api/v1/auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}

Response (200):
{
  "message": "OTP sent to email",
  "expires_in": 300
}
```

#### Verify OTP
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}

Response (200):
{
  "message": "Email verified successfully"
}
```

### Chat Endpoints

#### Send Message (Non-Streaming)
```http
POST /api/v1/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What is the capital of France?",
  "session_id": "session_123",  // Optional: omit for new session
  "provider": "openrouter",      // Optional: auto, openrouter, gemini, groq
  "model": "openai/gpt-4-turbo", // Optional: override default
  "temperature": 0.7,            // Optional: 0.0-2.0
  "max_tokens": 2000,            // Optional
  "enable_memory": true          // Optional: include memories in context
}

Response (200):
{
  "message_id": "msg_456",
  "session_id": "session_123",
  "reply": "The capital of France is Paris.",
  "model": "openai/gpt-4-turbo-preview",
  "provider": "openrouter",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 12,
    "total_tokens": 57
  },
  "memories_used": 3,           // Number of memories included in context
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Stream Message (WebSocket)
```http
WS /api/v1/chat/stream?token=<jwt_token>

Send:
{
  "message": "Tell me a story",
  "session_id": "session_123"
}

Receive (multiple messages):
{
  "type": "token",
  "content": "Once",
  "delta": "Once"
}
{
  "type": "token",
  "content": "Once upon",
  "delta": " upon"
}
...
{
  "type": "done",
  "usage": {"tokens": 150},
  "model": "gpt-4"
}
```

#### Get Chat History
```http
GET /api/v1/chat/history?session_id=session_123&limit=50&skip=0
Authorization: Bearer <token>

Response (200):
{
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "Hello",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "msg_124",
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "model": "gpt-4",
      "created_at": "2025-01-15T10:00:01Z"
    }
  ],
  "total": 2,
  "session_id": "session_123"
}
```

#### List Sessions
```http
GET /api/v1/chat/sessions?limit=20&skip=0&status=active
Authorization: Bearer <token>

Response (200):
{
  "sessions": [
    {
      "id": "session_123",
      "title": "Conversation about AI",
      "message_count": 15,
      "created_at": "2025-01-15T09:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "status": "active",      // active, archived, deleted
      "is_pinned": false
    }
  ],
  "total": 5
}
```

#### Update Session
```http
PUT /api/v1/chat/sessions/{session_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Title",
  "status": "archived",
  "is_pinned": true
}

Response (200):
{
  "id": "session_123",
  "title": "New Title",
  "status": "archived",
  "is_pinned": true
}
```

#### Delete Session
```http
DELETE /api/v1/chat/sessions/{session_id}
Authorization: Bearer <token>

Response (204): No Content
```

#### Branch Conversation
```http
POST /api/v1/chat/branch
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": "session_123",
  "from_message_id": "msg_456",
  "new_message": "What if we tried a different approach?"
}

Response (200):
{
  "new_session_id": "session_789",
  "parent_session_id": "session_123",
  "branch_point": "msg_456",
  "message_id": "msg_890"
}
```

### Memory Endpoints

#### List Memories
```http
GET /api/v1/memory?limit=50&skip=0&memory_type=preference&include_expired=false
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "mem_123",
    "user_id": "user_456",
    "content": "Prefers dark mode",
    "memory_type": "preference",
    "importance": 0.8,
    "confidence": 0.9,
    "status": "confirmed",
    "embedding": [...],  // 1536-dim vector
    "contexts": ["ui", "settings"],
    "created_at": "2025-01-10T00:00:00Z",
    "verified_at": "2025-01-10T01:00:00Z"
  }
]
```

#### Get Pending Memories
```http
GET /api/v1/memory/pending?limit=10
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "mem_789",
    "content": "Enjoys playing tennis",
    "memory_type": "topic",
    "importance": 0.6,
    "confidence": 0.75,
    "status": "pending",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

#### Verify Memory
```http
POST /api/v1/memory/{memory_id}/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "confirm"  // or "reject", "correct"
}

// For corrections:
{
  "action": "correct",
  "corrected_content": "Enjoys playing tennis and badminton",
  "corrected_importance": 0.7,
  "feedback": "Added badminton"
}

Response (200):
{
  "id": "mem_789",
  "status": "confirmed",
  "content": "Enjoys playing tennis and badminton",
  "verified_at": "2025-01-15T10:05:00Z"
}
```

#### Search Memories (Semantic)
```http
POST /api/v1/memory/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "What are my food preferences?",
  "limit": 5,
  "use_semantic_search": true,
  "memory_type": "preference",
  "min_importance": 0.5
}

Response (200):
[
  {
    "memory": {...},
    "similarity_score": 0.92,
    "relevance_reason": "High semantic similarity to query"
  }
]
```

#### Link Memories
```http
POST /api/v1/memory/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "source_id": "mem_123",
  "target_id": "mem_456",
  "relationship_type": "relates_to"
}

Response (201):
{
  "source_id": "mem_123",
  "target_id": "mem_456",
  "relationship_type": "relates_to",
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Get Related Memories
```http
GET /api/v1/memory/{memory_id}/related?relationship_type=relates_to&depth=2
Authorization: Bearer <token>

Response (200):
[
  {
    "memory": {...},
    "relationship": "relates_to",
    "distance": 1
  }
]
```

#### Detect Conflicts
```http
GET /api/v1/memory/conflicts/detect?memory_id=mem_123
Authorization: Bearer <token>

Response (200):
[
  {
    "memory_id": "mem_123",
    "conflicting_memories": [
      {
        "id": "mem_456",
        "content": "Prefers tea",
        "similarity_score": 0.91,
        "conflict_type": "contradicts"
      }
    ],
    "conflict_count": 1
  }
]
```

#### Consolidate Memories
```http
POST /api/v1/memory/consolidate
Authorization: Bearer <token>
Content-Type: application/json

{
  "memory_ids": ["mem_123", "mem_456", "mem_789"]
}

Response (200):
{
  "consolidated_memory": {
    "id": "mem_999",
    "content": "Combined memory content",
    "merged_from": ["mem_123", "mem_456", "mem_789"]
  }
}
```

#### Analytics Dashboard
```http
GET /api/v1/memory/analytics/dashboard?time_range=30d
Authorization: Bearer <token>

Response (200):
{
  "overview": {
    "total_memories": 127,
    "verified_count": 89,
    "pending_count": 23,
    "avg_confidence": 0.82
  },
  "by_type": {...},
  "health_score": 85,
  "insights": [...]
}
```

#### Export Memories
```http
POST /api/v1/memory/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "json",
  "include_relationships": true,
  "filter_by_status": "confirmed"
}

Response (200):
Downloads JSON/CSV file with memories
```

#### Import Memories
```http
POST /api/v1/memory/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "memories": [...],
  "format": "json",
  "merge_strategy": "skip_duplicates"
}

Response (200):
{
  "imported": 45,
  "skipped": 5,
  "errors": []
}
```

### Settings Endpoints

#### Get User Settings
```http
GET /api/v1/settings/settings
Authorization: Bearer <token>

Response (200):
{
  "memory_settings": {
    "auto_memory_extraction": true,
    "memory_importance_threshold": 0.5,
    "enable_semantic_search": true
  },
  "chat_settings": {
    "default_provider": "openrouter",
    "default_model": "openai/gpt-4-turbo",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

#### Update Settings
```http
PUT /api/v1/settings/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "memory_settings": {
    "auto_memory_extraction": false
  }
}

Response (200):
{
  "memory_settings": {...},
  "chat_settings": {...}
}
```

### Analytics Endpoints

#### Get User Activity
```http
GET /api/v1/analytics/activity?time_range=7d
Authorization: Bearer <token>

Response (200):
{
  "total_messages": 150,
  "total_sessions": 12,
  "avg_messages_per_session": 12.5,
  "active_days": 5,
  "by_day": [
    {"date": "2025-01-15", "messages": 25, "sessions": 3}
  ]
}
```

#### Get Model Usage Stats
```http
GET /api/v1/analytics/models
Authorization: Bearer <token>

Response (200):
{
  "by_provider": {
    "openrouter": {"count": 89, "percentage": 59.3},
    "gemini": {"count": 45, "percentage": 30.0},
    "groq": {"count": 16, "percentage": 10.7}
  },
  "by_model": {
    "openai/gpt-4-turbo": 45,
    "gemini-1.5-pro": 30
  }
}
```

### Health Check

```http
GET /api/v1/health

Response (200):
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "mongodb": "connected",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## 🔐 Authentication & Security

## 🔐 Authentication & Security

### JWT Token Flow

1. **Registration/Login** → Receive JWT access token
2. **Include token** in Authorization header: `Bearer <token>`
3. **Token validation** on every protected endpoint
4. **Automatic expiry** after configured time (default: 7 days)

**Token Structure**:
```python
{
  "sub": "user_id",      # User ID
  "email": "user@example.com",
  "exp": 1234567890,     # Expiration timestamp
  "iat": 1234567880      # Issued at timestamp
}
```

### Password Security

**Hashing**: bcrypt with configurable work factor (default: 12 rounds)
```python
# Password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash(plain_password)
```

**Password Requirements**:
- Length: 8-128 characters
- Must contain: uppercase, lowercase, number
- Validated using Pydantic models

### Rate Limiting

**Token Bucket Algorithm**:
- Default: 60 requests/minute per user
- Burst capacity: 10 requests
- Applied per endpoint

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

**Response on Limit Exceeded** (429):
```json
{
  "detail": "Rate limit exceeded. Try again in 30 seconds."
}
```

### CORS Configuration

**Allowed Origins** (configurable in .env):
```python
CORS__ALLOWED_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
CORS__ALLOW_CREDENTIALS=true
CORS__ALLOW_METHODS=["GET", "POST", "PUT", "DELETE", "PATCH"]
CORS__ALLOW_HEADERS=["Authorization", "Content-Type"]
```

### Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` to version control
   - Use secrets manager in production (AWS Secrets Manager, etc.)
   - Rotate secrets regularly

2. **HTTPS in Production**:
   - Always use TLS/SSL
   - Enforce HTTPS redirects
   - Use secure cookies

3. **API Key Management**:
   - Store provider keys encrypted
   - Implement key rotation
   - Monitor usage and costs

4. **Input Validation**:
   - All inputs validated with Pydantic
   - SQL injection protection via SQLAlchemy ORM
   - XSS protection in outputs

5. **Logging**:
   - Redact sensitive data (passwords, tokens)
   - Log all authentication attempts
   - Monitor for suspicious patterns

## 🗄️ Database Schema

### SQL Database (PostgreSQL/SQLite)

**Users Table**:
```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

**OTP Codes Table**:
```sql
CREATE TABLE otp_codes (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id),
    code VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_user ON otp_codes(user_id);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

### MongoDB Collections

**messages** (Chat History):
```javascript
{
  _id: ObjectId,
  session_id: String,
  user_id: String,
  role: String,              // "user" | "assistant" | "system"
  content: String,
  model: String,             // e.g., "gpt-4-turbo"
  provider: String,          // e.g., "openrouter"
  usage: {
    prompt_tokens: Number,
    completion_tokens: Number,
    total_tokens: Number
  },
  metadata: Object,
  created_at: Date
}

// Indexes
db.messages.createIndex({ session_id: 1, created_at: 1 })
db.messages.createIndex({ user_id: 1, created_at: -1 })
```

**sessions** (Chat Sessions):
```javascript
{
  _id: String,               // session_id
  user_id: String,
  title: String,
  message_count: Number,
  status: String,            // "active" | "archived" | "deleted"
  is_pinned: Boolean,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.sessions.createIndex({ user_id: 1, updated_at: -1 })
db.sessions.createIndex({ user_id: 1, status: 1 })
```

**memories** (User Memories):
```javascript
{
  _id: ObjectId,
  id: String,                // Public ID
  user_id: String,
  content: String,
  memory_type: String,       // "preference" | "fact" | "topic" | etc.
  importance: Number,        // 0.0 - 1.0
  confidence: Number,        // 0.0 - 1.0
  status: String,            // "pending" | "confirmed" | "rejected"
  embedding: Array[1536],    // Vector embedding
  contexts: [String],        // ["ui", "settings"]
  metadata: {
    source_session: String,
    source_message: String,
    extracted_at: Date
  },
  relationships: [{
    target_id: String,
    type: String,            // "relates_to" | "contradicts" | etc.
    created_at: Date
  }],
  access_count: Number,
  last_accessed: Date,
  verified_at: Date,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.memories.createIndex({ user_id: 1, status: 1, importance: -1, created_at: -1 })
db.memories.createIndex({ user_id: 1, memory_type: 1, confidence: -1 })
db.memories.createIndex({ content: "text" })
```

**user_analytics** (Analytics Data):
```javascript
{
  _id: ObjectId,
  user_id: String,
  event_type: String,        // "message_sent" | "session_created" | etc.
  event_data: Object,
  session_id: String,
  timestamp: Date
}

// Indexes
db.user_analytics.createIndex({ user_id: 1, timestamp: -1 })
db.user_analytics.createIndex({ user_id: 1, event_type: 1 })
```

**user_settings** (User Preferences):
```javascript
{
  _id: ObjectId,
  user_id: String,
  memory_settings: {
    auto_memory_extraction: Boolean,
    memory_importance_threshold: Number,
    enable_semantic_search: Boolean
  },
  chat_settings: {
    default_provider: String,
    default_model: String,
    temperature: Number,
    max_tokens: Number
  },
  created_at: Date,
  updated_at: Date
}

// Indexes
db.user_settings.createIndex({ user_id: 1 }, { unique: true })
```

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `SECRET_KEY` (32+ characters)
- [ ] Use managed PostgreSQL (not SQLite)
- [ ] Use MongoDB Atlas or managed MongoDB
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domains
- [ ] Set up environment-specific `.env` files
- [ ] Enable rate limiting
- [ ] Set up logging and monitoring
- [ ] Configure email service
- [ ] Rotate API keys regularly
- [ ] Set up backup strategy
- [ ] Enable database connection pooling

### Docker Deployment

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - postgres
      - mongodb
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chatbot
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: chatbot
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  postgres_data:
  mongo_data:
```

### Production Server Setup (Gunicorn + Uvicorn)

```bash
# Install Gunicorn
pip install gunicorn

# Run with Uvicorn workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

### Environment-Specific Configuration

**Development** (`.env.dev`):
```env
DATABASE_URL=sqlite:///./chatbot.db
MONGO_URI=mongodb://localhost:27017/chatbot
DEBUG=true
```

**Production** (`.env.prod`):
```env
DATABASE_URL=postgresql://user:pass@db-host:5432/chatbot
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatbot
DEBUG=false
CORS__ALLOWED_ORIGINS=["https://yourdomain.com"]
```

### Monitoring & Logging

**Structured Logging**:
```python
import logging
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("chatbot")
```

**Health Check Monitoring**:
```bash
# Set up cron job or monitoring service
curl -f http://localhost:8000/api/v1/health || alert_admin
```

**Metrics to Track**:
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Token usage per provider
- Database connection pool status
- Memory usage
- Active WebSocket connections

## 🧪 Testing

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run tests matching pattern
pytest -k "test_memory"
```

### Test Structure

```
tests/
├── conftest.py              # Pytest fixtures
├── test_auth.py             # Authentication tests
├── test_chat.py             # Chat endpoint tests
├── test_memory.py           # Memory system tests
├── test_providers.py        # AI provider tests
└── test_analytics.py        # Analytics tests
```

### Example Test

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_user():
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecurePass123!",
            "name": "Test User"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"

def test_chat_requires_auth():
    response = client.post(
        "/api/v1/chat",
        json={"message": "Hello"}
    )
    assert response.status_code == 401
```

### Mocking AI Providers

```python
from unittest.mock import patch, AsyncMock

@patch('app.services.ai_provider.OpenRouterProvider.generate')
async def test_chat_with_mock(mock_generate):
    mock_generate.return_value = {
        "content": "Mocked response",
        "usage": {"total_tokens": 10}
    }
    
    response = client.post(
        "/api/v1/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Hello"}
    )
    assert response.status_code == 200
    assert "Mocked response" in response.json()["reply"]
```

## 🔧 Troubleshooting

### Common Issues

**1. Server Won't Start**
```bash
# Check environment variables
python -c "from app.core.config import get_settings; print(get_settings())"

# Verify SECRET_KEY is set
echo $SECRET_KEY

# Check database connection
python -c "from app.db.session import engine; engine.connect()"
```

**2. 401 Unauthorized Errors**
```bash
# Verify token is valid
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/auth/me

# Check token expiration
python -c "import jwt; print(jwt.decode('<token>', options={'verify_signature': False}))"
```

**3. Database Connection Errors**
```bash
# PostgreSQL
psql $DATABASE_URL -c "SELECT 1"

# MongoDB
mongosh $MONGO_URI --eval "db.adminCommand('ping')"

# Run migrations
alembic upgrade head
```

**4. Memory/Embedding Errors**
```bash
# Check OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify embedding dimensions
python -c "from app.services.embedding_service import EmbeddingService; print(EmbeddingService().dimension)"
```

**5. Rate Limit Issues**
```python
# Adjust rate limits in .env
RATE_LIMIT__REQUESTS_PER_MINUTE=120
RATE_LIMIT__BURST_SIZE=20
```

### Debug Mode

Enable debug logging:
```python
# In .env
LOG_LEVEL=DEBUG

# Or in code
import logging
logging.getLogger("app").setLevel(logging.DEBUG)
```

### Performance Issues

**Slow Database Queries**:
```python
# Enable SQLAlchemy query logging
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

**Memory Leaks**:
```bash
# Monitor memory usage
python -m memory_profiler app/main.py
```

**High Token Usage**:
```python
# Monitor usage in analytics
GET /api/v1/analytics/models
```

## 📝 Contributing

### Development Workflow

1. **Fork and clone** the repository
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Install dependencies**: `pip install -r requirements.txt`
4. **Make changes** and write tests
5. **Run tests**: `pytest`
6. **Format code**: `black app/ && isort app/`
7. **Commit**: `git commit -m "Add feature"`
8. **Push**: `git push origin feature/your-feature`
9. **Open Pull Request**

### Code Style

- **Formatter**: Black (line length: 100)
- **Import sorting**: isort
- **Type hints**: Use Python type annotations
- **Docstrings**: Google style

```python
def function_name(param: str) -> dict:
    """Brief description.
    
    Args:
        param: Parameter description
        
    Returns:
        Description of return value
        
    Raises:
        ValueError: When validation fails
    """
    pass
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- FastAPI framework
- OpenRouter for multi-model access
- Google Gemini API
- Groq for ultra-fast inference
- OpenAI for embeddings
- MongoDB and PostgreSQL teams

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: `/docs` endpoint
- **Email**: support@yourdomain.com

---

**Built with ❤️ using FastAPI, MongoDB, and PostgreSQL**
