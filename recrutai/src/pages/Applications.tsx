import { useEffect, useRef, useState } from 'react'
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Application } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CvUploader } from '@/components/CvUploader'

type AppWithJob = Application & {
  jobs: { title: string; score_threshold: number; client_id: string; recruiter: string | null; clients: { name: string } }
}

type StatusFilter = 'all' | 'qualified' | 'rejected' | 'pending' | 'error'
type SortKey = 'score' | 'created_at' | 'job' | 'name'

function formatName(raw: string | null): { display: React.ReactNode; lastName: string } {
  if (!raw) return { display: '', lastName: '' }
  const parts = raw.trim().split(' ')
  if (parts.length === 1) return { display: <><span className="font-bold">{raw.toUpperCase()}</span></>, lastName: raw.toUpperCase() }
  const lastName = parts[parts.length - 1].toUpperCase()
  const firstName = parts.slice(0, -1).join(' ')
  return {
    display: <><span className="font-bold">{lastName}</span> {firstName}</>,
    lastName,
  }
}

function ScoreBadge({ score, threshold }: { score: number | null; threshold: number }) {
  if (score === null) return <span className="text-muted-foreground">—</span>
  const ok = score >= threshold
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ok ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-700'}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const map: Record<Application['status'], { label: string; cls: string }> = {
    pending:   { label: 'En analyse', cls: 'bg-amber-100 text-amber-700' },
    qualified: { label: 'Qualifié',   cls: 'bg-green-100 text-green-900' },
    rejected:  { label: 'Rejeté',     cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    error:     { label: 'Erreur',     cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-500" />}
      {label}
    </span>
  )
}

export default function Applications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<AppWithJob[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('created_at')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [viewName, setViewName] = useState<string>('')
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [activeJobs, setActiveJobs] = useState<{ id: string; title: string }[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function flashRow(id: string) {
    const existing = flashTimers.current.get(id)
    if (existing) clearTimeout(existing)
    setFlashIds(prev => new Set(prev).add(id))
    const t = setTimeout(() => setFlashIds(prev => { const s = new Set(prev); s.delete(id); return s }), 1500)
    flashTimers.current.set(id, t)
  }

  function exportQualifiedCsv() {
    const qualified = applications.filter(a => a.status === 'qualified')
    const headers = ['Nom', 'Email', 'Poste', 'Client', 'Score', 'Seuil', 'Synthèse', 'Points positifs', 'Points négatifs', 'Date']
    const rows = qualified.map(a => [
      a.candidate_name ?? '',
      a.candidate_email ?? '',
      a.jobs?.title ?? '',
      (a.jobs?.clients as { name: string } | undefined)?.name ?? '',
      a.score ?? '',
      a.jobs?.score_threshold ?? '',
      a.justification ?? '',
      a.positive_points ? (JSON.parse(a.positive_points) as string[]).join(' | ') : '',
      a.negative_points ? (JSON.parse(a.negative_points) as string[]).join(' | ') : '',
      new Date(a.created_at).toLocaleDateString('fr-FR'),
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidats-qualifies-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleCompare(id: string) {
    setCompareIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    setCompareIds(prev => filtered.every(a => prev.has(a.id)) ? new Set() : new Set(filtered.map(a => a.id)))
  }
  async function handleDeleteSelected() {
    if (!confirm(`Supprimer les ${compareIds.size} candidature${compareIds.size > 1 ? 's' : ''} sélectionnées ?`)) return
    await Promise.all([...compareIds].map(id => {
      const app = applications.find(a => a.id === id)
      return Promise.all([
        supabase.from('applications').delete().eq('id', id),
        app ? supabase.storage.from('cvs').remove([app.cv_file_path]) : Promise.resolve(),
      ])
    }))
    setCompareIds(new Set()); loadApplications()
  }

  async function loadActiveJobs() {
    const { data } = await supabase.from('jobs').select('id, title').eq('status', 'active').order('created_at', { ascending: false })
    setActiveJobs(data ?? [])
  }

  async function loadApplications() {
    const { data } = await supabase
      .from('applications')
      .select('*, jobs(title, score_threshold, client_id, recruiter, clients(name))')
      .order('created_at', { ascending: false })
    setApplications((data ?? []) as AppWithJob[])
    setLoading(false)
  }

  async function fetchOne(id: string): Promise<AppWithJob | null> {
    const { data } = await supabase
      .from('applications')
      .select('*, jobs(title, score_threshold, client_id, recruiter, clients(name))')
      .eq('id', id)
      .single()
    return (data as AppWithJob | null)
  }

  useEffect(() => {
    loadApplications()
    loadActiveJobs()

    const channel = supabase
      .channel('applications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, async ({ new: row }) => {
        const full = await fetchOne(row.id)
        if (full) setApplications(prev => [full, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications' }, async ({ new: row }) => {
        const full = await fetchOne(row.id)
        if (full) { setApplications(prev => prev.map(a => a.id === row.id ? full : a)); flashRow(row.id) }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'applications' }, ({ old: row }) => {
        setApplications(prev => prev.filter(a => a.id !== row.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function openUpload() {
    setSelectedJobId('')
    setUploadOpen(true)
  }

  async function viewCv(path: string, name: string | null) {
    const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 3600)
    if (!data?.signedUrl) return
    const isPdf = path.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      setViewName(name ?? 'CV')
      setViewUrl(data.signedUrl)
    } else {
      window.open(data.signedUrl, '_blank')
    }
  }


  async function deleteCv(id: string, path: string) {
    if (!confirm('Supprimer ce candidat et son CV ?')) return
    await Promise.all([
      supabase.from('applications').delete().eq('id', id),
      supabase.storage.from('cvs').remove([path]),
    ])
    loadApplications()
  }

  const myApplications = applications

  const filtered = myApplications
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .sort((a, b) => {
      if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1)
      if (sort === 'job') return (a.jobs?.title ?? '').localeCompare(b.jobs?.title ?? '', 'fr')
      if (sort === 'name') return formatName(a.candidate_name).lastName.localeCompare(formatName(b.candidate_name).lastName, 'fr')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const counts = {
    all: myApplications.length,
    qualified: myApplications.filter(a => a.status === 'qualified').length,
    rejected: myApplications.filter(a => a.status === 'rejected').length,
    pending: myApplications.filter(a => a.status === 'pending').length,
    error: myApplications.filter(a => a.status === 'error').length,
  }

  const pillBase = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none'
  const pillActive = 'bg-primary text-white'
  const pillInactive = 'bg-card border border-border text-foreground hover:bg-muted'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Candidatures</h1>
          <p className="text-muted-foreground text-base">{myApplications.length} candidature{myApplications.length !== 1 ? 's' : ''}{' au total'}</p>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.size >= 2 && compareIds.size <= 3 && (
            <Button
              variant="outline"
              className="border-violet-400 text-violet-700 hover:bg-violet-50"
              onClick={() => navigate(`/compare?ids=${[...compareIds].join(',')}`)}
            >
              Comparer ({compareIds.size})
            </Button>
          )}
          {compareIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              Supprimer ({compareIds.size})
            </Button>
          )}
          {compareIds.size > 0 && (
            <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => setCompareIds(new Set())}>
              Annuler
            </Button>
          )}
          {counts.qualified > 0 && (
            <Button variant="outline" onClick={exportQualifiedCsv}>
              ↓ Export CSV ({counts.qualified})
            </Button>
          )}
          <Button onClick={openUpload}>+ Déposer des CV</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'qualified', 'rejected', 'pending', 'error'] as StatusFilter[]).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`${pillBase} ${statusFilter === f ? pillActive : pillInactive}`}>
            {f === 'all'       ? `Toutes (${counts.all})` :
             f === 'qualified' ? `Qualifiés (${counts.qualified})` :
             f === 'rejected'  ? `Rejetés (${counts.rejected})` :
             f === 'pending'   ? `En analyse (${counts.pending})` :
             `Erreurs (${counts.error})`}
          </button>
        ))}
        <select
          className="ml-auto text-sm font-medium border border-border rounded px-3 py-1.5 bg-card text-foreground"
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
        >
          <option value="created_at">Trier par date</option>
          <option value="score">Trier par score</option>
          <option value="name">Trier par nom (A→Z)</option>
          <option value="job">Trier par offre</option>
        </select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                {compareIds.size >= 2 && (
                  <input type="checkbox" checked={filtered.every(a => compareIds.has(a.id))} onChange={toggleSelectAll}
                    className="w-4 h-4 accent-violet-600 cursor-pointer" />
                )}
              </TableHead>
              <TableHead className="w-28">Candidat</TableHead>
              <TableHead className="w-36">Offre / Client</TableHead>
              <TableHead className="w-24">Score / Statut</TableHead>
              <TableHead>Analyse</TableHead>
              <TableHead className="w-20">Date</TableHead>
              <TableHead className="w-32"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell><Skeleton className="w-4 h-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-20" /></TableCell>
                <TableCell><Skeleton className="h-3 w-24 mb-1" /><Skeleton className="h-3 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 mb-1" /><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-3 w-40 mb-1" /><Skeleton className="h-3 w-32" /></TableCell>
                <TableCell><Skeleton className="h-3 w-14" /></TableCell>
                <TableCell><Skeleton className="h-7 w-28" /></TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Aucune candidature{statusFilter !== 'all' && ' pour ce filtre'}
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map(a => (
              <TableRow
                key={a.id}
                className={[
                  'align-top transition-colors duration-200',
                  compareIds.has(a.id) ? 'bg-violet-50 dark:bg-violet-950/20' : 'hover:bg-muted/40',
                  flashIds.has(a.id) ? 'animate-highlight' : '',
                ].join(' ')}
              >
                <TableCell className="pr-0">
                  <input
                    type="checkbox"
                    checked={compareIds.has(a.id)}
                    onChange={() => toggleCompare(a.id)}
                    className="w-4 h-4 accent-violet-600 cursor-pointer"
                    aria-label={`Sélectionner ${a.candidate_name ?? 'ce candidat'}`}
                  />
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground line-clamp-1">
                    {a.candidate_name ? formatName(a.candidate_name).display : <span className="text-muted-foreground italic">Inconnu</span>}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{a.candidate_email ?? ''}</p>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => navigate(`/jobs/${a.job_id}`)}
                    className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline text-left line-clamp-1 block rounded"
                    aria-label={`Voir l'offre ${a.jobs?.title}`}
                  >
                    {a.jobs?.title ?? '—'}
                  </button>
                  <p className="text-xs text-muted-foreground line-clamp-1">{(a.jobs?.clients as { name: string } | undefined)?.name ?? '—'}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <ScoreBadge score={a.score} threshold={a.jobs?.score_threshold ?? 60} />
                    <StatusBadge status={a.status} />
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <p className="text-xs text-foreground line-clamp-1 leading-snug">{a.justification ?? '—'}</p>
                  {a.positive_points && (
                    <div className="space-y-0.5 mt-0.5">
                      {(JSON.parse(a.positive_points) as string[]).slice(0, 2).map((p, i) => (
                        <p key={i} className="text-xs font-medium text-green-800 dark:text-green-400 line-clamp-1">✅ {p}</p>
                      ))}
                    </div>
                  )}
                  {a.negative_points && (
                    <div className="space-y-0.5 mt-0.5">
                      {(JSON.parse(a.negative_points) as string[]).slice(0, 2).map((p, i) => (
                        <p key={i} className="text-xs font-medium text-red-600 dark:text-red-400 line-clamp-1">⚠️ {p}</p>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" className="text-xs px-2 h-7" onClick={() => viewCv(a.cv_file_path, a.candidate_name)} aria-label={`Voir le CV de ${a.candidate_name ?? 'ce candidat'}`}>PDF</Button>
                    <Button size="sm" variant="ghost" className="text-red-700 hover:text-red-900 text-xs px-2 h-7" onClick={() => deleteCv(a.id, a.cv_file_path)} aria-label={`Supprimer la candidature de ${a.candidate_name ?? 'ce candidat'}`}>✕</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Déposer des CV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Offre associée (optionnel)</label>
              <select
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
              >
                <option value="">— Aucune offre (juste déposer) —</option>
                {activeJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <CvUploader jobId={selectedJobId} onUploaded={() => { setUploadOpen(false); loadApplications() }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog viewer CV PDF */}
      <Dialog open={!!viewUrl} onOpenChange={() => setViewUrl(null)}>
        <DialogContent className="max-w-4xl w-full" style={{ height: '85vh' }}>
          <DialogHeader>
            <DialogTitle>CV — {viewName}</DialogTitle>
          </DialogHeader>
          {viewUrl && (
            <iframe
              src={viewUrl}
              className="w-full rounded border border-border"
              style={{ height: 'calc(85vh - 80px)' }}
              title={`CV ${viewName}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
