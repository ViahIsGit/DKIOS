import { useEffect, useMemo, useState } from 'react'
import { collection, db, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from '../firebase/config'
import './PostSignup.css'

function compressImageToBase64(file, maxSize = 512, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > width && height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        } else if (width === height && width > maxSize) {
          width = maxSize
          height = maxSize
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PostSignup({ details, onProfileUpdated, onLogout }) {
  if (!details?.uid) {
    return null
  }

  const [form, setForm] = useState({
    username: details?.username || details?.fullName || '',
    userHandle: details?.userHandle || '',
    bio: details?.bio || '',
    status: details?.status || '',
    link: details?.link || ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(details?.avatarBase64 || '')
  const [avatarBase64, setAvatarBase64] = useState(details?.avatarBase64 || '')
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    setForm({
      username: details?.username || details?.fullName || '',
      userHandle: details?.userHandle || '',
      bio: details?.bio || '',
      status: details?.status || '',
      link: details?.link || ''
    })
    setAvatarPreview(details?.avatarBase64 || '')
    setAvatarBase64(details?.avatarBase64 || '')
    setAvatarError('')
  }, [details])

  const cleanHandle = form.userHandle.trim().replace(/^@+/, '').toLowerCase()

  const canSubmit = useMemo(() => {
    return (
      form.username.trim().length >= 3 &&
      cleanHandle.length >= 3 &&
      form.bio.trim().length >= 10 &&
      !loading
    )
  }, [form, cleanHandle, loading])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarError('')

    try {
      const base64 = await compressImageToBase64(file)
      setAvatarBase64(base64)
      setAvatarPreview(base64)
    } catch (compressionError) {
      console.error('Erro ao comprimir avatar', compressionError)
      setAvatarError('Não foi possível processar a imagem. Tente outro arquivo.')
    }
  }

  const validateForm = () => {
    const nextErrors = {}
    if (form.username.trim().length < 3) {
      nextErrors.username = 'Use pelo menos 3 caracteres.'
    }
    if (cleanHandle.length < 3) {
      nextErrors.userHandle = 'O @ precisa ter pelo menos 3 caracteres.'
    }
    if (form.bio.trim().length < 10) {
      nextErrors.bio = 'Conte-nos mais sobre você (mínimo 10 caracteres).'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setSuccess(false)

    try {
      const handleQuery = query(
        collection(db, 'users'),
        where('userHandle', '==', cleanHandle),
        limit(1)
      )
      const snapshot = await getDocs(handleQuery)

      const handleTaken =
        !snapshot.empty && snapshot.docs.some((docSnapshot) => docSnapshot.id !== details?.uid)

      if (handleTaken) {
        setErrors((prev) => ({
          ...prev,
          userHandle: 'Este @ já está em uso.'
        }))
        setLoading(false)
        return
      }

      await setDoc(
        doc(db, 'users', details.uid),
        {
          username: form.username.trim(),
          userHandle: cleanHandle,
          bio: form.bio.trim(),
          status: form.status.trim() || null,
          link: form.link.trim() || null,
          avatarBase64: avatarBase64 || null,
          profileSetupCompleted: true,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )

      setSuccess(true)
      onProfileUpdated?.()
    } catch (error) {
      console.error('Erro ao salvar perfil', error)
      setErrors((prev) => ({
        ...prev,
        form: 'Não foi possível salvar agora. Tente novamente.'
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="postsignup-page">
      <div className="postsignup-card">
        <div className="pulse-ring" aria-hidden="true"></div>
        <header>
          <span className="eyebrow">Só falta isso</span>
          <h1>Bora deixar seu perfil com a sua cara</h1>
          <p>
            Foto, @ e uma bio estilosa são tudo o que a galera precisa pra encontrar você na DK. Coisa rápida,
            estilo rede social mesmo.
          </p>
        </header>

        <form className="postsignup-form" onSubmit={handleSubmit}>
          <div className="media-upload">
            <label htmlFor="avatarUpload" className="avatar-field">
              <input
                type="file"
                id="avatarUpload"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Prévia do avatar" />
                ) : (
                  <md-icon>photo_camera</md-icon>
                )}
              </div>
              <div className="media-copy">
                <strong>Foto de perfil</strong>
                <span>JPEG ou PNG, até 10MB.</span>
              </div>
            </label>

            {avatarError && <div className="form-error">{avatarError}</div>}

            {details?.userHandle && (
              <div className="profile-hint">
                <md-icon>info</md-icon>
                <span>Se já possuía avatar, ele será substituído após salvar.</span>
              </div>
            )}
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="form-label">Nome público</label>
              <md-filled-text-field
                value={form.username}
                onInput={handleChange('username')}
                label="Ex: Daniela Kerber"
                supportingText={errors.username}
                error={Boolean(errors.username)}
                required
              >
                <md-icon slot="leading-icon">badge</md-icon>
              </md-filled-text-field>
            </div>

            <div className="field-group">
              <label className="form-label">@UserHandle</label>
              <md-filled-text-field
                value={form.userHandle}
                onInput={handleChange('userHandle')}
                label="@seuuser"
                supportingText={errors.userHandle || 'Sem espaços. Use letras, números ou ponto.'}
                error={Boolean(errors.userHandle)}
                required
              >
                <md-icon slot="leading-icon">alternate_email</md-icon>
              </md-filled-text-field>
            </div>
          </div>

          <div className="field-group">
            <label className="form-label">Bio</label>
            <md-filled-text-field
              value={form.bio}
              onInput={handleChange('bio')}
              label="Conte sua história em poucas linhas"
              supportingText={errors.bio || 'Mínimo de 10 caracteres.'}
              error={Boolean(errors.bio)}
              rows={3}
              textarea="true"
              required
            >
              <md-icon slot="leading-icon">edit</md-icon>
            </md-filled-text-field>
          </div>

          <div className="quick-fields">
            <div className="field-group">
              <label className="form-label">Status do momento</label>
              <md-filled-text-field
                value={form.status}
                onInput={handleChange('status')}
                label="Ex: Produzindo novos beats 🔥"
              >
                <md-icon slot="leading-icon">mood</md-icon>
              </md-filled-text-field>
            </div>
            <div className="field-group">
              <label className="form-label">Link favorito</label>
              <md-filled-text-field
                value={form.link}
                onInput={handleChange('link')}
                label="instagram.com/seuuser"
              >
                <md-icon slot="leading-icon">link</md-icon>
              </md-filled-text-field>
            </div>
          </div>

          {errors.form && <div className="form-error">{errors.form}</div>}
          {success && (
            <div className="form-success">
              <md-icon>check_circle</md-icon>
              <span>Perfil salvo! Você será redirecionado em instantes.</span>
            </div>
          )}

          <div className="postsignup-actions">
            <md-filled-button type="submit" >
              {loading ? 'Salvando...' : 'Salvar perfil e continuar'}
            </md-filled-button>
            <button type="button" className="ghost-link" onClick={onLogout}>
              Encerrar sessão
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
