import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Application } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CvUploader } from '@/components/CvUploader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type SortKey = 'score' | 'created_at'
type StatusFilter = 'all' | 'qualified' | 'rejected' | 'pending' | 'error'

function ScoreBadge({ score, threshold }: { score: number | null; threshold: number }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>
  const qualified = score >= threshold
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const map: Record<Application['status'], { label: string; cls: string }> = {
    pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    qualified: { label: 'Qualifié', cls: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejeté', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    error: { label: 'Erreur', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [sort, setSort] = useState<SortKey>('score')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [viewName, setViewName] = useState<string>('')

  async function loadApplications() {
    const { data } = await supabase.from('applications').select('*').eq('job_id', id).order('created_at', { ascending: false })
    setApplications(data ?? [])
  }

  useEffect(() => {
    if (!id) return
    supabase.from('jobs').select('*, clients(name)').eq('id', id).single().then(({ data }) => setJob(data))
    loadApplications()
  }, [id])

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

  async function deleteCv(appId: string, path: string) {
    if (!confirm('Supprimer ce candidat et son CV ?')) return
    await Promise.all([
      supabase.from('applications').delete().eq('id', appId),
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

  if (!job) return <div className="p-8 text-muted-foreground text-base">Chargement...</div>

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="text-base font-medium text-muted-foreground hover:text-foreground mb-4">← Retour</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
          <p className="text-muted-foreground text-base mt-1 font-medium">
            {(job.clients as { name: string } | undefined)?.name} · {job.location} · {job.contract_type} · Seuil {job.score_threshold}
          </p>
        </div>
        <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
          {job.status === 'active' ? 'Active' : 'Clôturée'}
        </Badge>
      </div>

      {job.status === 'active' && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-3">Déposer des CV</h2>
          <CvUploader jobId={id!} onUploaded={loadApplications} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Candidatures ({applications.length})</h2>
          <div className="flex gap-2">
            <select
              className="text-sm font-medium border border-border rounded px-3 py-1.5 bg-card text-foreground"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Tous statuts</option>
              <option value="qualified">Qualifiés</option>
              <option value="rejected">Rejetés</option>
              <option value="pending">En attente</option>
              <option value="error">Erreur</option>
            </select>
            <select
              className="text-sm font-medium border border-border rounded px-3 py-1.5 bg-card text-foreground"
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
            >
              <option value="score">Trier par score</option>
              <option value="created_at">Trier par date</option>
            </select>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-base">Aucune candidature</TableCell></TableRow>
              )}
              {filtered.map(a => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground">{a.candidate_name ?? <span className="text-muted-foreground italic">Inconnu</span>}</TableCell>
                  <TableCell className="text-slate-700">{a.candidate_email ?? '—'}</TableCell>
                  <TableCell><ScoreBadge score={a.score} threshold={job.score_threshold} /></TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="max-w-sm">
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
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => viewCv(a.cv_file_path, a.candidate_name)}>
                        Voir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => downloadCv(a.cv_file_path, a.candidate_name)}>
                        PDF
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
      </div>

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
