import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  // Rutas relativas: el build funciona en la raíz o en cualquier subruta.
  base: './',
  plugins: [preact()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
