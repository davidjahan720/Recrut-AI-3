import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getAmBaseClientNames, getAmExtraClientIds } from '@/lib/sessionRole'

interface AMData {
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
  caMensuel: number
  caTrimestriel: number
  avgHon: number
  tauxTransfo: number
  nouveaux: number
  fidelisation: number
  targetNouveauxClientsMois: number
  targetCaMensuel: number
  targetCaTrimestriel: number
  ytdCa: number
  ytdNouveauxClients: number
  targetYtdCa: number
  targetYtdNouveauxClients: number
  targetAvgHon: number
}

const ACCOUNT_MANAGERS: AMData[] = [
  { name: 'Laura',  password: '0', color: 'from-violet-700 to-violet-900', initials: 'LA', clients: ['Nexeo', 'Solvay', 'BTP Pro'], offresActives: 0, cvSemaine: 430, cvMois: 850, qualifies: 153, taux: 18, caMensuel: 55000, caTrimestriel: 165000, avgHon: 8000, tauxTransfo: 25, nouveaux: 2, fidelisation: 73, targetNouveauxClientsMois: 3, targetCaMensuel: 58000, targetCaTrimestriel: 174000, ytdCa: 215000, ytdNouveauxClients: 8, targetYtdCa: 232000, targetYtdNouveauxClients: 12, targetAvgHon: 10000 },
  { name: 'Julien', password: '0', color: 'from-sky-700 to-sky-900',  initials: 'JU', clients: ['Inovev', 'Altair RH'],        offresActives: 0, cvSemaine: 320, cvMois: 550, qualifies: 99,  taux: 18, caMensuel: 41000, caTrimestriel: 123000, avgHon: 8000, tauxTransfo: 18, nouveaux: 1, fidelisation: 65, targetNouveauxClientsMois: 2, targetCaMensuel: 46000, targetCaTrimestriel: 138000, ytdCa: 162000, ytdNouveauxClients: 5, targetYtdCa: 184000, targetYtdNouveauxClients: 8,  targetAvgHon: 10000 },
]

const SESSION_KEY = 'am_session'

function fmtEur(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k €`
  return `${n} €`
}

function LoginScreen({ preselect, onLogin }: { preselect: string | null; onLogin: (r: AMData) => void }) {
  const selected = ACCOUNT_MANAGERS.find(r => r.name === preselect) ?? null
  const [pwd, setPwd] = useState('')
  const [, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (selected && pwd === selected.password) {
      localStorage.removeItem('recruiter_session')
      localStorage.removeItem('manager_session')
      localStorage.removeItem('manager_auth')
      localStorage.setItem(SESSION_KEY, selected.name)
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
          <p className="text-sm text-white/70">Account Manager</p>
        </div>
        <form onSubmit={submit} className="w-full flex flex-col gap-3 mt-2">
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={e => { setPwd(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/20 placeholder-white/80 text-white focus:outline-none focus:ring-2 focus:ring-white/60 border border-white/30"
          />
          <button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors border border-white/30">
            Accéder à mon espace
          </button>
        </form>
      </div>
    </div>
  )
}

function PersonalDashboard({ am }: { am: AMData }) {
  const baseClientNames = getAmBaseClientNames()

  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    const extraIds = getAmExtraClientIds()
    supabase.from('jobs').select('id, client_id, clients(name)').then(({ data }) => {
      if (!data) return
      const count = (data as unknown as { id: string; client_id: string; clients: { name: string } | { name: string }[] | null }[])
        .filter(j => {
          const clientName = Array.isArray(j.clients) ? j.clients[0]?.name ?? '' : j.clients?.name ?? ''
          return baseClientNames.some(n => n.toLowerCase() === clientName.toLowerCase())
            || extraIds.includes(j.client_id)
        }).length
      setActiveCount(count)
    })
  }, [])

  const [newMonthClients, setNewMonthClients] = useState<{ name: string; date: string }[]>([])

  useEffect(() => {
    const extraIds = getAmExtraClientIds()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    supabase
      .from('jobs')
      .select('id, title, created_at, client_id, clients(name)')
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return
        const seen = new Set<string>()
        const entries: { name: string; date: string }[] = []
        ;(data as unknown as { id: string; title: string; created_at: string; client_id: string; clients: { name: string } | null }[])
          .filter(j => {
            const clientName = (j.clients as { name: string } | null)?.name ?? ''
            return baseClientNames.some(n => n.toLowerCase() === clientName.toLowerCase())
              || extraIds.includes(j.client_id)
          })
          .forEach(j => {
            const clientName = (j.clients as { name: string } | null)?.name ?? ''
            if (clientName && !seen.has(clientName)) {
              seen.add(clientName)
              entries.push({ name: clientName, date: j.created_at })
            }
          })
        setNewMonthClients(entries)
      })
  }, [])

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const kpis = [
    { label: 'Offres actives', value: activeCount,             note: 'En cours',            bg: 'from-emerald-800 to-emerald-950', icon: '📋' },
    { label: 'Taux transfo.',  value: `${am.tauxTransfo} %`,  note: 'Prospects → clients', bg: 'from-red-700 to-red-900',       icon: '🤝' },
    { label: 'Fidélisation',   value: `${am.fidelisation} %`, note: 'Clients 2+ offres',   bg: 'from-green-700 to-green-900',       icon: '♻' },
  ]

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${am.color} flex items-center justify-center text-white font-bold text-sm`}>{am.initials}</div>
        <div>
          <h1 className="text-xl font-semibold text-foreground leading-tight">Mon espace — {am.name}</h1>
          <p className="text-muted-foreground text-sm">Account Manager</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Nouveaux clients — {monthLabel} <span className="normal-case font-normal">({newMonthClients.length})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {newMonthClients.length > 0
            ? newMonthClients.map(c => (
                <span key={c.name} className="inline-flex flex-col px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-foreground shadow-sm">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                </span>
              ))
            : <p className="text-sm text-muted-foreground">Aucun nouveau client ce mois-ci</p>
          }
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recrutement</p>
        <div className="grid grid-cols-5 gap-3">
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

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Objectifs</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'CA mensuel',             value: am.caMensuel,   target: am.targetCaMensuel,           fmt: fmtEur,              color: 'bg-blue-500',   icon: '💰' },
            { label: 'CA trimestriel',          value: am.caTrimestriel, target: am.targetCaTrimestriel,     fmt: fmtEur,              color: 'bg-sky-500',   icon: '📆' },
            { label: 'Nouveaux clients / mois', value: am.nouveaux,   target: am.targetNouveauxClientsMois, fmt: (n: number) => `${n}`, color: 'bg-amber-500', icon: '🆕' },
            { label: 'Hono. moy.',              value: am.avgHon,     target: am.targetAvgHon,              fmt: fmtEur,              color: 'bg-indigo-500', icon: '📐' },
          ].map(obj => {
            const pct = Math.min(100, Math.round((obj.value / obj.target) * 100))
            return (
              <div key={obj.label} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{obj.label}</p>
                  <span>{obj.icon}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{obj.fmt(obj.value)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${obj.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Objectif : {obj.fmt(obj.target)} — {pct}%</p>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { label: 'CA YTD',               value: am.ytdCa,            target: am.targetYtdCa,            fmt: fmtEur,              color: 'bg-blue-500' },
            { label: 'Nouveaux clients YTD', value: am.ytdNouveauxClients, target: am.targetYtdNouveauxClients, fmt: (n: number) => `${n}`, color: 'bg-amber-500' },
          ].map(obj => {
            const pct = Math.min(100, Math.round((obj.value / obj.target) * 100))
            return (
              <div key={obj.label} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{obj.label}</p>
                  <span className="text-xs text-muted-foreground">Depuis le 1er janv.</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{obj.fmt(obj.value)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${obj.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Objectif : {obj.fmt(obj.target)} — {pct}%</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AccountManagerDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preselect = searchParams.get('name')
  const savedName = localStorage.getItem(SESSION_KEY)
  const savedAM = savedName && (!preselect || savedName === preselect)
    ? ACCOUNT_MANAGERS.find(r => r.name === savedName) ?? null
    : null
  const [am, setAm] = useState<AMData | null>(savedAM)

  useEffect(() => {
    if (preselect && am && preselect !== am.name) {
      setAm(null)
    }
  }, [preselect])

  function handleLogin(a: AMData) {
    setAm(a)
    navigate('/account-manager', { replace: true })
  }

  if (!am) return <LoginScreen preselect={preselect} onLogin={handleLogin} />
  return <PersonalDashboard am={am} />
}
