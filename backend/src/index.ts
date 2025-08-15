import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, DatabaseConnection } from './database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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