import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Initialize the Supabase client with a Clerk session token provider.
 * Must be called once after Clerk is ready.
 */
export function initSupabaseClient(getToken: () => Promise<string | null>) {
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: (url, options = {}) => {
          return getToken().then((token) => {
            const headers = new Headers(options.headers)
            if (token) {
              headers.set('Authorization', `Bearer ${token}`)
            }
            return fetch(url, { ...options, headers })
          })
        },
      },
    }
  )
  return supabase
}

/**
 * Get the initialized Supabase client.
 * Throws if called before initSupabaseClient.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Call initSupabaseClient first.')
  }
  return supabase
}
