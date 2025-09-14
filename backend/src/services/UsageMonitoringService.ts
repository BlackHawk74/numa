import { rateLimiter, requestCache } from '../middleware/rateLimiting';

/**
 * Usage monitoring and alerting service
 */
export interface UsageAlert {
    type: 'cost' | 'rate_limit' | 'performance' | 'error_rate';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
    cacheHitRate: number;
    apiCallsPerMinute: number;
    estimatedHourlyCost: number;
}

class UsageMonitoringService {
    private alerts: UsageAlert[] = [];
    private performanceData: Array<{
        timestamp: number;
        responseTime: number;
        success: boolean;
        endpoint: string;
    }> = [];

    private readonly maxAlerts = 100;
    private readonly maxPerformanceData = 1000;

    // Configurable thresholds
    private thresholds = {
        costPerHour: 5.0, // $5 per hour
        errorRate: 0.05, // 5%
        averageResponseTime: 2000, // 2 seconds
        p95ResponseTime: 5000, // 5 seconds
        apiCallsPerMinute: 100,
        cacheHitRate: 0.7 // 70%
    };

    /**
     * Record performance metrics
     */
    recordPerformance(endpoint: string, responseTime: number, success: boolean): void {
        this.performanceData.push({
            timestamp: Date.now(),
            responseTime,
            success,
            endpoint
        });

        // Keep only recent data
        if (this.performanceData.length > this.maxPerformanceData) {
            this.performanceData = this.performanceData.slice(-this.maxPerformanceData);
        }

        // Check for performance alerts
        this.checkPerformanceAlerts();
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentData = this.performanceData.filter(d => d.timestamp > oneHourAgo);

        if (recentData.length === 0) {
            return {
                averageResponseTime: 0,
                p95ResponseTime: 0,
                errorRate: 0,
                throughput: 0,
                cacheHitRate: 0,
                apiCallsPerMinute: 0,
                estimatedHourlyCost: 0
            };
        }

        // Calculate metrics
        const responseTimes = recentData.map(d => d.responseTime).sort((a, b) => a - b);
        const successCount = recentData.filter(d => d.success).length;
        const usageStats = rateLimiter.getUsageStats();
        const cacheStats = requestCache.getStats();

        const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p95ResponseTime = responseTimes[p95Index] || 0;
        const errorRate = 1 - (successCount / recentData.length);
        const throughput = recentData.length / 60; // requests per minute
        const cacheHitRate = usageStats.cacheHits / (usageStats.cacheHits + usageStats.cacheMisses) || 0;
        const apiCallsPerMinute = usageStats.apiCalls / 60;
        const estimatedHourlyCost = usageStats.costEstimate * 60; // extrapolate to hourly

        return {
            averageResponseTime,
            p95ResponseTime,
            errorRate,
            throughput,
            cacheHitRate,
            apiCallsPerMinute,
            estimatedHourlyCost
        };
    }

    /**
     * Check for performance-based alerts
     */
    private checkPerformanceAlerts(): void {
        const metrics = this.getPerformanceMetrics();

        // Cost alert
        if (metrics.estimatedHourlyCost > this.thresholds.costPerHour) {
            this.addAlert({
                type: 'cost',
                severity: metrics.estimatedHourlyCost > this.thresholds.costPerHour * 2 ? 'critical' : 'high',
                message: `Estimated hourly cost exceeds threshold: $${metrics.estimatedHourlyCost.toFixed(2)}`,
                value: metrics.estimatedHourlyCost,
                threshold: this.thresholds.costPerHour,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }

        // Error rate alert
        if (metrics.errorRate > this.thresholds.errorRate) {
            this.addAlert({
                type: 'error_rate',
                severity: metrics.errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'high',
                message: `Error rate exceeds threshold: ${(metrics.errorRate * 100).toFixed(1)}%`,
                value: metrics.errorRate,
                threshold: this.thresholds.errorRate,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }

        // Performance alerts
        if (metrics.averageResponseTime > this.thresholds.averageResponseTime) {
            this.addAlert({
                type: 'performance',
                severity: 'medium',
                message: `Average response time exceeds threshold: ${metrics.averageResponseTime.toFixed(0)}ms`,
                value: metrics.averageResponseTime,
                threshold: this.thresholds.averageResponseTime,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }

        if (metrics.p95ResponseTime > this.thresholds.p95ResponseTime) {
            this.addAlert({
                type: 'performance',
                severity: 'high',
                message: `P95 response time exceeds threshold: ${metrics.p95ResponseTime.toFixed(0)}ms`,
                value: metrics.p95ResponseTime,
                threshold: this.thresholds.p95ResponseTime,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }

        // Cache hit rate alert
        if (metrics.cacheHitRate < this.thresholds.cacheHitRate && metrics.apiCallsPerMinute > 10) {
            this.addAlert({
                type: 'performance',
                severity: 'medium',
                message: `Cache hit rate below threshold: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
                value: metrics.cacheHitRate,
                threshold: this.thresholds.cacheHitRate,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }

        // API rate alert
        if (metrics.apiCallsPerMinute > this.thresholds.apiCallsPerMinute) {
            this.addAlert({
                type: 'rate_limit',
                severity: 'medium',
                message: `API calls per minute exceeds threshold: ${metrics.apiCallsPerMinute.toFixed(1)}`,
                value: metrics.apiCallsPerMinute,
                threshold: this.thresholds.apiCallsPerMinute,
                timestamp: new Date(),
                metadata: { metrics }
            });
        }
    }

    /**
     * Add alert to the system
     */
    private addAlert(alert: UsageAlert): void {
        // Avoid duplicate alerts within 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingAlert = this.alerts.find(a =>
            a.type === alert.type &&
            a.timestamp > fiveMinutesAgo
        );

        if (existingAlert) {
            return; // Skip duplicate alert
        }

        this.alerts.push(alert);

        // Keep only recent alerts
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(-this.maxAlerts);
        }

        // Log alert
        console.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`, {
            type: alert.type,
            value: alert.value,
            threshold: alert.threshold,
            timestamp: alert.timestamp
        });

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoringService(alert);
        }
    }

    /**
     * Send alert to external monitoring service
     */
    private sendToMonitoringService(alert: UsageAlert): void {
        // TODO: Implement integration with monitoring services
        // Examples: Sentry, DataDog, New Relic, PagerDuty, etc.

        // For now, just log to console in production
        console.error('[MONITORING] Alert triggered:', {
            alert,
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get recent alerts
     */
    getAlerts(limit: number = 50): UsageAlert[] {
        return this.alerts.slice(-limit).reverse();
    }

    /**
     * Get alerts by severity
     */
    getAlertsBySeverity(severity: UsageAlert['severity']): UsageAlert[] {
        return this.alerts.filter(a => a.severity === severity);
    }

    /**
     * Clear old alerts
     */
    clearOldAlerts(olderThanHours: number = 24): void {
        const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
        this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    }

    /**
     * Update thresholds
     */
    updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('Updated monitoring thresholds:', this.thresholds);
    }

    /**
     * Get current thresholds
     */
    getThresholds(): typeof this.thresholds {
        return { ...this.thresholds };
    }

    /**
     * Generate usage report
     */
    generateUsageReport(): {
        summary: PerformanceMetrics;
        alerts: UsageAlert[];
        recommendations: string[];
        thresholds: {
            costPerHour: number;
            errorRate: number;
            averageResponseTime: number;
            p95ResponseTime: number;
            apiCallsPerMinute: number;
            cacheHitRate: number;
        };
    } {
        const metrics = this.getPerformanceMetrics();
        const recentAlerts = this.getAlerts(10);
        const recommendations: string[] = [];

        // Generate recommendations based on metrics
        if (metrics.cacheHitRate < 0.5) {
            recommendations.push('Consider increasing cache TTL or improving cache key generation');
        }

        if (metrics.averageResponseTime > 1000) {
            recommendations.push('Optimize API response times or consider request batching');
        }

        if (metrics.estimatedHourlyCost > this.thresholds.costPerHour * 0.8) {
            recommendations.push('Monitor API usage closely - approaching cost threshold');
        }

        if (metrics.errorRate > 0.02) {
            recommendations.push('Investigate error patterns and improve error handling');
        }

        return {
            summary: metrics,
            alerts: recentAlerts,
            recommendations,
            thresholds: this.thresholds
        };
    }
}

// Export singleton instance
export const usageMonitoringService = new UsageMonitoringService();