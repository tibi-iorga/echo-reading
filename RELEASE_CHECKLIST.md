# Release Checklist

Use this checklist before tagging a stable release version.

## Pre-Release

- [ ] All features for this release are complete
- [ ] Code is tested and working
- [ ] No known critical bugs
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Manual testing of core features completed

## Version Bump

- [ ] Determine version increment type (major/minor/patch)
- [ ] Run version bump script:
  ```bash
  npm run version:patch   # for bug fixes
  npm run version:minor   # for new features
  npm run version:major   # for breaking changes
  ```
- [ ] Verify version updated in:
  - [ ] `app/package.json`
  - [ ] `app/src/constants/version.ts`

## Documentation

- [ ] Update `CHANGELOG.md` with:
  - [ ] Version number and date
  - [ ] Added features
  - [ ] Changed features
  - [ ] Fixed bugs
  - [ ] Security updates (if any)

## Git Commit and Tag

- [ ] Stage version files:
  ```bash
  git add app/package.json app/src/constants/version.ts CHANGELOG.md
  ```
- [ ] Commit version bump:
  ```bash
  git commit -m "Bump version to X.Y.Z"
  ```
- [ ] Create annotated tag:
  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z: [brief description]"
  ```
- [ ] Verify tag created:
  ```bash
  git tag -l
  git show vX.Y.Z
  ```

## Build Artifact (Optional)

- [ ] Build release:
  ```bash
  cd app
  npm run build
  ```
- [ ] Archive build (optional):
  ```bash
  # Create releases directory if needed
  mkdir -p ../releases
  
  # Archive (Windows PowerShell)
  Compress-Archive -Path dist -DestinationPath ../releases/echo-vX.Y.Z-$(Get-Date -Format 'yyyyMMdd').zip
  
  # Or on Linux/Mac
  tar -czf ../releases/echo-vX.Y.Z-$(date +%Y%m%d).tar.gz -C app dist
  ```

## Post-Release

- [ ] Push tags to remote (if using remote repository):
  ```bash
  git push origin vX.Y.Z
  ```
- [ ] Document any special migration steps needed (if data structure changed)
- [ ] Note any breaking changes for users (if major version)

## Quick Reference

### Revert to Previous Version

If something breaks after release:

```bash
# List available versions
git tag -l

# Checkout previous stable version
git checkout vX.Y.Z

# Or create restore branch
git checkout -b restore-vX.Y.Z vX.Y.Z

# Rebuild
cd app
npm install
npm run build
```

### Emergency Hotfix

If critical bug found immediately after release:

```bash
# Create hotfix branch from release tag
git checkout -b hotfix/critical-bug vX.Y.Z

# Fix bug and commit
# ... make fixes ...
git commit -m "Fix: [bug description]"

# Bump patch version
npm run version:patch

# Tag hotfix release
git tag -a vX.Y.Z+1 -m "Hotfix: [bug description]"

# Merge back to main
git checkout main
git merge hotfix/critical-bug
```
