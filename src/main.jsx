import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoutes } from './app/routes/AppRoutes';
import { AuthProvider } from './app/providers/AuthProvider';
import './shared/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </React.StrictMode>
);