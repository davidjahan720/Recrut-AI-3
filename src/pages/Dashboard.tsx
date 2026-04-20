import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useChartColors } from '@/lib/useChartColors'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface DayCount { day: string; count: number }
interface JobCount { title: string; count: number }
interface StatusCount { name: string; value: number; color: string }

interface Stats {
  activeJobs: number
  cvToday: number
  qualifiedThisWeek: number
  qualificationRate: number
  statusData: StatusCount[]
  dailyData: DayCount[]
  jobData: JobCount[]
}

const STATUS_COLORS: Record<string, string> = {
  qualified: '#7c3aed',
  rejected:  '#ef4444',
  pending:   '#f59e0b',
  error:     '#f97316',
}

const KPI_STYLES = [
  { bg: 'from-violet-500 to-violet-700', icon: '📋' },
  { bg: 'from-blue-500 to-blue-700',    icon: '📄' },
  { bg: 'from-emerald-500 to-emerald-700', icon: '✅' },
  { bg: 'from-orange-400 to-orange-600', icon: '📊' },
]

function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })
}

export default function Dashboard() {
  const { tick, tooltip } = useChartColors()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    activeJobs: 0, cvToday: 0, qualifiedThisWeek: 0, qualificationRate: 0,
    statusData: [], dailyData: [], jobData: [],
  })

  useEffect(() => {
    async function loadStats() {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      const [
        { count: activeJobs },
        { count: cvToday },
        { count: qualifiedThisWeek },
        { count: totalCv },
        { count: totalQualified },
        { data: recentApps },
        { data: allJobs },
      ] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'qualified').gte('created_at', weekAgo),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
        supabase.from('applications').select('id, status, created_at, job_id').gte('created_at', weekAgo),
        supabase.from('jobs').select('id, title'),
      ])

      // Status donut
      const statusCounts: Record<string, number> = { qualified: 0, rejected: 0, pending: 0, error: 0 }
      for (const a of recentApps ?? []) {
        if (statusCounts[a.status] !== undefined) statusCounts[a.status]++
      }
      const statusData: StatusCount[] = Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: name === 'qualified' ? 'Qualifiés' : name === 'rejected' ? 'Rejetés' : name === 'pending' ? 'En attente' : 'Erreurs',
          value,
          color: STATUS_COLORS[name],
        }))

      // Daily bar chart (last 7 days)
      const days: DayCount[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().split('T')[0]
        const count = (recentApps ?? []).filter(a => a.created_at.startsWith(key)).length
        days.push({ day: fmt(d), count })
      }

      // Jobs bar chart
      const jobMap: Record<string, number> = {}
      for (const a of recentApps ?? []) {
        jobMap[a.job_id] = (jobMap[a.job_id] ?? 0) + 1
      }
      const jobData: JobCount[] = Object.entries(jobMap)
        .map(([id, count]) => ({
          title: (allJobs ?? []).find(j => j.id === id)?.title ?? id.slice(0, 8),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      setStats({
        activeJobs: activeJobs ?? 0,
        cvToday: cvToday ?? 0,
        qualifiedThisWeek: qualifiedThisWeek ?? 0,
        qualificationRate: totalCv ? Math.round(((totalQualified ?? 0) / totalCv) * 100) : 0,
        statusData,
        dailyData: days,
        jobData,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  const kpis = [
    { label: 'Offres actives',           value: stats.activeJobs,         note: 'En cours' },
    { label: "CV reçus aujourd'hui",      value: stats.cvToday,            note: 'Dernières 24h' },
    { label: 'Qualifiés cette semaine',   value: stats.qualifiedThisWeek,  note: '7 derniers jours' },
    { label: 'Taux de qualification',     value: `${stats.qualificationRate} %`, note: 'Global' },
  ]

  return (
    <div className="p-5 flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-semibold text-foreground leading-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Vue d'ensemble de l'activité RecrutAI</p>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-[116px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 animate-fade-in">
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className={`bg-gradient-to-br ${KPI_STYLES[i].bg} rounded-xl p-6 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-semibold text-white leading-tight">{kpi.label}</p>
                <span className="text-3xl" aria-hidden="true">{KPI_STYLES[i].icon}</span>
              </div>
              <p className="text-5xl font-bold leading-tight">{kpi.value}</p>
              <p className="text-sm font-medium text-white mt-1">{kpi.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts — colonnes asymétriques */}
      <div className="grid gap-4 flex-1 min-h-0" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>

        {/* CV par jour */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-foreground mb-2">CV reçus — 7 derniers jours</h2>
          {stats.dailyData.every(d => d.count === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucun CV cette semaine</p>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 13, fill: tick, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: tick, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltip.bg, border: `1px solid ${tooltip.border}`, borderRadius: 8, fontSize: 11, color: tick }} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" name="CV" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Statuts donut */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-foreground mb-2">Répartition des candidatures (7j)</h2>
          {stats.statusData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucune candidature cette semaine</p>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius="30%" outerRadius="55%" paddingAngle={3} dataKey="value">
                    {stats.statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: tooltip.bg, border: `1px solid ${tooltip.border}`, borderRadius: 8, fontSize: 11, color: tick }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13, color: tick, fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top offres */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-foreground mb-2">CV reçus par offre (7j)</h2>
          {stats.jobData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucune donnée</p>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.jobData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fill: tick, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 13, fill: tick, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltip.bg, border: `1px solid ${tooltip.border}`, borderRadius: 8, fontSize: 11, color: tick }} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" name="CV" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
