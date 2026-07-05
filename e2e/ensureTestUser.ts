import { E2E_DEFAULT_EMAIL, loadEnvFile } from './loadEnv'

export interface E2ECredentials {
  email: string
  password: string
}

interface AuthSession {
  access_token: string
  user: { id: string }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta ${name} en .env (requerido para E2E)`)
  return value
}

async function authRequest(
  baseUrl: string,
  anonKey: string,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function signInOrSignUp(
  baseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const tokenRes = await authRequest(baseUrl, anonKey, 'token?grant_type=password', {
    email,
    password,
  })

  if (tokenRes.ok) {
    const data = (await tokenRes.json()) as AuthSession
    return data
  }

  const signupRes = await authRequest(baseUrl, anonKey, 'signup', { email, password })
  const signupBody = (await signupRes.json()) as AuthSession & { error_description?: string; msg?: string }

  if (signupRes.ok && signupBody.access_token) {
    return signupBody
  }

  const retryRes = await authRequest(baseUrl, anonKey, 'token?grant_type=password', {
    email,
    password,
  })
  if (!retryRes.ok) {
    const err = (await retryRes.json()) as { error_description?: string; msg?: string }
    throw new Error(
      err.error_description ??
        err.msg ??
        signupBody.error_description ??
        signupBody.msg ??
        'No se pudo autenticar el usuario E2E. Desactiva confirmación por correo en Supabase Auth.',
    )
  }

  return (await retryRes.json()) as AuthSession
}

async function restFetch(
  baseUrl: string,
  token: string,
  anonKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(init?.headers ?? {}),
    },
  })
}

async function seedOnboardingData(
  baseUrl: string,
  token: string,
  anonKey: string,
  userId: string,
) {
  const [presupuestoRes, cuentasRes] = await Promise.all([
    restFetch(baseUrl, token, anonKey, `presupuestos?user_id=eq.${userId}&select=user_id`),
    restFetch(baseUrl, token, anonKey, `cuentas?user_id=eq.${userId}&select=id,tipo`),
  ])

  const presupuestos = (await presupuestoRes.json()) as unknown[]
  const cuentas = (await cuentasRes.json()) as { id: string; tipo: string }[]

  if (presupuestos.length === 0) {
    const res = await restFetch(baseUrl, token, anonKey, 'presupuestos', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        limite_mensual: 8000,
        sueldo_mensual: 10000,
        ingresos_extras: 0,
        sueldo_semanal: 2500,
        dia_pago: 1,
        porcentaje_ahorro: 20,
      }),
    })
    if (!res.ok) {
      throw new Error(`Seed presupuesto: ${await res.text()}`)
    }
  }

  if (!cuentas.some((c) => c.tipo === 'efectivo')) {
    const res = await restFetch(baseUrl, token, anonKey, 'cuentas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'E2E Efectivo',
        tipo: 'efectivo',
        saldo_actual: 5000,
      }),
    })
    if (!res.ok) throw new Error(`Seed efectivo: ${await res.text()}`)
  }

  if (!cuentas.some((c) => c.tipo === 'credito')) {
    const res = await restFetch(baseUrl, token, anonKey, 'cuentas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'E2E Tarjeta',
        tipo: 'credito',
        limite_credito: 50000,
        saldo_actual: 0,
        dia_corte: 15,
      }),
    })
    if (!res.ok) throw new Error(`Seed crédito: ${await res.text()}`)
  }

  if (!cuentas.some((c) => c.tipo === 'debito')) {
    const res = await restFetch(baseUrl, token, anonKey, 'cuentas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'E2E Débito',
        tipo: 'debito',
        saldo_actual: 3000,
      }),
    })
    if (!res.ok) throw new Error(`Seed débito: ${await res.text()}`)
  }
}

export async function ensureTestUser(): Promise<E2ECredentials> {
  loadEnvFile()

  const baseUrl = requireEnv('VITE_SUPABASE_URL')
  const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY')
  const email = process.env.E2E_TEST_EMAIL ?? E2E_DEFAULT_EMAIL
  const password = requireEnv('E2E_TEST_PASSWORD')

  const session = await signInOrSignUp(baseUrl, anonKey, email, password)
  await seedOnboardingData(baseUrl, session.access_token, anonKey, session.user.id)

  process.env.E2E_TEST_EMAIL = email
  process.env.E2E_TEST_PASSWORD = password

  return { email, password }
}
