import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to prevent backend files from being processed
const ignoreBackendPlugin = (): Plugin => ({
  name: 'ignore-backend-files',
  enforce: 'pre',
  resolveId(id, importer) {
    // Don't touch node_modules
    if (id.includes('node_modules') || importer?.includes('node_modules')) {
      return null;
    }

    // Only block our backend files (absolute or relative paths from project root)
    const projectBackendPatterns = [
      '/utils/database',
      '../utils/database',
      './utils/database',
      '/utils/notification',
      '../utils/notification',
      './utils/notification',
      '/utils/booking-state-machine',
      '../utils/booking-state-machine',
      '/utils/payment',
      '../utils/payment',
      '/utils/pms-integration',
      '../utils/pms-integration',
      '/utils/rentcar-api',
      '../utils/rentcar-api',
      '/api/',
      '../api/',
      './api/',
      '/workers/',
      '../workers/',
      '/scripts/',
      '../scripts/'
    ];

    if (projectBackendPatterns.some(pattern => id.includes(pattern))) {
      return { id, external: true };
    }

    return null;
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  // Explicitly set root to prevent scanning backend folders
  root: './',
  publicDir: 'public',

  plugins: [
    ignoreBackendPlugin(),
    react()
  ],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': '/src',
      // Prevent frontend from importing backend-only files that use database.js
      '../utils/rentcar-api': '/utils/rentcar-api-stub.ts',
      '../utils/pms-integrations': '/utils/pms-integrations-stub.ts',
      '../utils/pms-integration': '/utils/pms-integration-stub.ts',
    },
  },
  optimizeDeps: {
    exclude: [
      'utils/database.js',
      'utils/notification.ts',
      'utils/notifications.ts',
      'utils/booking-state-machine.ts',
      'utils/payment.ts',
      'utils/pms-integration.ts',
      'utils/pms-integrations.ts',
      'utils/rentcar-api.ts',
      'utils/rentcar-price-calculator.ts',
      'utils/test-lock-db-integration.ts'
    ]
  },
  server: {
    port: 5173,
    open: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3004',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Don't use broad external patterns - handled by custom plugin instead
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-tabs'
          ],
          icons: ['lucide-react'],
          utils: ['clsx', 'tailwind-merge'],
          router: ['react-router-dom'],
          'date-utils': ['date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 2000  // 경고 한도 증가 (1MB → 2MB)
  },
  preview: {
    port: 3000,
    host: true
  }
})