# Git Workflow Prompt

Copy and paste this prompt when you're ready to commit and push your changes.

**Important**: This prompt includes quality-check questions. The AI will ask these questions and wait for your answers before proceeding with the commit. This helps catch issues before they're pushed to GitHub.

---

**I'm ready to commit my changes to git. Please help me follow best practices and ask me the quality-check questions before proceeding:**

1. **Review Changes**
   - Show me what files have changed (`git status`)
   - Show me a summary of the changes (`git diff --stat`)
   - Help me identify if any changes should be excluded (like temporary files, logs, etc.)

2. **Pre-Commit Checklist & Questions**
   
   **The AI will automatically check and answer these questions based on the codebase, then ask you to confirm:**
   
   a. **Testing & Functionality**
      - Review code changes to assess if testing was likely done
      - Check for TODO comments or incomplete implementations
      - Look for error handling and edge case coverage
      - Assess if changes appear to work as expected
   
   b. **Code Quality**
      - Check if code is complete or has incomplete features/TODOs
      - Look for debug code, console.logs, or commented-out code
      - Identify any obvious bugs or issues
      - Verify code consistency with existing codebase style
   
   c. **Breaking Changes & Compatibility**
      - Analyze if changes break existing functionality
      - Check if data structures changed and if migrations exist
      - Verify backwards compatibility with existing user data
      - Check if dependencies need updating
   
   d. **User Impact**
      - Assess if UI changes were made and if theme support was considered
      - Evaluate if changes need documentation
      - Check backwards compatibility
      - Assess potential performance impacts
   
   e. **Security & Privacy**
      - Scan for API keys, passwords, or sensitive data in changes
      - Check if user data storage methods changed
      - Identify any security concerns
   
   f. **Completeness**
      - Determine if feature is complete or work-in-progress
      - Check if related changes should be included
      - Verify if documentation was updated
      - Assess if version number should be bumped
   
   **Technical Checks (AI will perform):**
   - Verify no sensitive data (API keys, passwords) is being committed
   - Check if build command exists and is valid
   - Verify linting configuration exists
   - Confirm no unnecessary files are included (check .gitignore)
   
   **After the AI completes the checks, it will present a summary and ask: "Please confirm if this assessment is correct or if anything needs adjustment before proceeding with the commit."**

3. **Create Meaningful Commit**
   - Help me write a clear, descriptive commit message following conventional commits format:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `refactor:` for code refactoring
     - `docs:` for documentation changes
     - `style:` for formatting changes
     - `chore:` for maintenance tasks
   - Example: `feat: add version display in settings panel`

4. **Stage and Commit**
   - Stage only the relevant files
   - Create the commit with the message we agreed on

5. **Push to GitHub**
   - Push changes to the remote repository
   - Confirm everything pushed successfully

6. **If This is a Stable Release**
   - Check if version should be bumped
   - Update CHANGELOG.md if needed
   - Tag the release if appropriate
   - Push tags to GitHub

**My current changes are: [describe what you changed]**

**The AI will automatically check the codebase, answer the questions above, and present a summary. Please review the summary and confirm if it's correct or if anything needs adjustment before proceeding with the commit.**

---

## Quick Commands Reference

For your reference, here are the common commands:

```bash
# See what changed
git status
git diff

# Stage files
git add <file>
git add .  # All files

# Commit
git commit -m "feat: description of changes"

# Push
git push

# If you need to tag a release
npm run version:patch   # or :minor or :major
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin v0.1.1
```

## What NOT to Commit

- `node_modules/` (already in .gitignore)
- `dist/` build folders (already in .gitignore)
- `.env` files with secrets
- Temporary files
- `product-context/` folder (local only)
- Debug logs

## When to Tag a Release

Tag a release (create a new version) when:
- You've completed a feature set
- You've fixed critical bugs
- You want a stable checkpoint before major changes
- You're ready to "ship" a version

Use the version bump script:
- `npm run version:patch` - Bug fixes (0.1.0 → 0.1.1)
- `npm run version:minor` - New features (0.1.0 → 0.2.0)
- `npm run version:major` - Breaking changes (0.1.0 → 1.0.0)
