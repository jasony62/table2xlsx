import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  /* 支持别名 */
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/background/index.ts'),
      formats: ['es'],
      fileName: 'backgroundScript',
    },
  },
})
