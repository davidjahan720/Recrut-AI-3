export type UserRole = 'recruiter'

export interface AppUser {
  role: UserRole
  name: string
  redirect: string
}

export function setRoleSession(user: AppUser): void {
  // Nettoyage des anciennes sessions (am/manager) si elles trainent en localStorage
  localStorage.removeItem('am_session')
  localStorage.removeItem('manager_session')
  localStorage.removeItem('manager_auth')
  localStorage.removeItem('recruiter_session')

  if (user.role === 'recruiter') {
    localStorage.setItem('recruiter_session', user.name)
  }
}

export function clearRoleSession(): void {
  localStorage.removeItem('recruiter_session')
  localStorage.removeItem('am_session')
  localStorage.removeItem('manager_session')
  localStorage.removeItem('manager_auth')
}
