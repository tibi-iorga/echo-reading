/**
 * Local development API server.
 *
 * Stands up the same handlers that run as Vercel serverless functions in
 * production (app/api/*.ts), but as Express routes on port 4000. Vite's dev
 * server proxies /api/* here so the SPA can call the API on the same origin.
 *
 * NOT used in production. Vercel deploys app/api/*.ts directly.
 */

import express, { type Request, type Response, type NextFunction } from 'express'
import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const API_ROOT = resolve(APP_ROOT, 'api')
const PORT = Number(process.env.DEV_API_PORT ?? 4000)

// Match Vite's env precedence: .env.development.local > .env.local >
// .env.development > .env. dotenv applies later loads last; with override:true
// the later ones win.
function loadEnv() {
  const files = ['.env', '.env.development', '.env.local', '.env.development.local']
  for (const f of files) {
    dotenv.config({ path: resolve(APP_ROOT, f), override: true })
  }
}

/**
 * Walk a directory recursively, returning all files matching the predicate.
 */
async function walk(dir: string, accept: (path: string) => boolean): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip private libs like _lib
      if (entry.name.startsWith('_')) continue
      out.push(...(await walk(full, accept)))
    } else if (accept(full)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Convert an api/ file path to its Express route.
 *   api/books/[bookId].ts → /api/books/:bookId
 *   api/books/index.ts    → /api/books
 *   api/health.ts         → /api/health
 */
function fileToRoute(file: string): string {
  let rel = relative(API_ROOT, file).replace(/\\/g, '/')
  rel = rel.replace(/\.ts$/, '')
  rel = rel.replace(/\/index$/, '')
  rel = rel.replace(/\[([^\]]+)]/g, ':$1')
  return rel ? `/api/${rel}` : '/api'
}

/**
 * Wrap a Vercel-style default export so it can be mounted on Express.
 *
 * Two divergences to bridge:
 *   - Vercel exposes [bookId] via req.query.bookId. Express puts it in
 *     req.params.bookId. Merge params into query so handlers don't have to
 *     know which runtime they're in.
 *   - Vercel auto-parses JSON bodies. Express needs express.json() — added
 *     as middleware below.
 */
function adapt(handler: (req: Request, res: Response) => unknown | Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Merge params into query so handlers expecting req.query.bookId still work.
      // Express 5 makes req.query a getter-only property, so we replace it via
      // defineProperty rather than direct assignment.
      const merged = { ...req.query, ...req.params }
      Object.defineProperty(req, 'query', {
        value: merged,
        writable: true,
        configurable: true,
        enumerable: true,
      })
      await handler(req, res)
    } catch (err) {
      next(err)
    }
  }
}

async function main() {
  loadEnv()

  if (!process.env.DATABASE_URL) {
    console.warn('[dev-api] DATABASE_URL is not set. Routes that touch the DB will fail.')
  }
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('[dev-api] CLERK_SECRET_KEY is not set. All authenticated routes will reject requests.')
  }

  const app = express()

  // Match Vercel's body limit (~5MB default). Canvas content can be ~500KB.
  app.use(express.json({ limit: '5mb' }))

  const handlerFiles = await walk(API_ROOT, (p) => p.endsWith('.ts'))

  for (const file of handlerFiles) {
    const route = fileToRoute(file)
    const moduleUrl = pathToFileURL(file).href
    const mod = await import(moduleUrl)
    if (typeof mod.default !== 'function') {
      console.warn(`[dev-api] ${file} has no default export, skipping`)
      continue
    }
    // app.all matches every method; the handler dispatches by req.method itself.
    app.all(route, adapt(mod.default))
    console.log(`  ${route.padEnd(35)} ← ${relative(APP_ROOT, file)}`)
  }

  // Last-resort error handler so a thrown error returns JSON instead of HTML.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[dev-api] Unhandled error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
  })

  app.listen(PORT, () => {
    console.log(`\n[dev-api] Listening on http://localhost:${PORT}`)
    console.log(`[dev-api] Proxied from Vite at /api/*\n`)
  })
}

main().catch((err) => {
  console.error('[dev-api] Failed to start:', err)
  process.exit(1)
})
