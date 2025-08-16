# Project Structure

## Root Level Organization
```
numa/
├── frontend/           # React application
├── backend/            # Express.js API server
├── docs/              # Project documentation
├── .kiro/             # Kiro IDE configuration
├── node_modules/      # Root workspace dependencies
└── package.json       # Workspace configuration
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Application pages/routes
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Frontend utility functions
│   └── types/         # TypeScript type definitions
├── public/            # Static assets (index.html, favicon, etc.)
├── build/             # Production build output
├── package.json       # Frontend dependencies
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.js # Tailwind CSS configuration
└── postcss.config.js  # PostCSS configuration
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── routes/        # Express route handlers
│   │   ├── sessions.ts    # Session management endpoints
│   │   ├── therapy.ts     # AI conversation endpoints
│   │   ├── stt.ts         # Speech-to-text endpoints
│   │   └── tts.ts         # Text-to-speech endpoints
│   ├── services/      # Business logic services
│   │   ├── ConversationService.ts    # AI conversation logic
│   │   ├── SpeechToTextService.ts    # STT processing
│   │   ├── TextToSpeechService.ts    # TTS processing
│   │   ├── SentimentAnalysisService.ts # Emotion detection
│   │   ├── SessionSummaryService.ts   # Session summarization
│   │   ├── HuggingFaceClient.ts      # HF API client
│   │   └── __tests__/                # Service unit tests
│   ├── database/      # Database layer
│   │   ├── connection.ts             # Database connection
│   │   ├── supabase.ts              # Supabase client
│   │   ├── repositories/            # Data access layer
│   │   │   ├── UserRepository.ts
│   │   │   ├── SessionRepository.ts
│   │   │   └── GoalRepository.ts
│   │   └── migrations/              # Database schema migrations
│   ├── models/        # Data models and validation
│   │   ├── Session.ts     # Session data model
│   │   ├── validation.ts  # Input validation schemas
│   │   ├── utils.ts       # Model utilities
│   │   └── __tests__/     # Model tests
│   ├── middleware/    # Express middleware
│   │   ├── errorHandler.ts   # Global error handling
│   │   └── validation.ts     # Request validation
│   ├── scripts/       # Utility scripts
│   │   ├── setup-database.ts # Database initialization
│   │   └── migrate.ts        # Migration runner
│   └── index.ts       # Application entry point
├── dist/              # Compiled JavaScript output
├── package.json       # Backend dependencies
├── tsconfig.json      # TypeScript configuration
├── jest.config.js     # Jest testing configuration
└── API_ENDPOINTS.md   # API documentation
```

## Documentation (`docs/`)
```
docs/
├── API.md             # Complete API documentation
└── SETUP.md           # Development setup guide
```

## Configuration Files

### TypeScript Configuration
- `tsconfig.json` in both frontend and backend
- Strict type checking enabled
- ES2020 target for modern JavaScript features

### Environment Files
- `.env.example` templates in frontend and backend
- `.env` files for local development (gitignored)
- Separate configuration for each environment

### Testing Structure
- `__tests__/` directories alongside source code
- Jest configuration in `jest.config.js`
- Integration tests in `src/services/__tests__/integration.test.ts`

## Naming Conventions

### Files and Directories
- **PascalCase**: TypeScript classes, React components, services
- **camelCase**: Functions, variables, file names for utilities
- **kebab-case**: Route paths, API endpoints
- **snake_case**: Database columns, SQL identifiers

### Code Organization
- **Services**: Business logic, external API integration
- **Repositories**: Database access layer with CRUD operations
- **Models**: Data structures, validation schemas
- **Routes**: HTTP endpoint handlers
- **Middleware**: Request/response processing
- **Utils**: Pure functions, helpers, constants

## Import/Export Patterns
- Use named exports for utilities and services
- Use default exports for React components and main classes
- Barrel exports (`index.ts`) for clean imports
- Relative imports within same directory level
- Absolute imports from `src/` root

## Database Conventions
- **Tables**: Plural names (users, sessions, goals)
- **Columns**: snake_case naming
- **Primary Keys**: UUID type with `id` column name
- **Foreign Keys**: `{table}_id` format (user_id, session_id)
- **Timestamps**: `created_at`, `updated_at` with automatic triggers