# Technology Stack

## Architecture
Full-stack TypeScript application with React frontend and Node.js/Express backend, using Supabase as Backend-as-a-Service.

## Frontend Stack
- **React 18** - Modern UI framework with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Vite** - Fast build tool and development server (via Create React App)
- **React Router** - Client-side routing (planned)
- **Zustand** - Lightweight state management (planned)

## Backend Stack
- **Node.js** (v18+) - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Supabase** - PostgreSQL database with real-time features
- **HuggingFace Inference API** - AI/ML model integration
- **Multer** - File upload handling for audio processing

## Database
- **PostgreSQL** (via Supabase) - Primary database
- **Row Level Security (RLS)** - Fine-grained access control
- **Real-time subscriptions** - Live data updates
- **UUID primary keys** - Security and scalability

## AI & ML Services
- **HuggingFace Models**:
  - `openai/whisper-large-v3-turbo` - Speech-to-text
  - `meta-llama/Llama-3.1-8B-Instruct` - Conversation AI
  - `j-hartmann/emotion-english-distilroberta-base` - Sentiment analysis
  - `hexgrad/Kokoro-82M` - Text-to-speech (fallback)

## Development Tools
- **Jest** - Testing framework
- **ts-node** - TypeScript execution for development
- **nodemon** - Development server auto-restart
- **concurrently** - Run multiple npm scripts simultaneously

## Common Commands

### Development
```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev

# Start individual services
npm run dev:frontend  # React dev server on :3000
npm run dev:backend   # Express server on :3001
```

### Database
```bash
# Setup database schema
npm run db:setup

# Test database connection
npm run db:health
npm run db:test

# Run migrations
npm run migrate
```

### Build & Deploy
```bash
# Build all packages
npm run build

# Build individual packages
npm run build:frontend
npm run build:backend

# Start production server
npm start
```

### Testing
```bash
# Run backend tests
cd backend && npm test

# Run with coverage
cd backend && npm run test:coverage

# Watch mode
cd backend && npm run test:watch
```

## Environment Configuration
- **Development**: `.env` files in root, frontend/, and backend/
- **Required APIs**: Supabase project, HuggingFace API key
- **CORS**: Configured for localhost:3000 in development