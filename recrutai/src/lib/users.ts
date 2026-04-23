export type UserRole = 'recruiter' | 'am' | 'manager'

export interface AppUser {
  role: UserRole
  name: string
  redirect: string
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
