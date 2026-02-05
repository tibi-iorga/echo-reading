/**
 * Example Migration Script
 * 
 * This is a template for creating migration scripts.
 * Copy this file and modify for your specific migration needs.
 * 
 * Usage:
 * 1. Copy this file to a new file with a descriptive name
 * 2. Modify the migration logic
 * 3. Test with sample data first
 * 4. Run in browser console or as a Node script
 */

/**
 * Example: Migrate chat messages from v1 to v2
 * 
 * This example shows how to:
 * - Find all relevant localStorage keys
 * - Check current version
 * - Transform data structure
 * - Save migrated data
 * - Handle errors gracefully
 */
function exampleMigrationV1ToV2() {
  // Step 1: Find all keys that need migration
  const keys = Object.keys(localStorage)
  const targetKeys = keys.filter(key => key.startsWith('pdf_chat_messages_'))
  
  console.log(`Found ${targetKeys.length} keys to migrate`)
  
  // Step 2: Track migration results
  let migrated = 0
  let skipped = 0
  let errors = 0
  
  // Step 3: Process each key
  targetKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) {
        skipped++
        return
      }
      
      const data = JSON.parse(stored)
      
      // Step 4: Check if already migrated
      if (data.version === 2) {
        console.log(`✓ Already migrated: ${key}`)
        skipped++
        return
      }
      
      // Step 5: Perform migration
      if (data.version === 1) {
        interface Message {
          [key: string]: unknown
          timestamp?: number
        }
        const migratedData = {
          version: 2,
          messages: (data.messages as Message[]).map((msg) => ({
            ...msg,
            // Add new fields or transform structure here
            // Example: add timestamp if missing
            timestamp: msg.timestamp || Date.now(),
            // Example: rename field
            // oldField: msg.newField,
          })),
        }
        
        // Step 6: Save migrated data
        localStorage.setItem(key, JSON.stringify(migratedData))
        migrated++
        console.log(`✓ Migrated: ${key}`)
      } else {
        console.warn(`⚠ Unknown version ${data.version} for ${key}`)
        skipped++
      }
    } catch (error) {
      console.error(`✗ Error migrating ${key}:`, error)
      errors++
    }
  })
  
  // Step 7: Report results
  console.log(`\n📊 Migration Summary:`)
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Errors: ${errors}`)
  
  return { migrated, skipped, errors }
}

/**
 * Dry run mode - preview changes without saving
 */
function exampleMigrationDryRun() {
  const keys = Object.keys(localStorage)
  const targetKeys = keys.filter(key => key.startsWith('pdf_chat_messages_'))
  
  console.log(`[DRY RUN] Would process ${targetKeys.length} keys`)
  
  targetKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return
      
      const data = JSON.parse(stored)
      
      if (data.version === 1) {
        console.log(`[DRY RUN] Would migrate: ${key}`)
        console.log(`  Current:`, data)
        interface Message {
          [key: string]: unknown
          timestamp?: number
        }
        console.log(`  Would become:`, {
          version: 2,
          messages: (data.messages as Message[]).map((msg) => ({
            ...msg,
            timestamp: msg.timestamp || Date.now(),
          })),
        })
      }
    } catch (error) {
      console.error(`[DRY RUN] Error checking ${key}:`, error)
    }
  })
}

// Export for use in other scripts
export { exampleMigrationV1ToV2, exampleMigrationDryRun }

// Uncomment to run directly:
// exampleMigrationDryRun() // Test first
// exampleMigrationV1ToV2() // Then run for real
