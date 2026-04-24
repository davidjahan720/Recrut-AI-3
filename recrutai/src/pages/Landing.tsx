import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const FEATURES = [
  {
    icon: '🤖',
    title: 'Analyse IA instantanée',
    desc: "Chaque CV est lu et analysé par Claude AI en moins de 3 secondes. Extraction automatique du nom, email, compétences et expériences.",
  },
  {
    icon: '🎯',
    title: 'Score de correspondance',
    desc: "Un score sur 100 est attribué à chaque candidat selon la description de votre poste. Vous fixez le seuil de qualification.",
  },
  {
    icon: '✅',
    title: 'Qualification automatique',
    desc: 'Les CV au-dessus du seuil sont marqués "Qualifiés", les autres "Rejetés". Zéro subjectivité, 100 % de cohérence.',
  },
  {
    icon: '📋',
    title: 'Rapport structuré',
    desc: "Pour chaque CV : synthèse narrative, liste de points forts et points faibles. Tout ce qu'il faut pour prendre la bonne décision.",
  },
  {
    icon: '📧',
    title: 'Alertes email automatiques',
    desc: "Dès qu'un profil qualifié arrive, le client reçoit un email complet avec le rapport IA.",
  },
  {
    icon: '📊',
    title: 'Dashboard en temps réel',
    desc: "Visualisez les KPIs, les CV reçus par jour, le taux de qualification par offre et les statuts en un coup d'œil.",
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Créez votre offre',
    desc: 'Renseignez le titre du poste, la description, le type de contrat et le seuil de score souhaité.',
  },
  {
    n: '02',
    title: 'Déposez les CV',
    desc: 'Glissez-déposez les CV PDF ou Word. Plusieurs fichiers simultanément, analysés en quelques secondes.',
  },
  {
    n: '03',
    title: 'Recevez les résultats',
    desc: 'Score, justification, points positifs et négatifs. Les profils qualifiés sont notifiés au client après validation manuelle.',
  },
]

const FAQS = [
  {
    q: 'Quels formats de CV sont acceptés ?',
    a: 'RecrutAI accepte les fichiers PDF, Word (.docx, .doc), images (.png, .jpg, .jpeg, .webp) et HTML (.html, .htm). Vous pouvez déposer plusieurs fichiers en une seule fois.',
  },
  {
    q: 'Comment est calculé le score ?',
    a: "Claude AI compare chaque CV à la description du poste et attribue un score sur 100 basé sur les compétences, l'expérience et l'adéquation globale du profil.",
  },
  {
    q: 'Puis-je gérer plusieurs clients et plusieurs offres ?',
    a: "Oui. RecrutAI est conçu pour les cabinets de recrutement : chaque client a ses propres offres, et chaque offre a son propre seuil de qualification.",
  },
  {
    q: 'Les données des candidats sont-elles sécurisées ?',
    a: 'Les CV sont stockés dans un bucket privé Supabase avec accès sécurisé par JWT. Seuls les utilisateurs authentifiés peuvent y accéder.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden text-base">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">R</span>
            </div>
            <span className="font-bold text-slate-900 text-xl">RecrutAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-base text-slate-700 hover:text-slate-900 font-medium transition-colors px-3 py-1.5"
            >
              Accéder à l'app
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 animate-gradient">
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-4 py-2 text-base text-white mb-8 font-medium">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            Propulsé par Claude AI (Anthropic)
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Recrutez les meilleurs profils,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-blue-300">
              10× plus vite
            </span>
          </h1>

          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            RecrutAI analyse automatiquement chaque CV par rapport à vos offres, attribue un score de correspondance
            et vous livre un rapport IA complet en quelques secondes.
          </p>

          {/* Stats flottantes */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { v: '< 3s', l: 'Analyse par CV' },
              { v: '−80%', l: 'Temps de tri' },
              { v: '97%', l: 'Précision IA' },
              { v: '∞', l: 'CV simultanés' },
            ].map(s => (
              <div key={s.l} className="bg-white/15 border border-white/25 backdrop-blur rounded-xl p-5 animate-float">
                <p className="text-3xl font-bold text-white">{s.v}</p>
                <p className="text-sm text-white/90 mt-1 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-base font-bold text-violet-600 uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-700 text-lg mt-3 max-w-xl mx-auto leading-relaxed">
              Une plateforme complète pour automatiser le tri des CV et accélérer vos processus de recrutement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-3xl mb-5">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-base text-slate-700 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-base font-bold text-violet-600 uppercase tracking-widest mb-3">Processus</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">3 étapes, c'est tout</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-9 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-violet-200 via-indigo-200 to-blue-200" />
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative text-center">
                <div className={`w-18 h-18 w-[72px] h-[72px] mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-5 bg-gradient-to-br ${
                  i === 0 ? 'from-violet-700 to-violet-900' :
                  i === 1 ? 'from-indigo-700 to-indigo-900' :
                  'from-blue-700 to-blue-900'
                }`}>
                  {step.n}
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">{step.title}</h3>
                <p className="text-base text-slate-700 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-base font-bold text-violet-600 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-slate-900">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-6 py-5 flex items-center justify-between font-semibold text-slate-900 text-base hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  <span className={`ml-4 text-violet-600 font-bold text-xl transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-base text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 animate-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à transformer votre recrutement ?
          </h2>
          <p className="text-white/90 text-lg mb-8 leading-relaxed font-medium">
            Accédez à la plateforme RecrutAI et commencez à analyser vos CV en quelques minutes.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-500 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <span className="text-white font-bold text-base">RecrutAI</span>
          </div>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} RecrutAI — Propulsé par Claude AI (Anthropic)</p>
          <button onClick={() => navigate('/login')} className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Accéder à l'app →
          </button>
        </div>
      </footer>
    </div>
  )
}
