import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthRedirectStatus = 'confirmed' | 'recovered' | 'error' | 'none'

export interface AuthRedirectResult {
  status: AuthRedirectStatus
  error: string | null
}

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'email',
  'email_change',
  'recovery',
  'invite',
  'magiclink',
])

const AUTH_PARAM_KEYS = [
  'token_hash',
  'type',
  'error',
  'error_code',
  'error_description',
]

/** Combina query (?a=b) y hash (#a=b) en un solo mapa de parámetros. */
function collectParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search)
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(rawHash)
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  return params
}

/** Quita los parámetros de auth de la URL sin recargar, para evitar reprocesarlos. */
function cleanAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  AUTH_PARAM_KEYS.forEach((key) => url.searchParams.delete(key))
  const query = url.searchParams.toString()
  const clean = `${url.origin}${url.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState({}, document.title, clean)
}

function readableError(raw: string): string {
  return decodeURIComponent(raw.replace(/\+/g, ' '))
}

/**
 * Procesa el retorno del enlace de confirmación de correo.
 *
 * - `token_hash` + `type`: verifica con verifyOtp (no requiere el dispositivo
 *   original, así que funciona aunque abras el correo en otro lado y evita que
 *   el prefetch de Gmail invalide el enlace).
 * - `error_description`: lo devuelve para mostrarlo al usuario.
 * - Enlaces implícitos (#access_token) o PKCE (?code) los resuelve supabase-js
 *   por `detectSessionInUrl`, así que aquí no se tocan.
 */
export async function handleAuthRedirect(): Promise<AuthRedirectResult> {
  const params = collectParams()

  const errorRaw = params.get('error_description') ?? params.get('error')
  if (errorRaw) {
    cleanAuthParamsFromUrl()
    return { status: 'error', error: readableError(errorRaw) }
  }

  const tokenHash = params.get('token_hash')
  const type = params.get('type') as EmailOtpType | null

  if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    cleanAuthParamsFromUrl()
    if (error) {
      return { status: 'error', error: error.message }
    }
    return { status: type === 'recovery' ? 'recovered' : 'confirmed', error: null }
  }

  return { status: 'none', error: null }
}
