const RECRUITER_CLIENTS: Record<string, string[]> = {
  'Karim':   ['Solvay', 'Altair RH'],
  'Alix':    ['Terralys', 'Vinci RH', 'Kalexia'],
  'Nicolas': ['Elexia', 'Groupe Avena'],
}

/** Lien chargé de recrutement → AM dont il/elle traite les offres */
const RECRUITER_AM_LINK: Record<string, string> = {
  'Sophie': 'Laura',
}

const AM_BASE_NAMES: Record<string, string[]> = {
  'Laura': [
    'Nexeo', 'Solvay', 'BTP Pro',
    'Batir et Co', 'Cabinet Conseil Altéria', 'EdTech Knoovi',
    'Groupe Halbert', 'Kalexia', 'TechVision Solutions', 'TechVision Solutions SAS',
  ],
  'Julien': [
    'Inovev', 'Altair RH',
    'Cabinet Solvay RH', 'Cliniques du Rhone', 'Elexia',
    'FinTech Norda', 'Groupe Avena', 'Groupe Industriel Métalor', 'Terralys', 'Vinci RH',
  ],
}

/** Filtre par noms de clients pour les chargés de recrutement (null = pas de filtre) */
export function getClientFilter(): string[] | null {
  const recruiter = sessionStorage.getItem('recruiter_session')
  if (recruiter) return RECRUITER_CLIENTS[recruiter] ?? null
  return null
}

/** AM lié au chargé de recrutement connecté, ou null */
export function getRecruiterAmLink(): string | null {
  const recruiter = sessionStorage.getItem('recruiter_session')
  if (!recruiter) return null
  return RECRUITER_AM_LINK[recruiter] ?? null
}

/** Chargé de recrutement assigné à l'AM connecté, ou null */
export function getAmRecruiterAssignment(): string | null {
  const am = sessionStorage.getItem('am_session')
  if (!am) return null
  const entry = Object.entries(RECRUITER_AM_LINK).find(([, linkedAm]) => linkedAm === am)
  return entry ? entry[0] : null
}

/** Noms de clients de base pour un AM donné (par nom, sans session) */
export function getAmBaseClientNamesByAm(amName: string): string[] {
  return AM_BASE_NAMES[amName] ?? []
}

/** IDs de clients dynamiques pour un AM donné (par nom, sans session) */
export function getAmExtraClientIdsByAm(amName: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`am_portfolio_${amName}`) ?? '[]')
  } catch {
    return []
  }
}

export function getAmSession(): string | null {
  return sessionStorage.getItem('am_session')
}

/** Noms de clients de base pour un AM (portefeuille initial) */
export function getAmBaseClientNames(): string[] {
  const am = sessionStorage.getItem('am_session')
  if (!am) return []
  return AM_BASE_NAMES[am] ?? []
}

/** IDs de clients supplémentaires ajoutés dynamiquement par l'AM */
export function getAmExtraClientIds(): string[] {
  const am = sessionStorage.getItem('am_session')
  if (!am) return []
  try {
    return JSON.parse(localStorage.getItem(`am_portfolio_${am}`) ?? '[]')
  } catch {
    return []
  }
}

/** Noms de clients à surveiller pour les nouvelles offres du jour d'un chargé (par nom de chargé) */
export function getRecruiterTodayClientNames(recruiterName: string): string[] {
  const amLink = RECRUITER_AM_LINK[recruiterName]
  if (amLink) return AM_BASE_NAMES[amLink] ?? []      // Sophie → tous les clients de Laura
  return RECRUITER_CLIENTS[recruiterName] ?? []         // Karim/Alix/Nicolas → leurs clients propres
}

/** Enregistre un client_id dans le portefeuille persistant de l'AM connecté */
export function addAmClientId(clientId: string): void {
  const am = sessionStorage.getItem('am_session')
  if (!am || !clientId) return
  const key = `am_portfolio_${am}`
  const existing: string[] = (() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
  })()
  if (!existing.includes(clientId)) {
    localStorage.setItem(key, JSON.stringify([...existing, clientId]))
  }
}
