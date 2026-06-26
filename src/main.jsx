import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoutes } from './app/routes/AppRoutes';
import { AuthProvider } from './app/providers/AuthProvider';
import './shared/styles/globals.css';

const preventNumberInputScroll = () => {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && active.type === 'number') {
    active.blur();
  }
};

// Chrome, Edge, Safari, Opera e Firefox moderno
document.addEventListener('wheel', preventNumberInputScroll, { passive: true });
// Firefox antigo
document.addEventListener('DOMMouseScroll', preventNumberInputScroll, { passive: true });
// ------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </React.StrictMode>
);