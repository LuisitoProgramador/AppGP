import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnvFile(path = resolve(process.cwd(), '.env')) {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (process.env[key] == null) {
      process.env[key] = value
    }
  }
}

export const E2E_DEFAULT_EMAIL = 'e2e.pulso.test@pulso-e2e.local'
export const E2E_DEFAULT_PASSWORD = 'PulsoE2e_Test_2026!'
