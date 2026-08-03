import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames(assetInfo) {
          const sourceNames = [
            ...(assetInfo.names ?? []),
            ...(assetInfo.originalFileNames ?? []),
          ]

          return sourceNames.some((name) => /(^|[/\\])dev\.webp$/i.test(name))
            ? 'assets/dev.webp'
            : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
