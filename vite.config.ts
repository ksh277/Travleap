import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  // Explicitly set root to prevent scanning backend folders
  root: './',
  publicDir: 'public',

  plugins: [
    // Plugin removed - using build-frontend.cjs instead
    react()
  ],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': '/src',
      // Prevent frontend from importing backend-only files that use database.js
      // Use absolute paths for better matching
      '@/utils/rentcar-api': '/utils/rentcar-api-stub.ts',
      '@/utils/pms-integrations': '/utils/pms-integrations-stub.ts',
      '@/utils/pms-integration': '/utils/pms-integration-stub.ts',
      '@/utils/test-lock': '/utils/test-lock-stub.ts',
      '@/utils/notification': '/utils/notification-stub.ts',
      // Also match relative imports from components directory
      '../utils/rentcar-api': '/utils/rentcar-api-stub.ts',
      '../utils/pms-integrations': '/utils/pms-integrations-stub.ts',
      '../utils/pms-integration': '/utils/pms-integration-stub.ts',
      '../utils/test-lock': '/utils/test-lock-stub.ts',
      '../utils/notification': '/utils/notification-stub.ts',
      // Match from nested admin components (../../utils/)
      '../../utils/rentcar-api': '/utils/rentcar-api-stub.ts',
      '../../utils/pms-integrations': '/utils/pms-integrations-stub.ts',
      '../../utils/pms-integration': '/utils/pms-integration-stub.ts',
      '../../utils/test-lock': '/utils/test-lock-stub.ts',
      '../../utils/notification': '/utils/notification-stub.ts',
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
    sourcemap: true,
    rollupOptions: {
      // Don't use broad external patterns - handled by custom plugin instead
      output: {
        manualChunks: (id) => {
          // React and React-DOM in one chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // React Router in separate chunk
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-router';
          }
          // All Radix UI components together
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          // Other vendor dependencies
          if (id.includes('node_modules')) {
            return 'vendor-libs';
          }
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