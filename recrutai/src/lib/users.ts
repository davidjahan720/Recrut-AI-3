export type UserRole = 'recruiter' | 'am' | 'manager'

export interface AppUser {
  email: string
  password: string
  role: UserRole
  name: string
  redirect: string
}

export const APP_USERS: AppUser[] = [
  { email: 'sophie@recrutai.fr',  password: 'recrutai', role: 'recruiter', name: 'Sophie',         redirect: '/recruiter' },
  { email: 'karim@recrutai.fr',   password: 'recrutai', role: 'recruiter', name: 'Karim',          redirect: '/recruiter' },
  { email: 'alix@recrutai.fr',    password: 'recrutai', role: 'recruiter', name: 'Alix',           redirect: '/recruiter' },
  { email: 'nicolas@recrutai.fr', password: 'recrutai', role: 'recruiter', name: 'Nicolas',        redirect: '/recruiter' },
  { email: 'laura@recrutai.fr',   password: 'recrutai', role: 'am',        name: 'Laura',          redirect: '/account-manager' },
  { email: 'julien@recrutai.fr',  password: 'recrutai', role: 'am',        name: 'Julien',         redirect: '/account-manager' },
  { email: 'camille@recrutai.fr', password: 'recrutai', role: 'manager',   name: 'Camille Arnaud', redirect: '/manager' },
  { email: 'thomas@recrutai.fr',  password: 'recrutai', role: 'manager',   name: 'Thomas Mercier', redirect: '/manager' },
  { email: 'pierre@recrutai.fr',  password: 'recrutai', role: 'manager',   name: 'Pierre',         redirect: '/manager' },
]

export function findAppUser(email: string, password: string): AppUser | null {
  return APP_USERS.find(u => u.email === email && u.password === password) ?? null
}

export function setRoleSession(user: AppUser): void {
  localStorage.removeItem('recruiter_session')
  localStorage.removeItem('am_session')
  localStorage.removeItem('manager_session')
  localStorage.removeItem('manager_auth')

  if (user.role === 'recruiter') {
    localStorage.setItem('recruiter_session', user.name)
  } else if (user.role === 'am') {
    localStorage.setItem('am_session', user.name)
  } else if (user.role === 'manager') {
    localStorage.setItem('manager_session', user.name)
    localStorage.setItem('manager_auth', '1')
  }
}

export function clearRoleSession(): void {
  localStorage.removeItem('recruiter_session')
  localStorage.removeItem('am_session')
  localStorage.removeItem('manager_session')
  localStorage.removeItem('manager_auth')
}
