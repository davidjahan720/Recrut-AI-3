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
  // Si une session rôle existe déjà en localStorage, on court-circuite l'async Supabase
  // et on affiche les enfants immédiatement (pas de page blanche).
  const [session, setSession] = useState<Session | null | undefined>(
    hasRoleSession() ? null : undefined
  )

  useEffect(() => {
    async function initSession() {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    if (!hasRoleSession()) initSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!hasRoleSession()) setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span className="text-muted-foreground text-base">Chargement...</span>
    </div>
  )
  if (!session && !hasRoleSession()) return <Navigate to="/login" replace />
  return <>{children}</>
}
