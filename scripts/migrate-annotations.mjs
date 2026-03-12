import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set')
  process.exit(1)
}

const USER_ID = process.argv[4]

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const jsonPath = process.argv[2]
const BOOK_ID = process.argv[3]
if (!jsonPath || !BOOK_ID || !USER_ID) {
  console.error('Usage: node migrate-annotations.mjs <path-to-json> <book-id> <user-id>')
  process.exit(1)
}

const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
const annotations = data.annotations

console.log(`Inserting ${annotations.length} annotations for book ${BOOK_ID}...`)

const rows = annotations.map((a) => ({
  id: a.id,
  book_id: BOOK_ID,
  clerk_user_id: USER_ID,
  type: a.type,
  data: a,
}))

// Insert in batches of 5 to avoid payload size limits
for (let i = 0; i < rows.length; i += 5) {
  const batch = rows.slice(i, i + 5)
  const { error } = await supabase.from('annotations').insert(batch)
  if (error) {
    console.error(`Error inserting batch ${i}:`, error.message)
  } else {
    console.log(`Inserted batch ${Math.floor(i / 5) + 1}/${Math.ceil(rows.length / 5)}`)
  }
}

// Verify
const { count } = await supabase
  .from('annotations')
  .select('*', { count: 'exact', head: true })
  .eq('book_id', BOOK_ID)

console.log(`Done. ${count} annotations in DB for this book.`)
