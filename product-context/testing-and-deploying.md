# Testing and Deploying

Complete workflow for testing, committing, and deploying changes safely. This guide ensures your code is secure, tested, and ready for production.

**Critical:** This project auto deploys to Vercel when changes are pushed to `master`. Always complete all checks before pushing.

---

## Understanding This Process

Think of this like a pre-flight checklist for an airplane. Each item must be checked before takeoff. Skipping steps can lead to:
- Security vulnerabilities exposed to users
- Broken functionality affecting real users
- Data loss or corruption
- Reputation damage

**Time investment:** 10-15 minutes before each commit saves hours of fixing problems later.

---

## Pre-Commit QA Checklist

Before committing, run through this checklist. When asked to run QA, perform all checks below and respond with:

**If all checks pass:**
```
QA PASSED

All checks completed successfully. Ready to commit.
```

**If issues found:**
```
QA FAILED

Issues found:
- [List each issue with severity: BLOCKING, WARNING, or INFO]

Suggested actions:
1. [Specific action to fix issue 1]
2. [Specific action to fix issue 2]
```

---

## Phase 1: Automated Checks (Run These First)

These are quick automated checks that catch most problems.

### 1. Build Check
**What it does:** Verifies your code compiles without errors.

**How to run:**
```bash
cd app
npm run build
```

**Pass criteria:**
- ✅ Build completes without errors
- ✅ No red error messages in terminal
- ✅ `dist/` folder is created successfully

**Fail if:**
- ❌ Any error messages appear
- ❌ Build stops before completion
- ❌ TypeScript errors are reported

**Why it matters:** If code doesn't build, users can't use it. This is the most basic check.

---

### 2. Unit Tests (Vitest)
**What it does:** Tests individual pieces of code (functions, components, utilities) work correctly.

**How to run:**
```bash
cd app
npm run test:run
```

**Pass criteria:**
- ✅ All tests pass (green checkmarks)
- ✅ No failed tests
- ✅ Test count matches or exceeds previous runs

**Fail if:**
- ❌ Any test fails (red X marks)
- ❌ Tests timeout or crash
- ❌ Test count decreases significantly

**Why it matters:** Catches bugs in individual components before they affect the whole system.

**Coverage expectations:**
- Critical utilities (parsers, validators): 80%+ coverage
- Services (storage, sync): 70%+ coverage
- Hooks (usePDF, useAnnotations): 80%+ coverage
- Components: 60%+ coverage (focus on user interactions)

---

### 3. E2E Tests (Playwright)
**What it does:** Tests complete user workflows in real browsers (like a real user would use the app).

**How to run:**
```bash
cd app
npm run test:e2e
```

**Pass criteria:**
- ✅ All E2E tests pass
- ✅ Tests complete in reasonable time (< 5 minutes)
- ✅ No browser crashes

**Fail if:**
- ❌ Any E2E test fails
- ❌ Tests hang or timeout
- ❌ Browser errors appear

**Why it matters:** Ensures the complete user experience works end-to-end. This is your final safety net.

**Note:** E2E tests are slower (2-5 minutes). For quick development checks, you can skip these, but ALWAYS run them before committing to master.

**Critical flows to test:**
- Upload PDF → Create sync file → Add API key → Annotate → Export
- PDF operations (navigation, zoom, search, bookmarks)
- Annotation workflows (create, edit, delete)
- LLM integration (with mocked API)
- Sync file round-trip

---

### 4. Lint Check
**What it does:** Checks code style and catches common mistakes.

**How to run:**
```bash
cd app
npm run lint
```

**Pass criteria:**
- ✅ No lint errors
- ✅ Warnings are acceptable (note them but don't block)

**Fail if:**
- ❌ Lint errors appear (must fix)
- ❌ Critical warnings (unused variables, potential bugs)

**Why it matters:** Consistent code style makes code easier to maintain and catches bugs early.

---

### 5. Dependency Security Check
**What it does:** Scans dependencies for known security vulnerabilities.

**How to run:**
```bash
cd app
npm audit
```

**Pass criteria:**
- ✅ No critical or high severity vulnerabilities
- ✅ Medium/low vulnerabilities are acceptable (note them)

**Fail if:**
- ❌ Critical vulnerabilities found
- ❌ High severity vulnerabilities in production dependencies

**Why it matters:** Vulnerable dependencies can be exploited by attackers.

**If vulnerabilities found:**
```bash
npm audit fix          # Try automatic fixes
npm audit fix --force  # More aggressive (review changes)
```

---

## Phase 2: Security Checks (Critical)

These checks prevent exposing sensitive data or vulnerabilities.

### 6. Git Status Review
**What it does:** Shows what files you're about to commit.

**How to run:**
```bash
git status
git diff --stat        # Summary of changes
git diff               # Full changes (review carefully)
```

**Check for:**
- ✅ Only intended files are changed
- ✅ No debug code (`console.log`, `debugger` statements)
- ✅ No hardcoded secrets or API keys in code
- ✅ No unexplained commented-out code
- ✅ Changes match what you intended to do

**Fail if:**
- ❌ Unintended files appear in changes
- ❌ Debug code is present (`console.log`, `debugger`)
- ❌ Hardcoded API keys or secrets in code
- ❌ Large unrelated changes mixed in

**Why it matters:** Prevents committing debug code or secrets that could expose vulnerabilities.

---

### 7. Security File Check (CRITICAL)
**What it does:** Ensures no sensitive files are accidentally committed.

**How to run:**
```bash
git status
```

**Must NOT commit (BLOCKING):**
- ❌ `.env` files or any `.env.*` files (except `.env.example`)
- ❌ Test PDFs in `tests/fixtures/*.pdf` (may contain sensitive content)
- ❌ User sync files (`*.notes.json`, `*_notes.json`, `*_sync.json`)
- ❌ API keys, tokens, or credentials in any format
- ❌ Test results (`test-results/`, `playwright-report/`, `coverage/`)
- ❌ Browser storage dumps or IndexedDB files
- ❌ Certificate files (`.pem`, `.key`, `.cert`, `.p12`, `.pfx`)
- ❌ Backup files (`*.bak`, `*.backup`)
- ❌ Any file containing real API keys or passwords

**If sensitive files appear:**
1. **Unstage immediately:** `git reset HEAD <file>`
2. **Verify .gitignore:** Check if file pattern is in `.gitignore`
3. **Add to .gitignore:** If missing, add the pattern
4. **Remove from git:** If already committed: `git rm --cached <file>`
5. **Revoke credentials:** If real keys were exposed, revoke them immediately

**Why it matters:** Committing secrets exposes them to anyone with repository access. This is a critical security risk.

**Red flags to watch for:**
- Files with "key", "secret", "password", "token" in name
- Files in `tests/fixtures/` that aren't in `.gitignore`
- Any `.json` files that might contain user data
- Files you didn't intentionally create

---

### 8. Code Security Review
**What it does:** Manual check for security issues in changed code.

**Review changed files for:**

**API Keys and Secrets:**
- ❌ No API keys hardcoded in source code
- ❌ No secrets in comments or strings
- ❌ No credentials in error messages
- ✅ API keys only accessed through secure storage service

**Input Sanitization:**
- ✅ User input is validated before use
- ✅ File uploads are validated (type, size)
- ✅ Text input is sanitized before displaying
- ✅ No direct use of `innerHTML` with user data

**Error Handling:**
- ✅ Error messages don't expose sensitive information
- ✅ API keys are never logged or shown in errors
- ✅ Stack traces are sanitized in production

**Data Storage:**
- ✅ Sensitive data uses encrypted storage (IndexedDB with encryption)
- ✅ No sensitive data in localStorage (except encrypted)
- ✅ User data is stored securely

**Why it matters:** Prevents security vulnerabilities that could be exploited by attackers.

---

## Phase 3: Code Quality Checks

### 9. Breaking Changes Assessment
**What it does:** Checks if your changes break existing functionality.

**Assess:**
- ✅ Data structure changes include migration logic
- ✅ API contract changes are backward compatible or documented
- ✅ Removed exports are not used elsewhere
- ✅ Changed default behaviors are intentional and documented

**Fail if:**
- ❌ Data structure changes without migration
- ❌ Breaking API changes without documentation
- ❌ Removed functionality still referenced elsewhere

**Why it matters:** Breaking changes can cause data loss or break user workflows.

---

### 10. Completeness Check
**What it does:** Ensures work is ready to ship.

**Check:**
- ✅ No TODO comments for critical functionality
- ✅ No incomplete implementations (`throw new Error('Not implemented')`)
- ✅ Error handling present for failure cases
- ✅ Edge cases considered (empty inputs, null values, large files)
- ✅ Loading states handled properly
- ✅ User feedback provided (success/error messages)

**Fail if:**
- ❌ Critical TODOs remain
- ❌ Incomplete features are exposed to users
- ❌ No error handling for network failures
- ❌ Edge cases cause crashes

**Why it matters:** Incomplete work can crash the app or confuse users.

---

### 11. Test Coverage Verification
**What it does:** Ensures new/changed code has tests.

**Verify:**
- ✅ New utilities/functions have unit tests
- ✅ New components have component tests
- ✅ New user flows have E2E tests (Playwright)
- ✅ Changed functionality has updated tests
- ✅ Critical paths are covered:
  - File loading and parsing
  - Annotation creation/editing/deletion
  - Sync file import/export
  - Export to markdown
  - LLM API integration

**Coverage targets:**
- Critical paths: 80%+ coverage
- Important features: 70%+ coverage
- Nice-to-have features: 60%+ coverage

**Fail if:**
- ❌ New critical functionality has no tests
- ❌ Changed code breaks existing tests
- ❌ Test coverage drops significantly

**Why it matters:** Tests catch bugs before users encounter them.

---

### 12. Dependency Review
**What it does:** Ensures new dependencies are safe and necessary.

**If `package.json` changed:**
- ✅ New dependencies are necessary (not duplicates)
- ✅ Versions are pinned (no `^` or `~` for production)
- ✅ Dependencies are from trusted sources (npm registry)
- ✅ No suspicious or unknown packages
- ✅ Bundle size impact is acceptable

**How to check:**
```bash
cd app
npm audit              # Security vulnerabilities
npm outdated           # Check for updates
```

**Fail if:**
- ❌ Critical security vulnerabilities in new dependencies
- ❌ Unnecessary dependencies added
- ❌ Suspicious packages from unknown sources

**Why it matters:** Malicious or vulnerable dependencies can compromise security.

---

## Severity Levels

Understanding when to stop vs. proceed:

### 🔴 BLOCKING (Must Fix Before Commit)
These issues MUST be fixed before committing. Committing with these issues is dangerous.

- Build fails
- Unit tests fail
- E2E tests fail
- Lint errors
- Security issues (exposed keys, credentials, sensitive files staged)
- Sensitive files in git status (`.env`, test PDFs, sync files, etc.)
- Broken core functionality
- Critical security vulnerabilities in dependencies
- Rules of hooks violations (React)

**Action:** Fix immediately. Do not commit until resolved.

---

### 🟡 WARNING (Should Fix, Can Proceed with Justification)
These issues should be fixed, but you can proceed if you have a good reason.

- Lint warnings
- Missing documentation
- Debug code present (`console.log` statements)
- Large bundle size increases (>20%)
- Medium severity dependency vulnerabilities
- Missing tests for non-critical features

**Action:** Document why you're proceeding. Fix in next commit.

---

### 🔵 INFO (Note for Awareness)
These are informational - no action required, but be aware.

- Large diff size (>500 lines)
- New dependencies added
- Files outside expected scope
- Low severity dependency vulnerabilities
- Test coverage slightly below target

**Action:** No action needed. Just be aware.

---

## Workflow Steps

### Step 1: Run QA Checklist
Before committing, complete all checks above.

**Quick checklist:**
- [ ] Build passes
- [ ] Unit tests pass
- [ ] E2E tests pass (before master commits)
- [ ] Lint passes
- [ ] Security audit passes
- [ ] Git status reviewed (no sensitive files)
- [ ] Code security reviewed
- [ ] Breaking changes assessed
- [ ] Completeness verified
- [ ] Test coverage verified
- [ ] Dependencies reviewed

**Only proceed if:** All BLOCKING items pass, or you have documented justification for WARNING items.

---

### Step 2: Stage Changes Safely
```bash
git status              # Review what changed (CRITICAL)
git diff --stat         # Summary view
git diff                # Full diff (review carefully)
git add <files>         # Stage specific files (not git add .)
```

**Security check:** ALWAYS run `git status` before `git add` to verify no sensitive files.

**Best practice:** Stage files individually rather than `git add .` to avoid accidental commits.

**Do not commit:**
- `node_modules/`, `dist/` (in .gitignore)
- `.env` files or any `.env.*` files (except `.env.example`)
- Test PDFs in `tests/fixtures/*.pdf`
- User sync files (`*.notes.json`, `*_notes.json`, `*_sync.json`)
- API keys, tokens, or credentials
- Test results (`test-results/`, `playwright-report/`, `coverage/`)
- `product-context/` folder (local only)
- Debug logs or temporary files
- Certificate files (`.pem`, `.key`, `.cert`, etc.)
- Backup files (`*.bak`, `*.backup`)

---

### Step 3: Commit with Conventional Format
```bash
git commit -m "type: description"
```

**Types:**
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation
- `style:` formatting only
- `chore:` maintenance
- `security:` security fix
- `test:` adding or updating tests

**Examples:**
- `feat: add encrypted API key storage`
- `fix: prevent API key exposure in error messages`
- `security: sanitize error messages to prevent key leakage`

**Why it matters:** Clear commit messages help track changes and identify security fixes.

---

### Step 4: Version Bump (if needed)

**Bump when:**
- **Patch** (0.1.1 → 0.1.2): Bug fixes, UX improvements, security patches
- **Minor** (0.1.1 → 0.2.0): New features, new capabilities
- **Major** (0.1.1 → 1.0.0): Breaking changes, incompatible changes

**Skip when:**
- Internal refactoring with no user impact
- Documentation only changes
- Config/workflow changes
- Test-only changes

**Commands:**
```bash
cd app
npm run version:patch   # Bug fixes, security patches
npm run version:minor   # New features
npm run version:major   # Breaking changes
```

**Why it matters:** Version numbers communicate change impact to users.

---

### Step 5: Update CHANGELOG.md (required with version bump)

Add entry at top of file:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Changed behavior description

### Fixed
- Bug fix description

### Security
- Security fix description (always document security fixes)
```

**Use only the categories that apply.**

**Why it matters:** Users need to know what changed, especially security fixes.

---

### Step 6: Final Pre-Push Verification (REQUIRED)

**⚠️ CRITICAL:** Before pushing, verify all release information is correct. This is your last chance to catch mistakes before they go live.

**Run this verification checklist:**

#### A. Version Number Check
```bash
cd app
cat package.json | grep '"version"'
```

**Verify:**
- [ ] Version number matches the type of changes made
  - Patch (0.1.X): Bug fixes, small improvements
  - Minor (0.X.0): New features, new capabilities  
  - Major (X.0.0): Breaking changes
- [ ] Version was bumped if changes warrant it
- [ ] Version follows semantic versioning (X.Y.Z format)
- [ ] Version number is consistent across all files (if applicable)

**If version bump was needed but not done:**
1. Stop and bump version first
2. Update CHANGELOG.md
3. Re-run this verification

---

#### B. CHANGELOG.md Verification
```bash
cat CHANGELOG.md | head -20
```

**Verify:**
- [ ] CHANGELOG.md entry exists (if version was bumped)
- [ ] Date is correct (today's date in YYYY-MM-DD format)
- [ ] Version number in CHANGELOG matches package.json
- [ ] All significant changes are documented
- [ ] Security fixes are clearly marked
- [ ] Breaking changes are clearly marked (if any)
- [ ] Categories used are appropriate (Added/Changed/Fixed/Security)
- [ ] Descriptions are clear and user-friendly
- [ ] No placeholder text or TODOs remain

**Common mistakes to catch:**
- ❌ Wrong version number
- ❌ Missing date or wrong date format
- ❌ Security fixes not documented
- ❌ Breaking changes not clearly marked
- ❌ Vague descriptions ("Fixed bugs" instead of "Fixed PDF rendering issue")

---

#### C. Commit Message Review
```bash
git log -1
```

**Verify:**
- [ ] Commit message follows conventional format (`type: description`)
- [ ] Commit message accurately describes the changes
- [ ] Type is appropriate (feat/fix/docs/security/etc.)
- [ ] Description is clear and specific
- [ ] No sensitive information in commit message

**If multiple commits, review all:**
```bash
git log --oneline -5
```

---

#### D. Release Notes Summary (for your records)

**Create a mental summary of what's being released:**

- **What changed?** [Brief description]
- **Who is affected?** [All users / Specific feature users / No one]
- **Is this breaking?** [Yes / No]
- **Are there security fixes?** [Yes / No - if yes, document clearly]
- **Should users take action?** [Yes - update/revoke keys / No]

**If this is a significant release, consider:**
- Creating a release tag after push
- Notifying users (if applicable)
- Updating documentation (if needed)

---

#### E. Final Security Check

**One last security review before push:**

- [ ] No API keys or secrets in any committed files
- [ ] No sensitive user data in commits
- [ ] No `.env` files committed
- [ ] Error messages don't expose sensitive info
- [ ] All security fixes are documented in CHANGELOG

**Run final check:**
```bash
git diff HEAD~1 --name-only | grep -E '\.(env|key|pem|cert|p12|pfx)$'
```

Should return nothing. If files appear, STOP and unstage them.

---

#### F. Ready to Deploy Checklist

**Final confirmation before push:**

- [ ] All QA checks passed (from Step 1)
- [ ] Version number is correct
- [ ] CHANGELOG.md is updated and accurate
- [ ] Commit message is correct
- [ ] No sensitive files in commit
- [ ] Tests pass locally
- [ ] Build succeeds
- [ ] Ready for production

**If ANY item is unchecked:**
- ❌ **STOP** - Do not push
- Fix the issue
- Re-run relevant checks
- Then proceed

---

#### G. Human Verification Prompt

**Before executing `git push`, ask yourself:**

1. **"Am I confident this is ready for users?"**
   - If unsure, review again or get a second opinion

2. **"Would I be comfortable explaining these changes to users?"**
   - If not, improve documentation

3. **"If this breaks in production, can I fix it quickly?"**
   - If not, consider more testing

4. **"Are there any 'gotchas' users should know about?"**
   - If yes, document them in CHANGELOG

**Only proceed if you can answer "yes" to all questions.**

---

**After completing this verification:**

✅ All checks passed → Proceed to Step 7 (Push)
❌ Any check failed → Fix issues, then re-verify

**Why this matters:** Once you push, changes go live immediately. This verification catches mistakes before they affect users.

---

### Step 7: Push (Triggers Auto-Deployment)
```bash
git push
```

**⚠️ WARNING:** Pushes to `master` trigger automatic Vercel deployment.

**Before pushing (also verify Step 6 - Final Pre-Push Verification):**
- [ ] All QA checks passed (Step 1)
- [ ] Version number verified (Step 6A)
- [ ] CHANGELOG.md verified (Step 6B)
- [ ] Commit message reviewed (Step 6C)
- [ ] Final security check passed (Step 6E)
- [ ] Ready to deploy checklist complete (Step 6F)
- [ ] Human verification questions answered (Step 6G)

**After pushing:**
- Monitor deployment in Vercel dashboard
- Verify deployment succeeds
- Test critical flows on deployed site
- Check for errors in browser console

**Why it matters:** Auto-deployment means broken code goes live immediately.

---

### Step 8: Post-Deployment Verification

After deployment completes:

**Quick smoke test:**
1. Visit deployed site
2. Upload a test PDF
3. Create an annotation
4. Test export functionality
5. Check browser console for errors

**If issues found:**
- Document the issue
- Create a hotfix commit immediately
- Consider reverting if critical

---

### Step 9: Optional: Create Release Tag
For minor/major releases or stable checkpoints:
```bash
git tag -a v0.1.2 -m "Release v0.1.2"
git push origin v0.1.2
```

**Why it matters:** Tags mark stable releases for users to reference.

---

## Quick Reference

### QA Commands (Run in order)
```bash
cd app

# Phase 1: Automated checks
npm run build          # Build check
npm run test:run       # Unit tests (Vitest)
npm run test:e2e       # E2E tests (Playwright) - slower
npm run lint           # Lint check
npm audit              # Security audit

# Phase 2: Security checks
git status             # Review changes (CRITICAL)
git diff --stat        # Summary
git diff               # Full diff

# Phase 3: Manual review
# Review code for security, completeness, test coverage
```

### Git Commands
```bash
# Status and review
git status
git diff --stat
git diff

# Stage safely (individual files)
git add <file>
git add <file1> <file2>

# Commit
git commit -m "type: description"

# Version bump (from app directory)
cd app && npm run version:patch

# Final verification before push (Step 6)
cd app && cat package.json | grep '"version"'    # Check version
cat CHANGELOG.md | head -20                      # Verify changelog
git log -1                                       # Review commit message

# Push (triggers deployment) - ONLY after Step 6 verification
git push

# Tag release
git tag -a v0.1.2 -m "Release v0.1.2"
git push origin v0.1.2
```

### Emergency Commands (If you made a mistake)
```bash
# Unstage a file before committing
git reset HEAD <file>

# Remove sensitive file from git (but keep locally)
git rm --cached <file>

# Undo last commit (before pushing)
git reset --soft HEAD~1

# If you already pushed sensitive data:
# 1. Revoke exposed credentials immediately
# 2. Remove from git history (requires force push)
# 3. Contact security team if applicable
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This:
- Skip tests because "they're slow"
- Commit with `git add .` without checking `git status` first
- Ignore security warnings
- Commit debug code (`console.log`, `debugger`)
- Push to master without running E2E tests
- Commit sensitive files "just this once"

### ✅ Do This Instead:
- Run all tests before master commits
- Always check `git status` before staging
- Fix security issues immediately
- Remove debug code before committing
- Test locally before pushing
- Never commit sensitive files, ever

---

## Getting Help

If you're unsure about any check:
1. Review this document again
2. Check if it's BLOCKING (must fix) or WARNING (can proceed)
3. Document your decision if proceeding with warnings
4. Ask for review if critical security concerns

**Remember:** It's better to spend 15 minutes checking than hours fixing problems in production.

---

## Summary: The Golden Rules

1. **Security first:** Never commit secrets, always check `git status`
2. **Test everything:** Run tests before every commit to master
3. **Review carefully:** Check what you're committing
4. **Fix blocking issues:** Don't commit with BLOCKING problems
5. **Document decisions:** If proceeding with warnings, explain why
6. **Verify before push:** Complete Final Pre-Push Verification (Step 6) - check version, CHANGELOG, and release notes
7. **Verify deployment:** Check deployed site after pushing

Following this process ensures safe, tested, production-ready code.

**Remember:** The Final Pre-Push Verification (Step 6) is your last chance to catch mistakes before they go live. Never skip it.
