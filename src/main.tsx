/**
 * Main Entry Point - Trading Platform Application
 * Features: Error boundary, performance monitoring, PWA support, global state management
 * Version: 3.0.0
 */

import React, { StrictMode, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AppConfig {
  version: string;
  environment: 'development' | 'production' | 'test';
  apiBaseUrl: string;
  wsBaseUrl: string;
  features: {
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    darkMode: boolean;
    realTimeUpdates: boolean;
    chartAnimations: boolean;
  };
  limits: {
    maxWatchlistItems: number;
    minDepositAmount: number;
    maxWithdrawAmount: number;
    orderQuantityPrecision: number;
    pricePrecision: number;
  };
  timeouts: {
    apiTimeout: number;
    wsReconnectInterval: number;
    marketDataRefresh: number;
    toastDuration: number;
  };
}

interface GlobalError {
  message: string;
  timestamp: number;
  stack?: string;
  componentStack?: string;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

const APP_CONFIG: AppConfig = {
  version: '3.0.0',
  environment: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
    ? 'development' 
    : 'production',
  apiBaseUrl: typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://api.tradingplatform.com/v1'
    : 'http://localhost:8080/api/v1',
  wsBaseUrl: typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'wss://ws.tradingplatform.com'
    : 'ws://localhost:8080/ws',
  features: {
    soundEnabled: true,
    notificationsEnabled: true,
    darkMode: true,
    realTimeUpdates: true,
    chartAnimations: true,
  },
  limits: {
    maxWatchlistItems: 50,
    minDepositAmount: 100,
    maxWithdrawAmount: 1000000,
    orderQuantityPrecision: 0,
    pricePrecision: 2,
  },
  timeouts: {
    apiTimeout: 30000,
    wsReconnectInterval: 5000,
    marketDataRefresh: 1000,
    toastDuration: 4000,
  },
};

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

class AppState {
  private static instance: AppState;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private state: Map<string, any> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private errors: GlobalError[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeEventListeners();
      this.startPerformanceMonitoring();
    }
  }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  private initializeEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('connection-change', { online: true });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('connection-change', { online: false });
    });

    window.addEventListener('error', ((event: ErrorEvent) => {
      this.captureError(event.error || new Error(event.message));
    }) as EventListener);

    window.addEventListener('unhandledrejection', ((event: PromiseRejectionEvent) => {
      this.captureError(event.reason);
    }) as EventListener);
  }

  private startPerformanceMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceMetric(entry.name, entry.duration, {
              entryType: entry.entryType,
              startTime: entry.startTime,
            });
          }
        });
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  recordPerformanceMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };
    this.performanceMetrics.push(metric);
    
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    this.emit('performance-metric', metric);
  }

  captureError(error: Error | any, componentStack?: string): void {
    const globalError: GlobalError = {
      message: error?.message || String(error),
      timestamp: Date.now(),
      stack: error?.stack,
      componentStack,
    };
    this.errors.push(globalError);
    
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    this.emit('error-captured', globalError);
    
    if (APP_CONFIG.environment === 'development') {
      console.error('[Global Error]', globalError);
    }
  }

  getErrors(): GlobalError[] {
    return [...this.errors];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  isAppOnline(): boolean {
    return this.isOnline;
  }

  getConfig(): AppConfig {
    return { ...APP_CONFIG };
  }

  setState(key: string, value: any): void {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    this.emit(`state:${key}`, { oldValue, newValue: value });
    this.emit('state-change', { key, oldValue, newValue: value });
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  logEvent(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const event = {
      message,
      level,
      timestamp: Date.now(),
    };
    this.emit('log-event', event);
    
    if (APP_CONFIG.environment === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });
    
    AppState.getInstance().captureError(error, errorInfo.componentStack);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <i className="fas fa-exclamation-triangle"></i>
            <h1>Something went wrong</h1>
            <p>We apologize for the inconvenience. Please try refreshing the page.</p>
            {APP_CONFIG.environment === 'development' && (
              <details>
                <summary>Technical details</summary>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            <button onClick={() => window.location.reload()}>
              <i className="fas fa-sync-alt"></i> Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// PERFORMANCE MONITORING COMPONENT
// ============================================================================

class PerformanceMonitor extends React.Component<{ children: ReactNode }> {
  private static instanceCount = 0;
  private instanceId: number;
  private mountTime: number;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.instanceId = ++PerformanceMonitor.instanceCount;
    this.mountTime = performance.now();
  }

  componentDidMount(): void {
    const mountDuration = performance.now() - this.mountTime;
    AppState.getInstance().recordPerformanceMetric(
      `component-mount-${this.instanceId}`,
      mountDuration,
      { component: this.constructor.name }
    );
  }

  componentDidUpdate(prevProps: { children: ReactNode }): void {
    const updateStart = performance.now();
    const updateDuration = performance.now() - updateStart;
    if (updateDuration > 16) {
      AppState.getInstance().recordPerformanceMetric(
        `slow-update-${this.instanceId}`,
        updateDuration,
        { component: this.constructor.name }
      );
    }
  }

  render(): ReactNode {
    return this.props.children;
  }
}

// ============================================================================
// LAZY LOAD APP COMPONENT
// ============================================================================

const App = lazy(() => 
  import('./App').then(module => {
    const loadTime = performance.now();
    AppState.getInstance().recordPerformanceMetric('app-chunk-load', loadTime);
    return module;
  })
);

// ============================================================================
// LOADING FALLBACK COMPONENT
// ============================================================================

const LoadingFallback: React.FC = () => {
  const [progress, setProgress] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState('Loading application...');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    const messages = [
      'Loading application...',
      'Connecting to market data...',
      'Initializing charts...',
      'Setting up real-time updates...',
      'Almost ready...',
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 800);

    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="loading-fallback">
      <div className="loading-container">
        <div className="loading-icon">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="loading-progress">
          <div className="loading-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="loading-message">{loadingMessage}</div>
        <div className="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INITIALIZE APP
// ============================================================================

// Register service worker for PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && APP_CONFIG.environment === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(registrationError => {
      AppState.getInstance().logEvent(
        `ServiceWorker registration failed: ${registrationError}`,
        'error'
      );
    });
  });
}

// Keyboard shortcuts for development
if (typeof window !== 'undefined' && APP_CONFIG.environment === 'development') {
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      console.log('[App State]', {
        config: APP_CONFIG,
        errors: AppState.getInstance().getErrors(),
        metrics: AppState.getInstance().getPerformanceMetrics(),
        online: AppState.getInstance().isAppOnline(),
      });
      event.preventDefault();
    }
    
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
      console.clear();
      event.preventDefault();
    }
  });
}

// Root element validation
const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null;
if (!rootElement && typeof document !== 'undefined') {
  throw new Error('Root element not found. Make sure there is a div with id "root" in your HTML.');
}

// Create root and render application
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <StrictMode>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          AppState.getInstance().logEvent(
            `Uncaught error: ${error.message}`,
            'error'
          );
        }}
      >
        <PerformanceMonitor>
          <Suspense fallback={<LoadingFallback />}>
            <App />
          </Suspense>
        </PerformanceMonitor>
      </ErrorBoundary>
    </StrictMode>
  );
}

// Log successful initialization
AppState.getInstance().logEvent(
  `Application initialized successfully (v${APP_CONFIG.version})`,
  'info'
);

// Export for debugging in development
if (typeof window !== 'undefined' && APP_CONFIG.environment === 'development') {
  (window as any).__APP_STATE__ = AppState.getInstance();
  (window as any).__APP_CONFIG__ = APP_CONFIG;
}
