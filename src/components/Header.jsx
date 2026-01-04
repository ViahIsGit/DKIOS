import { useMemo } from 'react'
import './Header.css'

function Header({ onMenuClick, drawerOpen, activeTab }) {
  const currentIcon = useMemo(() => {
    const map = {
      feed: 'home',
      messages: 'mail',
      camera: 'videocam',
      notifications: 'notifications',
      profile: 'person',
      friends: 'group',
      settings: 'settings'
    }
    return map[activeTab] || 'home'
  }, [activeTab])

  return (
    <header className="app-header">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <md-icon-button 
              onClick={onMenuClick}
              className="menu-button desktop-menu only-desktop"
              aria-label="Abrir menu de navegação"
              tabIndex={window.innerWidth < 960 ? -1 : 0}
              style={{ display: window.innerWidth < 960 ? 'none' : undefined }}
            >
              <md-icon>{drawerOpen ? 'close' : 'menu'}</md-icon>
            </md-icon-button>
            
          </div>

          <div className="navbar-center">
            
          </div>

          <div className="navbar-right">
            <div id="apps-anchor"></div>
            <md-icon-button aria-label="Google Apps" onClick={() => {
              const menu = document.getElementById('apps-menu')
              if (menu) menu.open = true
            }}>
              <md-icon style={{ fontSize: 27 }}>apps</md-icon>
            </md-icon-button>
            <md-menu id="apps-menu" anchor="apps-anchor">
              <md-menu-item>
                <div slot="headline">Amigos</div>
              </md-menu-item>
              <md-menu-item>
                <div slot="headline">Configurações</div>
              </md-menu-item>
              <md-menu-item>
                <div slot="headline">Sair</div>
              </md-menu-item>
            </md-menu>
                    
            <md-icon-button aria-label="Conta">
              <md-icon style={{ fontSize: 27 }}>account_circle</md-icon>
            </md-icon-button>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header

