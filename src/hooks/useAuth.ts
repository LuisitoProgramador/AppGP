import { useCallback, useEffect, useState } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { requestPersistentStorage } from '../utils/persistentStorage'

export default function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setLoading(false)
      if (session) void requestPersistentStorage()
    })

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
    const result = await supabase.auth.signUp({ email, password })
    if (!result.error && result.data.session) {
      await requestPersistentStorage()
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error as AuthError | null }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
  }
}
