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

    // Block backend files completely
    const isBackendFile =
      id.includes('/utils/database') ||
      id.includes('\\utils\\database') ||
      id.includes('/utils/notification') ||
      id.includes('\\utils\\notification') ||
      id.includes('/utils/booking-state-machine') ||
      id.includes('/utils/payment') ||
      id.includes('/utils/pms-integration') ||
      id.includes('/utils/rentcar-api') ||
      id.match(/[\/\\]api[\/\\]/) ||
      id.match(/[\/\\]workers[\/\\]/) ||
      id.match(/[\/\\]scripts[\/\\]/);

    if (isBackendFile) {
      // Return a virtual module ID that will be handled by load hook
      return '\0virtual:backend-stub';
    }

    return null;
  },

  load(id) {
    // Return empty export for virtual backend stub
    if (id === '\0virtual:backend-stub') {
      return 'export default {};';
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