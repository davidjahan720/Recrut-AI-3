import { test, expect } from '@playwright/test'
import { login, loginWithRole } from './helpers'

test.describe('Page Candidatures', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/applications')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
  })

  test('affiche la page candidatures', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Candidatures' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Déposer des CV' })).toBeVisible()
  })

  test('les filtres de statut sont présents', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Toutes/ })).toBeVisible()
    await expect(page.locator('button', { hasText: /Qualifiés/ })).toBeVisible()
    await expect(page.locator('button', { hasText: /Rejetés/ })).toBeVisible()
    await expect(page.locator('button', { hasText: /En analyse/ })).toBeVisible()
  })

  test('ouvre le dialog de dépôt de CV', async ({ page }) => {
    await page.click('button:has-text("Déposer des CV")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Offre associée (optionnel)')).toBeVisible()
  })

  test('filtre par statut Qualifiés', async ({ page }) => {
    await page.click('button:has-text("Qualifiés")')
    await page.waitForTimeout(500)
    const empty = page.locator('text=Aucune candidature pour ce filtre')
    const badge = page.locator('span', { hasText: 'Qualifié' })
    expect(await empty.isVisible() || await badge.first().isVisible().catch(() => false)).toBe(true)
  })

  test('tri par score sans erreur', async ({ page }) => {
    await page.selectOption('select', 'score')
    await page.waitForTimeout(300)
    await expect(page.locator('h1', { hasText: 'Candidatures' })).toBeVisible()
  })

  test('bouton PDF présent sur chaque candidature', async ({ page }) => {
    const rows = page.locator('tbody tr')
    if (await rows.count() === 0) test.skip()
    const first = rows.first()
    if (await first.locator('text=Aucune candidature').isVisible()) test.skip()
    await expect(first.locator('button[aria-label*="Voir le CV"]')).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
  })

  test('affiche le message de bienvenue', async ({ page }) => {
    await expect(page.locator('text=Aujourd\'hui est une nouvelle occasion')).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithRole(page, 'am', 'Laura')
  })

  test('navigue vers Clients', async ({ page }) => {
    await page.waitForSelector('nav a:has-text("Clients")', { timeout: 10000 })
    await page.click('nav a:has-text("Clients")')
    await page.waitForLoadState('load')
    await expect(page).toHaveURL(/\/clients/)
    await expect(page.locator('h1', { hasText: 'Clients' })).toBeVisible()
  })

  test('navigue vers Offres', async ({ page }) => {
    await page.waitForSelector('nav a:has-text("Offres")', { timeout: 10000 })
    await page.click('nav a:has-text("Offres")')
    await page.waitForLoadState('load')
    await expect(page).toHaveURL(/\/jobs/)
  })

  test('toggle dark/light mode', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    const html = page.locator('html')
    const before = await html.getAttribute('class')
    await page.click('button:has-text("Mode")')
    await page.waitForTimeout(300)
    const after = await html.getAttribute('class')
    expect(before).not.toBe(after)
  })
})
