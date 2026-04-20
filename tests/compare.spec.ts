import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Comparaison de candidats (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/applications')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
  })

  test('les checkboxes de sélection sont présentes', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) test.skip()
    const firstCheckbox = rows.first().locator('input[type="checkbox"]')
    await expect(firstCheckbox).toBeVisible()
  })

  test('le bouton Comparer apparaît après 2 sélections', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count < 2) test.skip()

    // Sélectionner 2 candidats
    await rows.nth(0).locator('input[type="checkbox"]').check()
    await rows.nth(1).locator('input[type="checkbox"]').check()

    await expect(page.locator('button', { hasText: /Comparer/ })).toBeVisible()
  })

  test('le bouton Comparer est absent avec 1 seule sélection', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) test.skip()

    await rows.nth(0).locator('input[type="checkbox"]').check()
    await expect(page.locator('button', { hasText: /Comparer/ })).not.toBeVisible()
  })

  test('maximum 3 checkboxes sélectionnables', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count < 4) test.skip()

    for (let i = 0; i < 3; i++) {
      await rows.nth(i).locator('input[type="checkbox"]').check()
    }

    // La 4ème doit être disabled
    const fourth = rows.nth(3).locator('input[type="checkbox"]')
    await expect(fourth).toBeDisabled()
  })

  test('le bouton Annuler réinitialise la sélection', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count < 2) test.skip()

    await rows.nth(0).locator('input[type="checkbox"]').check()
    await rows.nth(1).locator('input[type="checkbox"]').check()
    await page.click('button', { hasText: 'Annuler' })

    await expect(page.locator('button', { hasText: /Comparer/ })).not.toBeVisible()
  })

  test('la page /compare charge avec 2 IDs valides', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count < 2) test.skip()

    await rows.nth(0).locator('input[type="checkbox"]').check()
    await rows.nth(1).locator('input[type="checkbox"]').check()
    await page.click('button', { hasText: /Comparer/ })

    await page.waitForURL(/\/compare\?ids=/, { timeout: 10000 })
    await expect(page.locator('h1', { hasText: 'Comparaison de candidats' })).toBeVisible()
  })

  test('la page /compare a un bouton retour fonctionnel', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count < 2) test.skip()

    await rows.nth(0).locator('input[type="checkbox"]').check()
    await rows.nth(1).locator('input[type="checkbox"]').check()
    await page.click('button', { hasText: /Comparer/ })
    await page.waitForURL(/\/compare\?ids=/)

    await page.click('button', { hasText: '← Retour' })
    await expect(page).toHaveURL(/\/applications/)
  })

  test('/compare redirige vers /applications si moins de 2 IDs', async ({ page }) => {
    await page.goto('/compare?ids=id-unique-seulement')
    await expect(page).toHaveURL(/\/applications/, { timeout: 10000 })
  })
})
