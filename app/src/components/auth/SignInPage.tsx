import { SignIn } from '@clerk/react'

export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <SignIn />
    </div>
  )
}
