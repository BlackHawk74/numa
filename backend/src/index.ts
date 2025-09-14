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
import messagesRoutes from './routes/messages';
import monitoringRoutes from './routes/monitoring';

// Import middleware
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler';
import { addRequestStartTime } from './middleware/validation';
import { 
  enhancedRateLimit, 
  cacheMiddleware, 
  usageMonitoring, 
  startCleanupTask 
} from './middleware/rateLimiting';
import { audioProcessingMonitoring, requestTiming } from './middleware/performanceMonitoring';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment flags for rate limiting
const isDev = process.env.NODE_ENV !== 'production';
const bypassRateLimitDev = isDev && process.env.BYPASS_RATE_LIMIT_DEV === 'true';

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(addRequestStartTime);
app.use(requestTiming);
app.use(requestLogger);
app.use(usageMonitoring);
app.use(audioProcessingMonitoring);

// Enhanced rate limiting with environment-aware config
if (!bypassRateLimitDev) {
  const rateConfig = isDev
    ? {
        // Generous limits for local development
        general: { max: 2000, windowMs: 15 * 60 * 1000 },
        api: { max: 1000, windowMs: 15 * 60 * 1000 },
        expensive: { max: 500, windowMs: 15 * 60 * 1000 },
      }
    : {
        // Defaults for production
        general: { max: 200, windowMs: 15 * 60 * 1000 },
        api: { max: 100, windowMs: 15 * 60 * 1000 },
        expensive: { max: 50, windowMs: 15 * 60 * 1000 },
      };

  app.use(enhancedRateLimit(rateConfig));
} else {
  console.warn('Rate limiting is bypassed in development (BYPASS_RATE_LIMIT_DEV=true)');
}

// Cache middleware for API responses
app.use('/api', cacheMiddleware(5 * 60 * 1000)); // 5 minute cache

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
app.use('/api/messages', messagesRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    console.log('Starting Numa AI Therapist Backend...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Start cleanup tasks
    startCleanupTask();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Database health check available at http://localhost:${PORT}/health/database`);
      console.log(`Monitoring dashboard available at http://localhost:${PORT}/api/monitoring/metrics`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;