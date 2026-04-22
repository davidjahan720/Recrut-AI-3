import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Turnstile } from '@marsidev/react-turnstile'

// [ACTION REQUISE] Créez votre clé sur https://dash.cloudflare.com → Turnstile
// Ajoutez VITE_TURNSTILE_SITE_KEY=votre_clé dans .env.local
// La clé ci-dessous est la clé de test Cloudflare (toujours valide, à remplacer en prod)
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'
const IS_E2E = import.meta.env.VITE_E2E_TEST === 'true'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(IS_E2E ? 'e2e-bypass' : null)
  const turnstileRef = useRef<{ reset: () => void }>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Veuillez valider le captcha.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setError('Email ou mot de passe incorrect.')
      // Réinitialise le captcha après échec
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-base font-bold">R</span>
            </div>
            <span className="font-bold text-foreground text-xl">RecrutAI</span>
          </div>
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription className="text-base">Accès réservé à l'équipe RecrutAI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@recrutai.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="text-base h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-base font-medium">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="text-base h-11"
                required
              />
            </div>

            {/* Cloudflare Turnstile CAPTCHA — masqué en mode test E2E */}
            {!IS_E2E && <div className="flex justify-center py-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={token => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => { setCaptchaToken(null); setError('Erreur captcha, veuillez réessayer.') }}
                options={{ theme: 'light', language: 'fr' }}
              />
            </div>}

            {error && (
              <p className="text-base text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loading || !captchaToken}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
