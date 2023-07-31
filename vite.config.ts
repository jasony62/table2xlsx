import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  /* 支持别名 */
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    minify: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
    },
  },
})
