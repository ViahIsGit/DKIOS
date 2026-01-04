import './BottomNav.css'
import { useMessages } from '../context/MessagesContext'
import { useRef } from 'react'

import '@material/web/icon/icon.js'
import '@material/web/fab/fab.js'

function BottomNav({ activeTab, onTabChange, onFABClick }) {
  const { totalUnreadCount } = useMessages()

  const itemRefs = useRef({})

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'home' },
    {
      id: 'messages',
      label: 'Mensagens',
      icon: 'inbox',
      badge:
        totalUnreadCount > 0
          ? totalUnreadCount > 99
            ? '99+'
            : totalUnreadCount.toString()
          : null
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: 'notifications',
      badge: '3'
    },
    { id: 'profile', label: 'Perfil', icon: 'person' }
  ]

  const playSpring = (el) => {
    if (!el) return

    el.animate(
      [
        { transform: 'scale(0.85)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ],
      {
        duration: 420,
        easing: 'cubic-bezier(.2, 1.4, .4, 1)',
      }
    )
  }

  const handleTabClick = (tabId) => {
    // 🔔 Haptic feedback (mobile)
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }

    const el = itemRefs.current[tabId]
    playSpring(el)

    onTabChange?.(tabId)
  }

  return (
    <div className="bottom-nav-wrapper">
      <nav className="bottom-nav" role="navigation" aria-label="Barra inferior">
        <div className="bottom-nav-items">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                ref={(el) => (itemRefs.current[tab.id] = el)}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                aria-label={tab.label}
                type="button"
              >
                {/* Indicador */}
                <div className={`bottom-nav-indicator ${isActive ? 'active' : ''}`} />

                {/* Ícone */}
                <md-icon
                  className="bottom-nav-icon"
                  aria-hidden="true"
                >
                  {tab.icon}
                </md-icon>

                {/* Badge */}
                {tab.badge && (
                  <span className="bottom-nav-badge" aria-hidden="true">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* FAB */}
      <md-fab
        class="bottom-nav-fab"
        aria-label="Criar"
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(15)
          onFABClick?.()
        }}
      >
        <md-icon slot="icon">add</md-icon>
      </md-fab>
    </div>
  )
}

export default BottomNav
