import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

function hasRoleSession(): boolean {
  return !!(
    localStorage.getItem('recruiter_session') ||
    localStorage.getItem('am_session') ||
    localStorage.getItem('manager_session') ||
    localStorage.getItem('manager_auth')
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session && !hasRoleSession()) return <Navigate to="/login" replace />
  return <>{children}</>
}
