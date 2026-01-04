import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useLayout } from '../context/LayoutContext'
import { sourceColorFromImage, hexFromArgb, themeFromSourceColor, argbFromHex } from '@material/material-color-utilities'
import './EditProfile.css'

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

export default function EditProfile() {
    const navigate = useNavigate()
    const { hideChrome, showChrome } = useLayout()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    const [form, setForm] = useState({
        username: '',
        userHandle: '',
        bio: '',
        link: ''
    })

    const [bannerMode, setBannerMode] = useState('auto') // 'auto' | 'custom'
    const [bannerColor, setBannerColor] = useState('#6750a4') // default M3 purple

    const [avatarPreview, setAvatarPreview] = useState('')
    const [avatarBase64, setAvatarBase64] = useState('')

    useEffect(() => {
        hideChrome()
        return () => showChrome()
    }, [hideChrome, showChrome])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser)
                try {
                    const userRef = doc(db, 'users', currentUser.uid)
                    const userSnap = await getDoc(userRef)
                    if (userSnap.exists()) {
                        const data = userSnap.data()
                        setForm({
                            username: data.username || '',
                            userHandle: data.userHandle || '',
                            bio: data.bio || '',
                            link: data.link || ''
                        })
                        setBannerMode(data.bannerMode || 'auto')
                        setBannerColor(data.bannerColor || '#6750a4')
                        setAvatarPreview(data.avatarBase64 || '')
                        setAvatarBase64(data.avatarBase64 || '')
                    }
                } catch (error) {
                    console.error('Erro ao carregar dados:', error)
                }
            } else {
                navigate('/login')
            }
            setLoading(false)
        })
        return () => unsubscribe()
    }, [navigate])

    const handleChange = (field) => (event) => {
        const value = event.target.value
        setForm(prev => ({ ...prev, [field]: value }))
        setErrors(prev => ({ ...prev, [field]: '' }))
    }

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            const base64 = await compressImageToBase64(file)
            setAvatarBase64(base64)
            setAvatarPreview(base64)

            if (bannerMode === 'auto') {
                const img = new Image()
                img.src = base64
                await new Promise(resolve => img.onload = resolve)
                const color = await sourceColorFromImage(img)
                setBannerColor(hexFromArgb(color))
            }
        } catch (error) {
            console.error('Erro ao processar imagem:', error)
            setErrors(prev => ({ ...prev, avatar: 'Erro ao processar imagem' }))
        }
    }

    const handleBannerModeChange = async (mode) => {
        setBannerMode(mode)
        if (mode === 'auto' && avatarPreview) {
            const img = new Image()
            img.src = avatarPreview
            await new Promise(resolve => img.onload = resolve)
            const color = await sourceColorFromImage(img)
            setBannerColor(hexFromArgb(color))
        }
    }

    const validateForm = () => {
        const newErrors = {}
        if (form.username.trim().length < 3) newErrors.username = 'Mínimo de 3 caracteres'
        if (form.userHandle.trim().length < 3) newErrors.userHandle = 'Mínimo de 3 caracteres'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm() || !user) return

        setSaving(true)
        try {
            // Check if handle is taken (if changed)
            const cleanHandle = form.userHandle.trim().toLowerCase().replace(/^@/, '')

            // Update user doc
            const userRef = doc(db, 'users', user.uid)
            await setDoc(userRef, {
                username: form.username.trim(),
                userHandle: cleanHandle,
                bio: form.bio.trim(),
                link: form.link.trim(),
                avatarBase64: avatarBase64,
                bannerMode,
                bannerColor,
                updatedAt: serverTimestamp()
            }, { merge: true })

            navigate('/u')
        } catch (error) {
            console.error('Erro ao salvar:', error)
            setErrors(prev => ({ ...prev, form: 'Erro ao salvar alterações' }))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="edit-profile-page">
                <md-circular-progress indeterminate></md-circular-progress>
            </div>
        )
    }

    return (
        <div className="edit-profile-page">
            <div className="edit-profile-container">
                <header className="edit-profile-top-bar">
                    <md-icon-button onClick={() => navigate('/u')}>
                        <md-icon>arrow_back</md-icon>
                    </md-icon-button>
                    <h1>Editar Perfil</h1>
                    <div className="top-bar-actions">
                        {/* Placeholder for balance or extra actions */}
                    </div>
                </header>

                <form className="edit-profile-content" onSubmit={handleSubmit}>
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            <label className="avatar-touch-target">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="avatar-image" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        <md-icon>add_a_photo</md-icon>
                                    </div>
                                )}
                                <div className="avatar-badge">
                                    <md-icon>edit</md-icon>
                                </div>
                            </label>
                        </div>
                        <p className="avatar-helper-text">Toque para alterar a foto</p>
                    </div>

                    <div className="banner-customization-section">
                        <h3>Personalização do Banner</h3>
                        <div className="banner-options">
                            <div
                                className={`banner-option ${bannerMode === 'auto' ? 'selected' : ''}`}
                                onClick={() => handleBannerModeChange('auto')}
                            >
                                <md-icon>auto_awesome</md-icon>
                                <span>Automático</span>
                            </div>
                            <div
                                className={`banner-option ${bannerMode === 'custom' ? 'selected' : ''}`}
                                onClick={() => handleBannerModeChange('custom')}
                            >
                                <md-icon>palette</md-icon>
                                <span>Personalizado</span>
                            </div>
                        </div>

                        {bannerMode === 'custom' && (
                            <div className="color-picker-container">
                                <label>Cor do Banner</label>
                                <div className="color-input-wrapper">
                                    <input
                                        type="color"
                                        value={bannerColor}
                                        onChange={(e) => setBannerColor(e.target.value)}
                                    />
                                    <span className="color-value">{bannerColor}</span>
                                </div>
                            </div>
                        )}

                        <div className="banner-preview" style={{ background: bannerColor }}>
                            <div className="banner-preview-overlay"></div>
                            <span>Pré-visualização</span>
                        </div>
                    </div>

                    <div className="form-fields">
                        <md-filled-text-field
                            label="Nome"
                            value={form.username}
                            onInput={handleChange('username')}
                            error={!!errors.username}
                            supportingText={errors.username}
                            className="full-width-field"
                        >
                            <md-icon slot="leading-icon">badge</md-icon>
                        </md-filled-text-field>

                        <md-filled-text-field
                            label="Usuário (@)"
                            value={form.userHandle}
                            onInput={handleChange('userHandle')}
                            error={!!errors.userHandle}
                            supportingText={errors.userHandle}
                            className="full-width-field"
                        >
                            <md-icon slot="leading-icon">alternate_email</md-icon>
                        </md-filled-text-field>

                        <md-filled-text-field
                            label="Bio"
                            value={form.bio}
                            onInput={handleChange('bio')}
                            type="textarea"
                            rows="3"
                            className="full-width-field"
                        >
                            <md-icon slot="leading-icon">edit</md-icon>
                        </md-filled-text-field>

                        <md-filled-text-field
                            label="Link"
                            value={form.link}
                            onInput={handleChange('link')}
                            placeholder="https://"
                            className="full-width-field"
                        >
                            <md-icon slot="leading-icon">link</md-icon>
                        </md-filled-text-field>
                    </div>

                    {errors.form && <div className="form-error-banner">{errors.form}</div>}

                    <div className="form-fab-container">
                        <md-fab
                            variant="primary"
                            label={saving ? "Salvando..." : "Salvar"}
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            <md-icon slot="icon">save</md-icon>
                        </md-fab>
                    </div>
                </form>
            </div>
        </div>
    )
}
