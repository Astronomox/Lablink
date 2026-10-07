import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { aiPlugin } from './server/ai.ts'

// MyHealthfinder sends no CORS headers, so proxy it through the dev/preview server.
const healthfinderProxy = {
  '/api/healthfinder': {
    target: 'https://odphp.health.gov',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/healthfinder/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix loads non-VITE_ vars too; they stay server-side (never exposed to the bundle).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), aiPlugin(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy: healthfinderProxy, host: true },
    preview: { proxy: healthfinderProxy, host: true },
  }
})
