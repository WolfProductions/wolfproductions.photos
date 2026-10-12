import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The app calls /api and /media on its own origin; in development those go to
// the local backend (cd backend && npm start)
const backend = 'http://localhost:3002'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': backend,
      '/media': backend
    }
  }
})
