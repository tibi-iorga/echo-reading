import { useState, useEffect, useRef } from 'react'
import { useSession } from '@clerk/react'
import { initSupabaseClient } from '@/services/supabase/supabaseClient'

/**
 * Initializes the Supabase client with the Clerk session token.
 * Blocks rendering of children until the client is ready.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const initialized = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (session && !initialized.current) {
      initSupabaseClient(async () => {
        const token = await session.getToken({ template: 'supabase' })
        return token
      })
      initialized.current = true
      setReady(true)
    }
  }, [session])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
