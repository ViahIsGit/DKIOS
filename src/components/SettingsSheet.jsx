import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { useLayout } from '../context/LayoutContext'
import './SettingsSheet.css'

export default function SettingsSheet({ isOpen, onClose, profileUrl, onLogout }) {
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const { hideChrome, showChrome } = useLayout()
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen) {
            hideChrome()
        } else {
            showChrome()
        }

        // Cleanup when component unmounts or isOpen changes
        return () => {
            if (isOpen) {
                showChrome()
            }
        }
    }, [isOpen, hideChrome, showChrome])

    useEffect(() => {
        if (isOpen && profileUrl) {
            QRCode.toDataURL(profileUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            })
                .then(url => setQrCodeUrl(url))
                .catch(err => console.error('Error generating QR code', err))
        }
    }, [isOpen, profileUrl])

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Meu Perfil',
                    text: 'Confira meu perfil!',
                    url: profileUrl
                })
            } catch (error) {
                console.error('Error sharing', error)
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(profileUrl)
            alert('Link copiado para a área de transferência!')
        }
    }

    const handleSettings = () => {
        onClose()
        navigate('/settings')
    }

    if (!isOpen) return null

    return (
        <div className="settings-sheet-overlay" onClick={onClose}>
            <div className="settings-sheet-container" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle-bar">
                    <div className="sheet-handle"></div>
                </div>

                <div className="sheet-content">
                    <h3>Compartilhar Perfil</h3>

                    <div className="qr-code-container">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code do Perfil" />}
                    </div>

                    <div className="sheet-actions">
                        <md-filled-tonal-button onClick={handleShare} className="sheet-btn">
                            <md-icon slot="icon">share</md-icon>
                            Compartilhar
                        </md-filled-tonal-button>

                        <div className="divider"></div>

                        <md-outlined-button onClick={handleSettings} className="sheet-btn">
                            <md-icon slot="icon">settings</md-icon>
                            Configurações
                        </md-outlined-button>

                        <md-outlined-button onClick={onLogout} className="sheet-btn logout-btn">
                            <md-icon slot="icon">logout</md-icon>
                            Sair
                        </md-outlined-button>
                    </div>
                </div>
            </div>
        </div>
    )
}
