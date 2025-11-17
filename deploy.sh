#!/bin/bash
# Deploy to GitHub Pages

echo "Building project..."
npm run build

echo "Deploying to gh-pages branch..."
git add dist -f
git commit -m "chore: Update build for GitHub Pages"

# Push dist folder to gh-pages branch
git subtree push --prefix dist origin gh-pages

echo "Deployment complete! Visit https://lpm24.github.io/SuperSmashTexty/"
