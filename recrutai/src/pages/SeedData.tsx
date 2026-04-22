import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type CandidateSeed = {
  name: string; email: string; score: number
  status: 'qualified' | 'pending_approval' | 'rejected'
  justification: string; positivePoints: string[]; negativePoints: string[]
}
type JobSeed = {
  title: string; location: string; contract_type: string
  description: string; score_threshold: number; honoraires: number
  candidates: CandidateSeed[]
}
type ClientSeed = {
  name: string; contactName: string; contactEmail: string; sector: string
  jobs: JobSeed[]
}

const SEED: ClientSeed[] = [
  // ── SOPHIE ──────────────────────────────────────────────────────────────
  {
    name: 'Nexeo', contactName: 'Marie Leblanc', contactEmail: 'marie.leblanc@nexeo.fr', sector: 'Conseil',
    jobs: [{
      title: 'Responsable Grands Comptes', location: 'Paris (75)', contract_type: 'CDI',
      score_threshold: 65, honoraires: 10500,
      description: 'Nous recherchons un Responsable Grands Comptes expérimenté pour développer et fidéliser un portefeuille de clients stratégiques dans le secteur du conseil.',
      candidates: [
        { name: 'MARTIN Sophie', email: 's.martin@mail.fr', score: 84, status: 'qualified',
          justification: 'Profil senior avec 8 ans d\'expérience en gestion de comptes stratégiques. Maîtrise des cycles de vente complexes et excellente culture client.',
          positivePoints: ['8 ans en gestion grands comptes', 'Maîtrise des cycles de vente B2B', 'Très bonnes compétences relationnelles'],
          negativePoints: ['Secteur conseil peu représenté dans son parcours'] },
        { name: 'BERNARD Julien', email: 'j.bernard@mail.fr', score: 71, status: 'pending_approval',
          justification: 'Candidat avec un bon potentiel commercial. Expérience de 5 ans en développement commercial, mais secteur conseil à confirmer.',
          positivePoints: ['Fort potentiel commercial', 'Bonne énergie et motivation', '5 ans d\'expérience'],
          negativePoints: ['Peu d\'expérience spécifique en conseil', 'Taille des comptes gérés inférieure'] },
        { name: 'ROUSSEAU Claire', email: 'c.rousseau@mail.fr', score: 52, status: 'rejected',
          justification: 'Profil junior ne correspondant pas aux critères seniors requis. Expérience insuffisante pour gérer des comptes stratégiques.',
          positivePoints: ['Bonne maîtrise des outils CRM'],
          negativePoints: ['Seulement 2 ans d\'expérience', 'Pas de gestion de comptes > 100k€', 'Secteur inadapté'] },
        { name: 'DUPONT Marc', email: 'm.dupont@mail.fr', score: 39, status: 'rejected',
          justification: 'Reconversion professionnelle récente sans expérience commerciale B2B significative.',
          positivePoints: ['Très motivé', 'Formation récente en vente'],
          negativePoints: ['Pas d\'expérience grands comptes', 'Reconversion sans track record', 'Secteur inconnu'] },
      ],
    }],
  },
  {
    name: 'BTP Pro', contactName: 'Jean-Pierre Moreau', contactEmail: 'jp.moreau@btppro.fr', sector: 'BTP',
    jobs: [{
      title: 'Conducteur de Travaux TCE', location: 'Lyon (69)', contract_type: 'CDI',
      score_threshold: 60, honoraires: 8500,
      description: 'BTP Pro recrute un Conducteur de Travaux Tous Corps d\'État pour piloter des chantiers de construction et rénovation en région lyonnaise.',
      candidates: [
        { name: 'LAMBERT Pierre', email: 'p.lambert@mail.fr', score: 78, status: 'qualified',
          justification: 'Conducteur de travaux expérimenté avec 10 ans sur chantiers TCE. Références solides sur projets de 2-5M€.',
          positivePoints: ['10 ans d\'expérience TCE', 'Gestion de chantiers jusqu\'à 5M€', 'Solide réseau sous-traitants'],
          negativePoints: ['Mobilité géographique limitée à Lyon'] },
        { name: 'PETIT Arnaud', email: 'a.petit@mail.fr', score: 67, status: 'pending_approval',
          justification: 'Bon profil technique avec expérience variée en gros œuvre et second œuvre. Peut progresser rapidement.',
          positivePoints: ['Bonne maîtrise technique', 'Expérience gros œuvre et second œuvre', 'Permis B + véhicule'],
          negativePoints: ['Chantiers gérés de taille modeste', 'Management équipe à renforcer'] },
        { name: 'GIRARD Nicolas', email: 'n.girard@mail.fr', score: 44, status: 'rejected',
          justification: 'Profil trop orienté bureau d\'études sans expérience terrain suffisante pour ce poste.',
          positivePoints: ['Solides connaissances techniques', 'Maîtrise AutoCAD'],
          negativePoints: ['Peu d\'expérience terrain', 'Pas de gestion de chantier autonome', 'Ne maîtrise pas le TCE'] },
        { name: 'THOMAS Laura', email: 'l.thomas@mail.fr', score: 55, status: 'rejected',
          justification: 'Expérience en rénovation mais insuffisante pour des chantiers neufs d\'envergure.',
          positivePoints: ['Expérience rénovation', 'Bonne organisation'],
          negativePoints: ['Pas d\'expérience neuf', 'Chantiers trop petits < 500k€', 'Management limité'] },
      ],
    }],
  },
  {
    name: 'Inovev', contactName: 'Stéphanie Renard', contactEmail: 's.renard@inovev.fr', sector: 'Industrie',
    jobs: [{
      title: 'Ingénieur R&D Mécanique', location: 'Grenoble (38)', contract_type: 'CDI',
      score_threshold: 70, honoraires: 11200,
      description: 'Inovev, acteur innovant de la mécanique de précision, recherche un Ingénieur R&D pour concevoir et développer de nouvelles solutions mécaniques.',
      candidates: [
        { name: 'SIMON Antoine', email: 'a.simon@mail.fr', score: 88, status: 'qualified',
          justification: 'Ingénieur mécanique de haut niveau avec expertise en CAO et simulation numérique. Plusieurs brevets déposés, profil R&D idéal.',
          positivePoints: ['Expert CAO/SolidWorks', '3 brevets déposés', 'Expérience en mécanique de précision', 'Anglais courant'],
          negativePoints: ['Prétentions salariales élevées'] },
        { name: 'MICHEL Elise', email: 'e.michel@mail.fr', score: 73, status: 'pending_approval',
          justification: 'Ingénieure compétente avec une bonne base en conception mécanique. Manque d\'expérience en R&D pure mais forte capacité d\'apprentissage.',
          positivePoints: ['Bonne maîtrise des outils de simulation', 'Profil analytique', 'Docteure en mécanique'],
          negativePoints: ['Peu d\'expérience industrielle', 'Pas de brevet', 'Secteur de précision à découvrir'] },
        { name: 'GARCIA Paul', email: 'p.garcia@mail.fr', score: 58, status: 'rejected',
          justification: 'Profil généraliste sans spécialisation R&D. Expérience principalement en maintenance, pas en conception.',
          positivePoints: ['Bonne connaissance des procédés industriels'],
          negativePoints: ['Pas de formation R&D', 'Peu de conception', 'Anglais technique insuffisant'] },
        { name: 'ROBERT Camille', email: 'c.robert@mail.fr', score: 42, status: 'rejected',
          justification: 'Débutant ne disposant pas de l\'expérience nécessaire pour un poste senior en R&D.',
          positivePoints: ['Diplôme d\'ingénieur récent', 'Enthousiaste'],
          negativePoints: ['0 an d\'expérience en industrie', 'Pas de maîtrise CAO avancée', 'Pas de projet R&D'] },
      ],
    }],
  },

  // ── KARIM ───────────────────────────────────────────────────────────────
  {
    name: 'Solvay', contactName: 'Frédéric Blanc', contactEmail: 'f.blanc@solvay.fr', sector: 'Chimie',
    jobs: [{
      title: 'Ingénieur Process Chimie', location: 'Rouen (76)', contract_type: 'CDI',
      score_threshold: 68, honoraires: 12000,
      description: 'Solvay, leader mondial de la chimie, recherche un Ingénieur Process pour optimiser et fiabiliser ses procédés de production chimique.',
      candidates: [
        { name: 'HENRY Maxime', email: 'm.henry@mail.fr', score: 81, status: 'qualified',
          justification: 'Ingénieur chimiste avec 7 ans d\'expérience en procédés chimiques. Expertise en optimisation de réacteurs et sécurité industrielle.',
          positivePoints: ['7 ans d\'expérience process chimie', 'Expert en réacteurs chimiques', 'Formation HSE solide', 'Anglais professionnel'],
          negativePoints: ['Secteur pétrochimique, transition chimie fine à valider'] },
        { name: 'LEROY Julie', email: 'j.leroy@mail.fr', score: 72, status: 'pending_approval',
          justification: 'Ingénieure chimiste avec bonne formation et stages significatifs. Profil junior prometteur avec potentiel de développement.',
          positivePoints: ['Formation Chimie ParisTech', 'Stage en procédés industriels', 'Très bons résultats académiques'],
          negativePoints: ['Seulement 3 ans d\'expérience', 'Pas de gestion de projets d\'ampleur'] },
        { name: 'DAVID Thomas', email: 't.david@mail.fr', score: 54, status: 'rejected',
          justification: 'Profil laboratoire sans expérience en procédés industriels. Ne correspond pas aux attentes terrain du poste.',
          positivePoints: ['Solides bases théoriques en chimie', 'Publications scientifiques'],
          negativePoints: ['Profil chercheur, pas industriel', 'Pas d\'expérience en production', 'Sécurité industrielle absente'] },
        { name: 'MARTINEZ Sandra', email: 's.martinez@mail.fr', score: 61, status: 'rejected',
          justification: 'Expérience en contrôle qualité mais insuffisante pour piloter des process de production complexes.',
          positivePoints: ['Connaissance des normes qualité', 'Rigueur et méthode'],
          negativePoints: ['Pas de pilotage process', 'Niveau d\'expérience insuffisant', 'Pas de gestion d\'équipe'] },
      ],
    }],
  },
  {
    name: 'Altair RH', contactName: 'Valérie Fontaine', contactEmail: 'v.fontaine@altairrh.fr', sector: 'RH',
    jobs: [{
      title: 'Consultant en Recrutement', location: 'Bordeaux (33)', contract_type: 'CDI',
      score_threshold: 62, honoraires: 7800,
      description: 'Altair RH recrute un Consultant en Recrutement pour développer son activité de chasse de têtes dans les secteurs ingénierie et industrie.',
      candidates: [
        { name: 'BERNARD Lucie', email: 'l.bernard@mail.fr', score: 79, status: 'qualified',
          justification: 'Consultante RH senior avec 6 ans en cabinet de recrutement. Expertise sur profils ingénierie et industrie, excellent réseau.',
          positivePoints: ['6 ans en cabinet recrutement', 'Spécialisation ingénierie/industrie', 'Excellent réseau candidats', 'KPIs au-dessus de la moyenne'],
          negativePoints: ['Souhaite une évolution managériale à terme'] },
        { name: 'RICHARD Kevin', email: 'k.richard@mail.fr', score: 65, status: 'pending_approval',
          justification: 'Consultant avec bonne maîtrise du sourcing digital. Chiffre d\'affaires en progression mais portefeuille à consolider.',
          positivePoints: ['Maîtrise LinkedIn Recruiter', 'Bonne capacité de closing', 'CA en progression'],
          negativePoints: ['Spécialisation sectorielle limitée', 'Réseau à développer sur l\'industrie'] },
        { name: 'MOREL Emma', email: 'e.morel@mail.fr', score: 48, status: 'rejected',
          justification: 'Profil RH généraliste sans expérience en cabinet de recrutement. Méconnaissance du recrutement à 360°.',
          positivePoints: ['Bonne connaissance du droit du travail', 'Formation RH solide'],
          negativePoints: ['Pas d\'expérience en cabinet', 'Pas de chasse de têtes', 'Secteur ingénierie non maîtrisé'] },
        { name: 'SIMON Tristan', email: 't.simon@mail.fr', score: 36, status: 'rejected',
          justification: 'Reconversion depuis la vente. Peu de compétences RH démontrées malgré une forte motivation.',
          positivePoints: ['Bon sens commercial', 'Grande motivation'],
          negativePoints: ['Pas de background RH', 'Pas de connaissance des métiers techniques', 'Pas de réseau candidats'] },
      ],
    }],
  },

  // ── ALIX ────────────────────────────────────────────────────────────────
  {
    name: 'Terralys', contactName: 'Pierre Deschamps', contactEmail: 'p.deschamps@terralys.fr', sector: 'Agriculture',
    jobs: [{
      title: 'Ingénieur Agronome', location: 'Orléans (45)', contract_type: 'CDI',
      score_threshold: 65, honoraires: 9200,
      description: 'Terralys, coopérative agricole innovante, recrute un Ingénieur Agronome pour accompagner ses adhérents et développer des pratiques durables.',
      candidates: [
        { name: 'ROUSSEAU Léa', email: 'l.rousseau@mail.fr', score: 83, status: 'qualified',
          justification: 'Ingénieure agronome avec expertise en agriculture durable et bon relationnel agriculteurs. Expérience terrain significative.',
          positivePoints: ['Formation AgroParisTech', '5 ans en coopérative agricole', 'Expertise agriculture durable', 'Très bon contact terrain'],
          negativePoints: ['Connaissance des céréales à approfondir'] },
        { name: 'DUPUIS François', email: 'f.dupuis@mail.fr', score: 68, status: 'pending_approval',
          justification: 'Agronome avec bonne base technique et expérience en conseil agricole. Profil solide qui peut s\'adapter rapidement.',
          positivePoints: ['Solide formation agronomique', 'Expérience conseil agricole', 'Permis et mobilité'],
          negativePoints: ['Peu d\'expérience en coopérative', 'Connaissance des outils numériques agricoles limitée'] },
        { name: 'MASSON Hugo', email: 'h.masson@mail.fr', score: 51, status: 'rejected',
          justification: 'Profil recherche peu adapté au terrain. Manque de contact avec les agriculteurs et connaissance limitée des enjeux commerciaux.',
          positivePoints: ['Solides bases scientifiques', 'Master recherche'],
          negativePoints: ['Profil académique, pas terrain', 'Pas de contact avec des exploitants', 'Peu orienté résultats'] },
        { name: 'FAURE Noémie', email: 'n.faure@mail.fr', score: 43, status: 'rejected',
          justification: 'Débutante sans expérience significative. Formation insuffisante pour le niveau senior requis.',
          positivePoints: ['Très motivée par le secteur agricole'],
          negativePoints: ['Licence, pas ingénieure', 'Aucune expérience professionnelle', 'Pas de connaissance réglementaire'] },
      ],
    }],
  },
  {
    name: 'Vinci RH', contactName: 'Isabelle Collin', contactEmail: 'i.collin@vincirh.fr', sector: 'RH',
    jobs: [{
      title: 'Chargé de Développement RH', location: 'Nantes (44)', contract_type: 'CDI',
      score_threshold: 60, honoraires: 8000,
      description: 'Vinci RH accompagne les PME dans leur développement RH. Nous recrutons un Chargé de Développement pour conseiller nos clients sur GPEC, formation et recrutement.',
      candidates: [
        { name: 'BOURGEOIS Alice', email: 'a.bourgeois@mail.fr', score: 76, status: 'qualified',
          justification: 'Chargée RH polyvalente avec expérience en cabinet conseil. Maîtrise des outils RH et bonne capacité relationnelle client.',
          positivePoints: ['Expérience conseil RH en PME', 'Maîtrise GPEC et formation', 'Bonne relation client', 'SIRH maîtrisé'],
          negativePoints: ['Expérience recrutement à approfondir'] },
        { name: 'CHAPUIS Romain', email: 'r.chapuis@mail.fr', score: 63, status: 'pending_approval',
          justification: 'Profil dynamique avec bonne formation et première expérience réussie. À former sur certains aspects mais potentiel évident.',
          positivePoints: ['Master RH', 'Première expérience réussie', 'Très motivé par le conseil'],
          negativePoints: ['3 ans d\'expérience seulement', 'Peu d\'autonomie démontrée', 'Pas de gestion de projet complexe'] },
        { name: 'PERRIN Nathan', email: 'n.perrin@mail.fr', score: 47, status: 'rejected',
          justification: 'Expérience uniquement en entreprise, pas en conseil. Difficultés à s\'adapter au multi-clients.',
          positivePoints: ['Expérience solide en entreprise', 'Bonne connaissance du droit social'],
          negativePoints: ['Aucune expérience conseil', 'Pas de relation client externe', 'Secteur PME inconnu'] },
        { name: 'RENAUD Marie', email: 'm.renaud@mail.fr', score: 38, status: 'rejected',
          justification: 'Profil administration du personnel très éloigné des besoins en développement RH et conseil.',
          positivePoints: ['Très bonne rigueur administrative'],
          negativePoints: ['Profil administratif, pas développement', 'Pas de compétences conseil', 'Pas de relation client'] },
      ],
    }],
  },
  {
    name: 'Kalexia', contactName: 'Matthieu Garnier', contactEmail: 'm.garnier@kalexia.fr', sector: 'Tech',
    jobs: [{
      title: 'Data Analyst Marketing', location: 'Paris (75)', contract_type: 'CDI',
      score_threshold: 67, honoraires: 10000,
      description: 'Kalexia, scale-up spécialisée en marketing data-driven, recherche un Data Analyst pour exploiter ses données clients et optimiser ses campagnes marketing.',
      candidates: [
        { name: 'LECOMTE Mathieu', email: 'm.lecomte@mail.fr', score: 86, status: 'qualified',
          justification: 'Data Analyst expert avec maîtrise de Python, SQL et des outils de BI. Expérience marketing digital appréciable et sens business développé.',
          positivePoints: ['Expert Python/SQL/Tableau', '4 ans en data marketing', 'Expérience e-commerce', 'Anglais courant'],
          negativePoints: ['Prétentions légèrement au-dessus de la fourchette'] },
        { name: 'BAUDRY Chloé', email: 'c.baudry@mail.fr', score: 70, status: 'pending_approval',
          justification: 'Analyste avec bonne maîtrise des outils et première expérience en marketing. Profil analytique solide, à confirmer sur les sujets business.',
          positivePoints: ['Bonne maîtrise SQL et Excel avancé', 'Formation data science', 'Curiosité et dynamisme'],
          negativePoints: ['Peu d\'expérience marketing business', 'Python à approfondir', 'Pas de management de dashboards'] },
        { name: 'MEUNIER Baptiste', email: 'b.meunier@mail.fr', score: 58, status: 'rejected',
          justification: 'Profil Excel/reporting sans les compétences analytiques avancées attendues. Pas de maîtrise des outils data modernes.',
          positivePoints: ['Bonne organisation', 'Reporting Excel maîtrisé'],
          negativePoints: ['Pas de SQL', 'Pas de Python ou R', 'Approche reporting, pas analytique'] },
        { name: 'AUBERT Jessica', email: 'j.aubert@mail.fr', score: 44, status: 'rejected',
          justification: 'Profil marketing sans compétences data. La dimension analytique est insuffisamment développée.',
          positivePoints: ['Bonne culture marketing digital', 'Créative'],
          negativePoints: ['Pas de compétences data', 'Pas de SQL', 'Très éloignée du profil technique requis'] },
      ],
    }],
  },

  // ── NICOLAS ─────────────────────────────────────────────────────────────
  {
    name: 'Elexia', contactName: 'Denis Caron', contactEmail: 'd.caron@elexia.fr', sector: 'Électrotechnique',
    jobs: [{
      title: 'Technicien Électrotechnique', location: 'Lille (59)', contract_type: 'CDI',
      score_threshold: 58, honoraires: 7200,
      description: 'Elexia, spécialiste de l\'électrotechnique industrielle, recrute un Technicien pour assurer la maintenance et l\'installation d\'équipements électriques.',
      candidates: [
        { name: 'MERCIER Kevin', email: 'k.mercier@mail.fr', score: 75, status: 'qualified',
          justification: 'Technicien électrotechnicien avec 6 ans d\'expérience en milieu industriel. Habilitations électriques à jour, autonome et réactif.',
          positivePoints: ['6 ans d\'expérience industrie', 'Habilitations B2V, BR, BC', 'Maîtrise armoires électriques', 'Disponible rapidement'],
          negativePoints: ['Conduite de chantier à renforcer'] },
        { name: 'LEBRUN Alexis', email: 'a.lebrun@mail.fr', score: 62, status: 'pending_approval',
          justification: 'Bon technicien avec habilitations en cours de renouvellement. Profil sérieux avec bonnes bases en électrotechnique industrielle.',
          positivePoints: ['BTS Électrotechnique', 'Expérience maintenance industrielle', 'Bon relationnel'],
          negativePoints: ['Habilitations à renouveler', 'Peu d\'expérience en installation neuf', 'Mobilité limitée'] },
        { name: 'PERROT Damien', email: 'd.perrot@mail.fr', score: 50, status: 'rejected',
          justification: 'Profil tertiaire sans expérience industrielle. Les installations résidentielles ne correspondent pas aux besoins industriels.',
          positivePoints: ['Habilitations à jour', 'Organisé'],
          negativePoints: ['Expérience résidentielle, pas industrie', 'Pas de maintenance industrielle', 'Pas de GMAO'] },
        { name: 'GUILLAUME Arnaud', email: 'a.guillaume@mail.fr', score: 35, status: 'rejected',
          justification: 'Débutant sans expérience professionnelle. Habilitations absentes, inadapté pour un poste en autonomie.',
          positivePoints: ['CAP Électrotechnique obtenu'],
          negativePoints: ['Aucune expérience industrielle', 'Pas d\'habilitations', 'Pas de disponibilité terrain'] },
      ],
    }],
  },
  {
    name: 'Groupe Avena', contactName: 'Patricia Noel', contactEmail: 'p.noel@groupeavena.fr', sector: 'Agroalimentaire',
    jobs: [{
      title: 'Chef de Projet Agroalimentaire', location: 'Strasbourg (67)', contract_type: 'CDI',
      score_threshold: 63, honoraires: 9800,
      description: 'Groupe Avena, acteur majeur de la transformation céréalière, recrute un Chef de Projet pour piloter ses projets d\'innovation et d\'amélioration continue.',
      candidates: [
        { name: 'FORESTIER Camille', email: 'c.forestier@mail.fr', score: 80, status: 'qualified',
          justification: 'Chef de projet agro-alimentaire confirmé avec expertise en amélioration continue et gestion de projets industriels. Très bon profil.',
          positivePoints: ['5 ans en gestion de projets agro', 'Certification Lean Six Sigma', 'Expérience en industrie céréalière', 'Leadership reconnu'],
          negativePoints: ['Demande une évolution rapide'] },
        { name: 'VASSEUR Ethan', email: 'e.vasseur@mail.fr', score: 66, status: 'pending_approval',
          justification: 'Ingénieur agroalimentaire avec de bonnes bases en gestion de projet. Profil qui peut évoluer vers un rôle senior avec accompagnement.',
          positivePoints: ['Ingénieur ENSIA', 'Expérience en production agro', 'Maîtrise MS Project'],
          negativePoints: ['Peu d\'expérience en pilotage de projets transverses', 'Management d\'équipe à développer'] },
        { name: 'COMBE Lucie', email: 'l.combe@mail.fr', score: 52, status: 'rejected',
          justification: 'Profil qualité sans expérience en gestion de projet. Les compétences en pilotage transverse sont insuffisantes.',
          positivePoints: ['Bonne connaissance des normes agro', 'HACCP maîtrisé'],
          negativePoints: ['Pas de gestion de projet', 'Pas de leadership démontré', 'Secteur céréalier inconnu'] },
        { name: 'PAGES Hugo', email: 'h.pages@mail.fr', score: 41, status: 'rejected',
          justification: 'Profil logistique sans compétences en R&D ou amélioration continue. Ne correspond pas au poste.',
          positivePoints: ['Bonne organisation', 'Connaissance de la supply chain agro'],
          negativePoints: ['Pas de gestion de projet innovation', 'Profil opérationnel, pas stratégique', 'Secteur très différent'] },
      ],
    }],
  },
]

export default function SeedData() {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState('')

  const [dedupRunning, setDedupRunning] = useState(false)
  const [dedupLog, setDedupLog] = useState<string[]>([])
  const [dedupError, setDedupError] = useState('')

  function addLog(msg: string) {
    setLog(prev => [...prev, msg])
  }

  function addDedupLog(msg: string) {
    setDedupLog(prev => [...prev, msg])
  }

  async function runDedup() {
    setDedupRunning(true)
    setDedupLog([])
    setDedupError('')

    // Normalise : minuscules + espaces multiples → 1 espace + trim
    const norm = (s: string | null | undefined) =>
      (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

    try {
      const { data: apps, error: fetchErr } = await supabase
        .from('applications')
        .select('id, job_id, candidate_name, candidate_email, cv_file_path, created_at')
        .order('created_at', { ascending: false }) // plus récent en premier

      if (fetchErr) throw new Error(`Chargement: ${fetchErr.message}`)
      if (!apps || apps.length === 0) {
        addDedupLog('Aucune candidature.')
        setDedupRunning(false)
        return
      }

      addDedupLog(`📊 ${apps.length} candidature(s) chargée(s)`)

      // Regroupement par (job_id, nom normalisé, email normalisé)
      const groups = new Map<string, typeof apps>()
      for (const app of apps) {
        const n = norm(app.candidate_name as string | null)
        const e = norm(app.candidate_email as string | null)
        // Ignorer seulement si nom ET email sont tous les deux vides
        if (!n && !e) continue
        const key = `${app.job_id}|${n}|${e}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(app)
      }

      const dupeGroups = [...groups.values()].filter(g => g.length > 1)
      addDedupLog(`🔍 ${dupeGroups.length} groupe(s) avec doublons`)

      if (dupeGroups.length === 0) {
        addDedupLog('✅ Aucun doublon — base propre !')
        setDedupRunning(false)
        return
      }

      let deleted = 0
      let errors = 0

      for (const group of dupeGroups) {
        const keeper = group[0] // le plus récent, à conserver
        const dupes  = group.slice(1)

        addDedupLog(``)
        addDedupLog(`👤 ${keeper.candidate_name ?? '(sans nom)'}  |  ${keeper.candidate_email ?? '(sans email)'}`)
        addDedupLog(`   ✅ Conservé : ${new Date(keeper.created_at as string).toLocaleString('fr-FR')}`)

        for (const dupe of dupes) {
          // Suppression unitaire — permet de détecter les erreurs RLS / RPC
          const { error: delErr } = await supabase
            .from('applications')
            .delete()
            .eq('id', dupe.id as string)

          if (delErr) {
            addDedupLog(`   ✗ ERREUR (id ${dupe.id}): ${delErr.message}`)
            errors++
          } else {
            // Nettoyage storage — best effort, erreur ignorée
            if (dupe.cv_file_path && !String(dupe.cv_file_path).startsWith('seed/')) {
              await supabase.storage.from('cvs').remove([String(dupe.cv_file_path)])
            }
            deleted++
            addDedupLog(`   🗑️  Supprimé : ${new Date(dupe.created_at as string).toLocaleString('fr-FR')}`)
          }
        }
      }

      addDedupLog(``)
      addDedupLog(
        `✅ Terminé — ${deleted} doublon(s) supprimé(s)` +
        (errors > 0 ? ` · ⚠️ ${errors} erreur(s) ci-dessus` : '')
      )
    } catch (e) {
      setDedupError(String(e))
    }

    setDedupRunning(false)
  }

  async function runSeed() {
    setRunning(true)
    setDone(false)
    setLog([])
    setError('')

    try {
      for (const clientData of SEED) {
        addLog(`→ Client : ${clientData.name}`)

        // Upsert client
        const { data: existing } = await supabase
          .from('clients').select('id').ilike('name', clientData.name).maybeSingle()

        let clientId: string = existing?.id ?? ''
        if (!clientId) {
          const { data: created, error: clientErr } = await supabase
            .from('clients')
            .insert({ name: clientData.name, contact_name: clientData.contactName, contact_email: clientData.contactEmail, notification_email: clientData.contactEmail, sector: clientData.sector, type: 'client' })
            .select('id').single()
          if (clientErr) throw new Error(`Client ${clientData.name}: ${clientErr.message}`)
          clientId = created!.id
          addLog(`  ✓ Créé`)
        } else {
          addLog(`  ↩ Existant`)
        }

        for (const jobData of clientData.jobs) {
          addLog(`  → Offre : ${jobData.title}`)
          const { data: newJob, error: jobErr } = await supabase
            .from('jobs')
            .insert({
              client_id: clientId,
              title: jobData.title,
              location: jobData.location,
              contract_type: jobData.contract_type,
              description: jobData.description,
              score_threshold: jobData.score_threshold,
              status: 'active',
              honoraires: jobData.honoraires,
            })
            .select('id').single()
          if (jobErr) throw new Error(`Job ${jobData.title}: ${jobErr.message}`)

          for (const cand of jobData.candidates) {
            const { error: appErr } = await supabase.from('applications').insert({
              job_id: newJob!.id,
              cv_file_path: `seed/${newJob!.id}/${cand.name.replace(/\s/g, '_')}.pdf`,
              candidate_name: cand.name,
              candidate_email: cand.email,
              score: cand.score,
              status: cand.status,
              justification: cand.justification,
              positive_points: JSON.stringify(cand.positivePoints),
              negative_points: JSON.stringify(cand.negativePoints),
            })
            if (appErr) throw new Error(`Candidat ${cand.name}: ${appErr.message}`)
            addLog(`    ✓ ${cand.name} — score ${cand.score} — ${cand.status}`)
          }
        }
      }
      setDone(true)
      addLog('✅ Seed terminé avec succès !')
    } catch (e) {
      setError(String(e))
    }
    setRunning(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Seed — Données fictives</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Insère 10 offres et 40 candidats scorés par IA pour les 4 chargés de recrutement.
      </p>
      <button
        onClick={runSeed}
        disabled={running || done}
        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
      >
        {running ? 'Seeding en cours...' : done ? '✅ Terminé' : '▶ Lancer le seed'}
      </button>
      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      {log.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-lg p-4 font-mono text-xs text-foreground space-y-0.5 max-h-96 overflow-auto">
          {log.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}

      <hr className="my-8 border-border" />

      <h2 className="text-xl font-semibold text-foreground mb-1">Déduplication des candidatures</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Analyse toutes les candidatures en base. Pour chaque combinaison identique (nom + email + poste),
        conserve uniquement la plus récente et supprime les anciennes avec leurs fichiers.
      </p>
      <button
        onClick={runDedup}
        disabled={dedupRunning}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
      >
        {dedupRunning ? 'Analyse en cours...' : '🧹 Lancer la déduplication'}
      </button>
      {dedupError && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{dedupError}</p>}
      {dedupLog.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-lg p-4 font-mono text-xs text-foreground space-y-0.5 max-h-96 overflow-auto">
          {dedupLog.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  )
}
