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
    async function initSession() {
      const { data } = await supabase.auth.getSession()
      let sess = data.session
      // Les utilisateurs à session locale (AM, recruteur, manager) n'ont pas de session Supabase.
      // On les connecte anonymement pour qu'ils aient le rôle "authenticated" côté RLS.
      if (!sess && hasRoleSession()) {
        try {
          const { data: anonData } = await supabase.auth.signInAnonymously()
          sess = anonData.session
        } catch {
          // signInAnonymously non activé sur ce projet — le RLS anon prend le relais
        }
      }
      setSession(sess)
    }
    initSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
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
