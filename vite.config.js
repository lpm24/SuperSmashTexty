import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Use '/SuperSmashTexty/' base path for production builds (GitHub Pages)
  // Use '/' for local development
  const base = command === 'build' ? '/SuperSmashTexty/' : '/';
  
  return {
    base,
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
      port: 3010, // Match package.json dev script
      open: true
    }
  };
});






