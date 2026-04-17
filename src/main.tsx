import React, { StrictMode, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

interface AppConfig {
  version: string;
  environment: 'development' | 'production' | 'test';
  apiBaseUrl: string;
  wsBaseUrl: string;
}

const APP_CONFIG: AppConfig = {
  version: '2.0.0',
  environment: (import.meta as any).env?.MODE || 'development',
  apiBaseUrl: (import.meta as any).env?.VITE_API_URL || 'https://api.tradingplatform.com/v1',
  wsBaseUrl: (import.meta as any).env?.VITE_WS_URL || 'wss://ws.tradingplatform.com',
};

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="error-boundary"><h1>Something went wrong</h1><button onClick={() => window.location.reload()}>Refresh</button></div>;
    }
    return this.props.children;
  }
}

const App = lazy(() => import('./App'));

const LoadingFallback = () => (
  <div className="loading-fallback">
    <div className="loading-container">
      <div className="loading-icon"><i className="fas fa-chart-line"></i></div>
      <div className="loading-message">Loading trading platform...</div>
    </div>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);
