# 🤖 Advanced AI ChatBot - Full-Stack Application

A production-ready, full-stack AI chatbot application featuring multiple AI providers, advanced memory management, real-time streaming, function calling, and comprehensive analytics.

## ✨ Key Features

### 🎯 Core Capabilities
- 🔐 **Secure Authentication** - JWT-based auth with bcrypt, email verification (OTP/Token), password reset
- 💬 **Multi-Provider AI** - OpenRouter (GPT-4, Claude, Llama), Google Gemini, Groq with automatic failover
- 🧠 **Advanced Memory System** - 6-phase semantic memory with embeddings, verification, and knowledge graphs
- 🛠️ **Function Calling** - Weather API (4 functions), web search, calculator, time utilities
- ⚡ **Real-Time Streaming** - WebSocket and SSE support for token-by-token responses
- 📊 **Comprehensive Analytics** - Usage tracking, token consumption, model performance, memory insights
- 🎨 **Modern UI/UX** - Glassmorphism design with dark mode, responsive layout
- 🌿 **Conversation Branching** - Create alternative conversation paths from any message
- 📁 **File Support** - Upload and process images and documents in chat
- 💾 **Session Management** - Save, archive, pin, and resume conversations

### 🚀 Advanced Features
- **Semantic Memory Search** - Vector embeddings (OpenAI text-embedding-3-small, 1536 dims)
- **Memory Verification Workflow** - Confirm, reject, or correct AI-extracted memories
- **Knowledge Graph** - Memory relationships (relates_to, contradicts, supports, etc.)
- **Conflict Detection** - Identify and consolidate contradictory memories
- **Memory Analytics** - Health scores, insights, and consolidation suggestions
- **Import/Export** - Backup and restore memories in JSON/CSV format
- **Privacy Controls** - Mark memories as private or share with specific users
- **Model Routing** - Intelligent provider selection with load balancing
- **Rate Limiting** - Token bucket algorithm for API protection
- **Session Pinning** - Pin important conversations to the top
- **Message Reactions** - React to AI responses with emojis
- **Settings Management** - Customize memory extraction, chat defaults, and preferences

## 🏗️ Technology Stack

### Backend (FastAPI)
- **Framework:** FastAPI 0.104+ (Python 3.11+)
- **Databases:** 
  - **PostgreSQL/SQLite** - User authentication, OTP codes
  - **MongoDB Atlas** - Chat history, memories, analytics, settings
- **Authentication:** JWT (HS256) with bcrypt password hashing (12 rounds)
- **AI Providers:** 
  - OpenRouter (Multi-model access)
  - Google Gemini (Gemini 1.5 Pro/Flash)
  - Groq (LLaMA 3.3 70B - ultra-fast inference)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **APIs & Tools:** 
  - WeatherAPI.com (current, forecast, astronomy, location search)
  - Tavily (optional web search)
- **Real-Time:** WebSocket, SSE (Server-Sent Events)
- **Async:** asyncio, Motor (async MongoDB driver)

### Frontend (Next.js)
- **Framework:** Next.js 15.5.6 with React 19
- **Language:** TypeScript 5.x (strict mode)
- **State Management:** Zustand (lightweight, no boilerplate)
- **Styling:** Tailwind CSS 3.x with custom black & white theme
- **UI Components:** 
  - Headless UI (accessible components)
  - Heroicons (beautiful icons)
  - Radix UI primitives
- **Charts:** Recharts (analytics visualizations)
- **Forms:** React Hook Form with Zod validation
- **HTTP Client:** Axios with interceptors
- **Notifications:** React Hot Toast

### DevOps & Tools
- **Migrations:** Alembic (SQL schema versioning)
- **Process Manager:** Uvicorn + Gunicorn workers
- **Containerization:** Docker, docker-compose
- **Testing:** Pytest (backend), Jest (frontend)
- **Code Quality:** Black, isort, ESLint, Prettier

## 📋 Prerequisites

- **Python:** 3.11 or higher
- **Node.js:** 18.x or higher
- **npm/yarn:** Latest stable version
- **MongoDB:** Atlas account (free tier) or local MongoDB 7+
- **PostgreSQL:** 15+ (or SQLite for development)
- **Git:** For version control

### Required API Keys (See detailed setup below)
- OpenRouter API key (for GPT-4, Claude, Llama models)
- Google Gemini API key (for Gemini models)
- Groq API key (for fast LLaMA inference)
- OpenAI API key (for embeddings)
- WeatherAPI.com key (for weather functions)
- Gmail App Password (for email verification)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Abhijeetsingh0022/Advance-Chat-Bot.git
cd Advance-Chat-Bot
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env with your credentials (see Configuration section below)
nano .env  # or use your preferred editor

# Run database migrations
alembic upgrade head
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
# or
yarn install

# The frontend uses the backend's API (no separate .env needed)
```

### 4. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python run.py

# Backend runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
# or
yarn dev

# Frontend runs on http://localhost:3000
```

### 5. Create Your Account

1. Open http://localhost:3000 in your browser
2. Click "Create Account"
3. Fill in your details (email, password, name)
4. Verify your email (check inbox for OTP code)
5. Start chatting!

### 6. Optional - Create Admin User

```bash
cd backend
python create_admin.py
# Follow prompts to create admin account
```

## ⚙️ Configuration & API Keys Setup

### Step 1: Create Environment File

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

### Step 2: Get API Keys

#### 🔑 OpenRouter API Key (Primary AI Provider)

OpenRouter provides access to multiple AI models (GPT-4, Claude, LLaMA, etc.) through a single API.

**Setup Steps:**
1. Visit https://openrouter.ai/
2. Click "Sign In" (top right)
3. Sign in with Google, GitHub, or email
4. Go to "Keys" section: https://openrouter.ai/keys
5. Click "Create Key"
6. Give it a name (e.g., "ChatBot App")
7. Set limits (optional): $10/month recommended for testing
8. Copy the key (starts with `sk-or-v1-...`)

**Add to .env:**
```bash
AI_SERVICES__OPEN_ROUTER_API_KEY_1=sk-or-v1-your-key-here
```

**Supported Models:**
- `openai/gpt-4-turbo-preview` (Most capable)
- `openai/gpt-3.5-turbo` (Fast & cheap)
- `anthropic/claude-3-opus` (Excellent reasoning)
- `meta-llama/llama-3.1-70b-instruct` (Open source)
- And 100+ more models!

**Pricing:** Pay-as-you-go, typically $0.01-$0.10 per request depending on model.

---

#### 🔑 Google Gemini API Key

Google's Gemini models (1.5 Pro, 1.5 Flash) - Free tier available!

**Setup Steps:**
1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Sign in with your Google account
4. Click "Get API Key" or "Create API Key"
5. Select "Create API key in new project" (or use existing)
6. Copy the key (starts with `AIza...`)

**Add to .env:**
```bash
AI_SERVICES__GEMINI_API_KEY=AIzaYourKeyHere
AI_SERVICES__GEMINI_MODEL=gemini-1.5-pro-latest
```

**Available Models:**
- `gemini-1.5-pro-latest` (Most capable, 1M token context)
- `gemini-1.5-flash-latest` (Faster, cheaper)

**Free Tier:** 
- 60 requests per minute
- 1,500 requests per day
- Perfect for development!

---

#### 🔑 Groq API Key (Ultra-Fast Inference)

Groq provides blazing-fast LLaMA model inference.

**Setup Steps:**
1. Visit https://console.groq.com/
2. Click "Sign Up" or "Sign In"
3. Sign up with email or Google account
4. Complete email verification
5. Go to "API Keys" section: https://console.groq.com/keys
6. Click "Create API Key"
7. Give it a name (e.g., "ChatBot")
8. Copy the key (starts with `gsk_...`)

**Add to .env:**
```bash
AI_SERVICES__GROQ_API_KEY=gsk_YourKeyHere
AI_SERVICES__GROQ_MODEL=llama-3.3-70b-versatile
```

**Available Models:**
- `llama-3.3-70b-versatile` (Latest, most capable)
- `llama-3.1-70b-versatile` (Stable version)
- `mixtral-8x7b-32768` (Good for coding)

**Free Tier:**
- 30 requests per minute
- 14,400 requests per day
- Extremely fast response times!

---

#### 🔑 OpenAI API Key (For Embeddings)

Required for semantic memory search (embeddings).

**Setup Steps:**
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Add payment method (required, but embeddings are very cheap)
4. Go to API Keys: https://platform.openai.com/api-keys
5. Click "Create new secret key"
6. Give it a name, copy the key (starts with `sk-...`)

**Add to .env:**
```bash
AI_SERVICES__OPENAI_API_KEY=sk-YourKeyHere
AI_SERVICES__EMBEDDING_MODEL=text-embedding-3-small
AI_SERVICES__EMBEDDING_DIMENSIONS=1536
```

**Cost:** ~$0.00002 per 1K tokens (extremely cheap)
- Example: 1 million words = ~$0.30

---

#### 🔑 WeatherAPI.com Key

For weather function calling (current weather, forecast, astronomy).

**Setup Steps:**
1. Visit https://www.weatherapi.com/
2. Click "Sign Up Free"
3. Fill in your details (no credit card required)
4. Verify your email
5. Log in and go to "API Key" section
6. Copy your API key

**Add to .env:**
```bash
WEATHER_API_KEY=your-key-here
```

**Free Tier:**
- 1 million requests per month
- Current weather, 3-day forecast, astronomy data
- More than enough for development!

---

#### 📧 Gmail App Password (For Email Verification)

**Setup Steps:**
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled
4. Go back to Security, scroll to "2-Step Verification"
5. Scroll down to "App passwords"
6. Click "App passwords"
7. Select "Mail" and your device
8. Click "Generate"
9. Copy the 16-character password (no spaces needed in .env)

**Add to .env:**
```bash
EMAIL__GMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL__GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Note:** Use your actual Gmail address, not an app-specific email.

---

#### 🗄️ MongoDB Atlas (Database)

**Setup Steps:**
1. Visit https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier available)
3. Create a free cluster (M0 Sandbox)
4. Wait for cluster to deploy (2-3 minutes)
5. Click "Connect" on your cluster
6. Add your IP address or allow access from anywhere (0.0.0.0/0)
7. Create a database user (username + password)
8. Choose "Connect your application"
9. Copy the connection string
10. Replace `<password>` with your database password
11. Replace `<database>` with `chatbot` or your preferred name

**Add to .env:**
```bash
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatbot
MONGO_DATABASE=chatbot
```

---

### Step 3: Complete .env Configuration

Your complete `.env` file should look like this:

```bash
# ============ Database Configuration ============
DATABASE_URL=sqlite:///./chatbot.db
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatbot
MONGO_DATABASE=chatbot

# ============ Security (CRITICAL) ============
# Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'
SECRET_KEY=your-super-secret-64-character-random-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# ============ AI Provider API Keys ============
# OpenRouter (Primary - Required)
AI_SERVICES__OPEN_ROUTER_API_KEY_1=sk-or-v1-your-key-here
AI_SERVICES__OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_SERVICES__OPENROUTER_MODEL=openai/gpt-4-turbo-preview

# Google Gemini (Optional)
AI_SERVICES__GEMINI_API_KEY=AIzaYourKeyHere
AI_SERVICES__GEMINI_MODEL=gemini-1.5-pro-latest

# Groq (Optional)
AI_SERVICES__GROQ_API_KEY=gsk_YourKeyHere
AI_SERVICES__GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI (For Embeddings - Required for memory features)
AI_SERVICES__OPENAI_API_KEY=sk-YourOpenAIKeyHere
AI_SERVICES__EMBEDDING_MODEL=text-embedding-3-small
AI_SERVICES__EMBEDDING_DIMENSIONS=1536

# ============ Email Configuration ============
EMAIL__GMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL__GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL__SMTP_SERVER=smtp.gmail.com
EMAIL__SMTP_PORT=587

# ============ Weather API ============
WEATHER_API_KEY=your-weatherapi-key-here
WEATHER_API_BASE_URL=http://api.weatherapi.com/v1

# ============ Rate Limiting ============
RATE_LIMIT__REQUESTS_PER_MINUTE=60
RATE_LIMIT__BURST_SIZE=10

# ============ CORS ============
CORS__ALLOWED_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
CORS__ALLOW_CREDENTIALS=true
```

### Step 4: Generate SECRET_KEY

Run this command to generate a secure secret key:

```bash
python -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Copy the output and paste it into your `.env` file as `SECRET_KEY`.

### Step 5: Verify Configuration

Test your configuration:

```bash
cd backend
python -c "from app.core.config import get_settings; print('✅ Configuration loaded successfully!')"
```

## 📁 Project Structure

```
ChatBot/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application entry
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/                    # API version 1 endpoints
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # Configuration management
│   │   │   ├── deps.py                # Dependency injection
│   │   │   └── security.py            # JWT and authentication
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── mongodb.py             # MongoDB connection
│   │   │   └── session.py             # SQL database session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── analytics.py           # Analytics data models
│   │   │   ├── mongo_models.py        # MongoDB models
│   │   │   └── sql_models.py          # SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── error.py               # Error response schemas
│   │   │   └── validation.py          # Request/response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_provider.py         # AI provider implementations
│   │   │   ├── ai_provider_streaming.py # Streaming support
│   │   │   ├── analytics_service.py   # Analytics tracking
│   │   │   ├── email.py               # Email service (OTP, verification)
│   │   │   ├── embedding_service.py   # Vector embeddings
│   │   │   ├── function_calling.py    # Tool/function implementations
│   │   │   ├── memory_service.py      # Memory management
│   │   │   ├── model_router.py        # Model selection and routing
│   │   │   └── session_manager.py     # Session management
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── analytics.py           # Analytics middleware
│   │   │   └── rate_limit.py          # Rate limiting
│   │   ├── templates/
│   │   │   ├── __init__.py
│   │   │   ├── base_email.html        # Base email template
│   │   │   ├── otp_verification.html  # OTP email template
│   │   │   ├── token_verification.html # Token email template
│   │   │   └── README.md
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── cleanup.py             # Cleanup utilities
│   │       └── exceptions.py          # Custom exceptions
│   ├── alembic/
│   │   ├── env.py                     # Alembic configuration
│   │   ├── script.py.mako             # Migration template
│   │   └── versions/                  # Database migrations
│   │       ├── 001_consolidated_initial_migration.py
│   │       ├── 122b81ebc3d7_add_compound_indexes_to_models.py
│   │       └── README.md
│   ├── alembic.ini                    # Alembic settings
│   ├── requirements.txt               # Python dependencies
│   ├── run.py                         # Application entry point
│   ├── test_all_api_keys.py          # API key validation
│   ├── test_chat_endpoint.py         # Chat endpoint tests
│   ├── validate_models.py            # Model validation
│   └── README.md                      # Backend documentation
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── page.tsx               # Home page
│   │   │   ├── chat/
│   │   │   │   └── page.tsx           # Chat interface
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Login page
│   │   │   └── register/
│   │   │       └── page.tsx           # Registration page
│   │   ├── components/
│   │   │   ├── BlurText.tsx           # Text blur effect
│   │   │   ├── BranchControls.tsx     # Conversation branching
│   │   │   ├── ClickSpark.tsx         # Click animation
│   │   │   ├── CodeBlock.tsx          # Code syntax highlighting
│   │   │   ├── CounterStat.tsx        # Animated counters
│   │   │   ├── ErrorBoundary.tsx      # Error handling
│   │   │   ├── FluidGlass.tsx         # Glassmorphism effect
│   │   │   ├── LiquidEther.tsx        # Liquid animation
│   │   │   ├── MemoryBadge.tsx        # Memory status badges
│   │   │   ├── MemoryCard.tsx         # Memory display cards
│   │   │   ├── MemoryDashboard.tsx    # Memory analytics
│   │   │   ├── MemoryManager.tsx      # Memory management
│   │   │   ├── MessageReactions.tsx   # Emoji reactions
│   │   │   ├── Navbar.tsx             # Navigation bar
│   │   │   ├── PricingCard.tsx        # Pricing display
│   │   │   ├── SplitText.tsx          # Text split animation
│   │   │   ├── TestimonialCarousel.tsx # Testimonials
│   │   │   ├── ToolsPanel.tsx         # Function calling panel
│   │   │   ├── TrueFocus.tsx          # Focus effect
│   │   │   ├── VoiceControls.tsx      # Voice input controls
│   │   │   └── chat/                  # Chat-specific components
│   │   ├── context/                   # React contexts
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # API client and utilities
│   │   ├── reducers/                  # State reducers
│   │   ├── store/                     # Zustand state management
│   │   ├── styles/                    # Global styles
│   │   └── types/                     # TypeScript types
│   ├── public/
│   │   └── assets/
│   │       └── 3d/                    # 3D assets
│   ├── components.json                # Shadcn UI config
│   ├── middleware.ts                  # Next.js middleware
│   ├── next.config.js                 # Next.js configuration
│   ├── package.json                   # Node dependencies
│   ├── postcss.config.js              # PostCSS configuration
│   ├── tailwind.config.ts             # Tailwind CSS config
│   ├── tsconfig.json                  # TypeScript configuration
│   └── BACKEND_INTEGRATION_FIXES.md   # Integration notes
│
├── .gitignore                         # Git ignore rules
├── README.md                          # This file (main documentation)
├── INTEGRATION_COMPLETE.md            # Integration status
└── test_appearance.md                 # UI testing notes
```

## 🛠️ Available Tools & Functions

The chatbot can execute the following tools through function calling (works with GPT-4, Claude, Gemini, LLaMA):

### 1. 🌤️ Weather API (WeatherAPI.com)

**get_current_weather**
- Get real-time weather for any location
- Example: *"What's the weather in Tokyo?"*
- Returns: Temperature, condition, humidity, wind speed, feels like

**get_weather_forecast**
- Get multi-day weather forecast (up to 3 days on free tier)
- Example: *"What's the 3-day forecast for London?"*
- Returns: Daily forecasts with high/low temps, conditions, precipitation

**get_astronomy_data**
- Get sunrise, sunset, moon phase, and astronomy info
- Example: *"When is sunset in Paris today?"*
- Returns: Sunrise/sunset times, moonrise/moonset, moon phase

**search_locations**
- Search for locations worldwide
- Example: *"Find weather stations near New York"*
- Returns: Matching locations with coordinates

### 2. 🔢 Calculator
- Perform mathematical calculations
- Example: *"Calculate sqrt(144) + 2^3"*
- Supports: +, -, *, /, ^, sqrt(), sin(), cos(), tan(), log()

### 3. 🌐 Web Search
- Search the web using Tavily API (if configured)
- Example: *"Search for latest AI news"*
- Returns: Top search results with summaries

### 4. 🕐 Current Time
- Get current time for any timezone
- Example: *"What time is it in New York?"*
- Supports: All IANA timezone names

### Function Calling Flow

```
User: "What's the weather in London and what time is it there?"

AI: [Analyzes query]
  ↓
[Calls get_current_weather("London")]
  ↓
[Calls current_time("Europe/London")]
  ↓
[Formats response]
  ↓
AI: "The weather in London is currently 15°C and partly cloudy. 
     The local time is 3:45 PM."
```

## 📊 Analytics & Monitoring

Access the comprehensive analytics dashboard at `/analytics` to view:

### User Analytics
- **Activity Overview**: Total messages, sessions, active days
- **Usage Patterns**: Messages per day/week/month
- **Session Metrics**: Average session length, messages per session
- **Peak Usage Times**: When you chat the most

### Model Performance
- **Provider Distribution**: Usage by OpenRouter, Gemini, Groq
- **Model Breakdown**: Which models you use most (GPT-4, Claude, LLaMA)
- **Token Consumption**: Prompt vs completion tokens
- **Cost Tracking**: Estimated API costs by provider

### Memory Analytics
- **Memory Overview**: Total memories by type and status
- **Verification Rate**: Confirmed vs pending vs rejected
- **Memory Health Score**: System health (0-100)
- **Insights**: AI-generated recommendations
- **Conflict Detection**: Contradictory memories
- **Consolidation Suggestions**: Merge similar memories

### Response Metrics
- **Average Response Time**: By provider and model
- **Token Statistics**: Average tokens per message
- **Error Rate**: Failed requests and reasons
- **Streaming Performance**: WebSocket vs SSE comparison

### Charts & Visualizations
- Line charts: Usage trends over time
- Bar charts: Model and provider comparison
- Pie charts: Token distribution, memory types
- Area charts: Cumulative metrics

## 🧠 Memory System Features

The advanced 6-phase memory system provides:

### Phase 1: Extraction & Verification
- Automatic extraction from conversations
- User verification workflow (confirm/reject/correct)
- Memory types: preference, fact, topic, relationship, goal, experience
- Importance and confidence scoring (0-1)

### Phase 2: Semantic Search
- Vector embeddings (1536 dimensions)
- Cosine similarity search
- Keyword + semantic hybrid search
- Context-aware memory retrieval

### Phase 3: Knowledge Graph
- Memory relationships (relates_to, contradicts, supports, caused_by)
- Multi-hop graph traversal
- Visual knowledge graph (nodes + edges)

### Phase 4: Conflict Resolution
- Automatic conflict detection
- Similarity threshold: 0.85
- Smart consolidation suggestions
- Manual conflict resolution

### Phase 5: Analytics Dashboard
- Memory health score
- Verification statistics
- Type and status distribution
- AI-generated insights

### Phase 6: Data Management
- Export: JSON/CSV format
- Import: Bulk memory upload
- Privacy controls: Mark as private
- Bulk operations: Delete filtered memories
- Expiration classification: Temporary vs permanent

### Using Memory Features

**View Memories in Sidebar:**
1. Open chat interface
2. Click "Memory" tab in sidebar
3. Filter by status (all/confirmed/pending/rejected)
4. Filter by type (preference/fact/topic/etc.)

**Verify Pending Memories:**
1. Click "Memories" button in header
2. Navigate to "Pending" tab
3. Review extracted memories
4. Click ✅ Confirm, ❌ Reject, or ✏️ Correct

**Memory Dashboard:**
1. Click "Memories" button in chat header
2. View overview, analytics, conflicts
3. Export/import memories
4. Manage privacy settings

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication (HS256)
- **Password Security**: bcrypt hashing with 12 rounds
- **Email Verification**: OTP codes (6 digits, 5-minute expiry)
- **Token Verification**: Email link verification (24-hour expiry)
- **Session Management**: Secure session handling

### API Security
- **Rate Limiting**: Token bucket algorithm
  - 60 requests/minute default
  - Configurable per endpoint
  - Burst capacity: 10 requests
- **CORS Protection**: Whitelist-based origin control
- **Input Validation**: Pydantic models for all inputs
- **SQL Injection Prevention**: SQLAlchemy ORM parameterization
- **XSS Protection**: Output sanitization

### Data Protection
- **Environment Variables**: Secrets in .env (never committed)
- **Database Encryption**: Connection string encryption
- **Password Requirements**: 8-128 chars, uppercase, lowercase, number
- **API Key Rotation**: Support for multiple provider keys
- **Secure Cookies**: HTTPOnly, SameSite flags

### Best Practices Implemented
- ✅ No hardcoded secrets
- ✅ HTTPS ready (TLS/SSL support)
- ✅ Regular dependency updates
- ✅ Error message sanitization
- ✅ Logging without sensitive data
- ✅ Token expiration and refresh
- ✅ Secure random generation (secrets module)

## 🚫 Before Pushing to GitHub - IMPORTANT!

### Security Checklist

**✅ Before every commit:**

1. **Never commit sensitive files:**
   ```bash
   # Check what will be committed
   git status
   
   # Review changes
   git diff
   ```

2. **Verify .gitignore is working:**
   ```bash
   # These should NOT appear in git status:
   # - .env
   # - *.db, *.sqlite
   # - __pycache__/
   # - node_modules/
   # - *.log
   ```

3. **Remove sensitive data if accidentally staged:**
   ```bash
   # Unstage file
   git reset HEAD .env
   
   # Remove from git history (if committed)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

4. **Use environment variable checker:**
   ```bash
   # Search for hardcoded secrets
   grep -r "sk-" --exclude-dir={node_modules,venv,.git}
   grep -r "AIza" --exclude-dir={node_modules,venv,.git}
   ```

### Files That Should NEVER Be Committed

```
❌ .env, .env.local, .env.*
❌ *.db, *.sqlite, *.sqlite3
❌ node_modules/
❌ __pycache__/, *.pyc
❌ venv/, env/, .venv/
❌ *.log, logs/
❌ chatbot.db*
❌ credentials.json, secrets.json
❌ Any file with API keys
```

### Files That SHOULD Be Committed

```
✅ .env.example (template without real keys)
✅ .gitignore
✅ README.md
✅ requirements.txt
✅ package.json
✅ Source code (*.py, *.ts, *.tsx)
✅ Configuration templates
✅ Documentation
```

### Quick Cleanup Script

Run before pushing:

```bash
# Remove cached files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete
find . -type f -name "*.log" -delete
find . -type f -name "*.db" -delete

# Verify no secrets
echo "Checking for potential secrets..."
git grep -i "sk-or-v1" || echo "✅ No OpenRouter keys found"
git grep -i "AIza" || echo "✅ No Gemini keys found"
git grep -i "gsk_" || echo "✅ No Groq keys found"

echo "✅ Pre-push checks complete!"
```

## 📝 API Documentation

### Interactive Documentation

Once the backend is running, access comprehensive API documentation:

- **Swagger UI**: http://localhost:8000/docs
  - Interactive API testing
  - Request/response schemas
  - Try endpoints directly in browser
  
- **ReDoc**: http://localhost:8000/redoc
  - Beautiful, readable documentation
  - Organized by endpoints
  - Detailed descriptions

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Create new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/request-otp` - Request email OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP code

#### Chat
- `POST /api/v1/chat` - Send message (non-streaming)
- `WS /api/v1/chat/stream` - Stream messages via WebSocket
- `GET /api/v1/chat/history` - Get conversation history
- `GET /api/v1/chat/sessions` - List all sessions
- `PUT /api/v1/chat/sessions/{id}` - Update session
- `DELETE /api/v1/chat/sessions/{id}` - Delete session
- `POST /api/v1/chat/branch` - Branch conversation

#### Memory
- `GET /api/v1/memory` - List memories
- `GET /api/v1/memory/pending` - Get pending verifications
- `POST /api/v1/memory/{id}/verify` - Verify memory
- `POST /api/v1/memory/search` - Semantic search
- `POST /api/v1/memory/link` - Create relationship
- `GET /api/v1/memory/{id}/related` - Get related memories
- `GET /api/v1/memory/conflicts/detect` - Detect conflicts
- `POST /api/v1/memory/consolidate` - Merge memories
- `GET /api/v1/memory/analytics/dashboard` - Analytics
- `POST /api/v1/memory/export` - Export memories
- `POST /api/v1/memory/import` - Import memories

#### Analytics
- `GET /api/v1/analytics/activity` - User activity stats
- `GET /api/v1/analytics/models` - Model usage stats

#### Settings
- `GET /api/v1/settings/settings` - Get user settings
- `PUT /api/v1/settings/settings` - Update settings

### Example: Send Message with cURL

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=YourPass123!" \
  | jq -r '.access_token')

# Send message
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather in London?",
    "provider": "openrouter",
    "enable_memory": true
  }'
```

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### Development Workflow

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/Advance-Chat-Bot.git
   cd Advance-Chat-Bot
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Set up development environment**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add comments for complex logic

5. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests (if available)
   cd frontend
   npm test
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature" # or "fix: resolve bug"
   ```

7. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Go to GitHub and create Pull Request
   ```

### Code Style Guidelines

**Python (Backend):**
- Follow PEP 8 style guide
- Use type hints
- Document functions with docstrings
- Format with Black: `black app/`
- Sort imports with isort: `isort app/`

**TypeScript (Frontend):**
- Follow Airbnb style guide
- Use TypeScript strict mode
- Document complex components
- Format with Prettier: `npm run format`
- Lint with ESLint: `npm run lint`

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Pull Request Guidelines

- Provide clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Abhijeet Singh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 Author

**Abhijeet Singh**

- GitHub: [@Abhijeetsingh0022](https://github.com/Abhijeetsingh0022)
- LinkedIn: [abhijeetsingh0022](https://www.linkedin.com/in/abhijeetsingh0022)
- Email: [Contact via Gmail or LinkedIn](masterabhijeetsingh@gmail.com)

### About This Project

This Advanced AI ChatBot is a comprehensive full-stack application demonstrating modern web development practices, AI integration, and production-ready architecture. Built with FastAPI, Next.js, and multiple AI providers, it showcases:

- Clean architecture and code organization
- Secure authentication and authorization
- Advanced memory management with semantic search
- Real-time streaming with WebSocket
- Comprehensive analytics and monitoring
- Production-ready deployment patterns

Feel free to:
- ⭐ Star this repository if you find it helpful
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features or improvements
- 🔧 Submit pull requests

## 🆘 Support & Help

### Getting Help

**Found a bug?**
- Check existing [GitHub Issues](https://github.com/Abhijeetsingh0022/Advance-Chat-Bot/issues)
- Create a new issue with detailed description
- Include error messages, logs, and steps to reproduce

**Have a question?**
- Check the documentation in `/docs` (if available)
- Review API docs at http://localhost:8000/docs
- Open a discussion on GitHub

**Need a feature?**
- Check the roadmap below
- Create a feature request issue
- Describe use case and expected behavior

### Common Issues & Solutions

**1. Backend won't start:**
```bash
# Check environment variables
python -c "from app.core.config import get_settings; print(get_settings())"

# Verify database connection
alembic upgrade head

# Check Python version
python --version  # Should be 3.11+
```

**2. Frontend connection errors:**
```bash
# Verify backend is running
curl http://localhost:8000/api/v1/health

# Check CORS settings in backend/.env
CORS__ALLOWED_ORIGINS=["http://localhost:3000"]
```

**3. API key errors:**
- Verify keys are correct in `.env`
- Check API key quotas on provider dashboards
- Ensure no leading/trailing spaces in keys

**4. Memory/embedding errors:**
```bash
# Verify OpenAI API key is set
echo $AI_SERVICES__OPENAI_API_KEY

# Check MongoDB connection
mongosh $MONGO_URI --eval "db.adminCommand('ping')"
```

## 🎯 Roadmap & Future Features

### Coming Soon
- [ ] Voice input/output (Speech-to-Text, Text-to-Speech)
- [ ] Multi-modal support (images, videos, PDFs)
- [ ] Plugin system for custom tools
- [ ] Team collaboration features
- [ ] Conversation templates
- [ ] Advanced analytics (sentiment analysis, topic modeling)
- [ ] Mobile app (React Native)
- [ ] Docker deployment configuration
- [ ] Kubernetes manifests
- [ ] CI/CD pipeline (GitHub Actions)

### Planned Improvements
- [ ] Redis caching for better performance
- [ ] PostgreSQL full-text search
- [ ] Elasticsearch integration
- [ ] GraphQL API option
- [ ] WebRTC for real-time collaboration
- [ ] Advanced rate limiting with Redis
- [ ] Distributed tracing (Jaeger/OpenTelemetry)
- [ ] Prometheus metrics export
- [ ] Automated testing suite expansion
- [ ] Performance benchmarking tools

### Community Requested
- [ ] Custom AI model integration
- [ ] Fine-tuning support
- [ ] RAG (Retrieval-Augmented Generation)
- [ ] Long-term conversation summaries
- [ ] Export conversations to PDF/MD
- [ ] Scheduled messages/reminders
- [ ] Integration with external tools (Slack, Discord, etc.)

Want to contribute to any of these? Open an issue or submit a PR!

## 🌟 Acknowledgments

### Technologies & Services
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js](https://nextjs.org/) - React framework for production
- [OpenRouter](https://openrouter.ai/) - Multi-model AI API
- [Google Gemini](https://ai.google.dev/) - Google's AI models
- [Groq](https://groq.com/) - Ultra-fast LLM inference
- [MongoDB](https://www.mongodb.com/) - Document database
- [WeatherAPI.com](https://www.weatherapi.com/) - Weather data
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

### Inspiration & Learning
- OpenAI ChatGPT for conversation UX patterns
- Anthropic Claude for AI safety best practices
- Vercel AI SDK for streaming implementations
- LangChain for memory management concepts

### Special Thanks
- Open source community for amazing tools
- AI research community for advancing the field
- Early testers and contributors

---

## 📞 Connect & Stay Updated

- **Repository**: [github.com/Abhijeetsingh0022/Advance-Chat-Bot](https://github.com/Abhijeetsingh0022/Advance-Chat-Bot)
- **Issues**: [Report bugs or request features](https://github.com/Abhijeetsingh0022/Advance-Chat-Bot/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Abhijeetsingh0022/Advance-Chat-Bot/discussions)
- **LinkedIn**: [Connect with the author](https://www.linkedin.com/in/abhijeetsingh0022)

---

<div align="center">

**⭐ If you find this project helpful, please consider giving it a star! ⭐**

**Built with ❤️ by [Abhijeet Singh](https://github.com/Abhijeetsingh0022)**

*Made with FastAPI, Next.js, and cutting-edge AI technology*

</div>
