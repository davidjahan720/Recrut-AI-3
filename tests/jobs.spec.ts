import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Page Offres', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/jobs')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
  })

  test('affiche la liste des offres', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Offres' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Nouvelle offre' })).toBeVisible()
  })

  test('les filtres sont présents', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Toutes' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Actives' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Clôturées' })).toBeVisible()
  })

  test('ouvre le dialog de création', async ({ page }) => {
    await page.click('button:has-text("Nouvelle offre")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Titre du poste')).toBeVisible()
  })

  test('filtre Actives masque les offres clôturées', async ({ page }) => {
    await page.click('button:has-text("Actives")')
    await page.waitForTimeout(500)
    await expect(page.locator('span', { hasText: 'Clôturée' })).toHaveCount(0)
  })

  test('navigue vers le détail d\'une offre', async ({ page }) => {
    const rows = page.locator('tbody tr')
    if (await rows.count() === 0) test.skip()
    const firstRow = rows.first()
    if (await firstRow.locator('text=Aucune offre').isVisible()) test.skip()
    await firstRow.click()
    await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+/, { timeout: 15000 })
  })
})
