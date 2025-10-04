# 🤖 AI ChatBot - Multi-Provider Chat Application

A modern, full-stack AI chatbot application with support for multiple AI providers, function calling, analytics, and advanced features.

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based auth with email verification (OTP/Token)
- 💬 **Multi-Provider AI Chat** - Support for OpenAI GPT-4, Claude, Gemini, Groq, DeepSeek, and more
- 🛠️ **Function Calling** - Built-in tools: Calculator, Weather (OpenWeatherMap), Web Search, Time
- 📊 **Analytics Dashboard** - Track usage, token consumption, model performance
- 🎨 **Modern UI** - Glassmorphism design with dark mode support
- 📁 **File Uploads** - Support for images and documents in chat
- 💾 **Session Management** - Save and resume conversations
- 🌿 **Message Branching** - Create alternative conversation paths
- ⚡ **Real-time Updates** - Live chat with streaming responses
- 👍 **Message Reactions** - React to AI responses with emojis

### Advanced Features
- 🔄 **Conversation Context** - Maintains chat history across sessions
- 📈 **Token Tracking** - Monitor API usage and costs
- 🎯 **Model Comparison** - Compare performance across different AI models
- 🔒 **Rate Limiting** - Protect API endpoints from abuse
- 📧 **Email Notifications** - Verification and password reset emails
- 🗄️ **Dual Database** - MongoDB for sessions/messages, SQLite for user data

## 🏗️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.13)
- **Databases:** 
  - MongoDB Atlas (Sessions, Messages, Analytics)
  - SQLite (User Authentication)
- **Authentication:** JWT with bcrypt password hashing
- **AI Providers:** OpenRouter, Groq, Google Gemini
- **APIs:** OpenWeatherMap, DuckDuckGo

### Frontend
- **Framework:** Next.js 15.5.4 with React 18
- **Language:** TypeScript
- **State Management:** Zustand
- **Styling:** Tailwind CSS with glassmorphism theme
- **UI Components:** Headless UI, Heroicons
- **Charts:** Recharts

## 📋 Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- MongoDB Atlas account (free tier works)
- API Keys (see Configuration section)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ChatBot
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env with your actual credentials (see Configuration section)
nano .env
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# The frontend uses the backend's environment variables
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python run.py
# Backend runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### 5. Create Admin User (First Time Only)

```bash
cd backend
python create_admin.py
```

## ⚙️ Configuration

### Required Environment Variables

Create a `.env` file in the `backend` directory with the following:

```bash
# Database Configuration
DATABASE_URL=sqlite:///./chatbot.db
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Security
SECRET_KEY=<generate-a-random-64-character-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (Gmail)
EMAIL__GMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL__GMAIL_APP_PASSWORD=<your-gmail-app-password>

# AI Services API Keys (at least one required)
AI_SERVICES__OPEN_ROUTER_API_KEY_1=<your-openrouter-key>
AI_SERVICES__GROQ_API_KEY=<your-groq-key>
AI_SERVICES__GEMINI_API_KEY=<your-gemini-key>

# OpenWeatherMap API Key (for weather tool)
OPENWEATHERMAP_API_KEY=<your-openweathermap-key>

# Rate Limiting
RATE_LIMIT__GENERAL_REQUESTS_PER_MINUTE=100
RATE_LIMIT__CHAT_REQUESTS_PER_MINUTE=10

# CORS
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Getting API Keys

1. **OpenRouter** (Multiple AI Models): https://openrouter.ai/
2. **Groq** (Fast Inference): https://groq.com/
3. **Google Gemini**: https://ai.google.dev/
4. **OpenWeatherMap** (Free Tier): https://openweathermap.org/api
5. **MongoDB Atlas** (Free Tier): https://www.mongodb.com/cloud/atlas

### Gmail App Password

1. Enable 2-factor authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in `EMAIL__GMAIL_APP_PASSWORD`

## 📁 Project Structure

```
ChatBot/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and security
│   │   ├── db/           # Database connections
│   │   ├── models/       # Data models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   │   ├── ai_provider.py        # AI provider implementations
│   │   │   ├── function_calling.py   # Tool/function implementations
│   │   │   ├── session_manager.py    # Session management
│   │   │   └── analytics_service.py  # Analytics tracking
│   │   └── middleware/   # Custom middleware
│   ├── alembic/          # Database migrations
│   ├── requirements.txt  # Python dependencies
│   └── run.py            # Application entry point
│
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   │   ├── chat/     # Chat interface
│   │   │   ├── analytics/# Analytics dashboard
│   │   │   ├── login/    # Authentication pages
│   │   │   └── profile/  # User profile
│   │   ├── components/   # React components
│   │   ├── lib/          # API client
│   │   ├── store/        # Zustand state management
│   │   └── styles/       # Global styles
│   └── package.json      # Node dependencies
│
└── README.md             # This file
```

## 🛠️ Available Tools/Functions

The chatbot can execute the following tools (works with GPT-4, Claude, Gemini, etc.):

1. **Calculator** - Perform mathematical calculations
   - Example: "Calculate sqrt(144) + 2^3"

2. **Weather** - Get current weather for any location
   - Example: "What's the weather in Tokyo?"

3. **Web Search** - Search the web using DuckDuckGo
   - Example: "Search for latest AI news"

4. **Current Time** - Get current time for any timezone
   - Example: "What time is it in New York?"

## 📊 Analytics

Access the analytics dashboard at `/analytics` to view:
- Total requests and messages
- Token usage and costs
- Model performance comparison
- Response time metrics
- Usage trends over time

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- CORS configuration
- Email verification
- Environment variable protection
- SQL injection prevention
- XSS protection

## 🚫 Important - Before Pushing to GitHub

**Run the cleanup script:**
```bash
chmod +x cleanup.sh
./cleanup.sh
```

**Never commit:**
- `.env` file (contains real API keys)
- Database files (`*.db`, `*.sqlite`)
- Log files (`*.log`)
- `__pycache__` directories
- `node_modules` directory

**Always check before pushing:**
```bash
git status
git diff
```

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (if available)
5. Submit a pull request

## 📄 License

[Your License Here]

## 👤 Author

[Your Name]

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- [Your contact information]

## 🎯 Roadmap

See `ADVANCED_FEATURES_ROADMAP.md` for planned features including:
- Voice input/output
- Multi-modal support
- Plugin system
- Advanced analytics
- Team collaboration
- And 20+ more features!

---

**Note:** This is a demo project. Ensure proper security measures and testing before deploying to production.
