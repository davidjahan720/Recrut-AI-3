import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Page publique permettant au candidat (ou son représentant) de demander
 * un examen humain de la décision automatisée prise sur sa candidature.
 *
 * Couvre :
 *  - RGPD art. 22.3 (droit d'obtenir l'intervention humaine).
 *  - AIPD T01, mesure R6 du document docs/explanation/aipd-scoring-cv.md.
 *
 * Accessibilité (RGAA AA) :
 *  - <main> ciblable, hiérarchie h1/h2.
 *  - <label htmlFor> sur chaque champ, aria-required, aria-invalid.
 *  - Erreurs en role="alert", succès en role="status".
 *  - Skip link, focus visible (style global).
 */

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export default function Contestation() {
  const navigate = useNavigate()
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [requesterEmail, setRequesterEmail] = useState('')
  const [motivation, setMotivation] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail(candidateEmail) || !isValidEmail(requesterEmail) || motivation.trim().length < 30) {
      setState({ kind: 'error', message: 'Tous les champs requis doivent être correctement renseignés.' })
      return
    }
    setState({ kind: 'submitting' })
    try {
      const r = await fetch('/api/rgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-review',
          candidate_email: candidateEmail.trim().toLowerCase(),
          candidate_name: candidateName.trim() || undefined,
          requester_email: requesterEmail.trim().toLowerCase(),
          motivation: motivation.trim(),
        }),
      })
      const json = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
      setState({ kind: 'success', message: json?.message ?? 'Votre demande a bien été enregistrée.' })
      setCandidateName('')
      setCandidateEmail('')
      setRequesterEmail('')
      setMotivation('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setState({ kind: 'error', message: `Erreur lors de l'envoi : ${msg}` })
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main-content" className="skip-link">Aller au contenu principal</a>

      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-900 hover:text-violet-700 transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span className="font-bold">RecrutAI</span>
          </button>
          <nav aria-label="Pages d'information" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <button type="button" onClick={() => navigate('/privacy')} className="text-slate-700 hover:text-slate-900 underline underline-offset-2">Politique de confidentialité</button>
            <button type="button" onClick={() => navigate('/accessibilite')} className="text-slate-700 hover:text-slate-900 underline underline-offset-2">Accessibilité</button>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-12 focus:outline-none">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Demander un examen humain</h1>
        <p className="text-slate-700 leading-relaxed mb-2">
          Conformément à l'article 22.3 du Règlement général sur la protection des données (RGPD),
          tout candidat dont la candidature a été évaluée automatiquement par un outil d'intelligence
          artificielle peut demander qu'un être humain réexamine la décision prise sur son dossier.
        </p>
        <p className="text-slate-700 leading-relaxed mb-8">
          Cette page vous permet de soumettre votre demande. Notre délégué à la protection des données
          vous répondra dans un délai d'<strong>un mois maximum</strong> à compter de la réception de
          votre demande (RGPD art. 12.3).
        </p>

        <section aria-labelledby="form-heading" className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 id="form-heading" className="text-xl font-semibold text-slate-900 mb-4">Votre demande</h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="contestation-candidate-name" className="block text-sm font-medium text-slate-900 mb-1">
                Nom du candidat <span className="text-slate-600 font-normal">(optionnel)</span>
              </label>
              <input
                id="contestation-candidate-name"
                type="text"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                autoComplete="name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-600 focus:outline-none"
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="contestation-candidate-email" className="block text-sm font-medium text-slate-900 mb-1">
                Email du candidat <span className="text-red-700">*</span>
              </label>
              <input
                id="contestation-candidate-email"
                type="email"
                inputMode="email"
                value={candidateEmail}
                onChange={e => setCandidateEmail(e.target.value)}
                required
                aria-required="true"
                autoComplete="email"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-600 focus:outline-none"
                placeholder="prenom.nom@email.com"
              />
              <p className="text-xs text-slate-700 mt-1">L'email utilisé pour candidater (sert à identifier votre dossier).</p>
            </div>

            <div>
              <label htmlFor="contestation-requester-email" className="block text-sm font-medium text-slate-900 mb-1">
                Votre email <span className="text-red-700">*</span>
              </label>
              <input
                id="contestation-requester-email"
                type="email"
                inputMode="email"
                value={requesterEmail}
                onChange={e => setRequesterEmail(e.target.value)}
                required
                aria-required="true"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-600 focus:outline-none"
                placeholder="contact@email.com"
              />
              <p className="text-xs text-slate-700 mt-1">Adresse à laquelle nous vous répondrons. Peut être identique à celle du candidat·e si vous faites la demande pour vous-même.</p>
            </div>

            <div>
              <label htmlFor="contestation-motivation" className="block text-sm font-medium text-slate-900 mb-1">
                Motif de votre demande <span className="text-red-700">*</span>
              </label>
              <textarea
                id="contestation-motivation"
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                required
                aria-required="true"
                rows={6}
                minLength={30}
                maxLength={4000}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-600 focus:outline-none"
                placeholder="Expliquez pourquoi vous souhaitez un nouvel examen : éléments du CV non pris en compte, contexte particulier, désaccord avec la justification, etc."
              />
              <p className="text-xs text-slate-700 mt-1">{motivation.length} / 4000 caractères (minimum 30).</p>
            </div>

            {state.kind === 'error' && (
              <p role="alert" className="px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                {state.message}
              </p>
            )}
            {state.kind === 'success' && (
              <p role="status" aria-live="polite" className="px-4 py-2 bg-green-50 border border-green-200 text-green-900 rounded-md text-sm">
                {state.message}
              </p>
            )}

            <button
              type="submit"
              disabled={state.kind === 'submitting' || state.kind === 'success'}
              aria-busy={state.kind === 'submitting'}
              className="w-full sm:w-auto px-6 py-3 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-violet-600 focus:outline-none"
            >
              {state.kind === 'submitting' ? 'Envoi en cours…' : 'Envoyer la demande'}
            </button>
          </form>
        </section>

        <section className="mt-10 text-sm text-slate-700 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Que se passe-t-il après l'envoi ?</h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Notre délégué à la protection des données reçoit votre demande.</li>
            <li>Vérification de votre identité (par l'email renseigné) sous quelques jours.</li>
            <li>Réexamen humain de votre candidature à la lumière des éléments transmis.</li>
            <li>Réponse motivée sous <strong>un mois maximum</strong>, par email.</li>
            <li>En cas de désaccord persistant, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-violet-700">CNIL</a>.</li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-sm text-slate-700 text-center">
          © {new Date().getFullYear()} RecrutAI · <a href="/privacy" className="underline underline-offset-2">Politique de confidentialité</a>
        </div>
      </footer>
    </div>
  )
}
