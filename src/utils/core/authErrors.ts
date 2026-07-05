import type { AuthError } from '@supabase/supabase-js'

const AUTH_ERROR_BY_CODE: Record<string, string> = {
  invalid_credentials:
    'Correo o contraseña incorrectos. Si aún no tienes cuenta, regístrate abajo.',
  email_not_confirmed:
    'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  user_already_exists:
    'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.',
  weak_password: 'La contraseña debe tener al menos 6 caracteres.',
  validation_failed: 'Revisa tus datos e inténtalo de nuevo.',
  signup_disabled: 'El registro no está disponible en este momento.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
}

const AUTH_ERROR_BY_MESSAGE: Record<string, string> = {
  'Invalid login credentials':
    'Correo o contraseña incorrectos. Si aún no tienes cuenta, regístrate abajo.',
  'Email not confirmed':
    'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  'User already registered':
    'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.',
  'Password should be at least 6 characters':
    'La contraseña debe tener al menos 6 caracteres.',
  'Signup requires a valid password':
    'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email address: invalid format':
    'El correo no tiene un formato válido.',
}

export function formatAuthError(error: AuthError, modo: 'login' | 'register'): string {
  if (error.code && AUTH_ERROR_BY_CODE[error.code]) {
    return AUTH_ERROR_BY_CODE[error.code]
  }

  const mapped = AUTH_ERROR_BY_MESSAGE[error.message]
  if (mapped) return mapped

  if (modo === 'login') {
    return 'No pudimos iniciar sesión. Verifica tus datos o regístrate si es tu primera vez.'
  }

  return 'No pudimos crear tu cuenta. Revisa tus datos e inténtalo de nuevo.'
}
