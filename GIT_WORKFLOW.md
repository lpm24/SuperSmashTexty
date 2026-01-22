# Git Workflow Automation Guide

This document outlines the automated and prompted ways to handle Git commits and pushes in this project.

## 🚀 Quick Start Options

### Option 1: VS Code/Cursor Source Control Panel (Recommended)
- **Location**: Left sidebar → Source Control icon (or `Ctrl+Shift+G`)
- **Features**:
  - Visual diff viewer
  - Stage/unstage files with checkboxes
  - Commit message input with validation
  - Push/pull buttons
  - Branch management
- **Auto-prompts**: VS Code will show a notification when you have uncommitted changes

### Option 2: GitHub Desktop
- **Visual interface** for all Git operations
- **Auto-detects** changes and shows them in the UI
- **One-click** commit and push
- **Built-in** conflict resolution

### Option 3: Command Line with Aliases
After setting up (see below), use these shortcuts:
```bash
git st          # Quick status
git changes     # See what changed
git review      # Review staged changes
git save "message"  # Commit all changes
git pushup      # Push current branch
```

## 📋 Setup Instructions

### 1. Enable Commit Message Template
Run this once to use the commit message template:
```bash
git config --local commit.template .gitmessage
```

### 2. Add Git Aliases (Optional)
To use the convenient aliases, add them to your local config:
```bash
git config --local include.path .gitconfig.local
```

Or manually add aliases:
```bash
git config --local alias.st "status -sb"
git config --local alias.save "!git add -A && git commit -m"
git config --local alias.pushup "push -u origin HEAD"
```

### 3. VS Code/Cursor Settings
The `.vscode/settings.json` file is already configured with:
- ✅ Smart commit suggestions
- ✅ Auto-fetch every 3 minutes
- ✅ Commit confirmation prompts
- ✅ Inline git blame
- ✅ Input validation for commit messages

### 4. GitHub Desktop Settings
In GitHub Desktop:
1. Go to **File → Options → Git**
2. Enable **"Automatically fetch from remote"**
3. Enable **"Show confirmation dialog before committing"**
4. Set default commit message format if desired

## 🔄 Automated Workflows

### Pre-Commit Checks (Future Enhancement)
You can add a pre-commit hook to:
- Run linters
- Check for console.log statements
- Verify build succeeds
- Run tests

Example setup (optional):
```bash
# Install husky for git hooks
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run build"
```

### CI/CD Pipeline
The `.github/workflows/ci.yml` file automatically:
- ✅ Runs on every push to `main`
- ✅ Installs dependencies
- ✅ Builds the project
- ✅ Verifies build succeeds

## 🔢 Automatic Version Numbering

**CRITICAL: DO NOT MODIFY OR REMOVE THIS SYSTEM**

The game version is automatically generated based on git commit count. This system has been implemented twice and must not be removed or modified.

### How It Works

1. **vite.config.js** defines a global `__APP_VERSION__` variable:
   ```javascript
   define: {
     __APP_VERSION__: JSON.stringify(`v0.1.${commitCount}`)
   }
   ```
   - Uses `git rev-list --count HEAD` to get total commit count
   - Version format: `v0.1.<commit_count>` (e.g., `v0.1.151`)

2. **src/scenes/menu.js** displays the version:
   ```javascript
   k.text(__APP_VERSION__, { size: UI_TEXT_SIZES.MICRO })
   ```
   - Bottom-right corner of the main menu
   - Uses `UI_COLORS.TEXT_DISABLED` color

### Files Involved (DO NOT REMOVE/MODIFY VERSION CODE)
- `vite.config.js` - Lines 4-11 (getGitCommitCount function) and line 22 (define block)
- `src/scenes/menu.js` - Line ~1095 (version display in menu)

### Why This Exists
- Automatically increments with each commit (no manual version bumping)
- Allows easy identification of which build a user is running
- Helps with bug reports and debugging

## 📝 Commit Message Guidelines

Use the template format (automatically loaded):
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `game`: Game-specific changes (mechanics, content)
- `refactor`: Code refactoring
- `style`: Formatting changes
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add multi-shot upgrade system
fix: Resolve projectile collision detection bug
game: Implement door-based enemy spawning
docs: Update README with Phase 2 progress
```

## 🎯 Recommended Daily Workflow

1. **Start of session**: `git pull` (or use GitHub Desktop sync)
2. **During work**: Make changes normally
3. **Check status**: 
   - VS Code: Look at Source Control panel
   - CLI: `git st` or `npm run git:status`
4. **Review changes**: 
   - VS Code: Click files in Source Control panel
   - CLI: `npm run git:changes`
5. **Commit**: 
   - VS Code: Stage files, write message, click commit
   - CLI: `git save "your message"`
6. **Push**: 
   - VS Code: Click push button
   - CLI: `git pushup`

## 🔔 Notifications & Prompts

### VS Code/Cursor
- **Source Control badge**: Shows number of uncommitted changes
- **Status bar**: Shows current branch and sync status
- **Notifications**: Prompts when you have uncommitted changes on branch switch

### GitHub Desktop
- **Tray icon**: Shows when you have uncommitted changes
- **Notifications**: Alerts for conflicts or sync issues

### Command Line
Check status anytime:
```bash
npm run git:status    # Quick status
git clean             # Check if working tree is clean
```

## 🛠️ Troubleshooting

**"Working tree has uncommitted changes"**
- Review: `git changes` or `npm run git:changes`
- Commit or stash: `git stash` to temporarily save

**"Branch is behind origin"**
- Pull latest: `git pull` or use GitHub Desktop sync

**"Commit message too long"**
- VS Code will warn you automatically
- Keep subject under 50 chars, body under 72 chars per line

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [VS Code Git Integration](https://code.visualstudio.com/docs/editor/versioncontrol)
- [GitHub Desktop Guide](https://docs.github.com/en/desktop)



