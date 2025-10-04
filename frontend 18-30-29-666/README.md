# ChatBot Frontend

Modern, responsive chat application built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- ✨ **Modern Design**: Clean black & white theme with dark/light mode toggle
- 🎨 **Responsive**: Mobile-first design with collapsible sidebar
- 🔐 **Authentication**: Complete auth flow (register, login, OTP/token verification)
- 💬 **Real-time Chat**: AI-powered conversations with multiple providers
- 📁 **File Uploads**: Support for images, text files, and documents
- 📚 **Session Management**: Organize conversations with tags, favorites, and search
- 🎯 **Admin Panel**: User management and system monitoring
- ⚡ **Performance**: Optimized with React 18 features and Next.js 14

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Heroicons
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
# .env.local is already set up with:
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   ├── page.tsx           # Home page (redirects)
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── verify-otp/        # OTP verification
│   │   ├── forgot-password/   # Password reset
│   │   ├── chat/              # Main chat interface
│   │   ├── profile/           # User profile & settings
│   │   └── admin/             # Admin dashboard
│   ├── components/            # Reusable components
│   │   ├── ThemeProvider.tsx # Theme management
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── ChatMessage.tsx   # Message display
│   │   ├── ChatInput.tsx     # Message input with files
│   │   ├── SessionList.tsx   # Session management
│   │   └── ...               # More components
│   ├── lib/                   # Utilities
│   │   └── api.ts            # API client & endpoints
│   ├── store/                 # State management
│   │   └── index.ts          # Zustand stores
│   ├── types/                 # TypeScript types
│   │   └── index.ts          # Shared types
│   └── styles/               # Global styles
│       └── globals.css       # Tailwind & custom CSS
├── public/                    # Static assets
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
└── next.config.js            # Next.js config
```

## Features

### Authentication
- Email/password registration
- OTP or token-based verification
- Forgot/reset password
- Persistent sessions
- Auto-redirect on auth state change

### Chat Interface
- Real-time AI responses
- Message history with infinite scroll
- File attachments (images, text, documents)
- Session management (create, rename, delete)
- Search conversations
- Export chat history (JSON, TXT, Markdown)

### Theme System
- Dark mode (default)
- Light mode
- Smooth transitions
- Persistent preference
- System-aware (optional)

### Responsive Design
- Mobile-first approach
- Collapsible sidebar
- Touch-friendly interactions
- Adaptive layouts

### Admin Features
- User management
- System statistics
- Health monitoring
- Bulk operations

## API Integration

All API calls are configured in `src/lib/api.ts`:

- **Auth**: `/api/auth/*`
- **Chat**: `/api/chat/*`
- **Admin**: `/api/admin/*`
- **Health**: `/api/health/*`

Axios interceptors handle:
- Authentication tokens
- Error responses
- Auto-redirect on 401

## Customization

### Theme Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  dark: {
    bg: '#000000',      // Background
    surface: '#111111', // Cards
    elevated: '#1a1a1a', // Elevated elements
  },
  light: {
    bg: '#ffffff',
    surface: '#f5f5f5',
    elevated: '#fafafa',
  },
  accent: {
    primary: '#3b82f6',  // Blue
    success: '#10b981',  // Green
    warning: '#f59e0b',  // Orange
    error: '#ef4444',    // Red
  }
}
```

### API Endpoint

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-api-url.com/api
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### API Connection Issues

1. Ensure backend is running on `http://localhost:8000`
2. Check CORS configuration in backend
3. Verify `NEXT_PUBLIC_API_URL` in `.env.local`

### TypeScript Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

### Hot Reload
Next.js automatically reloads on file changes. If it stops working:
```bash
# Restart dev server
npm run dev
```

### Adding New Pages
Create files in `src/app/` following Next.js App Router conventions.

### Adding Components
Create reusable components in `src/components/`.

### State Management
Use Zustand stores in `src/store/` for global state.

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
Set in your deployment platform:
- `NEXT_PUBLIC_API_URL`: Your backend API URL

## Performance

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Use Next.js `<Image>` component
- **Lazy Loading**: Components loaded on-demand
- **Caching**: API responses cached with Axios

## Security

- **XSS Protection**: React's built-in escaping
- **CSRF**: Not needed (token-based auth)
- **Secure Storage**: Tokens in localStorage (HTTPS only in production)
- **API Security**: All requests authenticated via JWT

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind classes (avoid custom CSS)
3. Test on mobile and desktop
4. Ensure dark/light modes work
5. Add error handling

## License

MIT License - See backend LICENSE file

## Support

For issues or questions:
1. Check this README
2. Review code comments
3. Check backend API documentation at `/docs`
