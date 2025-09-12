import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, DatabaseConnection } from './database';

// Import routes
import sttRoutes from './routes/stt';
import therapyRoutes from './routes/therapy';
import ttsRoutes from './routes/tts';
import sessionsRoutes from './routes/sessions';
import usersRoutes from './routes/users';
import goalsRoutes from './routes/goals';

// Import middleware
import { errorHandler, notFoundHandler, requestLogger, rateLimiter } from './middleware/errorHandler';
import { addRequestStartTime } from './middleware/validation';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(addRequestStartTime);
app.use(requestLogger);
app.use(rateLimiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await DatabaseConnection.healthCheck();
    res.json({ 
      status: 'OK', 
      message: 'Numa AI Therapist Backend is running',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Backend is running but database is unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database health endpoint
app.get('/health/database', async (req, res) => {
  try {
    const dbHealth = await DatabaseConnection.healthCheck();
    res.json(dbHealth);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Connectivity test endpoint for frontend
app.head('/health', (req, res) => {
  res.status(200).end();
});

// Connectivity test endpoint with minimal response
app.get('/health/connectivity', (req, res) => {
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    server: 'numa-backend'
  });
});

// API Routes
app.use('/api/stt', sttRoutes);
app.use('/api/therapy', therapyRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/goals', goalsRoutes);

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    console.log('Starting Numa AI Therapist Backend...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Database health check available at http://localhost:${PORT}/health/database`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;