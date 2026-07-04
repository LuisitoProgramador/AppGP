import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { clearOfflineQueueForUser } from '../services/offlineQueue'
import { handleAuthRedirect } from '../services/authRedirect'
import { clearLocalCachesForUser } from '../utils/localUserCache'
import { requestPersistentStorage } from '../utils/persistentStorage'
import { showError, showInfo } from '../utils/toast'

const emailRedirectTo = `${window.location.origin}/`

export default function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      const redirect = await handleAuthRedirect()
      if (!mounted) return

      if (redirect.status === 'error') {
        showError(`No se pudo validar el enlace: ${redirect.error}`)
      } else if (redirect.status === 'confirmed') {
        showInfo('Correo confirmado. ¡Bienvenido!')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!mounted) return

      setSession(session)
      setLoading(false)
      if (session) void requestPersistentStorage()
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setSession(session)
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(false)
      }
      if (event === 'SIGNED_IN' && session) {
        void requestPersistentStorage()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (!result.error && result.data.session) {
      await requestPersistentStorage()
    }
    return result
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })
    if (!result.error && result.data.session) {
      await requestPersistentStorage()
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await clearOfflineQueueForUser(user.id)
      clearLocalCachesForUser(user.id)
    }

    const { error } = await supabase.auth.signOut()
    return { error: error as AuthError | null }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: emailRedirectTo,
    })
    return { error: result.error as AuthError | null }
  }, [])

  return useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [session, loading, signIn, signUp, signOut, resetPassword],
  )
}
