import { type FormEvent, useState } from 'react'
import { useAuthContext } from '../contexts'
import { showError, showInfo } from '../utils/toast'
import { cardClassName, formWithKeyboardClassName, inputClassName, buttonPrimaryClassName, textLinkClassName } from './formStyles'

type ModoAuth = 'login' | 'register'

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
    const { error, data } = await authAction(email.trim(), password)

    setEnviando(false)

    if (error) {
      showError(`Error: ${error.message}`)
      return
    }

    if (modo === 'register') {
      if (data.session) {
        showInfo('Cuenta creada. ¡Bienvenido!')
      } else {
        showInfo('Revisa tu correo para confirmar la cuenta antes de entrar.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClassName} ${formWithKeyboardClassName}`}>
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
        className={buttonPrimaryClassName}
      >
        {enviando
          ? 'Procesando...'
          : modo === 'login'
            ? 'Entrar'
            : 'Crear cuenta y entrar'}
      </button>

      <button
        type="button"
        onClick={() => setModo(modo === 'login' ? 'register' : 'login')}
        className={textLinkClassName}
      >
        {modo === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </form>
  )
}
