import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { useTheme } from '../context/ThemeContext'
import './SettingsPage.css'

export default function SettingsPage() {
    const navigate = useNavigate()
    const { hideChrome, showChrome } = useLayout()
    const { wallpaper, setWallpaper, resetTheme } = useTheme()
    const fileInputRef = useRef(null)

    useEffect(() => {
        hideChrome()
        return () => showChrome()
    }, [hideChrome, showChrome])

    return (
        <div className="settings-page">
            <div className="settings-header">
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
                <h1>Configurações</h1>
            </div>

            <div className="settings-content">
                <div className="settings-section">
                    <h2>Conta</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>person</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Informações Pessoais</span>
                            <p>Atualize seus dados</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>lock</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Segurança</span>
                            <p>Senha e autenticação</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Preferências</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>notifications</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Notificações</span>
                            <p>Gerenciar alertas</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                    <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                            <div className="settings-item-icon">
                                <md-icon>palette</md-icon>
                            </div>
                            <div className="settings-item-text">
                                <span>Aparência</span>
                                <p>Personalize o tema com um papel de parede</p>
                            </div>
                        </div>

                        <div className="wallpaper-picker" style={{ width: '100%', marginTop: '8px' }}>
                            {wallpaper && (
                                <div style={{
                                    width: '100%',
                                    height: '150px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    marginBottom: '12px',
                                    position: 'relative'
                                }}>
                                    <img src={wallpaper} alt="Wallpaper" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <md-icon-button
                                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%' }}
                                        onClick={resetTheme}
                                    >
                                        <md-icon>delete</md-icon>
                                    </md-icon-button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setWallpaper(e.target.files[0])
                                        }
                                    }}
                                />
                                <md-filled-button
                                    onClick={() => fileInputRef.current.click()}
                                    style={{ width: '100%' }}
                                >
                                    <md-icon slot="icon">upload</md-icon>
                                    Escolher Papel de Parede
                                </md-filled-button>
                                {wallpaper && (
                                    <md-text-button onClick={resetTheme}>
                                        Resetar
                                    </md-text-button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Sobre</h2>
                    <div className="settings-item">
                        <div className="settings-item-icon">
                            <md-icon>info</md-icon>
                        </div>
                        <div className="settings-item-text">
                            <span>Sobre o App</span>
                            <p>Versão 1.0.0</p>
                        </div>
                        <md-icon>chevron_right</md-icon>
                    </div>
                </div>
            </div>
        </div>
    )
}
