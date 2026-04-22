import { test, expect } from '@playwright/test'
import { TEST_EMAIL, TEST_PASSWORD } from './helpers'

test.describe('Page Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('load')
    await page.waitForSelector('#email', { timeout: 15000 })
  })

  test('affiche le formulaire de connexion', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('affiche une erreur avec des identifiants invalides', async ({ page }) => {
    await page.fill('#email', 'mauvais@email.fr')
    await page.fill('#password', 'mauvaismdp')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible({ timeout: 12000 })
  })

  test('redirige vers le dashboard après connexion réussie', async ({ page }) => {
    await page.fill('#email', TEST_EMAIL)
    await page.fill('#password', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
  })

  test('la landing page est accessible sans être connecté', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
