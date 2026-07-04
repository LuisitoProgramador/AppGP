import { type FormEvent, useState, memo } from 'react'
import { useAuthActions } from '../../contexts'
import { formatAuthError } from '../../utils/core/authErrors'
import { showError, showInfo, showSuccess } from '../../utils/core/toast'
import {
  cardClassName,
  formWithKeyboardClassName,
  iconButtonClassName,
  inputClassName,
  buttonPrimaryClassName,
  textLinkClassName,
} from '../ui/formStyles'
import { EyeIcon, EyeOffIcon } from '../ui/icons'

type ModoAuth = 'login' | 'register'

export default memo(function LoginForm() {
  const { signIn, signUp, resetPassword } = useAuthActions()
  const [modo, setModo] = useState<ModoAuth>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEnviando(true)

    const authAction = modo === 'login' ? signIn : signUp
    const { error, data } = await authAction(email.trim(), password)

    setEnviando(false)

    if (error) {
      showError(formatAuthError(error, modo))
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

  async function handleForgotPassword() {
    const correo = email.trim()
    if (!correo) {
      showError('Escribe tu correo arriba para enviarte el enlace de recuperación.')
      return
    }

    setEnviandoReset(true)
    const { error } = await resetPassword(correo)
    setEnviandoReset(false)

    if (error) {
      showError('No pudimos enviar el enlace. Verifica el correo e inténtalo de nuevo.')
      return
    }

    showSuccess('Revisa tu correo para restablecer la contraseña.')
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
        <div className="relative">
          <input
            id="password"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClassName} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((visible) => !visible)}
            className={`${iconButtonClassName} absolute top-1/2 right-1 -translate-y-1/2 text-slate-400 hover:text-white`}
            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {modo === 'login' && (
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={enviandoReset}
          className="text-left text-sm text-slate-400 transition hover:text-white"
        >
          {enviandoReset ? 'Enviando enlace...' : '¿Olvidaste tu contraseña?'}
        </button>
      )}

      <button type="submit" disabled={enviando} className={buttonPrimaryClassName}>
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
})
