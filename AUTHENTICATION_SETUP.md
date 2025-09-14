# Supabase Authentication Setup Guide

This guide walks you through setting up Supabase authentication for the Numa AI Therapist application.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the database already set up
2. **Environment Variables**: Both frontend and backend `.env` files configured
3. **Dependencies**: All npm packages installed

## Setup Steps

### 1. Install Frontend Dependencies

The Supabase client library has been added to the frontend:

```bash
cd frontend
npm install @supabase/supabase-js
```

### 2. Environment Configuration

Make sure your environment files have the correct Supabase configuration:

**Frontend (.env)**:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=your_supabase_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Backend (.env)**:
```env
PORT=3001
NODE_ENV=development
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Database Migration

Apply the authentication migration to update RLS policies:

```bash
cd backend
node apply-auth-migration.js
```

This will:
- Update Row Level Security policies to work with Supabase auth
- Ensure users can only access their own data
- Set up proper authentication constraints

### 4. Test Authentication Setup

Run the authentication test to verify everything is working:

```bash
cd backend
node test-auth-setup.js
```

This will verify:
- Supabase connection
- Database permissions
- RLS policy functionality

### 5. Supabase Dashboard Configuration

In your Supabase dashboard:

1. **Enable Authentication**:
   - Go to Authentication > Settings
   - Enable email authentication
   - Configure any additional providers you want (Google, GitHub, etc.)

2. **Email Templates** (Optional):
   - Customize confirmation and reset password emails
   - Set your site URL for redirects

3. **RLS Policies**:
   - Verify that RLS is enabled on all tables
   - Check that the policies were applied correctly

## Architecture Overview

### Authentication Flow

1. **User Registration/Login**: Users authenticate through Supabase Auth
2. **JWT Tokens**: Frontend receives JWT tokens from Supabase
3. **API Requests**: Frontend sends JWT tokens in Authorization headers
4. **Backend Verification**: Backend verifies tokens with Supabase
5. **Database Access**: Backend uses service role for database operations
6. **RLS Enforcement**: Database enforces user-specific access via RLS

### Key Components

**Frontend**:
- `AuthProvider`: Manages authentication state
- `ProtectedRoute`: Wraps app content, shows auth forms when needed
- `AuthForm`: Handles sign up, sign in, and password reset
- `UserProfile`: Shows user info and sign out option

**Backend**:
- `authenticateUser`: Middleware to verify JWT tokens
- `ensureUserExists`: Middleware to create user records as needed
- Updated routes with authentication requirements

### Security Features

1. **Row Level Security**: Users can only access their own data
2. **JWT Verification**: All API requests require valid authentication
3. **Service Role Separation**: Backend uses service role for admin operations
4. **User Ownership**: All resources are tied to authenticated users

## Usage

### Starting the Application

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm start
   ```

3. **Access Application**:
   - Navigate to `http://localhost:3000`
   - You'll see the authentication form
   - Sign up for a new account or sign in with existing credentials

### User Flow

1. **First Visit**: User sees authentication form
2. **Sign Up**: User creates account with email/password
3. **Email Confirmation**: User confirms email (if enabled)
4. **Dashboard Access**: User can access the therapy dashboard
5. **Session Continuity**: User stays logged in across browser sessions
6. **Sign Out**: User can sign out from the user profile menu

## Troubleshooting

### Common Issues

1. **"User not authenticated" errors**:
   - Check that SUPABASE_URL and keys are correct
   - Verify user is signed in
   - Check browser network tab for 401 errors

2. **RLS policy errors**:
   - Run the auth migration script
   - Check Supabase dashboard for policy status
   - Verify service role key is set

3. **CORS errors**:
   - Ensure FRONTEND_URL is set correctly in backend
   - Check Supabase CORS settings

4. **Database connection issues**:
   - Run `node test-auth-setup.js` to diagnose
   - Check Supabase project status
   - Verify environment variables

### Debug Commands

```bash
# Test backend authentication setup
cd backend && node test-auth-setup.js

# Test environment variables
cd backend && node test-env-vars.js

# Check database connection
cd backend && node test-database.js
```

## Next Steps

After authentication is working:

1. **Customize Auth UI**: Modify `AuthForm.tsx` for your branding
2. **Add Social Providers**: Configure Google/GitHub auth in Supabase
3. **Email Templates**: Customize confirmation and reset emails
4. **User Profiles**: Add more user profile fields as needed
5. **Session Management**: Implement session timeout and refresh logic

## Security Considerations

1. **Environment Variables**: Never commit real keys to version control
2. **HTTPS**: Use HTTPS in production
3. **Token Expiry**: Configure appropriate JWT expiry times
4. **Rate Limiting**: Implement rate limiting for auth endpoints
5. **Email Verification**: Consider requiring email verification for new users

## Support

If you encounter issues:

1. Check the Supabase documentation: https://supabase.com/docs
2. Review the authentication logs in Supabase dashboard
3. Test with the provided debug scripts
4. Check browser developer tools for client-side errors