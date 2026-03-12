@echo off
REM Pre-deployment validation script for Windows
REM Run this before every deployment to catch breaking changes

echo 🚀 Starting pre-deployment checks...

cd app

REM 1. Install dependencies
echo 📦 Installing dependencies...
call npm ci
if %ERRORLEVEL% neq 0 goto :error

REM 2. Lint check  
echo 🔍 Running linter...
call npm run lint
if %ERRORLEVEL% neq 0 goto :error

REM 3. Type checking (via build)
echo 🔧 Type checking and building...
call npm run build
if %ERRORLEVEL% neq 0 goto :error

REM 4. Unit tests
echo 🧪 Running unit tests...
call npm run test:run
if %ERRORLEVEL% neq 0 goto :error

REM 5. E2E tests (critical flows only)  
echo 🎭 Running critical deployment tests...
REM Run only the stable deployment-critical tests
call npx playwright test tests/e2e/deployment-critical.spec.ts
if %ERRORLEVEL% neq 0 goto :error

echo ✅ All pre-deployment checks passed!
echo 🚢 Ready to deploy!
goto :end

:error
echo ❌ Pre-deployment check failed!
echo 🛑 Do not deploy until all checks pass!
exit /b 1

:end