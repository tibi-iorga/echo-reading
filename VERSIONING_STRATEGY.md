# Versioning Strategy for Echo

## Overview

This document outlines the versioning strategy to ensure you can revert to stable versions when needed. The strategy covers code versioning, build artifacts, data migrations, and release management.

## 1. Git-Based Version Control

### Initialize Git Repository

```bash
cd d:\personal-projects\books-reading
git init
git add .
git commit -m "Initial commit: v0.1.0 stable baseline"
```

### Branching Strategy

**Main Branch**: `main` or `master`
- Always stable and deployable
- Only merge tested, working code
- Tag stable releases here

**Development Branch**: `develop` (optional)
- Active development work
- Merge feature branches here
- Test before merging to main

**Feature Branches**: `feature/feature-name`
- New features or experiments
- Delete after merging

**Hotfix Branches**: `hotfix/issue-description`
- Critical bug fixes from main
- Merge back to main and develop

### Git Tags for Releases

Tag stable versions using semantic versioning:

```bash
# Tag current stable version
git tag -a v0.1.0 -m "Stable baseline version"

# Tag future releases
git tag -a v0.2.0 -m "Release: Enhanced search features"
git tag -a v0.1.1 -m "Hotfix: PDF rendering bug"
```

**Tag Naming Convention**: `v{major}.{minor}.{patch}`
- Major: Breaking changes
- Minor: New features, backward compatible
- Patch: Bug fixes, backward compatible

### Reverting to Stable Version

```bash
# List all tags
git tag -l

# Checkout specific version
git checkout v0.1.0

# Create branch from tag (recommended)
git checkout -b restore-v0.1.0 v0.1.0

# Or reset main to a tag (destructive)
git reset --hard v0.1.0
```

## 2. Semantic Versioning

### Version Format

Follow [Semantic Versioning 2.0.0](https://semver.org/): `MAJOR.MINOR.PATCH`

**Current**: `0.1.0` (pre-1.0, so breaking changes increment minor)

**Version Increment Rules**:
- **MAJOR** (1.0.0): Breaking API changes, major architecture changes
- **MINOR** (0.2.0): New features, backward compatible additions
- **PATCH** (0.1.1): Bug fixes, small improvements, backward compatible

### Version Storage

Update version in three places:

1. **package.json**: `"version": "0.1.0"`
2. **src/constants/version.ts**: `export const VERSION = '0.1.0'`
3. **Git tag**: `v0.1.0`

### Version Update Script

Create `scripts/version-bump.js` to automate version updates:

```javascript
// scripts/version-bump.js
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const [,, type] = process.argv; // 'major', 'minor', or 'patch'

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Usage: node scripts/version-bump.js [major|minor|patch]');
  process.exit(1);
}

// Read current version
const packageJson = JSON.parse(readFileSync('app/package.json', 'utf8'));
const [major, minor, patch] = packageJson.version.split('.').map(Number);

let newVersion;
if (type === 'major') newVersion = `${major + 1}.0.0`;
else if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

// Update package.json
packageJson.version = newVersion;
writeFileSync('app/package.json', JSON.stringify(packageJson, null, 2) + '\n');

// Update version.ts
const versionTs = `export const VERSION = '${newVersion}'\n`;
writeFileSync('app/src/constants/version.ts', versionTs);

console.log(`Version bumped to ${newVersion}`);
console.log('Next steps:');
console.log(`  1. git add app/package.json app/src/constants/version.ts`);
console.log(`  2. git commit -m "Bump version to ${newVersion}"`);
console.log(`  3. git tag -a v${newVersion} -m "Release v${newVersion}"`);
```

## 3. Build Artifact Management

### Build Output

Vite builds to `app/dist/` directory. This contains the deployable application.

### Release Builds

**Option 1: Archive Builds Locally**

```bash
# Build the application
cd app
npm run build

# Create versioned archive
cd ..
mkdir -p releases
tar -czf releases/echo-v0.1.0-$(date +%Y%m%d).tar.gz -C app dist
# Or on Windows PowerShell:
Compress-Archive -Path app\dist -DestinationPath releases\echo-v0.1.0-$(Get-Date -Format 'yyyyMMdd').zip
```

**Option 2: Store Builds in Git (Not Recommended)**
- Bloats repository
- Only use for critical releases if needed

**Option 3: External Storage**
- Cloud storage (S3, Google Drive, etc.)
- Versioned releases folder
- Document location in release notes

### Release Checklist

Before tagging a stable version:

- [ ] All tests pass (when you add tests)
- [ ] Build succeeds without errors
- [ ] Manual testing of core features
- [ ] Version numbers updated in all locations
- [ ] CHANGELOG.md updated (see below)
- [ ] Git commit with version bump
- [ ] Git tag created
- [ ] Build artifact archived (optional)

## 4. Data Migration Versioning

### Current System

You already have migration support in `storageService.ts`:
- Version constants for data structures
- Migration functions for backward compatibility
- Manual migration scripts in `scripts/migrations/`

### Migration Best Practices

1. **Always Increment Data Versions**: When changing data structures
2. **Write Migration Functions**: Support old data formats
3. **Test Migrations**: Use test scripts before deploying
4. **Backup Before Migrating**: Export localStorage before major migrations

### Version Compatibility Matrix

Document which app versions support which data versions:

| App Version | Chat Messages | UI State | Global UI State |
|------------|---------------|----------|-----------------|
| 0.1.0      | v1            | v1       | v1              |
| 0.2.0      | v1, v2        | v1, v2   | v1, v2          |

## 5. Application Version Display

### Show Version in UI

Add version display in Settings panel:

```typescript
// In SettingsPanel.tsx
import { VERSION } from '../constants/version'

// Display in UI
<div className="text-xs text-gray-500 mt-4">
  Echo v{VERSION}
</div>
```

### Version in Build

Vite can inject version at build time. Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
})
```

## 6. CHANGELOG Management

Create `CHANGELOG.md` to track changes:

```markdown
# Changelog

All notable changes to Echo will be documented in this file.

## [0.1.0] - 2025-01-28

### Added
- Initial stable release
- PDF reading and annotation
- LLM chat integration
- Export to Markdown

### Changed
- (none)

### Fixed
- (none)
```

**Format**: Follow [Keep a Changelog](https://keepachangelog.com/) format

**Update Process**: Update CHANGELOG.md before each release tag

## 7. Quick Reference: Reverting to Stable Version

### Scenario: Code Broke, Need to Revert

```bash
# 1. Check what went wrong (optional)
git log --oneline

# 2. List available stable versions
git tag -l

# 3. Create restore branch from stable tag
git checkout -b restore-stable v0.1.0

# 4. Build and test
cd app
npm install
npm run build
npm run preview

# 5. If good, merge back to main (or replace main)
git checkout main
git merge restore-stable
# OR replace main entirely:
git reset --hard v0.1.0

# 6. Rebuild
cd app
npm run build
```

### Scenario: Need Previous Build Artifact

```bash
# If you archived builds:
# Extract from releases/echo-v0.1.0-YYYYMMDD.tar.gz

# If builds are in git:
git checkout v0.1.0
cd app
npm run build
# dist/ now contains the old version
```

### Scenario: Data Migration Issues

```bash
# 1. Backup current localStorage (browser console)
# See scripts/migrations/README.md

# 2. Run migration script
# See scripts/migrations/example-migration.ts

# 3. Or revert app version and let it handle migration
git checkout v0.1.0
cd app
npm install
npm run build
```

## 8. Recommended Workflow

### Daily Development

```bash
# Work on feature branch
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
```

### Before Major Changes

```bash
# Tag current stable state
git tag -a v0.1.0 -m "Stable before major changes"

# Create backup branch
git checkout -b backup-before-major-changes
git checkout main
```

### Releasing Stable Version

```bash
# 1. Ensure everything works
npm run build
npm run lint

# 2. Update version
node scripts/version-bump.js minor

# 3. Update CHANGELOG.md

# 4. Commit version bump
git add .
git commit -m "Bump version to 0.2.0"

# 5. Tag release
git tag -a v0.2.0 -m "Release v0.2.0: Enhanced features"

# 6. Build and archive (optional)
npm run build
# Archive dist/ folder

# 7. Push tags
git push origin v0.2.0
```

## 9. Automation (Future)

Consider adding:

- **GitHub Actions** or similar CI/CD:
  - Auto-build on tags
  - Create release artifacts
  - Run tests before release

- **Release Script**: Combine version bump, changelog, tag, build

- **Pre-commit Hooks**: Ensure version numbers match

## Summary

**Immediate Actions**:

1. Initialize git repository
2. Tag current version as v0.1.0
3. Create CHANGELOG.md
4. Set up version bump script
5. Document your release process

**Key Principles**:

- Tag every stable version
- Keep main branch always deployable
- Archive important builds
- Document data migrations
- Test before tagging releases

This strategy ensures you can always revert to a known good state while maintaining development velocity.
