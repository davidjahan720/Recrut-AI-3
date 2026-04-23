/// <reference types="node" />

// Validation des credentials côté serveur — les mots de passe ne sont plus dans le bundle JS
const ROLE_USERS = [
  { email: 'sophie@recrutai.fr',  role: 'recruiter', name: 'Sophie',         redirect: '/recruiter' },
  { email: 'karim@recrutai.fr',   role: 'recruiter', name: 'Karim',          redirect: '/recruiter' },
  { email: 'alix@recrutai.fr',    role: 'recruiter', name: 'Alix',           redirect: '/recruiter' },
  { email: 'nicolas@recrutai.fr', role: 'recruiter', name: 'Nicolas',        redirect: '/recruiter' },
  { email: 'laura@recrutai.fr',   role: 'am',        name: 'Laura',          redirect: '/account-manager' },
  { email: 'julien@recrutai.fr',  role: 'am',        name: 'Julien',         redirect: '/account-manager' },
  { email: 'camille@recrutai.fr', role: 'manager',   name: 'Camille Arnaud', redirect: '/manager' },
  { email: 'thomas@recrutai.fr',  role: 'manager',   name: 'Thomas Mercier', redirect: '/manager' },
  { email: 'pierre@recrutai.fr',  role: 'manager',   name: 'Pierre',         redirect: '/manager' },
]

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })

  const appPassword = process.env.APP_ROLE_PASSWORD
  if (!appPassword) return res.status(500).json({ error: 'Configuration serveur manquante' })

  const user = ROLE_USERS.find(u => u.email === String(email).trim().toLowerCase())
  if (!user || String(password) !== appPassword) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
  }

  return res.status(200).json({ role: user.role, name: user.name, redirect: user.redirect })
}
