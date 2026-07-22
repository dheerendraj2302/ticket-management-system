import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ActingUserProvider } from './context/ActingUserContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Toaster from './components/Toaster.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ActingUserProvider>
        <App />
        <Toaster />
      </ActingUserProvider>
    </ToastProvider>
  </StrictMode>
);
