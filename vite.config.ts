import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';

// Generate a random nonce
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Use environment variable or generate a new nonce
  const nonce = env.VITE_CSP_NONCE || generateNonce();

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Enable source maps in production
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'framer-motion'],
          },
        },
      },
    },
    // Vite env configuration
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_CSP_NONCE': JSON.stringify(nonce),
    },
    // Replace nonce placeholder in HTML
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        return html.replace(/%VITE_CSP_NONCE%/g, nonce);
      },
    },
  };
});