/**
 * Tests d'accessibilité automatisés (RGAA AA) sur les routes authentifiées.
 *
 * Authentification : on simule une session recruteur Sophie en posant
 * `localStorage.recruiter_session` avant chaque navigation. ProtectedRoute
 * laisse alors passer sans redirection vers /login.
 *
 * Couverture : Dashboard, Manager, Recruiter, Clients, Jobs, Applications, RGPD.
 *
 * Bloquant en CI : tout violation `serious` ou `critical` fait échouer le job,
 * comme pour les tests sur routes publiques.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

interface AxeViolation {
  id: string
  impact?: string | null
  description: string
  helpUrl: string
  nodes: { html: string }[]
}

const PRIVATE_ROUTES: { path: string; label: string }[] = [
  { path: '/dashboard',    label: 'Dashboard accueil' },
  { path: '/manager',      label: 'Dashboard manager' },
  { path: '/recruiter',    label: 'Mon espace recruteur' },
  { path: '/clients',      label: 'Liste clients' },
  { path: '/jobs',         label: 'Liste offres' },
  { path: '/applications', label: 'Candidatures' },
  { path: '/rgpd',         label: 'Page RGPD' },
]

const RGAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

test.beforeEach(async ({ context }) => {
  // Simule une session recruteur Sophie. ProtectedRoute s'appuie sur
  // localStorage.recruiter_session pour court-circuiter Supabase Auth.
  await context.addInitScript(() => {
    localStorage.setItem('recruiter_session', 'Sophie')
  })
})

for (const route of PRIVATE_ROUTES) {
  test(`@a11y ${route.label} (${route.path}) — sans violation serious/critical`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'load', timeout: 20_000 })
    // Laisser le composant se hydrater + un éventuel premier fetch de données.
    await page.waitForTimeout(1500)

    const results = await new AxeBuilder({ page })
      .withTags(RGAA_TAGS)
      // Recharts SVG : on exclut l'instance Recharts car elle est traitée
      // via un tableau sr-only équivalent (cf. RGAA 1.7). Le wrapper
      // role="img" + aria-label porte la description accessible.
      .exclude('.recharts-wrapper svg')
      .analyze()

    const blocking = (results.violations as AxeViolation[]).filter(
      v => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      const summary = blocking.map(v =>
        `\n - [${v.impact}] ${v.id}: ${v.description}\n   ${v.helpUrl}\n   Nœuds : ${v.nodes.length}\n   Exemple : ${v.nodes[0]?.html?.slice(0, 200) ?? ''}`,
      ).join('')
      throw new Error(`Violations RGAA bloquantes sur ${route.path} :${summary}`)
    }

    const minor = (results.violations as AxeViolation[]).filter(
      v => v.impact !== 'serious' && v.impact !== 'critical',
    )
    if (minor.length > 0) {
      console.log(`[${route.label}] ${minor.length} violation(s) mineure(s) à corriger ultérieurement`)
    }
    expect(blocking.length).toBe(0)
  })
}
