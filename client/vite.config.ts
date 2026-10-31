import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'
  const target = env.VITE_BACKEND_TARGET || (isDev ? 'http://localhost:4000' : 'https://d10grnxvwn5xrp.cloudfront.net')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: !isDev,
        },
      },
    },
    css: {
      postcss: {},
    },
  }
})
