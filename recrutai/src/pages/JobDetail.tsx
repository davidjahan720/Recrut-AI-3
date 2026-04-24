import { useEffect, useState } from 'react'
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Application } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CvUploader } from '@/components/CvUploader'

type SortKey = 'score' | 'created_at'
type StatusFilter = 'all' | 'qualified' | 'rejected' | 'pending' | 'error'

function formatName(raw: string | null): React.ReactNode {
  if (!raw) return null
  const parts = raw.trim().split(' ')
  if (parts.length === 1) return <span className="font-bold">{raw.toUpperCase()}</span>
  const lastName = parts[parts.length - 1].toUpperCase()
  const firstName = parts.slice(0, -1).join(' ')
  return <><span className="font-bold">{lastName}</span> {firstName}</>
}

function ScoreBadge({ score, threshold }: { score: number | null; threshold: number }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>
  const qualified = score >= threshold
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${qualified ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-700'}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const map: Record<Application['status'], { label: string; cls: string }> = {
    pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    qualified: { label: 'Qualifié',   cls: 'bg-green-100 text-green-900' },
    rejected:  { label: 'Rejeté',     cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    error:     { label: 'Erreur',     cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

function CompareModal({
  open, onClose, candidates, job, onViewCv,
}: {
  open: boolean
  onClose: () => void
  candidates: Application[]
  job: Job
  onViewCv: (path: string, name: string | null) => void
}) {
  if (!open) return null
  const cols = candidates.length === 2 ? 'grid-cols-2' : candidates.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-none !w-screen !h-screen !top-0 !left-0 !translate-x-0 !translate-y-0 !rounded-none overflow-y-auto p-6" style={{}}>

        <DialogHeader>
          <DialogTitle>Comparaison — {candidates.length} candidats</DialogTitle>
        </DialogHeader>
        <div className={`grid ${cols} gap-5 mt-2`}>
          {candidates.map(a => {
            const positives: string[] = a.positive_points ? JSON.parse(a.positive_points) : []
            const negatives: string[] = a.negative_points ? JSON.parse(a.negative_points) : []
            return (
              <div key={a.id} className="border border-border rounded-xl p-5 flex flex-col gap-3 bg-card">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-foreground text-base leading-tight">{formatName(a.candidate_name) ?? <span className="italic text-muted-foreground">Inconnu</span>}</p>
                  <p className="text-sm text-muted-foreground truncate">{a.candidate_email ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ScoreBadge score={a.score} threshold={job.score_threshold} />
                  <StatusBadge status={a.status} />
                </div>
                {a.justification && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-border pt-2">{a.justification}</p>
                )}
                {positives.length > 0 && (
                  <div className="space-y-1">
                    {positives.slice(0, 2).map((p, i) => (
                      <p key={i} className="text-sm font-medium text-green-800 leading-snug">{p}</p>
                    ))}
                  </div>
                )}
                {negatives.length > 0 && (
                  <div className="space-y-1">
                    {negatives.slice(0, 2).map((p, i) => (
                      <p key={i} className="text-sm font-medium text-red-700 leading-snug">{p}</p>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" className="mt-auto" onClick={() => onViewCv(a.cv_file_path, a.candidate_name)}>
                  Voir CV
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [sort, setSort] = useState<SortKey>('score')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [toggling, setToggling] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = useState(false)
  const [cvUploadOpen, setCvUploadOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const isRecruiter = !!localStorage.getItem('recruiter_session')

  async function loadJob() {
    const { data, error } = await supabase.from('jobs').select('*, clients(name, contact_email)').eq('id', id!).single()
    if (data) setJob(data)
    else if (error) setLoadError(true)
  }

  async function loadApplications() {
    const { data } = await supabase.from('applications').select('*').eq('job_id', id).order('created_at', { ascending: false })
    setApplications(data ?? [])
  }

  useEffect(() => {
    if (!id) return
    loadJob()
    loadApplications()
  }, [id])

  async function setStatus(newStatus: string) {
    if (!job || toggling) return
    setToggling(true)
    await fetch('/api/update-job-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    await loadJob()
    setToggling(false)
  }

  async function viewCv(path: string, name: string | null) {
    void name
    const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
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

  function exportFiche(a: Application) {
    const statusLabel: Record<Application['status'], string> = {
      qualified: 'Qualifié', rejected: 'Rejeté', pending: 'En attente', error: 'Erreur',
    }
    const positives: string[] = a.positive_points ? JSON.parse(a.positive_points) : []
    const negatives: string[] = a.negative_points ? JSON.parse(a.negative_points) : []
    const date = new Date(a.created_at).toLocaleDateString('fr-FR')

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Fiche — ${a.candidate_name ?? 'Candidat'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; color: #1e293b; font-size: 14px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .row { display: flex; gap: 32px; margin-bottom: 20px; }
  .field label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 4px; display: block; }
  .field span { font-weight: 600; font-size: 15px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .qualified { background: #dcfce7; color: #166534; }
  .rejected { background: #f1f5f9; color: #475569; }
  .pending { background: #fef9c3; color: #854d0e; }
  .error { background: #fee2e2; color: #b91c1c; }
  .score-ok { background: #dcfce7; color: #166534; }
  .score-ko { background: #fee2e2; color: #b91c1c; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 8px; }
  p.justif { line-height: 1.6; color: #334155; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 4px; line-height: 1.5; }
  .section { margin-bottom: 18px; }
  .green { color: #166534; } .red { color: #b91c1c; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${a.candidate_name ?? 'Candidat inconnu'}</h1>
<p class="sub">${a.candidate_email ?? ''} · Reçu le ${date}</p>
<hr>
<div class="row">
  <div class="field"><label>Poste</label><span>${job?.title ?? ''}</span></div>
  <div class="field"><label>Score</label><span class="badge ${(a.score ?? 0) >= (job?.score_threshold ?? 60) ? 'score-ok' : 'score-ko'}">${a.score ?? '—'} / 100</span></div>
  <div class="field"><label>Statut</label><span class="badge ${a.status}">${statusLabel[a.status]}</span></div>
</div>
<hr>
<div class="section">
  <h3>Analyse IA</h3>
  <p class="justif">${a.justification ?? '—'}</p>
</div>
${positives.length ? `<div class="section"><h3>Points positifs</h3><ul>${positives.map(p => `<li class="green">✅ ${p}</li>`).join('')}</ul></div>` : ''}
${negatives.length ? `<div class="section"><h3>Points négatifs</h3><ul>${negatives.map(p => `<li class="red">⚠️ ${p}</li>`).join('')}</ul></div>` : ''}
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function deleteCv(appId: string, path: string) {
    if (!confirm('Supprimer ce candidat et son CV ?')) return
    await fetch('/api/delete-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [appId], paths: [path] }),
    })
    setSelected(prev => { const n = new Set(prev); n.delete(appId); return n })
    loadApplications()
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const filtered = applications
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .sort((a, b) => {
      if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const allFilteredIds = filtered.map(a => a.id)
  const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someFilteredSelected = allFilteredIds.some(id => selected.has(id))

  function toggleSelectAll() {
    setSelected(prev => {
      const n = new Set(prev)
      if (allFilteredSelected) { allFilteredIds.forEach(id => n.delete(id)) }
      else { allFilteredIds.forEach(id => n.add(id)) }
      return n
    })
  }

  async function deleteSelected() {
    const ids = [...selected]
    if (!confirm(`Supprimer ${ids.length} candidat(s) et leurs CV ?`)) return
    const paths = applications.filter(a => ids.includes(a.id)).map(a => a.cv_file_path)
    await fetch('/api/delete-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, paths }),
    })
    setSelected(new Set())
    loadApplications()
  }

  const selectedCandidates = applications.filter(a => selected.has(a.id))
  const colSpan = 7

  if (!job && loadError) return (
    <div className="p-8 space-y-3">
      <p className="text-destructive text-base font-medium">Impossible de charger cette offre.</p>
      <button onClick={() => navigate('/jobs')} className="text-sm text-muted-foreground underline hover:text-foreground">← Retour aux offres</button>
    </div>
  )
  if (!job) return <div className="p-8 text-muted-foreground text-base">Chargement...</div>

  const jobStatus = job.status as string
  const totalCv = applications.length
  const qualifiedCv = applications.filter(a => a.status === 'qualified').length
  const daysSince = Math.max(1, Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86_400_000))

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="text-base font-medium text-muted-foreground hover:text-foreground mb-4">← Retour</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
          <p className="text-muted-foreground text-base mt-1 font-medium">
            {(job.clients as { name: string } | undefined)?.name} · {job.location} · {job.contract_type} · Seuil {job.score_threshold}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {job.ref_code && (
              <span className="font-mono bg-muted px-2 py-1 rounded text-base font-semibold text-foreground">{job.ref_code}</span>
            )}
            {job.posted_by && (
              <span>Créé par <span className="font-semibold text-foreground">{job.posted_by}</span> le {new Date(job.created_at).toLocaleDateString('fr-FR')} à {new Date(job.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {(job.clients as { contact_email?: string | null } | undefined)?.contact_email && (
              <span>Contact client : <a href={`mailto:${(job.clients as { contact_email?: string | null }).contact_email}`} className="font-semibold text-foreground underline underline-offset-2">{(job.clients as { contact_email?: string | null }).contact_email}</a></span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-6 shrink-0">
          {isRecruiter && (
            <Button
              onClick={() => jobStatus === 'active' && setCvUploadOpen(true)}
              className="h-12 px-6 text-base font-semibold"
            >
              📄 Déposer CV
            </Button>
          )}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              disabled={toggling}
              className={`h-11 px-6 text-base font-semibold ${jobStatus === 'active'
                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                : 'border-green-500 text-green-700 hover:bg-green-50'}`}
              onClick={() => jobStatus !== 'active' && setStatus('active')}
            >
              {toggling && jobStatus !== 'active' ? '...' : 'Active'}
            </Button>
            <Button
              variant="outline"
              disabled={toggling}
              className={`h-11 px-6 text-base font-semibold ${jobStatus === 'inactive'
                ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 hover:border-amber-600'
                : 'border-amber-400 text-amber-700 hover:bg-amber-50'}`}
              onClick={() => jobStatus !== 'inactive' && setStatus('inactive')}
            >
              {toggling && jobStatus !== 'inactive' ? '...' : 'Mettre en pause'}
            </Button>
            <Button
              variant="outline"
              disabled={toggling}
              className={`h-11 px-6 text-base font-semibold ${jobStatus === 'closed'
                ? 'bg-slate-600 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-700'
                : 'border-slate-400 text-slate-700 hover:bg-slate-50'}`}
              onClick={() => {
                if (jobStatus !== 'closed' && confirm('Clôturer cette offre ? Elle ne recevra plus de CV.')) {
                  setStatus('closed')
                }
              }}
            >
              {toggling && jobStatus !== 'closed' ? '...' : 'Clôturer'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg">
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CV reçus</span>
          <span className="text-3xl font-bold text-foreground">{totalCv}</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualifiés</span>
          <span className={`text-3xl font-bold ${qualifiedCv > 0 ? 'text-green-600' : 'text-foreground'}`}>{qualifiedCv}</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jours en ligne</span>
          <span className="text-3xl font-bold text-foreground">{daysSince}</span>
        </div>
      </div>


      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Candidatures ({applications.length})</h2>
            {isRecruiter && selected.size >= 2 && selected.size <= 4 && (
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setCompareOpen(true)}>
                Comparer ({selected.size})
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={selected.size === 0}
              onClick={deleteSelected}
            >
              Supprimer{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline">
                Tout désélectionner
              </button>
            )}
          </div>
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
                <TableHead className="w-px whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 cursor-pointer"
                    />
                    Candidat
                  </div>
                </TableHead>
                <TableHead className="w-px whitespace-nowrap">Score</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead className="w-px whitespace-nowrap">Email</TableHead>
                <TableHead className="w-px whitespace-nowrap">Statut</TableHead>
                <TableHead className="w-px whitespace-nowrap">Ajouté par</TableHead>
                <TableHead className="w-px whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8 text-base">Aucune candidature</TableCell></TableRow>
              )}
              {filtered.map(a => {
                const isChecked = selected.has(a.id)
                return (
                  <TableRow key={a.id} className={`hover:bg-muted/30 ${isChecked ? 'bg-violet-50 dark:bg-violet-950/20' : ''}`}>
                    <TableCell className="text-foreground">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(a.id)}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 cursor-pointer flex-shrink-0"
                        />
                        {formatName(a.candidate_name) ?? <span className="text-muted-foreground italic">Inconnu</span>}
                      </div>
                    </TableCell>
                    <TableCell><ScoreBadge score={a.score} threshold={job.score_threshold} /></TableCell>
                    <TableCell>
                      <p className="text-xs text-foreground leading-snug mb-1">{a.justification ?? '—'}</p>
                      {a.positive_points && (
                        <div className="space-y-0.5">
                          {(JSON.parse(a.positive_points) as string[]).slice(0, 2).map((p, i) => (
                            <p key={i} className="text-xs font-medium text-green-800">{p}</p>
                          ))}
                        </div>
                      )}
                      {a.negative_points && (
                        <div className="space-y-0.5 mt-0.5">
                          {(JSON.parse(a.negative_points) as string[]).slice(0, 2).map((p, i) => (
                            <p key={i} className="text-xs font-medium text-red-700">{p}</p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700 text-xs whitespace-nowrap">{a.candidate_email ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {a.uploaded_by && <p className="font-medium text-foreground">{a.uploaded_by}</p>}
                      <p className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString('fr-FR')} {new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => downloadCv(a.cv_file_path, a.candidate_name)}>
                          CV PDF
                        </Button>
                        <Button size="sm" variant="outline" className="text-violet-600 border-violet-300 hover:bg-violet-50" onClick={() => exportFiche(a)}>
                          Fiche
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-700 hover:text-red-900" onClick={() => deleteCv(a.id, a.cv_file_path)}>
                          Suppr.
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        candidates={selectedCandidates}
        job={job}
        onViewCv={viewCv}
      />

      <Dialog open={cvUploadOpen} onOpenChange={setCvUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Déposer des CV</DialogTitle>
          </DialogHeader>
          <CvUploader jobId={id!} onUploaded={() => { loadApplications(); setCvUploadOpen(false) }} />
        </DialogContent>
      </Dialog>

    </div>
  )
}
