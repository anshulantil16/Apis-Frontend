import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    watch: {
      // src/assets/hierarchy/, public/milestones/, public/packaging/ and
      // public/Apis_wall/ receive photos while the dev server is running; a
      // file still mid-copy makes Windows' fs.watch throw EBUSY, which crashes
      // the whole Vite process. A crash mid-edit is far worse than a stale
      // photo, so just don't watch these folders. The cost: a photo added or
      // renamed in public/ 404s until the dev server is restarted.
      ignored: ['**/src/assets/hierarchy/**', '**/public/milestones/**', '**/public/packaging/**', '**/public/Apis_wall/**'],
    },
  },
})