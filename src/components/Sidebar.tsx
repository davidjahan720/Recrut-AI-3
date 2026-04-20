import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/clients', label: 'Clients', icon: '🏢' },
  { to: '/jobs', label: 'Offres', icon: '📋' },
  { to: '/applications', label: 'Candidatures', icon: '👤' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-gradient-to-b from-violet-900 to-indigo-900 text-white flex flex-col">
      <div className="p-5 border-b border-white/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white text-base font-bold">R</span>
          </div>
          <span className="font-bold text-white text-lg">RecrutAI</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-medium transition-colors ${
                isActive
                  ? 'bg-white/25 text-white'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`
            }
          >
            <span className="text-xl">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/15 space-y-1">
        <button
          onClick={() => setDark(!dark)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-base font-medium rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
        >
          <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
          {dark ? 'Mode clair' : 'Mode sombre'}
        </button>
        <p className="text-sm text-white/50 truncate px-4 py-1">{email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2.5 text-base font-medium rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
