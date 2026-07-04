import type { AuthError } from '@supabase/supabase-js'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
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
  const mapped = AUTH_ERROR_MESSAGES[error.message]
  if (mapped) return mapped

  if (modo === 'login') {
    return 'No pudimos iniciar sesión. Verifica tus datos o regístrate si es tu primera vez.'
  }

  return 'No pudimos crear tu cuenta. Revisa tus datos e inténtalo de nuevo.'
}
