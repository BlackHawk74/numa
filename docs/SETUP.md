# Numa AI Therapist - Setup Guide

This guide provides detailed instructions for setting up the Numa AI Therapist platform for development and production environments.

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)

### Required Accounts & API Keys
- **Supabase Account** - [Sign up](https://supabase.com/)
- **HuggingFace Account** - [Sign up](https://huggingface.co/)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/BlackHawk74/numa.git
cd numa
```

### 2. Install Dependencies

```bash
npm run install:all
```

This command installs dependencies for both frontend and backend packages.

### 3. Supabase Setup

#### Create a New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: numa-ai-therapist
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
5. Click "Create new project"

#### Get API Keys
1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 4. HuggingFace Setup

#### Get API Key
1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Choose "Read" access (sufficient for inference)
4. Copy the generated token

### 5. Environment Configuration

#### Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# HuggingFace API Configuration
HUGGINGFACE_API_KEY=your_huggingface_token_here

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### 6. Database Setup

#### Initialize Database Schema
```bash
cd backend
npm run db:setup
```

This will provide you with SQL commands to run in Supabase.

#### Run SQL in Supabase
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from the setup command output
4. Click "Run" to execute

#### Verify Database Setup
```bash
npm run db:test
```

This should show all tests passing if the database is set up correctly.

### 7. Start Development Servers

From the root directory:
```bash
npm run dev
```

This starts both servers:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### 8. Verify Installation

#### Check Backend Health
Visit: http://localhost:3001/health

You should see:
```json
{
  "status": "OK",
  "message": "Numa AI Therapist Backend is running",
  "database": {
    "status": "healthy",
    "message": "Database connection is healthy",
    "timestamp": "2025-01-12T..."
  }
}
```

#### Check Frontend
Visit: http://localhost:3000

You should see the Numa AI Therapist interface.

## Production Deployment

### Environment Variables
For production, ensure:
- `NODE_ENV=production`
- Use production Supabase project
- Use secure, unique API keys
- Configure proper CORS origins

### Build Commands
```bash
# Build all packages
npm run build

# Start production server
npm start
```

### Security Considerations
- Never commit `.env` files to version control
- Use environment-specific API keys
- Enable RLS policies in Supabase
- Use HTTPS in production
- Regularly rotate API keys

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify Supabase URL and keys are correct
- Check if database tables exist (`npm run db:test`)
- Ensure RLS policies are properly configured

#### Frontend Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run type-check`

#### API Connection Issues
- Verify backend is running on correct port
- Check CORS configuration
- Ensure environment variables are loaded

### Getting Help
- Check the [main README](../README.md) for general information
- Review error logs in the console
- Verify all environment variables are set correctly

## Development Workflow

### Making Changes
1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally: `npm run dev`
4. Run tests: `npm test` (when available)
5. Commit changes: `git commit -m "Description"`
6. Push branch: `git push origin feature/your-feature`

### Database Changes
1. Create migration in `backend/src/database/migrations/`
2. Test migration: `npm run db:test`
3. Document changes in migration file
4. Update repository classes if needed

This setup guide should get you up and running with the Numa AI Therapist platform. For additional help, refer to the main documentation or create an issue in the repository.