import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'

const MANAGERS         = ['Camille Arnaud', 'Thomas Mercier', 'Pierre']
const ACCOUNT_MANAGERS = ['Laura', 'Julien']
const RECRUITERS       = ['Sophie', 'Karim', 'Alix', 'Nicolas']

function DropdownItem({ icon, label, isActive, open, onToggle, whiteIcon, children }: {
  icon: string; label: string; isActive: boolean; open: boolean
  onToggle: () => void; whiteIcon?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-medium transition-colors ${
          isActive ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'
        }`}
      >
        <span className="text-xl" style={whiteIcon ? { filter: 'brightness(0) invert(1)' } : undefined}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs text-white/80">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="ml-4 mt-1 space-y-0.5">{children}</div>}
    </div>
  )
}

function SubItem({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors"
    >
      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
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
  function scrollNav() { navRef.current?.scrollBy({ top: 80, behavior: 'smooth' }) }

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
  const role = localStorage.getItem('recruiter_session') ? 'recruiter'
             : localStorage.getItem('am_session') ? 'am'
             : localStorage.getItem('manager_session') ? 'manager'
             : null

  const links: { to: string; label: string; icon: string }[] = []
  if (role) {
    if (role === 'recruiter')  links.push({ to: '/recruiter',      label: 'Mon espace',   icon: '▦' })
    if (role === 'am')         links.push({ to: '/account-manager',label: 'Mon espace',   icon: '▦' })
    if (role === 'manager') {
      links.push({ to: '/manager', label: 'Mon espace', icon: '▦' })
    }
    if (role !== 'recruiter')  links.push({ to: '/clients',        label: 'Clients',      icon: '🏢' })
    links.push(                            { to: '/jobs',           label: 'Offres',       icon: '📋' })
  }

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} h-screen bg-gradient-to-b from-violet-900 to-indigo-900 text-white flex flex-col overflow-hidden transition-[width] duration-200`}>
      <div className={`${collapsed ? 'p-3' : 'p-5'} border-b border-white/15 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">R</span>
          </div>
          {!collapsed && <span className="font-bold text-white text-lg truncate">RecrutAI</span>}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Réduire la barre latérale"
            title="Réduire"
            className="text-white/70 hover:text-white text-lg w-7 h-7 rounded hover:bg-white/15 flex items-center justify-center shrink-0"
          >
            «
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Étendre la barre latérale"
          title="Étendre"
          className="text-white/70 hover:text-white text-lg w-full py-2 hover:bg-white/15 flex items-center justify-center"
        >
          »
        </button>
      )}

      <nav ref={navRef} className="flex-1 p-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            title={collapsed ? link.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-base font-medium transition-colors ${
                isActive ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'
              }`
            }
          >
            <span className="text-xl">{link.icon}</span>
            {!collapsed && link.label}
          </NavLink>
        ))}

        {!collapsed && (<>
        {/* Chargés de recrutement */}
        <DropdownItem
          icon="👤" label="Chargés" whiteIcon
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

        {/* Account Manager */}
        <DropdownItem
          icon="🤝" label="Account Manager"
          isActive={location.pathname === '/account-manager'}
          open={openMenu === 'account'}
          onToggle={() => toggle('account')}
        >
          {ACCOUNT_MANAGERS.map(name => (
            <SubItem key={name} name={name} onClick={() => {
              navigate(`/account-manager?name=${encodeURIComponent(name)}`)
              setOpenMenu(null)
            }} />
          ))}
        </DropdownItem>

        {/* Manager */}
        <DropdownItem
          icon="📈" label="Manager"
          isActive={location.pathname === '/manager'}
          open={openMenu === 'managers'}
          onToggle={() => toggle('managers')}
        >
          {MANAGERS.map(name => (
            <SubItem key={name} name={name} onClick={() => {
              navigate(`/manager-personal?name=${encodeURIComponent(name)}`)
              setOpenMenu(null)
            }} />
          ))}
        </DropdownItem>
        </>)}
      </nav>
      {!collapsed && (
        <button onClick={scrollNav} className="flex items-center justify-center py-1.5 text-white/70 hover:text-white transition-colors text-xs shrink-0" aria-label="Défiler vers le bas">▼</button>
      )}

      <div className={`${collapsed ? 'p-2' : 'p-3'} border-t border-white/15 space-y-1`}>
        <button
          onClick={() => setDark(!dark)}
          title={collapsed ? (dark ? 'Mode clair' : 'Mode sombre') : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 text-base font-medium rounded-lg text-white hover:bg-white/15 transition-colors`}
        >
          <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
          {!collapsed && (dark ? 'Mode clair' : 'Mode sombre')}
        </button>
        {!collapsed && <p className="text-sm text-white font-medium truncate px-4 py-1">{email}</p>}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full ${collapsed ? 'flex justify-center px-2' : 'text-left px-4'} py-2.5 text-base font-medium rounded-lg text-white hover:bg-white/15 transition-colors`}
        >
          {collapsed ? '⏏' : 'Déconnexion'}
        </button>
      </div>
    </aside>
  )
}
