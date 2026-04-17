import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Fast refresh, optimized for production
        fastRefresh: true,
      }),
      // Brotli compression for faster delivery
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }),
      // Gzip fallback
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
      }),
      // PWA for offline support and caching
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.svg'],
        manifest: {
          name: 'Trading Platform',
          short_name: 'TradingPro',
          theme_color: '#0a0e1a',
          background_color: '#0a0e1a',
          display: 'standalone',
          icons: [
            {
              src: '/assets/images/logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,mp3}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    
    // Base path for GitHub Pages / Render
    base: '/',
    
    // Optimize server for fast HMR
    server: {
      port: 3000,
      host: true,
      open: false,
      hmr: {
        overlay: false, // Faster HMR
      },
    },
    
    // Build optimizations
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disable sourcemaps for smaller build
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: {
          toplevel: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['chart.js', 'react-chartjs-2'],
            utils: ['date-fns', 'clsx'],
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      target: 'es2020',
      chunkSizeWarningLimit: 500,
      cssCodeSplit: true,
    },
    
    // Optimize dependencies for faster loading
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'date-fns'],
      exclude: [],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    
    // CSS optimizations
    css: {
      devSourcemap: false,
      modules: {
        localsConvention: 'camelCase',
      },
    },
    
    // Environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    // Performance hints
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
  };
});
