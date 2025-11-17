import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SuperSmashTexty/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3001,
    open: true
  }
});






