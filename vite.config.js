import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteApiPlugin } from './server/viteApiPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteApiPlugin()],
})
