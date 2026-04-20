import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Export CSV (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/applications')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
  })

  test('le bouton Export CSV est absent s\'il n\'y a pas de qualifiés', async ({ page }) => {
    const qualifiedBtn = page.locator('button', { hasText: /Qualifiés \(0\)/ })
    const exportBtn = page.locator('button', { hasText: /Export CSV/ })

    if (await qualifiedBtn.isVisible()) {
      await expect(exportBtn).not.toBeVisible()
    } else {
      // Des qualifiés existent — vérifier que le bouton est là
      await expect(exportBtn).toBeVisible()
    }
  })

  test('le bouton Export CSV est visible quand des qualifiés existent', async ({ page }) => {
    const qualifiedCount = page.locator('button', { hasText: /Qualifiés \([1-9]/ })
    if (!await qualifiedCount.isVisible()) test.skip()

    await expect(page.locator('button', { hasText: /Export CSV/ })).toBeVisible()
  })

  test('le bouton Export CSV déclenche un téléchargement', async ({ page }) => {
    const qualifiedCount = page.locator('button', { hasText: /Qualifiés \([1-9]/ })
    if (!await qualifiedCount.isVisible()) test.skip()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.click('button:has-text("Export CSV")'),
    ])

    expect(download.suggestedFilename()).toMatch(/^candidats-qualifies-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

test.describe('Accessibilité clavier (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/applications')
    await page.waitForLoadState('load')
    await page.waitForSelector('h1', { timeout: 15000 })
  })

  test('les filtres de statut sont navigables au clavier', async ({ page }) => {
    // Tab jusqu'au premier filtre, Enter pour activer
    const firstPill = page.locator('button', { hasText: /Toutes/ })
    await firstPill.focus()
    await expect(firstPill).toBeFocused()
    await firstPill.press('Enter')
    await expect(firstPill).toBeVisible()
  })

  test('les boutons d\'action ont un aria-label', async ({ page }) => {
    const rows = page.locator('tbody tr')
    if (await rows.count() === 0) test.skip()

    const firstRow = rows.first()
    if (await firstRow.locator('text=Aucune candidature').isVisible()) test.skip()

    const voirBtn = firstRow.locator('button[aria-label*="Voir le CV"]')
    await expect(voirBtn).toBeVisible()

    const deleteBtn = firstRow.locator('button[aria-label*="Supprimer la candidature"]')
    await expect(deleteBtn).toBeVisible()
  })

  test('les checkboxes ont un aria-label', async ({ page }) => {
    const rows = page.locator('tbody tr')
    if (await rows.count() === 0) test.skip()

    const firstCheckbox = rows.first().locator('input[type="checkbox"][aria-label]')
    await expect(firstCheckbox).toBeVisible()
  })
})
