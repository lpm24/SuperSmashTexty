# Claude Code Project Instructions

This file contains critical information for AI assistants working on this codebase.

## Critical Systems - DO NOT REMOVE OR MODIFY

### 1. Automatic Version Numbering System

**Files involved:**
- `vite.config.js` - Defines `__APP_VERSION__` global using git commit count
- `src/scenes/menu.js` - Displays version in bottom-right of main menu

**How it works:**
```
Version format: v0.1.<git_commit_count>
Example: v0.1.151 (after 151 commits)
```

**Why this matters:**
- This system has been accidentally removed TWICE before
- It automatically increments with each commit (no manual updates needed)
- Critical for bug reports and identifying user build versions

**DO NOT:**
- Remove the `getGitCommitCount()` function from vite.config.js
- Remove the `define: { __APP_VERSION__: ... }` block from vite.config.js
- Remove the version display code from menu.js (~line 1094-1101)
- Replace `__APP_VERSION__` with a hardcoded version string

**Documentation:** See GIT_WORKFLOW.md "Automatic Version Numbering" section

---

## Project Architecture Notes

### Build System
- **Vite** for development and production builds
- **Kaplay** (game engine) loaded via npm
- Production builds go to `dist/` and deploy to GitHub Pages

### Key Directories
- `src/scenes/` - Game scenes (menu, game, gameOver, etc.)
- `src/systems/` - Core systems (particles, meta progression, achievements)
- `src/data/` - Game data (enemies, upgrades, unlocks, achievements)
- `src/entities/` - Game entities (player, projectiles)

### Cosmetics System
- Death effects, trails, and glows are cosmetic options
- Defined in `src/data/unlocks.js`
- Implemented in `src/systems/particleSystem.js`
- Equipped cosmetics stored in `gameState.equippedCosmetics`
