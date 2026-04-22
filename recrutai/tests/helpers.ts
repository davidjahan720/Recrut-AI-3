import { Page } from '@playwright/test'

export const TEST_EMAIL = 'jahandavid@gmail.com'
export const TEST_PASSWORD = '03121975'

export async function login(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('load')
  await page.waitForSelector('#email', { timeout: 15000 })
  await page.fill('#email', TEST_EMAIL)
  await page.fill('#password', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 20000 })
  await page.waitForLoadState('load')
}

export async function loginWithRole(page: Page, role: 'recruiter' | 'am' | 'manager', name: string) {
  await login(page)
  const key = role === 'recruiter' ? 'recruiter_session'
            : role === 'am'        ? 'am_session'
            :                        'manager_session'
  await page.evaluate(([k, n]) => {
    sessionStorage.setItem(k, n)
    window.dispatchEvent(new Event('role-login'))
  }, [key, name] as [string, string])
  await page.waitForTimeout(500)
}
