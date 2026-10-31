import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://d10grnxvwn5xrp.cloudfront.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  css: {
    postcss: {},
  },
})
