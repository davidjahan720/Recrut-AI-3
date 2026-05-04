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
    id: 'decision-automatisee',
    title: 'Décision automatisée — droit à un examen humain (art. 22)',
    body: (
      <>
        <p>RecrutAI utilise un modèle d'intelligence artificielle (Mistral AI, France) pour pré-évaluer chaque CV par rapport à une fiche de poste et lui attribuer un score de correspondance. Ce score participe à la décision de qualification (qualifié / rejeté).</p>
        <p>Conformément à l'<strong>article 22.3 du RGPD</strong>, vous pouvez à tout moment :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>obtenir l'intervention d'un être humain</strong> pour réexaminer la décision automatisée prise sur votre candidature ;</li>
          <li><strong>exprimer votre point de vue</strong> et apporter des éléments contextuels (CV mal interprété, éléments absents pris en compte, etc.) ;</li>
          <li><strong>contester la décision</strong> et demander une révision motivée.</li>
        </ul>
        <p>Pour faire valoir ce droit, utilisez le formulaire dédié <a href="/contestation" className="underline underline-offset-2 font-medium">demander un examen humain</a>, ou écrivez à <a href="mailto:contact@recrutai.fr" className="underline underline-offset-2">contact@recrutai.fr</a>. Notre délégué à la protection des données vous répondra sous un mois maximum.</p>
        <p>À noter : un cabinet de recrutement utilisant RecrutAI procède toujours à une revue humaine avant de transmettre une candidature qualifiée à son client. Le score IA est une aide à la décision, pas une décision finale.</p>
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

const A11Y_SECTIONS: Section[] = [
  {
    id: 'engagement',
    title: 'Engagement',
    body: (
      <>
        <p>RecrutAI s'engage à rendre son service accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005, modifiée par la loi n° 2016-1321 du 7 octobre 2016 pour une République numérique.</p>
        <p>Cette déclaration s'applique à <a href="https://recrutai2-app.vercel.app" className="underline underline-offset-2">recrutai2-app.vercel.app</a>.</p>
      </>
    ),
  },
  {
    id: 'etat-conformite',
    title: 'État de conformité',
    body: (
      <>
        <p><strong>RecrutAI 2 est en conformité partielle avec le RGAA 4.1 niveau AA</strong>, en raison des non-conformités énumérées ci-dessous.</p>
        <p>À la date de la dernière vérification, aucune violation de niveau « serious » ou « critical » n'est détectée par les outils automatisés sur les pages publiques.</p>
      </>
    ),
  },
  {
    id: 'resultats-tests',
    title: 'Résultats des tests',
    body: (
      <>
        <p>L'audit a été conduit en interne et combine :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>analyse statique en intégration continue avec ESLint et le plugin <code>jsx-a11y</code> ;</li>
          <li>tests automatisés Playwright + axe-core sur les pages publiques (<code>/</code>, <code>/login</code>, <code>/legal</code>, <code>/privacy</code>) — couvre environ 30 % des critères RGAA ;</li>
          <li>audit manuel ponctuel via l'extension axe DevTools.</li>
        </ul>
        <p>Les pages internes nécessitant authentification (espaces recruteur, manager, candidatures, RGPD) feront l'objet d'un audit complémentaire au prochain trimestre.</p>
      </>
    ),
  },
  {
    id: 'non-conformites',
    title: 'Contenus non accessibles',
    body: (
      <>
        <p>Les non-conformités identifiées :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Le graphique « Performance — CA mensuel » sur le tableau de bord Manager fournit un tableau de données équivalent en lecture d'écran, mais n'a pas été testé exhaustivement avec NVDA / VoiceOver.</li>
          <li>Les composants tiers shadcn/ui (Dialog, Select) s'appuient sur Radix UI conforme WAI-ARIA, mais n'ont pas été audités pièce par pièce.</li>
          <li>Quelques contrastes secondaires (badges « En pause », « Clôturée ») sont légèrement en-dessous de 4.5:1 sur fond clair.</li>
          <li>L'accessibilité des pages internes authentifiées n'est pas encore couverte par les tests automatisés en CI.</li>
        </ul>
        <p>Aucune dérogation pour charge disproportionnée n'est appliquée à ce jour.</p>
      </>
    ),
  },
  {
    id: 'contenus-tiers',
    title: 'Contenus non soumis à l\'obligation',
    body: (
      <>
        <p>Les CVs téléversés par les recruteurs (PDFs / Word / images) sont des contenus tiers ; nous ne maîtrisons pas leur accessibilité native. Une description textuelle est cependant générée par l'IA pour permettre la lecture par les technologies d'assistance.</p>
      </>
    ),
  },
  {
    id: 'etablissement',
    title: 'Établissement de cette déclaration',
    body: (
      <>
        <p>Cette déclaration a été établie le 4 mai 2026.</p>
        <p>Technologies utilisées : HTML5 sémantique, WAI-ARIA 1.2, CSS3 (Tailwind), TypeScript / React 19.</p>
        <p>Outils d'évaluation : axe DevTools, <code>@axe-core/playwright</code>, ESLint plugin jsx-a11y.</p>
      </>
    ),
  },
  {
    id: 'retour-information',
    title: 'Retour d\'information et contact',
    body: (
      <>
        <p>Si vous n'arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter le responsable pour être orienté vers une alternative accessible : <a href="mailto:contact@recrutai.fr" className="underline underline-offset-2">contact@recrutai.fr</a>. Réponse sous 30 jours ouvrés.</p>
      </>
    ),
  },
  {
    id: 'recours',
    title: 'Voies de recours',
    body: (
      <>
        <p>En l'absence de réponse satisfaisante, vous pouvez :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Écrire au <a href="https://www.defenseurdesdroits.fr/nous-contacter" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Défenseur des droits</a> ;</li>
          <li>Contacter le délégué du Défenseur des droits dans votre région : <a href="https://www.defenseurdesdroits.fr/saisir/delegues" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">defenseurdesdroits.fr/saisir/delegues</a> ;</li>
          <li>Envoyer un courrier (gratuit, sans timbre) : Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07.</li>
        </ul>
      </>
    ),
  },
]

type PageMode = 'legal' | 'privacy' | 'accessibility'

export default function Legal() {
  const navigate = useNavigate()
  const path = useLocation().pathname
  const mode: PageMode = path.startsWith('/accessibilite') ? 'accessibility'
                       : path.startsWith('/privacy') ? 'privacy'
                       : 'legal'
  const sections = mode === 'accessibility' ? A11Y_SECTIONS
                 : mode === 'privacy' ? PRIVACY_SECTIONS
                 : LEGAL_SECTIONS
  const title = mode === 'accessibility' ? 'Déclaration d\'accessibilité'
              : mode === 'privacy' ? 'Politique de confidentialité'
              : 'Mentions légales'

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
            {mode !== 'legal' && (
              <button type="button" onClick={() => navigate('/legal')} className="text-slate-700 hover:text-slate-900 underline underline-offset-2">Mentions légales</button>
            )}
            {mode !== 'privacy' && (
              <button type="button" onClick={() => navigate('/privacy')} className="text-slate-700 hover:text-slate-900 underline underline-offset-2">Politique de confidentialité</button>
            )}
            {mode !== 'accessibility' && (
              <button type="button" onClick={() => navigate('/accessibilite')} className="text-slate-700 hover:text-slate-900 underline underline-offset-2">Accessibilité</button>
            )}
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
