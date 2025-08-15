# Database Setup and Usage

This directory contains the database schema, connection utilities, and repository classes for the Numa AI Therapist application.

## Quick Start

1. **Test Database Connection**
   ```bash
   npm run db:health
   ```

2. **Get Setup Instructions**
   ```bash
   npm run db:setup
   ```

3. **Test Database Functionality**
   ```bash
   npm run db:test
   ```

## Database Schema

The application uses three main tables:

### Users Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Optional)
- `preferences` (JSONB, Optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Sessions Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `date` (TIMESTAMP)
- `transcript` (TEXT, Optional)
- `summary` (TEXT, Optional)
- `emotion` (VARCHAR, Optional)
- `duration_minutes` (INTEGER, Optional)
- `status` (VARCHAR: 'active', 'completed', 'cancelled')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Goals Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `description` (TEXT, Required)
- `status` (VARCHAR: 'active', 'completed', 'cancelled')
- `target_date` (DATE, Optional)
- `progress_notes` (TEXT[], Optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Repository Classes

### UserRepository
```typescript
import { UserRepository } from './database';

// Create user
const user = await UserRepository.create({
  name: 'John Doe',
  preferences: { theme: 'dark' }
});

// Find user
const user = await UserRepository.findById(userId);

// Get user with context (recent sessions + active goals)
const context = await UserRepository.getUserWithContext(userId);
```

### SessionRepository
```typescript
import { SessionRepository } from './database';

// Create session
const session = await SessionRepository.create({
  user_id: userId,
  transcript: 'Conversation transcript...',
  emotion: 'calm'
});

// Complete session
const completed = await SessionRepository.completeSession(
  sessionId,
  'Session summary...',
  'hopeful',
  25 // duration in minutes
);

// Get session stats
const stats = await SessionRepository.getSessionStats(userId);
```

### GoalRepository
```typescript
import { GoalRepository } from './database';

// Create goal
const goal = await GoalRepository.create({
  user_id: userId,
  description: 'Practice mindfulness daily',
  target_date: '2025-08-20'
});

// Add progress note
const updated = await GoalRepository.addProgressNote(
  goalId,
  'Completed 10 minutes of meditation today'
);

// Complete goal
const completed = await GoalRepository.completeGoal(
  goalId,
  'Successfully established daily routine'
);
```

## Error Handling

The database utilities include comprehensive error handling:

- **DatabaseError**: For database operation failures
- **ConnectionError**: For connection issues
- **Validation**: UUID format validation, input sanitization
- **Retry Logic**: Automatic retry with exponential backoff

## Environment Variables

Required environment variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup Instructions

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to SQL Editor
4. Run the SQL from `migrations/001_initial_schema.sql`

Or run:
```bash
npm run db:setup
```

## Testing

Run the comprehensive database test suite:
```bash
npm run db:test
```

This will test:
- Database connection
- All repository operations
- Error handling
- Data validation

## Files Structure

```
database/
├── README.md                 # This file
├── supabase.ts              # Supabase client and types
├── connection.ts            # Connection utilities and error handling
├── index.ts                 # Main exports
├── migrations/
│   └── 001_initial_schema.sql
├── repositories/
│   ├── UserRepository.ts
│   ├── SessionRepository.ts
│   └── GoalRepository.ts
└── scripts/
    ├── setup-database.ts
    └── migrate.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.2**: Session memory and context retrieval
- **2.3**: Goal tracking and storage
- **8.4**: Cost-effective Supabase integration

## Next Steps

After setting up the database:

1. Run `npm run db:test` to verify everything works
2. Start the development server: `npm run dev`
3. Check health endpoints:
   - `GET /health` - Overall health
   - `GET /health/database` - Database-specific health