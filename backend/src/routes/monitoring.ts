import express from 'express';
import { usageMonitoringService } from '../services/UsageMonitoringService';
import { rateLimiter, requestCache } from '../middleware/rateLimiting';
import { huggingFaceClient } from '../services/HuggingFaceClient';
import { DatabaseConnection } from '../database/connection';
import { getAudioPerformanceReport, clearOldAudioMetrics } from '../middleware/performanceMonitoring';

const router = express.Router();

/**
 * Get current performance metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = usageMonitoringService.getPerformanceMetrics();
    const usageStats = rateLimiter.getUsageStats();
    const cacheStats = requestCache.getStats();
    const queueStatus = huggingFaceClient.getQueueStatus();
    const dbCacheStats = DatabaseConnection.getCacheStats();
    const audioPerformance = getAudioPerformanceReport();

    res.json({
      performance: metrics,
      usage: usageStats,
      cache: cacheStats,
      queue: queueStatus,
      database: dbCacheStats,
      audio: audioPerformance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get recent alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;

    let alerts = severity 
      ? usageMonitoringService.getAlertsBySeverity(severity as any)
      : usageMonitoringService.getAlerts(limit);

    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get usage report
 */
router.get('/report', (req, res) => {
  try {
    const report = usageMonitoringService.generateUsageReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate usage report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update monitoring thresholds
 */
router.put('/thresholds', (req, res) => {
  try {
    const thresholds = req.body;
    
    // Validate thresholds
    const validKeys = ['costPerHour', 'errorRate', 'averageResponseTime', 'p95ResponseTime', 'apiCallsPerMinute', 'cacheHitRate'];
    const invalidKeys = Object.keys(thresholds).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        error: 'Invalid threshold keys',
        invalidKeys,
        validKeys
      });
    }

    usageMonitoringService.updateThresholds(thresholds);
    
    res.json({
      message: 'Thresholds updated successfully',
      thresholds: usageMonitoringService.getThresholds()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update thresholds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current thresholds
 */
router.get('/thresholds', (req, res) => {
  try {
    const thresholds = usageMonitoringService.getThresholds();
    res.json({ thresholds });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve thresholds',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear old alerts
 */
router.delete('/alerts', (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    usageMonitoringService.clearOldAlerts(hours);
    
    res.json({
      message: `Cleared alerts older than ${hours} hours`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear old audio performance metrics
 */
router.delete('/audio-metrics', (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    clearOldAudioMetrics(hours);
    
    res.json({
      message: `Cleared audio metrics older than ${hours} hours`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear audio metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get audio performance report
 */
router.get('/audio-performance', (req, res) => {
  try {
    const report = getAudioPerformanceReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audio performance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reset usage statistics
 */
router.post('/reset-stats', (req, res) => {
  try {
    rateLimiter.resetStats();
    
    res.json({
      message: 'Usage statistics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear caches
 */
router.post('/clear-cache', (req, res) => {
  try {
    const cacheType = req.query.type as string;
    
    if (cacheType === 'request' || !cacheType) {
      requestCache.cleanup();
    }
    
    if (cacheType === 'database' || !cacheType) {
      DatabaseConnection.clearExpiredCache();
    }
    
    if (cacheType === 'queue' || !cacheType) {
      huggingFaceClient.clearQueue();
    }
    
    res.json({
      message: `Cache cleared: ${cacheType || 'all'}`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check with detailed system status
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = usageMonitoringService.getPerformanceMetrics();
    const alerts = usageMonitoringService.getAlerts(5);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    
    const status = criticalAlerts.length > 0 ? 'degraded' : 'healthy';
    
    res.json({
      status,
      metrics: {
        responseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        throughput: metrics.throughput,
        cacheHitRate: metrics.cacheHitRate,
        estimatedCost: metrics.estimatedHourlyCost
      },
      alerts: {
        total: alerts.length,
        critical: criticalAlerts.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;