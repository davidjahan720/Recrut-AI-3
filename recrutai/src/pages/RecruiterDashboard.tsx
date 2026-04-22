import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getRecruiterTodayClientNames } from '@/lib/sessionRole'

interface RecruiterData {
  name: string
  password: string
  color: string
  initials: string
  clients: string[]
  offresActives: number
  cvSemaine: number
  cvMois: number
  qualifies: number
  taux: number
}

const RECRUITERS: RecruiterData[] = [
  { name: 'Sophie',  password: '0', color: 'from-violet-500 to-violet-700', initials: 'SO', clients: ['Nexeo', 'BTP Pro', 'Inovev'],     offresActives: 0, cvSemaine: 93,  cvMois: 400, qualifies: 72, taux: 18 },
  { name: 'Karim',   password: '0', color: 'from-blue-500 to-blue-700',     initials: 'KA', clients: ['Solvay', 'Altair RH'],             offresActives: 0, cvSemaine: 81,  cvMois: 350, qualifies: 63, taux: 18 },
  { name: 'Alix',    password: '0', color: 'from-emerald-500 to-emerald-700', initials: 'AL', clients: ['Terralys', 'Vinci RH', 'Kalexia'], offresActives: 0, cvSemaine: 105, cvMois: 450, qualifies: 81, taux: 18 },
  { name: 'Nicolas', password: '0', color: 'from-orange-500 to-orange-700', initials: 'NI', clients: ['Elexia', 'Groupe Avena'],          offresActives: 0, cvSemaine: 47,  cvMois: 200, qualifies: 36, taux: 18 },
]

function getWeekLabel() {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now); monday.setDate(now.getDate() - (day - 1))
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `Lun. ${fmt(monday)} → aujourd'hui`
}

function getMonthLabel() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const SESSION_KEY = 'recruiter_session'


function LoginScreen({ preselect, onLogin }: { preselect: string | null; onLogin: (r: RecruiterData) => void }) {
  const selected = RECRUITERS.find(r => r.name === preselect) ?? null
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (selected && pwd === selected.password) {
      sessionStorage.removeItem('am_session')
      sessionStorage.removeItem('manager_session')
      sessionStorage.removeItem('manager_auth')
      sessionStorage.setItem(SESSION_KEY, selected.name)
      window.dispatchEvent(new Event('role-login'))
      onLogin(selected)
    } else {
      setError(true)
      setPwd('')
    }
  }

  if (!selected) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">Sélectionnez un profil depuis le menu.</p>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className={`bg-gradient-to-br ${selected.color} rounded-2xl p-8 text-white flex flex-col items-center gap-4 w-72 shadow-lg`}>
        <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-2xl font-bold">{selected.initials}</div>
        <div className="text-center">
          <p className="text-xl font-bold">{selected.name}</p>
          <p className="text-sm text-white/70">Chargé de recrutement</p>
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
          {error && <p className="text-xs text-red-200 text-center">Mot de passe incorrect</p>}
          <button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors border border-white/30">
            Accéder à mon espace
          </button>
        </form>
      </div>
    </div>
  )
}

function PersonalDashboard({ recruiter }: { recruiter: RecruiterData }) {
  const r = recruiter
  const [activeCount, setActiveCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    async function fetchActiveCount() {
      const { data: clientRows } = await supabase.from('clients').select('id').in('name', r.clients)
      const clientIds = (clientRows ?? []).map((c: { id: string }) => c.id)
      if (clientIds.length === 0) { setActiveCount(0); return }
      const { data: jobs } = await supabase.from('jobs').select('id').in('client_id', clientIds)
      if (!jobs || jobs.length === 0) { setActiveCount(0); return }
      const jobIds = jobs.map(j => j.id as string)
      const { data: seededApps } = await supabase.from('applications').select('job_id')
        .in('job_id', jobIds).like('cv_file_path', 'seed/%')
      const seededSet = new Set((seededApps ?? []).map(a => a.job_id as string))
      setActiveCount(jobIds.filter(id => !seededSet.has(id)).length)
    }
    fetchActiveCount()
  }, [r.name])

  useEffect(() => {
    async function fetchTodayOffers() {
      const clientNames = getRecruiterTodayClientNames(r.name)
      if (clientNames.length === 0) { setTodayCount(0); return }

      const { data: clientRows } = await supabase
        .from('clients').select('id').in('name', clientNames)
      const clientIds = (clientRows ?? []).map((c: { id: string }) => c.id)
      if (clientIds.length === 0) { setTodayCount(0); return }

      // Offres créées depuis minuit (heure locale)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: todayJobs } = await supabase
        .from('jobs').select('id')
        .in('client_id', clientIds)
        .gte('created_at', todayStart.toISOString())

      if (!todayJobs || todayJobs.length === 0) { setTodayCount(0); return }

      const todayIds = todayJobs.map(j => j.id as string)

      // Exclure les jobs issus du seed (leurs candidatures ont cv_file_path LIKE 'seed/%')
      const { data: seededApps } = await supabase
        .from('applications').select('job_id')
        .in('job_id', todayIds)
        .like('cv_file_path', 'seed/%')

      const seededSet = new Set((seededApps ?? []).map(a => a.job_id as string))
      setTodayCount(todayIds.filter(id => !seededSet.has(id)).length)
    }
    fetchTodayOffers()

    // Rafraîchissement toutes les 60 secondes pour détecter les nouvelles offres sans recharger
    const interval = setInterval(fetchTodayOffers, 60_000)
    return () => clearInterval(interval)
  }, [r.name])

  const kpis = [
    { label: 'Mes offres',          value: activeCount,     note: 'Total',             bg: 'from-emerald-500 to-emerald-700', icon: '📋' },
    { label: 'CV reçus — semaine', value: r.cvSemaine,     note: getWeekLabel(),      bg: 'from-blue-500 to-blue-700',       icon: '📄' },
    { label: 'CV reçus — mois',    value: r.cvMois,        note: getMonthLabel(),     bg: 'from-cyan-500 to-cyan-700',       icon: '📅' },
    { label: 'Qualifiés',          value: r.qualifies,     note: 'Ce mois-ci',        bg: 'from-violet-500 to-violet-700',   icon: '✅' },
  ]

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">


      {/* Compteur offres AM aujourd'hui */}
      <div className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm shadow-sm bg-gradient-to-br ${r.color}`}>
        <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-sm font-bold shrink-0">{todayCount}</span>
        Nouvelle offre aujourd'hui
      </div>

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-white font-bold text-sm`}>{r.initials}</div>
        <div>
          <h1 className="text-xl font-semibold text-foreground leading-tight">Mon espace — {r.name}</h1>
          <p className="text-muted-foreground text-sm">Tableau de bord personnel</p>
        </div>
      </div>

      {/* Clients */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mes clients</p>
        <div className="flex flex-wrap gap-2">
          {r.clients.map(c => (
            <span key={c} className="inline-flex px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-foreground shadow-sm">{c}</span>
          ))}
        </div>
      </div>

      {/* Recrutement KPIs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recrutement</p>
        <div className="grid grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className={`bg-gradient-to-br ${k.bg} rounded-xl p-4 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white leading-tight">{k.label}</p>
                <span className="text-xl">{k.icon}</span>
              </div>
              <p className="text-3xl font-bold leading-tight">{k.value}</p>
              <p className="text-xs font-medium text-white/80 mt-1">{k.note}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default function RecruiterDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselect = searchParams.get('name')
  const savedName = sessionStorage.getItem(SESSION_KEY)
  const savedRecruiter = savedName && (!preselect || savedName === preselect)
    ? RECRUITERS.find(r => r.name === savedName) ?? null
    : null
  const [recruiter, setRecruiter] = useState<RecruiterData | null>(savedRecruiter)

  useEffect(() => {
    if (preselect && recruiter && preselect !== recruiter.name) {
      setRecruiter(null)
    }
  }, [preselect])

  function handleLogin(r: RecruiterData) {
    setRecruiter(r)
    navigate('/recruiter', { replace: true })
  }

  if (!recruiter) return <LoginScreen preselect={preselect} onLogin={handleLogin} />
  return <PersonalDashboard recruiter={recruiter} />
}
