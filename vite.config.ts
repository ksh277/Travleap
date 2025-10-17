import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': '/src',
    },
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