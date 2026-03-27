import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiTarget = 'http://server:3025'
const apiPaths = [
  '/auth', '/users', '/employees', '/tasks', '/hr',
  '/organization', '/logs', '/tickets', '/clients',
  '/projects', '/meetings', '/invoices', '/notifications',
  '/chat', '/demands', '/expenses', '/salary', '/uploads',
  '/api', '/leads', '/lead-activities', '/client-payments',
  '/task-natures', '/teams', '/departments', '/gamification',
  '/payroll', '/tax', '/accounting',
]

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
      ...Object.fromEntries(
        apiPaths.map(path => [path, {
          target: apiTarget,
          bypass: (req: any) => {
            // Let browser page navigations (HTML) fall through to the SPA
            if (req.headers.accept?.includes('text/html')) return req.url
          },
        }])
      ),
      '/socket.io': {
        target: apiTarget,
        ws: true,
      },
    },
  },
})
