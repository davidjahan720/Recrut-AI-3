import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'

function readUser() {
  return sessionStorage.getItem('recruiter_session')
      || sessionStorage.getItem('am_session')
      || sessionStorage.getItem('manager_session')
      || null
}

export function AppLayout() {
  const [currentUser, setCurrentUser] = useState<string | null>(readUser)

  useEffect(() => {
    const handler = () => setCurrentUser(readUser())
    window.addEventListener('role-login', handler)
    return () => window.removeEventListener('role-login', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentUser && (
          <div className="flex justify-end items-center px-5 py-2 border-b border-border bg-background shrink-0">
            <span className="text-sm font-medium text-muted-foreground">{currentUser}</span>
          </div>
        )}
        <main className="flex-1 bg-background overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
