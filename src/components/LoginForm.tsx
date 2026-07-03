import { type FormEvent, useState } from 'react'
import { useAuthContext } from '../contexts'

type ModoAuth = 'login' | 'register'

const inputClassName =
  'w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

export default function LoginForm() {
  const { signIn, signUp } = useAuthContext()
  const [modo, setModo] = useState<ModoAuth>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEnviando(true)

    const authAction = modo === 'login' ? signIn : signUp
    const { error } = await authAction(email.trim(), password)

    setEnviando(false)

    if (error) {
      alert(`Error: ${error.message}`)
      return
    }

    if (modo === 'register') {
      alert('Cuenta creada. Revisa tu correo si Supabase requiere confirmación.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 shadow-xl shadow-black/20 backdrop-blur-sm"
    >
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-semibold text-white">
          {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="text-sm text-slate-400">
          {modo === 'login'
            ? 'Accede para registrar tus gastos'
            : 'Regístrate para empezar a controlar tu presupuesto'}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-blue-500 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando
          ? 'Procesando...'
          : modo === 'login'
            ? 'Entrar'
            : 'Registrarse'}
      </button>

      <button
        type="button"
        onClick={() => setModo(modo === 'login' ? 'register' : 'login')}
        className="w-full text-sm text-slate-400 transition hover:text-white"
      >
        {modo === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </form>
  )
}
