import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initializeTabLifecycleSync } from './lib/tabSync';
import './index.css';

// Initialize global multi-tab and lifecycle sync early
initializeTabLifecycleSync();

// Suppress benign Vite WebSocket HMR errors in AI Studio sandboxed environment
if (typeof window !== 'undefined') {
  const isWebSocketError = (err: any) => {
    if (!err) return false;
    const msg = err.message || String(err);
    return msg.includes('websocket') || 
           msg.includes('WebSocket') || 
           msg.includes('WebSocket closed');
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebSocketError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isWebSocketError(event.error) || isWebSocketError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// Register the Service Worker for remote/offline rural usage
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ VetAxis Rural ServiceWorker registered successfully with scope:', registration.scope);

        // Auto-check for fresh SW updates whenever tab becomes visible or focused
        const checkForUpdates = () => {
          registration.update().catch((e) => console.warn('SW update check failed:', e));
        };

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates();
          }
        });
        window.addEventListener('focus', checkForUpdates);
      })
      .catch((error) => {
        console.error('❌ VetAxis ServiceWorker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
