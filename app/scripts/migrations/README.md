# Data Migration Scripts

This folder contains manual migration scripts for fixing or migrating data when needed.

## When to Use

Use these scripts when:
- You need to fix corrupted data in localStorage
- You want to manually migrate data outside the app
- You need to bulk update data structure
- The automatic migrations in `storageService.ts` aren't sufficient

## How to Use

1. Create a new migration script (see example below)
2. Run it in the browser console or as a Node script
3. Test with sample data first

## Example Migration Script

```typescript
// scripts/migrations/migrate-chat-messages-v1-to-v2.ts
// Run this in browser console or as a standalone script

function migrateChatMessagesV1ToV2() {
  const keys = Object.keys(localStorage)
  const chatMessageKeys = keys.filter(key => key.startsWith('pdf_chat_messages_'))
  
  let migrated = 0
  let errors = 0
  
  chatMessageKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return
      
      const data = JSON.parse(stored)
      
      // Check if already migrated
      if (data.version === 2) {
        console.log(`Already migrated: ${key}`)
        return
      }
      
      // Migrate from v1 to v2
      if (data.version === 1) {
        const migratedData = {
          version: 2,
          messages: data.messages.map(msg => ({
            ...msg,
            // Add new field or transform structure
            timestamp: msg.timestamp || Date.now(),
          })),
        }
        
        localStorage.setItem(key, JSON.stringify(migratedData))
        migrated++
        console.log(`Migrated: ${key}`)
      }
    } catch (error) {
      console.error(`Error migrating ${key}:`, error)
      errors++
    }
  })
  
  console.log(`Migration complete: ${migrated} migrated, ${errors} errors`)
}

// Run migration
migrateChatMessagesV1ToV2()
```

## Best Practices

1. **Always backup first**: Export localStorage data before running migrations
2. **Test on sample data**: Create test data and verify migration works
3. **Version check**: Check current version before migrating
4. **Error handling**: Wrap in try/catch and log errors
5. **Dry run mode**: Add a `--dry-run` flag to preview changes

## Backup localStorage

```javascript
// Run in browser console to backup all localStorage
const backup = {}
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key) {
    backup[key] = localStorage.getItem(key)
  }
}
console.log(JSON.stringify(backup, null, 2))
// Copy output and save to file
```
