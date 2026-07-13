import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    // Honors the ~/* alias from tsconfig paths (vite 8 native support).
    tsconfigPaths: true,
  },
})
