import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Page interne de gestion des droits RGPD candidats.
 * Permet aux utilisateurs internes (recruteurs / admin) de :
 *  - exporter (art. 15 + 20)
 *  - rectifier (art. 16)
 *  - effacer (art. 17)
 *
 * Accessibilité : formulaires labellés, erreurs annoncées (role=alert),
 * actions critiques avec confirmation explicite.
 *
 * Sécurité : transmet l'identité de l'acteur (recruiter_session ou email
 * admin Supabase) via le header X-Actor pour journalisation côté serveur.
 */

type Mode = 'idle' | 'searching' | 'found' | 'error'

interface Application {
  id: string
  created_at: string
  candidate_name: string | null
  candidate_email: string | null
  score: number | null
  status: string
  jobs?: { title: string; clients?: { name: string } } | null
}

async function getActorHeader(): Promise<string> {
  const recruiter = localStorage.getItem('recruiter_session')
  if (recruiter) return recruiter
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? 'unknown'
}

export default function Rgpd() {
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [error, setError] = useState('')
  const [applications, setApplications] = useState<Application[]>([])

  const [rectifyName, setRectifyName] = useState('')
  const [rectifyEmail, setRectifyEmail] = useState('')
  const [busy, setBusy] = useState<'export' | 'erase' | 'rectify' | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatusMsg('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setMode('searching')

    const { data, error: dbErr } = await supabase
      .from('applications')
      .select('id, created_at, candidate_name, candidate_email, score, status, jobs(title, clients(name))')
      .ilike('candidate_email', trimmed)
      .order('created_at', { ascending: false })

    if (dbErr) {
      setError('Erreur lors de la recherche.')
      setMode('error')
      return
    }
    setApplications((data ?? []) as unknown as Application[])
    setMode('found')
  }

  async function callApi(action: 'export' | 'erase' | 'rectify', body: Record<string, unknown>): Promise<Response> {
    const actor = await getActorHeader()
    return fetch('/api/rgpd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Actor': actor },
      body: JSON.stringify({ action, ...body }),
    })
  }

  async function doExport() {
    setBusy('export')
    setError('')
    setStatusMsg('')
    try {
      const r = await callApi('export', { candidate_email: email.trim().toLowerCase() })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rgpd-export-${email.trim().toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatusMsg(`Export généré (${json.applications_count} candidatures).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export')
    } finally {
      setBusy(null)
    }
  }

  async function doErase() {
    if (!confirm(
      `Êtes-vous certain·e de vouloir effacer définitivement TOUTES les données du candidat ${email.trim().toLowerCase()} ?\n\n`
      + 'Cette action est irréversible et conforme au droit à l\'oubli (RGPD art. 17).',
    )) return
    setBusy('erase')
    setError('')
    setStatusMsg('')
    try {
      const r = await callApi('erase', { candidate_email: email.trim().toLowerCase(), confirm: true })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
      setStatusMsg(`Effacement terminé : ${json.deleted_applications} candidature(s), ${json.deleted_cvs} CV.`)
      setApplications([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur effacement')
    } finally {
      setBusy(null)
    }
  }

  async function doRectify(e: React.FormEvent) {
    e.preventDefault()
    if (!rectifyName.trim() && !rectifyEmail.trim()) {
      setError('Renseignez au moins un nouveau nom ou email.')
      return
    }
    setBusy('rectify')
    setError('')
    setStatusMsg('')
    try {
      const r = await callApi('rectify', {
        target_email: email.trim().toLowerCase(),
        new_candidate_name: rectifyName.trim() || undefined,
        new_candidate_email: rectifyEmail.trim().toLowerCase() || undefined,
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
      setStatusMsg(`Rectification appliquée à ${json.updated_applications} candidature(s).`)
      setRectifyName('')
      setRectifyEmail('')
      // Re-déclenche la recherche si l'email a changé
      if (rectifyEmail.trim()) setEmail(rectifyEmail.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur rectification')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="p-4 md:p-8 max-w-3xl" aria-labelledby="rgpd-heading">
      <header className="mb-6">
        <h1 id="rgpd-heading" className="text-2xl font-semibold text-foreground">Droits RGPD candidats</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Permet d'exercer les droits d'accès, de rectification et d'effacement (art. 15 à 17 du RGPD)
          pour tout candidat dont l'email est connu en base.
        </p>
      </header>

      <form onSubmit={search} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3" aria-label="Recherche d'un candidat par email">
        <div className="space-y-1.5">
          <Label htmlFor="rgpd-email" className="text-base font-medium">Email du candidat</Label>
          <Input
            id="rgpd-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="prenom.nom@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <Button type="submit" disabled={mode === 'searching' || !email.trim()}>
          {mode === 'searching' ? 'Recherche…' : 'Rechercher'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          {error}
        </p>
      )}

      {statusMsg && (
        <p role="status" aria-live="polite" className="mb-4 px-4 py-2 bg-green-50 border border-green-200 text-green-900 rounded-md text-sm">
          {statusMsg}
        </p>
      )}

      {mode === 'found' && applications.length === 0 && (
        <p className="text-muted-foreground text-sm mb-6">Aucune candidature trouvée pour cet email.</p>
      )}

      {mode === 'found' && applications.length > 0 && (
        <>
          <section aria-labelledby="results-heading" className="mb-8">
            <h2 id="results-heading" className="text-lg font-semibold text-foreground mb-3">
              {applications.length} candidature{applications.length > 1 ? 's' : ''} trouvée{applications.length > 1 ? 's' : ''}
            </h2>
            <ul className="bg-card border border-border rounded-lg divide-y divide-border list-none p-0">
              {applications.map(a => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{a.candidate_name ?? <span className="italic text-muted-foreground">Nom inconnu</span>}</p>
                  <p className="text-muted-foreground">
                    {a.jobs?.title ?? '—'}
                    {a.jobs?.clients?.name ? ` · ${a.jobs.clients.name}` : ''}
                    {' · '}
                    {new Date(a.created_at).toLocaleDateString('fr-FR')}
                    {' · '}
                    Score {a.score ?? '—'} · {a.status}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="actions-heading" className="space-y-6">
            <h2 id="actions-heading" className="text-lg font-semibold text-foreground">Actions disponibles</h2>

            {/* Export — art. 15 + 20 */}
            <article className="bg-card border border-border rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-foreground">Exporter les données <span className="text-xs font-normal text-muted-foreground">(art. 15 et 20)</span></h3>
              <p className="text-sm text-muted-foreground">
                Génère un fichier JSON portable avec toutes les candidatures, analyses IA et liens de
                téléchargement temporaires (1 h) vers les CVs.
              </p>
              <Button onClick={doExport} disabled={busy !== null} aria-busy={busy === 'export'}>
                {busy === 'export' ? 'Export en cours…' : 'Télécharger l\'export JSON'}
              </Button>
            </article>

            {/* Rectification — art. 16 */}
            <article className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground">Rectifier les données <span className="text-xs font-normal text-muted-foreground">(art. 16)</span></h3>
              <p className="text-sm text-muted-foreground">
                Corrige le nom et/ou l'email pour toutes les candidatures de ce candidat.
              </p>
              <form onSubmit={doRectify} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="rectify-name" className="text-sm">Nouveau nom (optionnel)</Label>
                  <Input id="rectify-name" type="text" value={rectifyName} onChange={e => setRectifyName(e.target.value)} placeholder="Prénom Nom corrigé" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rectify-email" className="text-sm">Nouvel email (optionnel)</Label>
                  <Input id="rectify-email" type="email" value={rectifyEmail} onChange={e => setRectifyEmail(e.target.value)} placeholder="nouvel.email@exemple.com" autoComplete="off" />
                </div>
                <Button type="submit" variant="outline" disabled={busy !== null} aria-busy={busy === 'rectify'}>
                  {busy === 'rectify' ? 'Rectification en cours…' : 'Appliquer la rectification'}
                </Button>
              </form>
            </article>

            {/* Effacement — art. 17 */}
            <article className="bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-900 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-red-900 dark:text-red-200">Effacer définitivement <span className="text-xs font-normal text-red-800 dark:text-red-300">(art. 17 — droit à l'oubli)</span></h3>
              <p className="text-sm text-red-900 dark:text-red-200">
                Supprime <strong>irréversiblement</strong> toutes les candidatures et fichiers CV
                de ce candidat. Une confirmation vous sera demandée.
              </p>
              <Button variant="destructive" onClick={doErase} disabled={busy !== null} aria-busy={busy === 'erase'}>
                {busy === 'erase' ? 'Effacement en cours…' : 'Effacer toutes les données'}
              </Button>
            </article>
          </section>
        </>
      )}
    </section>
  )
}
