import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Application, Job } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CvUploader } from '@/components/CvUploader'

type AppWithJob = Application & {
  jobs: { title: string; score_threshold: number; client_id: string; clients: { name: string } }
}

type StatusFilter = 'all' | 'qualified' | 'rejected' | 'pending' | 'error'
type SortKey = 'score' | 'created_at'

function ScoreBadge({ score, threshold }: { score: number | null; threshold: number }) {
  if (score === null) return <span className="text-muted-foreground">—</span>
  const ok = score >= threshold
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const map: Record<Application['status'], { label: string; cls: string }> = {
    pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    qualified: { label: 'Qualifié',   cls: 'bg-green-100 text-green-800' },
    rejected:  { label: 'Rejeté',     cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    error:     { label: 'Erreur',     cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

export default function Applications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<AppWithJob[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('created_at')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [viewName, setViewName] = useState<string>('')
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [sentOk, setSentOk] = useState<Set<string>>(new Set())

  async function loadApplications() {
    const { data } = await supabase
      .from('applications')
      .select('*, jobs(title, score_threshold, client_id, clients(name))')
      .order('created_at', { ascending: false })
    setApplications((data ?? []) as AppWithJob[])
  }

  async function loadActiveJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*, clients(name)')
      .eq('status', 'active')
      .order('title')
    setActiveJobs((data ?? []) as Job[])
  }

  useEffect(() => {
    loadApplications()
    loadActiveJobs()
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

  async function downloadCv(path: string, name: string | null) {
    const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = name ? `CV_${name}.pdf` : 'CV.pdf'
      a.click()
    }
  }

  async function sendAnalysis(id: string) {
    setSending(prev => new Set(prev).add(id))
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase.functions.invoke('send-analysis', {
      body: { application_id: id },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    setSending(prev => { const s = new Set(prev); s.delete(id); return s })
    if (data?.error) alert('Erreur : ' + data.error)
    else setSentOk(prev => new Set(prev).add(id))
  }

  async function deleteCv(id: string, path: string) {
    if (!confirm('Supprimer ce candidat et son CV ?')) return
    await Promise.all([
      supabase.from('applications').delete().eq('id', id),
      supabase.storage.from('cvs').remove([path]),
    ])
    loadApplications()
  }

  const filtered = applications
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .sort((a, b) => {
      if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const counts = {
    all: applications.length,
    qualified: applications.filter(a => a.status === 'qualified').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    pending: applications.filter(a => a.status === 'pending').length,
    error: applications.filter(a => a.status === 'error').length,
  }

  const pillBase = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors'
  const pillActive = 'bg-primary text-white'
  const pillInactive = 'bg-card border border-border text-foreground hover:bg-muted'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Candidatures</h1>
          <p className="text-muted-foreground text-base">{applications.length} candidature{applications.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={openUpload}>+ Déposer des CV</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'qualified', 'rejected', 'pending', 'error'] as StatusFilter[]).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`${pillBase} ${statusFilter === f ? pillActive : pillInactive}`}>
            {f === 'all' ? `Toutes (${counts.all})` :
             f === 'qualified' ? `Qualifiés (${counts.qualified})` :
             f === 'rejected' ? `Rejetés (${counts.rejected})` :
             f === 'pending' ? `En attente (${counts.pending})` :
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
        </select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidat</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Offre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Analyse</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  Aucune candidature{statusFilter !== 'all' && ' pour ce filtre'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(a => (
              <TableRow key={a.id} className="hover:bg-muted/40">
                <TableCell className="font-semibold text-foreground">
                  {a.candidate_name ?? <span className="text-muted-foreground italic">Inconnu</span>}
                </TableCell>
                <TableCell className="text-slate-700">{a.candidate_email ?? '—'}</TableCell>
                <TableCell>
                  <button onClick={() => navigate(`/jobs/${a.job_id}`)} className="text-base font-medium text-blue-700 hover:underline">
                    {a.jobs?.title ?? '—'}
                  </button>
                </TableCell>
                <TableCell className="text-slate-700 font-medium">
                  {(a.jobs?.clients as { name: string } | undefined)?.name ?? '—'}
                </TableCell>
                <TableCell>
                  <ScoreBadge score={a.score} threshold={a.jobs?.score_threshold ?? 60} />
                </TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-slate-700 mb-1.5 whitespace-normal break-words leading-relaxed">{a.justification ?? '—'}</p>
                  {a.positive_points && (
                    <div className="space-y-1">
                      {(JSON.parse(a.positive_points) as string[]).map((p, i) => (
                        <p key={i} className="text-sm font-medium text-green-800 whitespace-normal break-words">✅ {p}</p>
                      ))}
                    </div>
                  )}
                  {a.negative_points && (
                    <div className="space-y-1 mt-1.5">
                      {(JSON.parse(a.negative_points) as string[]).map((p, i) => (
                        <p key={i} className="text-sm font-medium text-red-700 whitespace-normal break-words">⚠️ {p}</p>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-600 whitespace-nowrap font-medium">
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 min-w-[90px]">
                    <Button size="sm" variant="ghost" onClick={() => viewCv(a.cv_file_path, a.candidate_name)}>
                      Voir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadCv(a.cv_file_path, a.candidate_name)}>
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-violet-600 border-violet-300 hover:bg-violet-50 text-xs"
                      disabled={sending.has(a.id) || sentOk.has(a.id)}
                      onClick={() => sendAnalysis(a.id)}
                    >
                      {sentOk.has(a.id) ? '✅ Envoyé' : sending.has(a.id) ? '...' : 'Envoyer analyse'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteCv(a.id, a.cv_file_path)}>
                      Suppr.
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Déposer des CV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Sélectionner une offre active</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <span className="truncate">
                    {selectedJobId
                      ? (() => {
                          const j = activeJobs.find(j => j.id === selectedJobId)
                          return j ? `${j.title} — ${(j.clients as { name: string } | undefined)?.name ?? ''}` : 'Choisir une offre...'
                        })()
                      : 'Choisir une offre...'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {activeJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} — {(j.clients as { name: string } | undefined)?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedJobId && (
              <CvUploader jobId={selectedJobId} onUploaded={() => { loadApplications() }} />
            )}
            {!selectedJobId && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sélectionne une offre pour afficher la zone de dépôt
              </p>
            )}
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
