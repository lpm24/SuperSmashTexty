import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git commit count for version number
function getGitCommitCount() {
  try {
    return execSync('git rev-list --count HEAD').toString().trim();
  } catch {
    return '0';
  }
}

export default defineConfig(({ command }) => {
  const commitCount = getGitCommitCount();
  // Use '/SuperSmashTexty/' base path for production builds (GitHub Pages)
  // Use '/' for local development
  const base = command === 'build' ? '/SuperSmashTexty/' : '/';
  
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(`v0.1.${commitCount}`)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
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






