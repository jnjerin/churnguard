// ============================================================================
// CHURNGUARD LOGGING UTILITY
// ============================================================================
// Centralized logging system for debugging and monitoring
// In production, this would send logs to a service like LogRocket or Sentry

import { LogEvent, AnalyticsEvent } from '../types';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEvent[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Log a debug message (only shown in development)
   */
  debug(message: string, data?: Record<string, any>, context?: { userId?: string; conversationId?: string }) {
    this.log('debug', 'ui', message, data, context);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, any>, context?: { userId?: string; conversationId?: string }) {
    this.log('info', 'ui', message, data, context);
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: Record<string, any>, context?: { userId?: string; conversationId?: string }) {
    this.log('warn', 'ui', message, data, context);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error | any, context?: { userId?: string; conversationId?: string }) {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    
    this.log('error', 'error', message, errorData, context);
  }

  /**
   * Log API calls and responses
   */
  api(method: string, url: string, status: number, duration: number, data?: any) {
    this.log('info', 'api', `${method} ${url} - ${status}`, {
      method,
      url,
      status,
      duration,
      data
    });
  }

  /**
   * Log chat-related events
   */
  chat(event: string, data?: Record<string, any>, context?: { userId?: string; conversationId?: string }) {
    this.log('info', 'chat', event, data, context);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogEvent['level'], 
    category: LogEvent['category'], 
    message: string, 
    data?: Record<string, any>,
    context?: { userId?: string; conversationId?: string }
  ) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userId: context?.userId,
      conversationId: context?.conversationId
    };

    // Add to in-memory logs
    this.logs.push(logEvent);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (this.isDevelopment) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      const prefix = `[ChurnGuard:${category}]`;
      
      if (data) {
        console[consoleMethod](prefix, message, data);
      } else {
        console[consoleMethod](prefix, message);
      }
    }

    // In production, you'd send critical logs to a monitoring service
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      this.sendToMonitoring(logEvent);
    }
  }

  /**
   * Track analytics events (user interactions, conversions, etc.)
   */
  track(event: string, properties: Record<string, any> = {}, userId?: string) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId,
      sessionId: this.getSessionId()
    };

    if (this.isDevelopment) {
      console.log('[Analytics]', event, properties);
    }

    // In production, send to analytics service (Google Analytics, Mixpanel, etc.)
    if (!this.isDevelopment) {
      this.sendToAnalytics(analyticsEvent);
    }
  }

  /**
   * Get recent logs (useful for debugging)
   */
  getRecentLogs(count = 50): LogEvent[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }

  /**
   * Get session ID for analytics
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('churnguard_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('churnguard_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Send logs to monitoring service (production only)
   */
  private sendToMonitoring(logEvent: LogEvent) {
    // In a real app, you'd send to Sentry, LogRocket, etc.
    // For now, we'll just store it locally
    try {
      const existingLogs = JSON.parse(localStorage.getItem('churnguard_error_logs') || '[]');
      existingLogs.push(logEvent);
      
      // Keep only last 100 error logs
      const recentLogs = existingLogs.slice(-100);
      localStorage.setItem('churnguard_error_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  /**
   * Send analytics to tracking service (production only)
   */
  private sendToAnalytics(analyticsEvent: AnalyticsEvent) {
    // In a real app, you'd send to Google Analytics, Mixpanel, etc.
    // For now, we'll just store it locally
    try {
      const existingEvents = JSON.parse(localStorage.getItem('churnguard_analytics') || '[]');
      existingEvents.push(analyticsEvent);
      
      // Keep only last 500 analytics events
      const recentEvents = existingEvents.slice(-500);
      localStorage.setItem('churnguard_analytics', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to store analytics event:', error);
    }
  }
}

// Create and export a singleton instance
export const logger = new Logger();

// Export some commonly used logging functions
export const logInfo = logger.info.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const trackEvent = logger.track.bind(logger);