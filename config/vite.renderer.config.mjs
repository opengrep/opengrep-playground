import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue()],
  build: {
    // Reduce memory pressure during build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Limit parallel file operations to reduce memory usage in CI
      maxParallelFileOps: 5,
      output: {
        // Split Monaco Editor into separate chunks to reduce memory usage during build
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