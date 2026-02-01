# Contributing to Echo

Thank you for considering contributing to Echo. This document explains how to report bugs, suggest features, and submit changes.

## How to contribute

### Reporting bugs

Open an issue and include:

- A clear, short title
- Steps to reproduce
- What you expected vs what happened
- Your environment (OS, browser, Node version if relevant)
- Any errors from the browser console or terminal

### Suggesting a feature

Open an issue with:

- What problem or workflow you want to improve
- How you’d like Echo to behave (and optionally, why)
- Any alternatives you’ve considered

### Code and pull requests

1. **Check existing issues**  
   Look for an open issue that matches your change, or open one to discuss before doing large work.

2. **Set up locally**  
   From the `app` directory:
   - `npm install`
   - `npm run dev` to run the app
   - `npm run lint` to run the linter

3. **Make your change**  
   Keep changes focused. Follow the existing code style (TypeScript, React, Tailwind). If you add behavior, add or update comments where it helps.

4. **Test**  
   Manually test the flows you changed. Run `npm run lint` and fix any issues.

5. **Submit a pull request**  
   Describe what you changed and why. Link any related issues. We’ll review and may ask for tweaks.

## What we’re looking for

- Bug fixes and clear, small improvements
- Documentation fixes (README, comments, CONTRIBUTING)
- Features that fit Echo’s scope: local-first PDF reading, annotations, and LLM chat

We may say no to changes that significantly expand scope or add heavy dependencies. When in doubt, open an issue first to discuss.

## Questions

If something is unclear, open an issue with the “question” label (or the closest label your host provides). We’ll answer when we can.
