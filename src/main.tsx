import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Disable the auto redirect on auth change
// This allows us to handle redirects manually in our components
// supabase.auth.onAuthStateChange((event, session) => {
//   if (event === 'SIGNED_IN') window.location.href = '/';
//   if (event === 'SIGNED_OUT') window.location.href = '/login';
// });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);