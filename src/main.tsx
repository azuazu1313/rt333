import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { reportWebVitals } from './utils/webVitals.ts';
import { HelmetProvider } from 'react-helmet-async';

// Disable the auto redirect on auth change
// This allows us to handle redirects manually in our components

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);

// Report web vitals if GA is configured
reportWebVitals();