# Scripts

Utility scripts for development and maintenance.

## Migration Testing

### Browser Console (Recommended)

1. Open your app in the browser
2. Open browser console (F12)
3. Copy and paste the contents of `test-migrations-browser.js`
4. Tests will run and show results

### Node.js (If ts-node is installed)

```bash
npm run test:migrations
```

## Migration Scripts

See `migrations/README.md` for information on creating and running manual migration scripts.

## Quick Commands

- **Test migrations**: Run `test-migrations-browser.js` in browser console
- **Backup localStorage**: See `migrations/README.md` for backup script
- **Manual migration**: Create script in `migrations/` folder
