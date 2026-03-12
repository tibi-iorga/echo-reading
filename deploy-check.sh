#!/bin/bash

# Pre-deployment validation script
# Run this before every deployment to catch breaking changes

echo "🚀 Starting pre-deployment checks..."

cd app

# Exit on any error
set -e

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 2. Lint check
echo "🔍 Running linter..."
npm run lint

# 3. Type checking (via build)
echo "🔧 Type checking and building..."
npm run build

# 4. Unit tests
echo "🧪 Running unit tests..."
npm run test:run

# 5. E2E tests (critical flows only)
echo "🎭 Running critical deployment tests..."
# Run only the stable deployment-critical tests
npx playwright test tests/e2e/deployment-critical.spec.ts

echo "✅ All pre-deployment checks passed!"
echo "🚢 Ready to deploy!"