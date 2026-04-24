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

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} → ${fmt(end)} ${now.getFullYear()}`
}

function getQuarterRange() {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  const end = new Date(now.getFullYear(), (q + 1) * 3, 0)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} → ${fmt(end)} ${now.getFullYear()}`
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `Semaine du ${fmt(monday)} au ${fmt(friday)}`
}

function fmtEur(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k €`
  return `${n} €`
}

const KPI_STYLES = [
  { bg: 'from-emerald-800 to-emerald-950', icon: '📋' },
  { bg: 'from-blue-700 to-blue-900',       icon: '📄' },
  { bg: 'from-violet-700 to-violet-900',   icon: '✅' },
  { bg: 'from-orange-700 to-orange-900',   icon: '📊' },
]

const BIZ_STYLES = [
  { bg: 'from-teal-800 to-teal-950',       icon: '💰' },
  { bg: 'from-cyan-800 to-cyan-950',       icon: '📆' },
  { bg: 'from-indigo-700 to-indigo-900',   icon: '📐' },
  { bg: 'from-rose-700 to-rose-900',       icon: '🤝' },
  { bg: 'from-amber-800 to-amber-950',     icon: '🆕' },
  { bg: 'from-lime-800 to-lime-950',       icon: '♻' },
]

const RECRUITERS = [
  { name: 'Sophie',  clients: ['Nexeo', 'BTP Pro', 'Inovev'],       offresActives: 0, cv: 400, qualifies: 72, taux: 18, caMensuel: 27000, targetCaMensuel: 30000 },
  { name: 'Karim',   clients: ['Solvay', 'Altair RH'],               offresActives: 0, cv: 350, qualifies: 63, taux: 18, caMensuel: 24000, targetCaMensuel: 27000 },
  { name: 'Alix',    clients: ['Terralys', 'Vinci RH', 'Kalexia'],   offresActives: 0, cv: 450, qualifies: 81, taux: 18, caMensuel: 30000, targetCaMensuel: 33000 },
  { name: 'Nicolas', clients: ['Elexia', 'Groupe Avena'],            offresActives: 0, cv: 200, qualifies: 36, taux: 18, caMensuel: 15000, targetCaMensuel: 18000 },
]

const MONTHS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const LAURA_ACTUAL   = [50000, 58000, 62000, 55000, null, null, null, null, null, null, null, null]
const JULIEN_ACTUAL  = [38000, 44000, 47000, 41000, null, null, null, null, null, null, null, null]
// Objectifs non-linéaires : démarrage progressif, creux estival juil-aoû, pic Q4, ralentissement déc
const LAURA_TARGET   = [52000, 56000, 60000, 62000, 61000, 59000, 47000, 44000, 58000, 64000, 66000, 59000]
const JULIEN_TARGET  = [39000, 42000, 45000, 47000, 46000, 44000, 35000, 32000, 43000, 49000, 51000, 45000]

const amChartData = MONTHS_LABELS.map((month, i) => ({
  month,
  'Laura (réel)':       LAURA_ACTUAL[i],
  'Laura (objectif)':   LAURA_TARGET[i],
  'Julien (réel)':      JULIEN_ACTUAL[i],
  'Julien (objectif)':  JULIEN_TARGET[i],
}))


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
          {error && <p className="text-sm text-red-700 text-center">Mot de passe incorrect</p>}
          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
            Accéder
          </button>
        </form>
      </div>
    </div>
  )
}

const AM_PROFILES = [
  { name: 'Laura',  color: '#ec4899', taux: 18, tauxObjectif: 22, caMensuel: 55000, caTrimestriel: 165000, targetCaMensuel: 58000, targetCaTrimestriel: 174000, nouveaux: 2, targetNouveauxClientsMois: 3, ytdCa: 215000, ytdNouveauxClients: 8, clients: ['Nexeo', 'Solvay', 'BTP Pro'] },
  { name: 'Julien', color: '#0ea5e9', taux: 18, tauxObjectif: 22, caMensuel: 41000, caTrimestriel: 123000, targetCaMensuel: 46000, targetCaTrimestriel: 138000, nouveaux: 1, targetNouveauxClientsMois: 2, ytdCa: 162000, ytdNouveauxClients: 5, clients: ['Inovev', 'Altair RH'] },
]



export default function ManagerDashboard() {
  const { tick: tickColor } = useChartColors()
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(PWD_KEY) === '1')
  const [loading, setLoading] = useState(true)
  const [, setJobStats] = useState<JobStat[]>([])
  const [kpis, setKpis] = useState({ activeJobs: 0, totalCv: 0, totalQualified: 0, rate: 0 })
  const [biz, setBiz] = useState<BizKpis>({ caMensuel: 0, caTrimestriel: 0, avgHonoraires: 0, tauxTransformation: 0, nouveauxClientsMois: 0, tauxFidelisation: 0 })

  useEffect(() => {
    async function load() {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()

      const [{ data: jobs }, { data: clients }] = await Promise.all([
        supabase.from('jobs').select('id, title, status, created_at, honoraires, recruiter, clients(name), applications(id, status, email_sent_at)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, type, signed_at, jobs(id)'),
      ])

      if (!jobs) { setLoading(false); return }

      // Job stats
      const stats: JobStat[] = jobs.map(j => {
        const apps = (j.applications as { id: string; status: string; email_sent_at: string | null }[]) ?? []
        const qualified = apps.filter(a => a.status === 'qualified').length
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

      setJobStats(stats)
      setLoading(false)
    }
    load()
  }, [])

  const kpiCards = [
    { label: 'Offres actives',        value: kpis.activeJobs,    note: 'En cours' },
    { label: 'CV reçus au total',      value: kpis.totalCv,        note: getWeekRange() },
    { label: 'Candidats qualifiés',    value: kpis.totalQualified, note: getWeekRange() },
    { label: 'Taux de qualification',  value: `${Math.round(AM_PROFILES.reduce((s, am) => s + am.taux, 0) / AM_PROFILES.length)} %`, note: 'Global' },
  ]

  const TARGET_CA_MENSUEL = 104000
  const TARGET_CA_TRIMESTRIEL = 312000

  const bizCards = [
    { label: 'CA mensuel',               value: fmtEur(biz.caMensuel),         note: getMonthRange(),            rawValue: biz.caMensuel,           target: TARGET_CA_MENSUEL,  fmtTarget: fmtEur },
    { label: 'CA trimestriel',            value: fmtEur(biz.caTrimestriel),     note: getQuarterRange(),          rawValue: biz.caTrimestriel,        target: TARGET_CA_TRIMESTRIEL, fmtTarget: fmtEur },
    { label: 'Honoraires moy. / mission', value: fmtEur(biz.avgHonoraires),     note: 'Marge indicative',         rawValue: null, target: null,       fmtTarget: fmtEur },
    { label: 'Taux transformation',       value: `${biz.tauxTransformation} %`, note: 'Prospects → clients',      rawValue: null, target: null,       fmtTarget: fmtEur },
    { label: 'Nouveaux clients',          value: biz.nouveauxClientsMois,       note: getMonthRange(),            rawValue: biz.nouveauxClientsMois, target: AM_PROFILES.reduce((s, am) => s + am.targetNouveauxClientsMois, 0), fmtTarget: (n: number) => `${n}` },
    { label: 'Taux de fidélisation',      value: `${biz.tauxFidelisation} %`,   note: 'Clients avec 2+ offres',   rawValue: null, target: null,       fmtTarget: fmtEur },
  ]



  if (!unlocked) return <PasswordGate onUnlock={() => { localStorage.setItem(PWD_KEY, '1'); setUnlocked(true) }} />

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
          <div className="grid grid-cols-6 gap-3">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3">
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
            {bizCards.map((kpi, i) => {
              const pct = kpi.target && kpi.rawValue != null
                ? Math.min(100, Math.round((kpi.rawValue / kpi.target) * 100))
                : null
              return (
                <div key={kpi.label} className={`bg-gradient-to-br ${BIZ_STYLES[i].bg} rounded-xl p-4 text-white shadow-sm flex flex-col`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-white leading-tight">{kpi.label}</p>
                    <span className="text-xl">{BIZ_STYLES[i].icon}</span>
                  </div>
                  <p className="text-3xl font-bold leading-tight">{kpi.value}</p>
                  <p className="text-xs font-medium text-white/80 mt-1">{kpi.note}</p>
                  {pct != null && kpi.target && (
                    <>
                      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-white/70 mt-1">Obj. {kpi.fmtTarget(kpi.target)} — {pct}%</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tableau chargés de recrutement */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Performance par chargé de recrutement</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden w-fit">
          <table className="text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Chargé</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground">CV reçus</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground">Qualifiés</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground">CA mensuel</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground">Objectif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECRUITERS.map(r => (
                <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-foreground">{r.cv}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-semibold text-foreground">{r.qualifies}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">{fmtEur(r.caMensuel)}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">{fmtEur(r.targetCaMensuel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Taux de qualification AM */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Taux de qualification annuel — Account Managers</p>
        <div className="grid grid-cols-4 gap-3">
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
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} />
              <YAxis tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: tickColor }} />
              <Tooltip formatter={(v: unknown) => fmtEur(Number(v))} />
              <Legend content={(props: any) => (
                <div className="flex flex-wrap gap-4 justify-center mt-2">
                  {(props.payload ?? []).map((entry: any) => {
                    const dashed = entry.payload?.strokeDasharray
                    return (
                      <div key={entry.dataKey} className="flex items-center gap-1.5">
                        <svg width="28" height="10" style={{ display: 'block' }}>
                          <line x1="0" y1="5" x2="28" y2="5"
                            stroke={entry.color}
                            strokeWidth={dashed ? 1.5 : 2.5}
                            strokeDasharray={dashed ? '5 4' : undefined}
                          />
                        </svg>
                        <span style={{ fontSize: 12, color: tickColor }}>{entry.value}</span>
                      </div>
                    )
                  })}
                </div>
              )} />
              <Line type="monotone" dataKey="Laura (réel)"      stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Laura (objectif)"  stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />
              <Line type="monotone" dataKey="Julien (réel)"     stroke="#38bdf8" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Julien (objectif)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
