import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // Split Monaco Editor into separate chunks for better caching
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'monaco-yaml': ['monaco-yaml'],
          'vue-monaco': ['@guolao/vue-monaco-editor'],
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle Monaco Editor for faster dev server startup
    include: ['monaco-editor', 'monaco-yaml', '@guolao/vue-monaco-editor'],
  },
});