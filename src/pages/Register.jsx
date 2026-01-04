import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db, doc, serverTimestamp, setDoc } from '../firebase/config'
import './Register.css'

const benefitTiles = [
  { id: 'metrics', icon: 'insights', label: 'Analytics em tempo real' },
  { id: 'studio', icon: 'palette', label: 'Studio de criação' },
  { id: 'collab', icon: 'diversity_3', label: 'Squads colaborativos' }
]

function getFriendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'Já existe uma conta com esse email.',
    'auth/invalid-email': 'Formato de email inválido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/operation-not-allowed': 'Cadastro temporariamente indisponível.'
  }
  return map[code] || 'Não foi possível criar sua conta agora. Tente novamente.'
}

export default function Register({ onShowLogin, onShowForgot }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    code: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = form.password.trim() !== '' && form.password === form.confirm

  const canSubmit = useMemo(() => {
    return (
      form.name.trim() !== '' &&
      form.email.trim() !== '' &&
      form.password.trim().length >= 6 &&
      passwordsMatch &&
      !loading
    )
  }, [form, loading, passwordsMatch])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
      if (form.name.trim()) {
        await updateProfile(user, { displayName: form.name.trim() })
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          fullName: form.name.trim(),
          email: form.email.trim(),
          inviteCode: form.code || null,
          profileSetupCompleted: false,
          createdAt: serverTimestamp()
        },
        { merge: true }
      )
    } catch (authError) {
      setError(getFriendlyError(authError.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-shell">
        <section className="register-info">
          <div className="info-header">
            <span className="eyebrow">Convite beta</span>
            <h1>Crie sua conta DK Material</h1>
            <p>Configure seu perfil creator e libere acesso ao feed experimental.</p>
          </div>

          <div className="info-grid">
            {benefitTiles.map((tile) => (
              <md-elevated-card key={tile.id} className="info-card">
                <md-icon>{tile.icon}</md-icon>
                <span>{tile.label}</span>
              </md-elevated-card>
            ))}
          </div>

          <div className="info-footer">
            <md-icon>shield</md-icon>
            <p>Todos os cadastros passam por revisão humana para manter a comunidade segura.</p>
          </div>
        </section>

        <section className="register-form-panel">
          <header className="register-header">
            <div>
              <h2>Comece informando seus dados</h2>
              <p>Usaremos essas informações para personalizar sua experiência.</p>
            </div>
            <button type="button" className="ghost-link" onClick={() => navigate('/login')}>
              Já tenho conta
            </button>
          </header>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="form-label">Nome completo</label>
              <md-filled-text-field
                value={form.name}
                onInput={handleChange('name')}
                label="Como deseja ser chamado"
                required
              >
                <md-icon slot="leading-icon">badge</md-icon>
              </md-filled-text-field>
            </div>

            <div className="field-group">
              <label className="form-label">Email</label>
              <md-filled-text-field
                type="email"
                value={form.email}
                onInput={handleChange('email')}
                label="voce@email.com"
                required
              >
                <md-icon slot="leading-icon">alternate_email</md-icon>
              </md-filled-text-field>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="form-label">Senha</label>
                <md-filled-text-field
                  type="password"
                  value={form.password}
                  onInput={handleChange('password')}
                  label="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                >
                  <md-icon slot="leading-icon">lock</md-icon>
                </md-filled-text-field>
              </div>

              <div className="field-group">
                <label className="form-label">Confirmar senha</label>
                <md-filled-text-field
                  type="password"
                  value={form.confirm}
                  onInput={handleChange('confirm')}
                  label="Repita a senha"
                  required
                  autoComplete="new-password"
                  error={!passwordsMatch && form.confirm.trim() !== ''}
                  errorText="As senhas não coincidem"
                >
                  <md-icon slot="leading-icon">check_circle</md-icon>
                </md-filled-text-field>
              </div>
            </div>

            <div className="field-group">
              <label className="form-label">Código de convite (opcional)</label>
              <md-filled-text-field
                value={form.code}
                onInput={handleChange('code')}
                label="#CREATOR"
              >
                <md-icon slot="leading-icon">key</md-icon>
              </md-filled-text-field>
            </div>

            {error && <div className="form-error">{error}</div>}

            <md-filled-button type="submit" >
              {loading ? 'Criando...' : 'Criar conta'}
            </md-filled-button>

            <button type="button" className="ghost-link" onClick={() => navigate('/forgot-password')}>
              Precisa recuperar o acesso?
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}


