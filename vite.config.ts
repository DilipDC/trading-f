import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Base path for Render / GitHub Pages
  base: '/',
  
  // Server configuration
  server: {
    port: 3000,
    host: true,
    open: false,
  },
  
  // Build optimizations
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,          // Smaller builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // Remove console logs
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    target: 'es2020',
    chunkSizeWarningLimit: 600,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'date-fns'],
  },
  
  // CSS options
  css: {
    devSourcemap: false,
  },
});
