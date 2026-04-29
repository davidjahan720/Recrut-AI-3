import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { useUploads } from '@/contexts/UploadContext'

function readUser() {
  return localStorage.getItem('recruiter_session')
      || localStorage.getItem('am_session')
      || localStorage.getItem('manager_session')
      || null
}

export function AppLayout() {
  const [currentUser, setCurrentUser] = useState<string | null>(readUser)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { items, dismiss } = useUploads()
  const activeItems = items.filter(i => i.status === 'pending' || i.status === 'uploading' || i.status === 'scoring')
  const errorItems = items.filter(i => i.status === 'error')
  const doneCount = items.filter(i => i.status === 'done').length
  const showWidget = items.length > 0 && (activeItems.length > 0 || errorItems.length > 0 || doneCount > 0)
  const lastJobId = items[items.length - 1]?.jobId

  useEffect(() => {
    const handler = () => setCurrentUser(readUser())
    window.addEventListener('role-login', handler)
    return () => window.removeEventListener('role-login', handler)
  }, [])

  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <Sidebar />
          <button
            aria-label="Fermer le menu"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-black/40"
          />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-2 border-b border-border bg-background shrink-0">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-foreground hover:bg-muted"
          >
            <span className="text-2xl leading-none">☰</span>
          </button>
          <span className={`text-sm font-medium text-muted-foreground ${currentUser ? 'ml-auto' : 'ml-auto opacity-0'}`}>
            {currentUser ?? '·'}
          </span>
        </div>
        <main className="flex-1 bg-background overflow-auto">
          <Outlet />
        </main>
      </div>
      {showWidget && (
        <div className="fixed bottom-4 right-4 z-40 w-72 bg-card border border-border rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              {activeItems.length > 0
                ? `${activeItems.length} CV en cours d'analyse`
                : errorItems.length > 0
                  ? `${doneCount} terminé${doneCount > 1 ? 's' : ''}, ${errorItems.length} erreur${errorItems.length > 1 ? 's' : ''}`
                  : `${doneCount} CV analysé${doneCount > 1 ? 's' : ''}`}
            </p>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          {activeItems.length > 0 && (
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div className="h-full bg-violet-600 animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
          {lastJobId && (
            <button
              onClick={() => navigate(`/jobs/${lastJobId}`)}
              className="text-xs text-violet-700 hover:text-violet-900 hover:underline"
            >
              Voir l'offre →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
