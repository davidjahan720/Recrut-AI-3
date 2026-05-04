/**
 * Tests d'accessibilité automatisés (RGAA AA) sur les routes publiques.
 *
 * Couverture : Landing, Login, Mentions légales, Politique de confidentialité.
 * Règles : WCAG 2.1 niveau AA (équivalent RGAA 4.1 niveau AA).
 *
 * Limitation connue : axe-core couvre ~30 % des critères RGAA. Les autres
 * (60 %+) nécessitent un audit manuel — cf. how-to/auditer-composant-axe.md
 * pour la procédure de complément.
 *
 * Bloquant en CI : tout violation `serious` ou `critical` fait échouer le job.
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

const PUBLIC_ROUTES: { path: string; label: string }[] = [
  { path: '/', label: 'Landing' },
  { path: '/login', label: 'Login' },
  { path: '/legal', label: 'Mentions légales' },
  { path: '/privacy', label: 'Politique de confidentialité' },
]

const RGAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

for (const route of PUBLIC_ROUTES) {
  test(`@a11y ${route.label} (${route.path}) — sans violation serious/critical`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const results = await new AxeBuilder({ page })
      .withTags(RGAA_TAGS)
      .analyze()

    const blocking = (results.violations as AxeViolation[]).filter(
      v => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      const summary = blocking.map(v =>
        `\n - [${v.impact}] ${v.id}: ${v.description}\n   ${v.helpUrl}\n   Nœuds : ${v.nodes.length}`,
      ).join('')
      throw new Error(`Violations RGAA bloquantes sur ${route.path} :${summary}`)
    }

    // Test passant : on logge les violations mineures pour suivi (non bloquant).
    const minor = (results.violations as AxeViolation[]).filter(
      v => v.impact !== 'serious' && v.impact !== 'critical',
    )
    if (minor.length > 0) {
      console.log(`[${route.label}] ${minor.length} violation(s) mineure(s) à corriger ultérieurement`)
    }
    expect(blocking.length).toBe(0)
  })
}
