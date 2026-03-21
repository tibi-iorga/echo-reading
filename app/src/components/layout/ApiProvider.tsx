import { useState, useEffect, useRef } from 'react'
import { useSession } from '@clerk/react'
import { initApiService } from '@/services/api/apiService'

/**
 * Initializes the API service with the Clerk session token.
 * Blocks rendering of children until the service is ready.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const initialized = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (session && !initialized.current) {
      initApiService(async () => {
        const token = await session.getToken()
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
