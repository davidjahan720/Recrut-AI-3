import { useNavigate, useLocation } from 'react-router-dom'

type Section = { id: string; title: string; body: React.ReactNode }

const LEGAL_SECTIONS: Section[] = [
  {
    id: 'editeur',
    title: 'Éditeur du site',
    body: (
      <>
        <p>RecrutAI — application de qualification de candidatures assistée par IA.</p>
        <p>Responsable de la publication : David Jahan.</p>
        <p>Contact : <a href="mailto:contact@recrutai.fr" className="underline underline-offset-2">contact@recrutai.fr</a>.</p>
      </>
    ),
  },
  {
    id: 'hebergement',
    title: 'Hébergement',
    body: (
      <>
        <p>Application hébergée par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</p>
        <p>Base de données et stockage hébergés par Supabase Inc., region UE.</p>
      </>
    ),
  },
  {
    id: 'propriete',
    title: 'Propriété intellectuelle',
    body: <p>L'ensemble des contenus (textes, logos, interfaces) est la propriété de RecrutAI, sauf mention contraire. Toute reproduction ou diffusion non autorisée est interdite.</p>,
  },
]

const PRIVACY_SECTIONS: Section[] = [
  {
    id: 'responsable',
    title: 'Responsable du traitement',
    body: <p>RecrutAI est responsable du traitement des données personnelles collectées via la plateforme. Pour toute demande, écrivez à <a href="mailto:contact@recrutai.fr" className="underline underline-offset-2">contact@recrutai.fr</a>.</p>,
  },
  {
    id: 'donnees-collectees',
    title: 'Données collectées',
    body: (
      <>
        <p>Nous collectons et traitons les données suivantes :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Données d'identification des candidats issues des CV transmis : nom, prénom, email, parcours professionnel, compétences.</li>
          <li>Données des clients et contacts : raison sociale, nom, prénom, email professionnel, secteur.</li>
          <li>Données de connexion des utilisateurs internes : email, identifiant de session, journaux techniques.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'finalites',
    title: 'Finalités et bases légales',
    body: (
      <>
        <p>Les données sont traitées pour :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Analyser les CV et établir un score de correspondance avec une offre — base légale : intérêt légitime du cabinet de recrutement à exécuter sa mission.</li>
          <li>Notifier le client final lorsqu'un profil dépasse le seuil de qualification — base légale : exécution du contrat de prestation.</li>
          <li>Assurer la sécurité de la plateforme et tracer les accès — base légale : intérêt légitime à sécuriser le service.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'conservation',
    title: 'Durée de conservation',
    body: (
      <>
        <p>Les CV et données candidats sont conservés <strong>2 ans</strong> à compter du dernier contact, conformément aux préconisations de la CNIL pour les processus de recrutement.</p>
        <p>Les données clients sont conservées pendant la durée de la relation contractuelle et jusqu'à 5 ans après la fin de celle-ci pour respecter les obligations comptables.</p>
        <p>Les journaux techniques sont conservés 12 mois maximum.</p>
      </>
    ),
  },
  {
    id: 'destinataires',
    title: 'Destinataires et sous-traitants',
    body: (
      <>
        <p>Les données sont accessibles :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Aux utilisateurs internes habilités du cabinet (chargés de recrutement, managers).</li>
          <li>Au client final, uniquement pour les profils qualifiés associés à son offre, via l'adresse de notification renseignée dans sa fiche.</li>
        </ul>
        <p>Sous-traitants techniques (art. 28 RGPD) :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Supabase</strong> — base de données et stockage des CV, hébergement région UE (Ireland — eu-west-1).</li>
          <li><strong>Mistral AI</strong> — analyse et OCR des CV, société française, hébergement Union européenne.</li>
          <li><strong>Vercel</strong> — hébergement de l'application web et des fonctions serverless, région UE.</li>
          <li><strong>Resend</strong> — envoi des notifications email aux clients, traitements UE/US sous DPF.</li>
        </ul>
        <p>Aucun transfert vers un pays hors UE n'est effectué sans garanties contractuelles appropriées (Data Privacy Framework ou clauses contractuelles types signées).</p>
      </>
    ),
  },
  {
    id: 'droits',
    title: 'Vos droits',
    body: (
      <>
        <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données.</p>
        <p>Pour exercer ces droits, contactez-nous à <a href="mailto:contact@recrutai.fr" className="underline underline-offset-2">contact@recrutai.fr</a>.</p>
        <p>Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CNIL</a>.</p>
      </>
    ),
  },
  {
    id: 'securite',
    title: 'Sécurité',
    body: (
      <>
        <p>Les données sont stockées dans des buckets privés Supabase, accessibles via JWT signés. Les mots de passe ne sont jamais stockés en clair.</p>
        <p>Les communications sont chiffrées en TLS 1.2 ou supérieur.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies et stockage local',
    body: (
      <>
        <p>RecrutAI n'utilise pas de cookies de mesure d'audience ni de cookies publicitaires.</p>
        <p>Le stockage local du navigateur (<code>localStorage</code>) est utilisé uniquement pour les préférences techniques (thème clair/sombre, état réduit de la barre latérale, session utilisateur). Aucune donnée personnelle de candidat n'y est conservée.</p>
      </>
    ),
  },
]

export default function Legal() {
  const navigate = useNavigate()
  const isPrivacy = useLocation().pathname.startsWith('/privacy')
  const sections = isPrivacy ? PRIVACY_SECTIONS : LEGAL_SECTIONS
  const title = isPrivacy ? 'Politique de confidentialité' : 'Mentions légales'

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
          <nav aria-label="Pages d'information">
            <button
              type="button"
              onClick={() => navigate(isPrivacy ? '/legal' : '/privacy')}
              className="text-sm text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              {isPrivacy ? 'Mentions légales' : 'Politique de confidentialité'}
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-12 focus:outline-none">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 text-sm mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <nav aria-label="Sommaire" className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-10">
          <p className="text-sm font-semibold text-slate-900 mb-2">Sommaire</p>
          <ol className="list-decimal pl-6 space-y-1 text-sm text-slate-700">
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-violet-700 underline-offset-2 hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map(s => (
            <section key={s.id} aria-labelledby={`${s.id}-h`} id={s.id} className="scroll-mt-20">
              <h2 id={`${s.id}-h`} className="text-xl font-semibold text-slate-900 mb-3">{s.title}</h2>
              <div className="text-slate-700 leading-relaxed space-y-2 text-base">{s.body}</div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-sm text-slate-600 text-center">
          © {new Date().getFullYear()} RecrutAI
        </div>
      </footer>
    </div>
  )
}
