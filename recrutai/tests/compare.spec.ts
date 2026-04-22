import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Onglet Manager — protection mot de passe', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Forcer sessionStorage vide pour simuler un accès non authentifié
    await page.evaluate(() => sessionStorage.removeItem('manager_auth'))
    await page.goto('/manager')
    await page.waitForLoadState('load')
  })

  test('affiche le formulaire mot de passe', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Accès réservé — Manager')).toBeVisible()
  })

  test('affiche une erreur avec un mauvais mot de passe', async ({ page }) => {
    await page.fill('input[type="password"]', 'mauvais')
    await page.click('button:has-text("Accéder")')
    await expect(page.locator('text=Mot de passe incorrect')).toBeVisible()
  })

  test('donne accès au dashboard avec le bon mot de passe', async ({ page }) => {
    await page.fill('input[type="password"]', '0')
    await page.click('button:has-text("Accéder")')
    await expect(page.locator('h1', { hasText: 'Vue Manager' })).toBeVisible({ timeout: 10000 })
  })

  test('le dashboard Manager affiche les KPIs recrutement', async ({ page }) => {
    await page.fill('input[type="password"]', '0')
    await page.click('button:has-text("Accéder")')
    await expect(page.locator('text=Offres actives')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=CA mensuel').first()).toBeVisible()
  })

  test('le tableau chargés de recrutement est présent', async ({ page }) => {
    await page.fill('input[type="password"]', '0')
    await page.click('button:has-text("Accéder")')
    await expect(page.locator('text=Performance par chargé de recrutement')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Sophie')).toBeVisible()
    await expect(page.locator('text=Karim')).toBeVisible()
  })
})
