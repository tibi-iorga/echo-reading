import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { SupabaseProvider } from '@/components/layout/SupabaseProvider'
import { SignInPage } from '@/components/auth/SignInPage'
import { SignUpPage } from '@/components/auth/SignUpPage'
import { LandingPage } from '@/components/landing/LandingPage'
import { LibraryView } from '@/components/Library/LibraryView'
import { ReadingView } from '@/components/reading/ReadingView'
import { SystemSettings } from '@/pages/SystemSettings'
import { PrivacyPolicy } from '@/pages/PrivacyPolicy'

function SupabaseLayout() {
  return (
    <SupabaseProvider>
      <Outlet />
    </SupabaseProvider>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Protected routes — auth checked, then Supabase initialized */}
      <Route element={<ProtectedLayout />}>
        <Route element={<SupabaseLayout />}>
          <Route path="/library" element={<LibraryView />} />
          <Route path="/settings" element={<SystemSettings />} />
          <Route path="/read/:bookId" element={<ReadingView />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
