import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { ensureTestUser } from './ensureTestUser'

const AUTH_FILE = resolve('e2e/.auth/user.json')

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:4173'
  const { email, password } = await ensureTestUser()

  mkdirSync(dirname(AUTH_FILE), { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(baseURL)
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await page.getByTestId('gasto-form').waitFor({ timeout: 30_000 })

  await context.storageState({ path: AUTH_FILE })
  await browser.close()
}

export default globalSetup
