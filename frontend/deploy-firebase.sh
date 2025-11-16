#!/bin/bash

# Firebase Hosting Deployment Script for AskEd Frontend

echo "Building AskEd Frontend..."

# Build production
npm run build

echo "Build complete!"
echo ""
echo "To deploy to Firebase Hosting:"
echo "1. Install Firebase CLI: npm install -g firebase-tools"
echo "2. Login: firebase login"
echo "3. Initialize: firebase init hosting"
echo "   - Select 'Use an existing project' or create new"
echo "   - Set public directory to: dist"
echo "   - Configure as single-page app: Yes"
echo "   - Don't overwrite dist/index.html"
echo "4. Deploy: firebase deploy --only hosting"
echo ""
echo "Or use Cloud Storage + CDN for static hosting"
