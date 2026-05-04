import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'

const RECRUITERS = ['Sophie', 'Alix']

function DropdownItem({ icon, label, isActive, open, onToggle, whiteIcon, children, panelId }: {
  icon: string; label: string; isActive: boolean; open: boolean
  onToggle: () => void; whiteIcon?: boolean; children: React.ReactNode
  panelId: string
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-medium transition-colors ${
          isActive ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'
        }`}
      >
        <span aria-hidden="true" className="text-xl" style={whiteIcon ? { filter: 'brightness(0) invert(1)' } : undefined}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span aria-hidden="true" className="text-xs text-white/90">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div id={panelId} className="ml-4 mt-1 space-y-0.5">{children}</div>}
    </div>
  )
}

function SubItem({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/15 hover:text-white transition-colors"
    >
      <span aria-hidden="true" className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
        {name[0].toUpperCase()}
      </span>
      {name}
    </button>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1')
  // Used only to force a re-render when role-login fires (logout case, no URL change)
  const [, forceUpdate] = useState(0)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  // Force re-render on role-login event (covers logout + any edge case)
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1)
    window.addEventListener('role-login', handler)
    return () => window.removeEventListener('role-login', handler)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function toggle(key: string) {
    setOpenMenu(prev => prev === key ? null : key)
  }

  // Computed fresh on every render — location is read so any navigation re-evaluates this
  void location
  const isRecruiter = !!localStorage.getItem('recruiter_session')
  const isAdmin = !isRecruiter // une session Supabase auth (admin) sans session role

  const links: { to: string; label: string; icon: string }[] = []
  if (isRecruiter || isAdmin) {
    links.push({ to: '/manager',   label: 'Dashboard',  icon: '📊' })
    links.push({ to: '/recruiter', label: 'Mon espace', icon: '▦' })
    links.push({ to: '/clients',   label: 'Clients',    icon: '🏢' })
    links.push({ to: '/jobs',      label: 'Offres',     icon: '📋' })
    links.push({ to: '/rgpd',      label: 'RGPD',       icon: '🛡️' })
  }

  return (
    <aside
      aria-label="Navigation principale"
      className={`${collapsed ? 'w-16' : 'w-60'} h-screen bg-gradient-to-b from-violet-900 to-indigo-900 text-white flex flex-col overflow-hidden transition-[width] duration-200`}
    >
      <div className={`${collapsed ? 'p-3' : 'p-5'} border-b border-white/15 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div aria-hidden="true" className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">R</span>
          </div>
          {!collapsed && <span className="font-bold text-white text-lg truncate">RecrutAI</span>}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Réduire la barre latérale"
            className="text-white/90 hover:text-white text-lg w-7 h-7 rounded hover:bg-white/15 flex items-center justify-center shrink-0"
          >
            <span aria-hidden="true">«</span>
          </button>
        )}
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Étendre la barre latérale"
          className="text-white/90 hover:text-white text-lg w-full py-2 hover:bg-white/15 flex items-center justify-center"
        >
          <span aria-hidden="true">»</span>
        </button>
      )}

      <nav ref={navRef} aria-label="Menu" className="flex-1 p-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            aria-label={collapsed ? link.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-base font-medium transition-colors ${
                isActive ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'
              }`
            }
          >
            <span aria-hidden="true" className="text-xl">{link.icon}</span>
            {!collapsed && link.label}
          </NavLink>
        ))}

        {!collapsed && (
          <DropdownItem
            icon="👤" label="Chargés de recrutement" whiteIcon
            panelId="sidebar-recruiters-panel"
            isActive={location.pathname === '/recruiter'}
            open={openMenu === 'recruiters'}
            onToggle={() => toggle('recruiters')}
          >
            {RECRUITERS.map(name => (
              <SubItem key={name} name={name} onClick={() => {
                navigate(`/recruiter?name=${encodeURIComponent(name)}`)
                setOpenMenu(null)
              }} />
            ))}
          </DropdownItem>
        )}
      </nav>
      <div className={`${collapsed ? 'p-2' : 'p-3'} border-t border-white/15 space-y-1`}>
        <button
          type="button"
          onClick={() => setDark(!dark)}
          aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}
          aria-pressed={dark}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 text-base font-medium rounded-lg text-white hover:bg-white/15 transition-colors`}
        >
          <span aria-hidden="true" className="text-xl">{dark ? '☀️' : '🌙'}</span>
          {!collapsed && (dark ? 'Mode clair' : 'Mode sombre')}
        </button>
        {!collapsed && email && <p className="text-sm text-white font-medium truncate px-4 py-1" aria-label={`Connecté en tant que ${email}`}>{email}</p>}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Déconnexion"
          className={`w-full ${collapsed ? 'flex justify-center px-2' : 'text-left px-4'} py-2.5 text-base font-medium rounded-lg text-white hover:bg-white/15 transition-colors`}
        >
          {collapsed ? <span aria-hidden="true">⏏</span> : 'Déconnexion'}
        </button>
      </div>
    </aside>
  )
}
