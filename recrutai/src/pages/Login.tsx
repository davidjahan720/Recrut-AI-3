import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { setRoleSession } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Vérification des credentials côté serveur (mots de passe hors bundle)
    const loginRes = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (loginRes.ok) {
      const appUser = await loginRes.json()
      setRoleSession(appUser)
      window.dispatchEvent(new Event('role-login'))
      navigate(appUser.redirect, { replace: true })
      setLoading(false)
      return
    }
    if (loginRes.status !== 401) {
      setError('Erreur serveur, veuillez réessayer.')
      setLoading(false)
      return
    }

    // Admin → Supabase
    const { error: supaErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (supaErr) {
      setError('Email ou mot de passe incorrect.')
    } else {
      clearRoleSession()
      navigate('/dashboard', { replace: true })
    }
  }

  function clearRoleSession() {
    localStorage.removeItem('recruiter_session')
    localStorage.removeItem('am_session')
    localStorage.removeItem('manager_session')
    localStorage.removeItem('manager_auth')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div aria-hidden="true" className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-base font-bold">R</span>
            </div>
            <span className="font-bold text-foreground text-xl">RecrutAI</span>
          </div>
          <h1 className="font-heading text-xl leading-snug font-semibold text-foreground">Connexion</h1>
          <CardDescription className="text-base">Accès réservé à l'équipe RecrutAI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="prenom@recrutai.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="text-base h-11"
                required
                aria-required="true"
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-base font-medium">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="text-base h-11"
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-800 dark:text-red-300">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Connexion en cours…' : "Accéder à l'app"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/legal" className="hover:underline underline-offset-2">Mentions légales</a>
            <span aria-hidden="true"> · </span>
            <a href="/privacy" className="hover:underline underline-offset-2">Politique de confidentialité</a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
