import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Application } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type AppWithJob = Application & {
  jobs: { title: string; score_threshold: number; clients: { name: string } }
}

function ScoreRing({ score, threshold }: { score: number | null; threshold: number }) {
  if (score === null) return <span className="text-4xl font-bold text-muted-foreground">—</span>
  const ok = score >= threshold
  return (
    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${ok ? 'border-green-500' : 'border-red-400'}`}>
      <span className={`text-2xl font-bold ${ok ? 'text-green-600' : 'text-red-500'}`}>{score}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const map: Record<Application['status'], { label: string; cls: string }> = {
    pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    qualified: { label: 'Qualifié',   cls: 'bg-green-100 text-green-900' },
    rejected:  { label: 'Rejeté',     cls: 'bg-slate-100 text-slate-700' },
    error:     { label: 'Erreur',     cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

export default function CompareApplications() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [apps, setApps] = useState<AppWithJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3)
    if (ids.length < 2) { navigate('/applications'); return }

    supabase
      .from('applications')
      .select('*, jobs(title, score_threshold, clients(name))')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids.map(id => (data ?? []).find(a => a.id === id)).filter(Boolean) as AppWithJob[]
        setApps(ordered)
        setLoading(false)
      })
  }, [params, navigate])

  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-9 w-24" />
        <div><Skeleton className="h-7 w-56 mb-1" /><Skeleton className="h-4 w-32" /></div>
      </div>
      <div className="flex gap-4">
        {[0,1,2].map(i => (
          <div key={i} className="flex-1 rounded-xl border border-border p-5 space-y-4">
            <Skeleton className="h-5 w-36 mb-1" /><Skeleton className="h-3 w-28" />
            <div className="flex flex-col items-center gap-2"><Skeleton className="w-20 h-20 rounded-full" /><Skeleton className="h-5 w-16" /></div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-4/6" />
          </div>
        ))}
      </div>
    </div>
  )

  const best = apps.reduce((top, a) => (a.score ?? -1) > (top.score ?? -1) ? a : top, apps[0])
  const colWidth = apps.length === 2 ? 'w-1/2' : 'w-1/3'

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/applications')}>← Retour</Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Comparaison de candidats</h1>
          <p className="text-muted-foreground text-sm">{apps.length} candidats comparés</p>
        </div>
      </div>

      <div className="flex gap-4 items-stretch">
        {apps.map(a => {
          const isBest = apps.length > 1 && a.id === best.id && (a.score ?? -1) >= 0
          const positives: string[] = a.positive_points ? JSON.parse(a.positive_points) : []
          const negatives: string[] = a.negative_points ? JSON.parse(a.negative_points) : []

          return (
            <div
              key={a.id}
              className={`${colWidth} flex flex-col rounded-xl border-2 overflow-hidden ${isBest ? 'border-green-500 shadow-lg' : 'border-border'}`}
            >
              {isBest && (
                <div className="bg-green-500 text-white text-xs font-bold text-center py-1 tracking-wide uppercase">
                  Meilleur score
                </div>
              )}

              <div className="bg-card p-5 flex flex-col gap-4 flex-1">
                {/* Identité */}
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {a.candidate_name ?? <span className="text-muted-foreground italic">Candidat inconnu</span>}
                  </p>
                  {a.candidate_email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{a.candidate_email}</p>
                  )}
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{a.jobs?.title ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{(a.jobs?.clients as { name: string } | undefined)?.name ?? '—'}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center gap-2">
                  <ScoreRing score={a.score} threshold={a.jobs?.score_threshold ?? 60} />
                  <div className="flex flex-col items-center gap-1">
                    <StatusBadge status={a.status} />
                    <p className="text-xs text-muted-foreground">Seuil : {a.jobs?.score_threshold ?? '—'}</p>
                  </div>
                </div>

                {/* Justification */}
                {a.justification && (
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Synthèse</p>
                    <p className="text-sm text-foreground leading-relaxed">{a.justification}</p>
                  </div>
                )}

                {/* Points positifs */}
                {positives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Points positifs</p>
                    <ul className="space-y-1">
                      {positives.slice(0, 2).map((p, i) => (
                        <li key={i} className="text-sm text-green-800">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Points négatifs */}
                {negatives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Points négatifs</p>
                    <ul className="space-y-1">
                      {negatives.slice(0, 2).map((p, i) => (
                        <li key={i} className="text-sm text-red-700">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                  Déposé le {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
