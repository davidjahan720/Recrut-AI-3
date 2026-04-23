import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

interface ManagerProfile {
  name: string
  initials: string
  color: string
  password: string
}

const MANAGERS: ManagerProfile[] = [
  { name: 'Camille Arnaud', initials: 'CA', color: 'from-violet-600 to-violet-800', password: '0' },
  { name: 'Thomas Mercier', initials: 'TM', color: 'from-indigo-600 to-indigo-800', password: '0' },
  { name: 'Pierre',         initials: 'PI', color: 'from-slate-600 to-slate-800',   password: '0' },
]

const SESSION_KEY = 'manager_session'

function LoginScreen({ preselect, onLogin }: { preselect: ManagerProfile | null; onLogin: (p: ManagerProfile) => void }) {
  const [pwd, setPwd] = useState('')
  const [, setError] = useState(false)

  if (!preselect) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">Sélectionnez un profil depuis le menu.</p>
    </div>
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pwd === preselect!.password) {
      localStorage.removeItem('recruiter_session')
      localStorage.removeItem('am_session')
      localStorage.setItem('manager_auth', '1')
      localStorage.setItem(SESSION_KEY, preselect!.name)
      window.dispatchEvent(new Event('role-login'))
      onLogin(preselect!)
    } else {
      setError(true)
      setPwd('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className={`bg-gradient-to-br ${preselect.color} rounded-2xl p-8 text-white flex flex-col items-center gap-4 w-72 shadow-lg`}>
        <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-2xl font-bold">{preselect.initials}</div>
        <div className="text-center">
          <p className="text-xl font-bold">{preselect.name}</p>
          <p className="text-sm text-white/70">Manager</p>
        </div>
        <form onSubmit={submit} className="w-full flex flex-col gap-3 mt-2">
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={e => { setPwd(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/20 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/60 border border-white/30"
          />
          <button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors border border-white/30">
            Accéder à mon espace
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ManagerPersonalDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselect = searchParams.get('name')
  const savedName = localStorage.getItem(SESSION_KEY)
  const isAuth = localStorage.getItem('manager_auth') === '1'

  useEffect(() => {
    if (isAuth && savedName && (!preselect || savedName === preselect)) {
      navigate('/manager', { replace: true })
    }
  }, [])

  const [reset, setReset] = useState(false)
  useEffect(() => {
    if (preselect && savedName && preselect !== savedName) {
      setReset(true)
    }
  }, [preselect])

  function handleLogin() {
    navigate('/manager', { replace: true })
  }

  const effectivePreselect = reset ? preselect : preselect
  const preselectProfile = MANAGERS.find(m => m.name === effectivePreselect) ?? null

  return <LoginScreen preselect={preselectProfile} onLogin={handleLogin} />
}
