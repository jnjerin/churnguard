// ============================================================================
// CHURNGUARD LOGGING UTILITY
// ============================================================================
// Centralized logging with different levels and browser/server compatibility

interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEvent[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private log(level: LogEvent['level'], category: string, message: string, data?: any, context?: Record<string, any>) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      context
    };

    // Add to memory store
    this.logs.push(logEvent);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (this.isDevelopment && typeof window !== 'undefined') {
      const prefix = `[${level.toUpperCase()}] ${category}:`;
      const style = this.getConsoleStyle(level);
      
      if (data || context) {
        console.groupCollapsed(`%c${prefix} ${message}`, style);
        if (data) console.log('Data:', data);
        if (context) console.log('Context:', context);
        console.groupEnd();
      } else {
        console.log(`%c${prefix} ${message}`, style);
      }
    }

    // In production, might want to send to an external service
    if (!this.isDevelopment) {
      this.sendToExternalService(logEvent);
    }
  }

  private getConsoleStyle(level: LogEvent['level']): string {
    const styles = {
      info: 'color: #3b82f6; font-weight: bold',
      warn: 'color: #f59e0b; font-weight: bold',
      error: 'color: #ef4444; font-weight: bold',
      debug: 'color: #6b7280; font-weight: normal'
    };
    return styles[level];
  }

  private sendToExternalService(logEvent: LogEvent) {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // In a real app, send to your logging service
    // Example: Sentry, LogRocket, DataDog, etc.
    try {
      // Placeholder for external logging service
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEvent)
      // });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  // Public methods
  info(message: string, data?: any, context?: Record<string, any>) {
    this.log('info', 'APP', message, data, context);
  }

  warn(message: string, data?: any, context?: Record<string, any>) {
    this.log('warn', 'APP', message, data, context);
  }

  error(message: string, data?: any, context?: Record<string, any>) {
    this.log('error', 'APP', message, data, context);
  }

  debug(message: string, data?: any, context?: Record<string, any>) {
    this.log('debug', 'APP', message, data, context);
  }

  // Category-specific loggers
  api(message: string, data?: any, context?: Record<string, any>) {
    this.log('info', 'API', message, data, context);
  }

  chat(message: string, data?: any, context?: Record<string, any>) {
    this.log('info', 'CHAT', message, data, context);
  }

  user(message: string, data?: any, context?: Record<string, any>) {
    this.log('info', 'USER', message, data, context);
  }

  // Get logs for debugging
  getLogs(level?: LogEvent['level'], category?: string): LogEvent[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (category && log.category !== category) return false;
      return true;
    });
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs (for debugging or support)
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Analytics/tracking functions
interface TrackingEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

export const trackEvent = (event: string, properties?: Record<string, any>, userId?: string) => {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  const trackingEvent: TrackingEvent = {
    event,
    properties,
    userId,
    timestamp: new Date().toISOString()
  };

  logger.debug('Tracking event', trackingEvent);

  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    try {
      // Example: Google Analytics, Mixpanel, Amplitude, etc.
      // gtag('event', event, properties);
      // mixpanel.track(event, properties);
      // amplitude.logEvent(event, properties);
    } catch (error) {
      logger.error('Failed to track event', { event, error: error });
    }
  }
};

export const trackUserAction = (action: string, details?: Record<string, any>) => {
  trackEvent('user_action', { action, ...details });
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application error', { 
    message: error.message, 
    stack: error.stack,
    ...context 
  });
  
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    ...context
  });
};

// Performance tracking
export const trackPerformance = (name: string, duration: number, details?: Record<string, any>) => {
  logger.debug('Performance metric', { name, duration, ...details });
  
  trackEvent('performance', {
    metric_name: name,
    duration_ms: duration,
    ...details
  });
};

// Conversation tracking
export const trackConversation = (event: string, conversationId: string, details?: Record<string, any>) => {
  logger.chat(`Conversation ${event}`, { conversationId, ...details });
  
  trackEvent(`conversation_${event}`, {
    conversation_id: conversationId,
    ...details
  });
};