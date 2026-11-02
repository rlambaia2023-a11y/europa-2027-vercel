import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // em desenvolvimento, /api vai para o `vercel dev` (porta 3000)
    proxy: { '/api': 'http://localhost:3000' },
  },
});
