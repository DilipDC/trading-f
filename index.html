/**
 * Main Entry Point - Optimized for Speed & Performance
 * Features: Lazy loading, code splitting, fast hydration
 */

import React, { StrictMode, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

// Lazy load main App component
const App = lazy(() => import('./App'));

// Ultra-fast loading fallback
const LoadingFallback = () => (
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
      <div style={{
        fontSize: '2rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #00d4ff, #7b2ff7)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        marginBottom: '20px'
      }}>
        <i className="fas fa-chart-line"></i> TRADING PRO
      </div>
      <div style={{
        width: '40px',
        height: '40px',
        margin: '0 auto',
        border: '3px solid rgba(0,212,255,0.1)',
        borderTopColor: '#00d4ff',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  </div>
);

// Root element
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </StrictMode>
  );
}

// Remove loader quickly
window.addEventListener('load', () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
});
