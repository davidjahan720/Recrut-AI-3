import { useEffect, useState } from 'react'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { useChartColors } from '@/lib/useChartColors'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface JobStat {
  id: string
  title: string
  clientName: string
  status: string
  total: number
  qualified: number
  rate: number
  days: number
  honoraires: number | null
}

interface BizKpis {
  caMensuel: number
  caTrimestriel: number
  avgHonoraires: number
  tauxTransformation: number
  nouveauxClientsMois: number
  tauxFidelisation: number
}

function fmtEur(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k €`
  return `${n} €`
}

const KPI_STYLES = [
  { bg: 'from-emerald-500 to-emerald-700', icon: '📋' },
  { bg: 'from-blue-500 to-blue-700',       icon: '📄' },
  { bg: 'from-violet-500 to-violet-700',   icon: '✅' },
  { bg: 'from-orange-400 to-orange-600',   icon: '📊' },
]

const BIZ_STYLES = [
  { bg: 'from-teal-500 to-teal-700',       icon: '💰' },
  { bg: 'from-cyan-500 to-cyan-700',       icon: '📆' },
  { bg: 'from-indigo-500 to-indigo-700',   icon: '📐' },
  { bg: 'from-rose-500 to-rose-700',       icon: '🤝' },
  { bg: 'from-amber-500 to-amber-700',     icon: '🆕' },
  { bg: 'from-lime-500 to-lime-700',       icon: '♻' },
]

const RECRUITERS = [
  { name: 'Sophie',  clients: ['Nexeo', 'BTP Pro', 'Inovev'],       offresActives: 0, cv: 400, qualifies: 72, taux: 18, caMensuel: 27000, targetCaMensuel: 30000 },
  { name: 'Karim',   clients: ['Solvay', 'Altair RH'],               offresActives: 0, cv: 350, qualifies: 63, taux: 18, caMensuel: 24000, targetCaMensuel: 27000 },
  { name: 'Alix',    clients: ['Terralys', 'Vinci RH', 'Kalexia'],   offresActives: 0, cv: 450, qualifies: 81, taux: 18, caMensuel: 30000, targetCaMensuel: 33000 },
  { name: 'Nicolas', clients: ['Elexia', 'Groupe Avena'],            offresActives: 0, cv: 200, qualifies: 36, taux: 18, caMensuel: 15000, targetCaMensuel: 18000 },
]

const MONTHS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const LAURA_ACTUAL  = [50000, 53000, 57000, 55000, null, null, null, null, null, null, null, null]
const JULIEN_ACTUAL = [38000, 40000, 43000, 41000, null, null, null, null, null, null, null, null]

const amChartData = MONTHS_LABELS.map((month, i) => ({
  month,
  'Laura (réel)':       LAURA_ACTUAL[i],
  'Laura (objectif)':   58000,
  'Julien (réel)':      JULIEN_ACTUAL[i],
  'Julien (objectif)':  46000,
}))

const amCombinedChartData = MONTHS_LABELS.map((month, i) => ({
  month,
  'Réel':     LAURA_ACTUAL[i] != null && JULIEN_ACTUAL[i] != null ? (LAURA_ACTUAL[i] as number) + (JULIEN_ACTUAL[i] as number) : null,
  'Objectif': 104000,
}))

const AM_PROFILES = [
  { name: 'Laura',  color: '#ec4899', taux: 18, tauxObjectif: 22, caMensuel: 55000, caTrimestriel: 165000, targetCaMensuel: 58000, targetCaTrimestriel: 174000, nouveaux: 2, targetNouveauxClientsMois: 3, ytdCa: 215000, ytdNouveauxClients: 8, clients: ['Nexeo', 'Solvay', 'BTP Pro'] },
  { name: 'Julien', color: '#0ea5e9', taux: 18, tauxObjectif: 22, caMensuel: 41000, caTrimestriel: 123000, targetCaMensuel: 46000, targetCaTrimestriel: 138000, nouveaux: 1, targetNouveauxClientsMois: 2, ytdCa: 162000, ytdNouveauxClients: 5, clients: ['Inovev', 'Altair RH'] },
]

const PWD_KEY = 'manager_auth'
const CORRECT_PWD = '0'

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value === CORRECT_PWD) { onUnlock() } else { setError(true); setValue('') }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4 w-80 shadow-sm">
        <span className="text-4xl">🔒</span>
        <p className="text-sm font-semibold text-foreground">Accès réservé — Manager</p>
        <form onSubmit={submit} className="w-full flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {error && <p className="text-xs text-red-500 text-center">Mot de passe incorrect</p>}
          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
            Accéder
          </button>
        </form>
      </div>
    </div>
  )
}

function AMConsolidatedView({ managerName }: { managerName: string }) {
  const totCaMensuel       = AM_PROFILES.reduce((s, am) => s + am.caMensuel, 0)
  const totTargetMensuel   = AM_PROFILES.reduce((s, am) => s + am.targetCaMensuel, 0)
  const totCaTrimestriel   = AM_PROFILES.reduce((s, am) => s + am.caTrimestriel, 0)
  const totTargetTrim      = AM_PROFILES.reduce((s, am) => s + am.targetCaTrimestriel, 0)
  const totNouveaux        = AM_PROFILES.reduce((s, am) => s + am.nouveaux, 0)
  const totTargetNouveaux  = AM_PROFILES.reduce((s, am) => s + am.targetNouveauxClientsMois, 0)
  const totYtdCa           = AM_PROFILES.reduce((s, am) => s + am.ytdCa, 0)
  const totYtdNouveaux     = AM_PROFILES.reduce((s, am) => s + am.ytdNouveauxClients, 0)

  const objectives = [
    { label: 'CA mensuel',       value: totCaMensuel,     target: totTargetMensuel,  fmt: fmtEur,                color: 'bg-teal-500',  icon: '💰' },
    { label: 'CA trimestriel',   value: totCaTrimestriel, target: totTargetTrim,     fmt: fmtEur,                color: 'bg-cyan-500',  icon: '📆' },
    { label: 'Nouveaux clients', value: totNouveaux,      target: totTargetNouveaux, fmt: (n: number) => `${n}`, color: 'bg-amber-500', icon: '🆕' },
  ]

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      <div>
        <h1 className="text-xl font-semibold text-foreground leading-tight">Vue Manager — {managerName}</h1>
        <p className="text-muted-foreground text-sm">Performance Account Managers — chiffres consolidés</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Objectifs — Équipe AM</p>
        <div className="grid grid-cols-3 gap-3">
          {objectives.map(obj => {
            const pct = Math.min(100, Math.round((obj.value / obj.target) * 100))
            return (
              <div key={obj.label} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{obj.label}</p>
                  <span>{obj.icon}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{obj.fmt(obj.value)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${obj.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Objectif : {obj.fmt(obj.target)} — {pct}%</p>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-1">CA YTD — Équipe</p>
            <p className="text-2xl font-bold text-foreground">{fmtEur(totYtdCa)}</p>
            <p className="text-xs text-muted-foreground mt-1">Depuis le 1er janvier</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Nouveaux clients YTD</p>
            <p className="text-2xl font-bold text-foreground">{totYtdNouveaux}</p>
            <p className="text-xs text-muted-foreground mt-1">Depuis le 1er janvier</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Évolution CA mensuel</p>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={amCombinedChartData} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmtEur(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Réel"     stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Objectif" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default function ManagerDashboard() {
  useChartColors()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(PWD_KEY) === '1')
  const [loading, setLoading] = useState(true)
  const [, setJobStats] = useState<JobStat[]>([])
  const [kpis, setKpis] = useState({ activeJobs: 0, totalCv: 0, totalQualified: 0, rate: 0 })
  const [biz, setBiz] = useState<BizKpis>({ caMensuel: 0, caTrimestriel: 0, avgHonoraires: 0, tauxTransformation: 0, nouveauxClientsMois: 0, tauxFidelisation: 0 })
  const [recruiterCounts, setRecruiterCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()

      const [{ data: jobs }, { data: clients }] = await Promise.all([
        supabase.from('jobs').select('id, title, status, created_at, honoraires, recruiter, clients(name), applications(id, status, email_sent_at)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, type, signed_at, jobs(id)'),
      ])

      if (!jobs) return

      // Job stats
      const stats: JobStat[] = jobs.map(j => {
        const apps = (j.applications as { id: string; status: string; email_sent_at: string | null }[]) ?? []
        const qualified = apps.filter(a => a.status === 'qualified' || a.status === 'pending_approval').length
        const total = apps.length
        return {
          id: j.id,
          title: j.title,
          clientName: !Array.isArray(j.clients) && j.clients ? (j.clients as { name: string }).name : '—',
          status: j.status,
          total,
          qualified,
          rate: total > 0 ? Math.round((qualified / total) * 100) : 0,
          days: Math.max(1, Math.floor((Date.now() - new Date(j.created_at).getTime()) / 86_400_000)),
          honoraires: j.honoraires ?? null,
        }
      })

      // Global recruitment KPIs
      const activeJobs = stats.filter(j => j.status === 'active').length
      const totalCv = stats.reduce((s, j) => s + j.total, 0)
      const totalQualified = stats.reduce((s, j) => s + j.qualified, 0)
      const rate = totalCv > 0 ? Math.round((totalQualified / totalCv) * 100) : 0
      setKpis({ activeJobs, totalCv, totalQualified, rate })

      // Business KPIs
      const qualifiedApps = jobs.flatMap(j =>
        ((j.applications as { id: string; status: string; email_sent_at: string | null }[]) ?? [])
          .filter(a => a.status === 'qualified' && a.email_sent_at)
          .map(a => ({ honoraires: j.honoraires ?? 0, email_sent_at: a.email_sent_at! }))
      )

      const caMensuel = qualifiedApps
        .filter(a => a.email_sent_at >= startOfMonth)
        .reduce((s, a) => s + a.honoraires, 0)

      const caTrimestriel = qualifiedApps
        .filter(a => a.email_sent_at >= startOfQuarter)
        .reduce((s, a) => s + a.honoraires, 0)

      const jobsWithHon = stats.filter(j => j.honoraires != null && j.honoraires > 0)
      const avgHonoraires = jobsWithHon.length > 0
        ? Math.round(jobsWithHon.reduce((s, j) => s + (j.honoraires ?? 0), 0) / jobsWithHon.length)
        : 0

      // Client KPIs
      const allClients = clients ?? []
      const totalClients = allClients.length
      const signedClients = allClients.filter(c => (c.type as string) === 'client').length
      void (totalClients > 0 ? Math.round((signedClients / totalClients) * 100) : 0) // remplacé par valeur fixe

      const nouveauxClientsMois = allClients.filter(c =>
        c.signed_at && c.signed_at >= startOfMonth && (c.type as string) === 'client'
      ).length

      const clientsWithJobs = allClients.filter(c => ((c.jobs as { id: string }[]) ?? []).length >= 2).length
      const tauxFidelisation = signedClients > 0 ? Math.round((clientsWithJobs / signedClients) * 100) : 0

      setBiz({
        caMensuel:           caMensuel           || 96000,
        caTrimestriel:       caTrimestriel       || 288000,
        avgHonoraires:       avgHonoraires       || 8000,
        tauxTransformation:  20,
        nouveauxClientsMois: nouveauxClientsMois || 3,
        tauxFidelisation:    tauxFidelisation    || 73,
      })
      // Offres actives par chargé de recrutement : total / 4 (équirépartition)
      const perRecruiter = Math.floor((jobs as unknown[]).length / 4)
      const counts: Record<string, number> = {}
      for (const rec of RECRUITERS) counts[rec.name] = perRecruiter
      setRecruiterCounts(counts)

      setJobStats(stats)
      setLoading(false)
    }
    load()
  }, [])

  const kpiCards = [
    { label: 'Offres actives',        value: kpis.activeJobs,    note: 'En cours' },
    { label: 'CV reçus au total',      value: kpis.totalCv,       note: 'Toutes offres' },
    { label: 'Candidats qualifiés',    value: kpis.totalQualified, note: 'Toutes offres' },
    { label: 'Taux de qualification',  value: `${kpis.rate} %`,   note: 'Global' },
  ]

  const bizCards = [
    { label: 'CA mensuel',               value: fmtEur(biz.caMensuel),         note: 'Mois en cours' },
    { label: 'CA trimestriel',            value: fmtEur(biz.caTrimestriel),     note: 'Trimestre en cours' },
    { label: 'Honoraires moy. / mission', value: fmtEur(biz.avgHonoraires),     note: 'Marge indicative' },
    { label: 'Taux transformation',       value: `${biz.tauxTransformation} %`, note: 'Prospects → clients' },
    { label: 'Nouveaux clients',          value: biz.nouveauxClientsMois,     note: 'Ce mois-ci' },
    { label: 'Taux de fidélisation',      value: `${biz.tauxFidelisation} %`, note: 'Clients avec 2+ offres' },
  ]



  if (!unlocked) return <PasswordGate onUnlock={() => { sessionStorage.setItem(PWD_KEY, '1'); setUnlocked(true) }} />

  const managerName = sessionStorage.getItem('manager_session')
  if (managerName && managerName !== 'Pierre') {
    return <AMConsolidatedView managerName={managerName} />
  }

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      <div>
        <h1 className="text-xl font-semibold text-foreground leading-tight">Vue Manager</h1>
        <p className="text-muted-foreground text-sm">Performance recrutement & indicateurs business</p>
      </div>

      {/* Recrutement KPIs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recrutement</p>
        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {kpiCards.map((kpi, i) => (
              <div key={kpi.label} className={`bg-gradient-to-br ${KPI_STYLES[i].bg} rounded-xl p-4 text-white shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white leading-tight">{kpi.label}</p>
                  <span className="text-xl">{KPI_STYLES[i].icon}</span>
                </div>
                <p className="text-3xl font-bold leading-tight">{kpi.value}</p>
                <p className="text-xs font-medium text-white/80 mt-1">{kpi.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Business KPIs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business</p>
        {loading ? (
          <div className="grid grid-cols-6 gap-3">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3">
            {bizCards.map((kpi, i) => (
              <div key={kpi.label} className={`bg-gradient-to-br ${BIZ_STYLES[i].bg} rounded-xl p-4 text-white shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white leading-tight">{kpi.label}</p>
                  <span className="text-xl">{BIZ_STYLES[i].icon}</span>
                </div>
                <p className="text-3xl font-bold leading-tight">{kpi.value}</p>
                <p className="text-xs font-medium text-white/80 mt-1">{kpi.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tableau chargés de recrutement */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Performance par chargé de recrutement</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Chargé</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Clients</th>
                {/* Recrutement */}
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-700">Offres actives</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-700">CV reçus</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-violet-700">Qualifiés</th>
                {/* Business */}
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-teal-700">CA mensuel</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-cyan-700">CA mensuel obj.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECRUITERS.map(r => (
                <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.clients.map(c => (
                        <span key={c} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-emerald-700">{recruiterCounts[r.name] ?? 0}</td>
                  <td className="px-3 py-3 text-center font-semibold">{r.cv}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-semibold ${r.qualifies > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>{r.qualifies}</span>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-teal-700">{fmtEur(r.caMensuel)}</td>
                  <td className="px-3 py-3 text-center font-semibold text-cyan-700">{fmtEur(r.targetCaMensuel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Taux de qualification AM */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Taux de qualification annuel — Account Managers</p>
        <div className="grid grid-cols-2 gap-3">
          {AM_PROFILES.map(am => (
            <div key={am.name} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: am.color }}>
                {am.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{am.name}</p>
                  <span className="text-sm font-bold text-orange-600">{am.taux} %</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                    <span>Réel {new Date().getFullYear()}</span>
                    <span>{am.taux} %</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${am.taux}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                    <span>Objectif {new Date().getFullYear()}</span>
                    <span>{am.tauxObjectif} %</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-200 rounded-full border border-orange-400 border-dashed" style={{ width: `${am.tauxObjectif}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Account Managers — CA mensuel */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Performance Account Managers — CA mensuel</p>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={amChartData} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmtEur(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Laura (réel)"      stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Laura (objectif)"  stroke="#ec4899" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="Julien (réel)"     stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Julien (objectif)" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
