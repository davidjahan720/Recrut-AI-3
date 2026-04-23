import { test } from '@playwright/test'

const PROD_URL = 'https://recrutai2-app.vercel.app'

interface Log {
  type: string
  source: string
  text: string
  url?: string
  status?: number
}

test('audit production — page d\'accueil + login + jobs', async ({ page }) => {
  test.setTimeout(180000)
  const logs: Log[] = []

  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      logs.push({ type: m.type(), source: 'console', text: m.text() })
    }
  })
  page.on('pageerror', e => {
    logs.push({ type: 'pageerror', source: 'page', text: e.message })
  })
  page.on('requestfailed', r => {
    logs.push({ type: 'requestfailed', source: 'network', text: r.failure()?.errorText ?? '', url: r.url() })
  })
  page.on('response', async r => {
    if (r.status() >= 400) {
      let body = ''
      try { body = (await r.text()).slice(0, 400) } catch { /* ignore */ }
      logs.push({ type: 'http', source: 'network', text: body, url: r.url(), status: r.status() })
    }
  })

  console.log('\n==== 1. Landing ====')
  await page.goto(PROD_URL, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  console.log('URL:', page.url())
  console.log('Title:', await page.title())

  console.log('\n==== 2. Login Laura (AM) ====')
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  await page.fill('#email', 'laura@recrutai.fr')
  await page.fill('#password', 'recrutai')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
  console.log('After login URL:', page.url())

  console.log('\n==== 3. Naviguer vers Jobs ====')
  await page.goto(`${PROD_URL}/jobs`, { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  console.log('Jobs page URL:', page.url())

  console.log('\n==== 4. Ouvrir Nouvelle offre ====')
  const newBtn = page.locator('button', { hasText: 'Nouvelle offre' })
  const hasNewBtn = await newBtn.count() > 0
  console.log('Bouton "Nouvelle offre" visible :', hasNewBtn)
  if (!hasNewBtn) {
    console.log('❌ Impossible d\'ouvrir la modale')
    return
  }
  await newBtn.first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'audit-modal.png', fullPage: true })

  console.log('\n==== 5. Remplir le formulaire ====')
  const dialog = page.locator('[role="dialog"]')
  const inputs = dialog.locator('input:not([type="file"]):not([type="number"]):not([aria-hidden="true"])')
  const inputCount = await inputs.count()
  console.log(`Nombre d'inputs visibles : ${inputCount}`)

  // Inputs attendus dans l'ordre :
  // 0: Nom de l'entreprise
  // 1: Secteur d'activité
  // 2: Titre du poste
  // 3: Localisation
  await inputs.nth(0).fill('Test Audit Corp ' + Date.now())
  await inputs.nth(1).fill('Tech')
  await inputs.nth(2).fill('Dev Full Stack Test')
  if (inputCount >= 4) await inputs.nth(3).fill('Paris')

  console.log('\n==== 6. Cliquer Enregistrer ====')
  const saveBtn = dialog.locator('button', { hasText: /^Enregistrer/ })
  await saveBtn.click()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: 'audit-after-save.png', fullPage: true })
  console.log('Post-save URL:', page.url())

  const dialogVisible = await dialog.count() > 0
  console.log('Dialog encore ouvert :', dialogVisible)
  if (dialogVisible) {
    const dialogText = await dialog.innerText()
    console.log('--- Contenu du dialog après save ---')
    console.log(dialogText)
  }

  console.log('\n\n==== 🔎 LOGS CAPTURÉS ====')
  console.log(`Total: ${logs.length} entrées`)
  for (const l of logs) {
    const prefix = l.source === 'network' ? `[HTTP ${l.status ?? '---'}]` : `[${l.type}]`
    console.log(`${prefix} ${l.url ?? ''}`)
    if (l.text) console.log(`  → ${l.text.slice(0, 400)}`)
  }
})
