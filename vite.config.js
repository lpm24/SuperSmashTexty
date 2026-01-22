import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// ============================================================================
// AUTOMATIC VERSION SYSTEM - DO NOT REMOVE OR MODIFY
// ============================================================================
// This generates the game version displayed in the menu (e.g., v0.1.151)
// Version = v0.1.<git_commit_count>
// Used by: src/scenes/menu.js via __APP_VERSION__ global
// Docs: See GIT_WORKFLOW.md "Automatic Version Numbering" section
// ============================================================================
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
    // DO NOT REMOVE: Auto-version system (see comment at top of file)
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






