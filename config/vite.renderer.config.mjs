import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue()],
  build: {
    // Reduce memory pressure during build
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // Split Monaco Editor into separate chunks to reduce memory usage during build
        codeSplitting: {
          groups: [
            { name: 'monaco-editor', test: /[\\/]node_modules[\\/]monaco-editor[\\/]/ },
            { name: 'monaco-yaml', test: /[\\/]node_modules[\\/]monaco-yaml[\\/]/ },
            { name: 'vue-monaco', test: /[\\/]node_modules[\\/]@guolao[\\/]vue-monaco-editor[\\/]/ },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle Monaco Editor for faster dev server startup
    include: ['monaco-editor', 'monaco-yaml', '@guolao/vue-monaco-editor'],
  },
});