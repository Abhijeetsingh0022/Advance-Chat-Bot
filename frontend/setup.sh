#!/bin/bash

# Frontend Setup & Run Script
# Sets up the Next.js frontend and starts development server

set -e

echo "🚀 ChatBot Frontend Setup"
echo "========================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local..."
    cat > .env.local << EOF
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Optional: Feature flags
# NEXT_PUBLIC_ENABLE_VOICE=true
# NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
# NEXT_PUBLIC_ENABLE_MEMORY=true
# NEXT_PUBLIC_ENABLE_STREAMING=true
EOF
    echo "✅ Created .env.local"
else
    echo "✅ .env.local already exists"
fi

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build 2>&1 | head -20

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔗 Make sure backend is running at: http://localhost:8000"
