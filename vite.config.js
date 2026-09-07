import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_PAGES === '1' ? '/sol/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
