import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (_err: any, _req, _res) => {
            // Ignore temporary socket proxy errors when backend restarts
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (_err) => {
              // Swallow websocket socket errors cleanly
            });
          });
          proxy.on('proxyResWs', (_proxyRes, _req, socket) => {
            socket.on('error', (_err) => {
              // Swallow websocket response socket errors cleanly
            });
          });
        }
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios'],
          icons: ['lucide-react']
        }
      }
    }
  }
})
