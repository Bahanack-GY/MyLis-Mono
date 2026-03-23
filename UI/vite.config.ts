import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      clientPort: parseInt(process.env.UI_PORT || '8080'),
    },
    proxy: {
      '/auth': 'http://server:3025',
      '/users': 'http://server:3025',
      '/employees': 'http://server:3025',
      '/tasks': 'http://server:3025',
      '/hr': 'http://server:3025',
      '/organization': 'http://server:3025',
      '/logs': 'http://server:3025',
      '/tickets': 'http://server:3025',
      '/clients': 'http://server:3025',
      '/projects': 'http://server:3025',
      '/meetings': 'http://server:3025',
      '/invoices': 'http://server:3025',
      '/notifications': 'http://server:3025',
      '/chat': 'http://server:3025',
      '/demands': 'http://server:3025',
      '/expenses': 'http://server:3025',
      '/salary': 'http://server:3025',
      '/uploads': 'http://server:3025',
      '/api': 'http://server:3025',
      '/socket.io': {
        target: 'http://server:3025',
        ws: true,
      },
    },
  },
})
