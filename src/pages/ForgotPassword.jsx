import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import './ForgotPassword.css'

export default function ForgotPassword({ onShowLogin, onShowRegister }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => email.trim() !== '' && !loading, [email, loading])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setStatus('idle')
    setError('')

    try {
      await sendPasswordResetEmail(auth, email)
      setStatus('sent')
    } catch (authError) {
      setError('Não foi possível enviar o email agora. Verifique o endereço informado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recover-page">
      <div className="recover-card">
        <header className="recover-header">
          <div className="recover-icon">
            <md-icon>lock_reset</md-icon>
          </div>
          <h1>Recupere seu acesso</h1>
          <p>Enviaremos um email com instruções para redefinir sua senha.</p>
        </header>

        <form className="recover-form" onSubmit={handleSubmit}>
          <label className="form-label">Email cadastrado</label>
          <md-filled-text-field
            type="email"
            value={email}
            onInput={(event) => setEmail(event.target.value)}
            label="voce@email.com"
            required
          >
            <md-icon slot="leading-icon">alternate_email</md-icon>
          </md-filled-text-field>

          {error && <div className="form-error">{error}</div>}

          {status === 'sent' && (
            <div className="recover-success">
              <md-icon>mark_email_read</md-icon>
              <div>
                <strong>Verifique sua caixa de entrada</strong>
                <p>
                  Caso não encontre o email, revise seu spam ou aguarde alguns minutos antes de tentar
                  novamente.
                </p>
              </div>
            </div>
          )}

          <md-filled-button type="submit">
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </md-filled-button>
        </form>

        <footer className="recover-footer">
          <button type="button" className="ghost-link" onClick={() => navigate('/login')}>
            Voltar para login
          </button>
          <button type="button" className="ghost-link" onClick={() => navigate('/register')}>
            Criar nova conta
          </button>
        </footer>
      </div>
    </div>
  )
}



