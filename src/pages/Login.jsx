import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import './Login.css'

function getFriendlyError(code) {
  const map = {
    'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.',
    'auth/invalid-email': 'Formato de email inválido.',
    'auth/user-disabled': 'Conta desativada. Procure o suporte.',
    'auth/user-not-found': 'Não encontramos uma conta com esse email.',
    'auth/wrong-password': 'Senha incorreta. Tente novamente.',
    'auth/popup-closed-by-user': 'O pop-up foi fechado antes da autenticação.',
    'auth/cancelled-popup-request': 'Finalizamos o pop-up anterior. Tente novamente.'
  }

  return map[code] || 'Não foi possível entrar agora. Tente novamente mais tarde.'
}

export default function Login({ onShowRegister, onShowForgot }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const canSubmit = useMemo(
    () => form.email.trim() !== '' && form.password.trim() !== '' && !loading,
    [form, loading]
  )

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setFieldErrors({ email: '', password: '' })

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password)
      window.localStorage.setItem('logged', 'true')
    } catch (authError) {
      const friendly = getFriendlyError(authError.code)
      switch (authError.code) {
        case 'auth/invalid-email':
          setFieldErrors((prev) => ({ ...prev, email: friendly }))
          break
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setFieldErrors((prev) => ({ ...prev, password: friendly }))
          break
        default:
          setError(friendly)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-panel">
      <header className="login-header">
  <div className="brand-mark">
    <div className="brand-copy">
      <span className="brand-subtitle">Bem-vindo ao DK!</span>
      <strong className="brand-title">Sua nova experiência social</strong>
    </div>
  </div>

  <p className="brand-description">
  🌎 Explore novos criadores e tendências.<br />
  🎥 Publique reels e conteúdos dinâmicos.<br />
  ⚡ Interaja em tempo real, rápido e sem limites.
</p>


</header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-label">Email de acesso</label>
          <md-filled-text-field
            type="email"
            value={form.email}
            label="nome@empresa.com"
            onInput={handleChange('email')}
            required
            autoComplete="email"
            name="email"
            error={Boolean(fieldErrors.email)}
            supportingText={fieldErrors.email}
          >
            <md-icon slot="leading-icon">mail</md-icon>
          </md-filled-text-field>

          <label className="form-label">Senha</label>
          <md-filled-text-field
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            label="Digite sua senha"
            onInput={handleChange('password')}
            required
            autoComplete="current-password"
            name="password"
            error={Boolean(fieldErrors.password)}
            supportingText={fieldErrors.password}
          >
            <md-icon slot="leading-icon">lock</md-icon>
            <md-icon-button
              slot="trailing-icon"
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <md-icon>{showPassword ? 'visibility' : 'visibility_off'}</md-icon>
            </md-icon-button>
          </md-filled-text-field>

          <div className="form-meta">
            <button type="button" className="ghost-link" onClick={() => navigate('/forgot-password')}>
              Esqueci minha senha
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <md-filled-button type="submit">
            {loading ? 'Entrando...' : 'Entrar'}
          </md-filled-button>

          {loading && (
            <md-linear-progress indeterminate className="login-progress"></md-linear-progress>
          )}
        </form>

        <footer className="login-footer">
          <span>Ainda não tem conta?</span>
          <button type="button" className="ghost-link" onClick={() => navigate('/register')}>
            Criar nova conta
          </button>
        </footer>
      </section>
    </div>
  )
}


