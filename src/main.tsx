/**
 * Main Entry Point - Optimized for Super Fast Loading
 * Features: Lazy loading, code splitting, performance monitoring, critical CSS
 * Version: 4.0.0 - Ultra Fast
 */

import React, { StrictMode, Suspense, lazy, Component, ErrorInfo, ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AppConfig {
  version: string;
  environment: 'development' | 'production' | 'test';
  features: {
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    realTimeUpdates: boolean;
  };
  timeouts: {
    apiTimeout: number;
    marketDataRefresh: number;
    toastDuration: number;
  };
}

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

const APP_CONFIG: AppConfig = {
  version: '4.0.0',
  environment: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
    ? 'development' 
    : 'production',
  features: {
    soundEnabled: true,
    notificationsEnabled: true,
    realTimeUpdates: true,
  },
  timeouts: {
    apiTimeout: 30000,
    marketDataRefresh: 5000,
    toastDuration: 3000,
  },
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Track Core Web Vitals
const reportWebVitals = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log(`FID: ${(entry as any).processingStart - (entry as any).startTime}ms`);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log(`CLS: ${clsValue}`);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.warn('Web Vitals not supported');
    }
  }
};

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0e1a',
          color: '#e1e4e8',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '48px', color: '#ff4444', marginBottom: '20px' }}></i>
            <h2>Something went wrong</h2>
            <button onClick={() => window.location.reload()} style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#00d4ff',
              border: 'none',
              borderRadius: '8px',
              color: '#0a0e1a',
              cursor: 'pointer'
            }}>Refresh Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// LAZY LOADING WITH PREFETCH
// ============================================================================

// Prefetch the App component on idle time
const prefetchApp = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./App');
    });
  }
};

// Lazy load App with prefetch
const App = lazy(() => {
  prefetchApp();
  return import('./App');
});

// ============================================================================
// ULTRA FAST LOADING FALLBACK
// ============================================================================

const LoadingFallback: React.FC = () => {
  useEffect(() => {
    // Simple animation for loading
    const timer = setTimeout(() => {
      const progressBar = document.querySelector('.fast-loader-progress') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = '100%';
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 80%, #0a0e1a 0%, #05080f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* Logo Animation */}
        <div style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          marginBottom: '24px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <i className="fas fa-chart-line"></i> TRADING PRO
        </div>
        
        {/* Fast Spinner */}
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto 20px',
          border: '3px solid rgba(0, 212, 255, 0.1)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }}></div>
        
        {/* Progress Bar */}
        <div style={{
          width: '200px',
          height: '2px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          margin: '0 auto',
          overflow: 'hidden'
        }}>
          <div className="fast-loader-progress" style={{
            width: '0%',
            height: '100%',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        
        <p style={{ color: '#8b92a8', fontSize: '12px', marginTop: '16px', letterSpacing: '2px' }}>
          LOADING...
        </p>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// INITIALIZE APP
// ============================================================================

// Report web vitals
reportWebVitals();

// Root element
const rootElement = document.getElementById('root');
if (!rootElement && typeof document !== 'undefined') {
  throw new Error('Root element not found');
}

// Create root and render
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  );
}

// Remove loader instantly when React mounts
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
      }, 200);
    }
  }, 100);
});

// Log performance
console.log(`⚡ App loaded in ${performance.now().toFixed(0)}ms`);
