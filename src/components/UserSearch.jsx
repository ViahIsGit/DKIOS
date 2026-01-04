import { useEffect, useState, useRef } from 'react'
import { getAllUsers } from '../services/messages'
import { getOrCreateConversation } from '../services/messages'
import './UserSearch.css'

function UserSearch({ isOpen, onClose, currentUser, onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const searchInputRef = useRef(null)

  // Buscar usuários quando o componente abrir
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen || !currentUser) {
        setAllUsers([])
        return
      }
      
      setLoadingUsers(true)
      try {
        const users = await getAllUsers(currentUser.uid, searchQuery)
        setAllUsers(users)
      } catch (error) {
        console.error("Erro ao carregar usuários:", error)
      } finally {
        setLoadingUsers(false)
      }
    }
    
    loadUsers()
  }, [isOpen, searchQuery, currentUser])

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSelectUser = async (userId) => {
    if (!currentUser) return
    
    try {
      const conversationId = await getOrCreateConversation(currentUser.uid, userId)
      if (conversationId && onSelectUser) {
        onSelectUser(conversationId)
      }
      onClose()
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="user-search-overlay" onClick={onClose}>
      <div className="user-search-container" onClick={(e) => e.stopPropagation()}>
        <div className="user-search-header">
          <md-icon-button 
            aria-label="Fechar"
            onClick={onClose}
          >
            <md-icon>arrow_back</md-icon>
          </md-icon-button>
          <h2>Nova Conversa</h2>
          <div style={{ width: '48px' }}></div>
        </div>

        <div className="user-search-content">
          <div className="user-search-input-wrapper">
            <md-icon className="search-icon">search</md-icon>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar usuários"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search-input"
            />
            {searchQuery && (
              <md-icon-button 
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                <md-icon>close</md-icon>
              </md-icon-button>
            )}
          </div>
          
          <div className="user-search-results">
            {loadingUsers ? (
              <div className="user-search-loading">
                <md-circular-progress indeterminate></md-circular-progress>
                <p>Carregando usuários...</p>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="user-search-empty">
                <md-icon style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>
                  {searchQuery ? 'search_off' : 'person_search'}
                </md-icon>
                <p>{searchQuery ? 'Nenhum usuário encontrado' : 'Digite para buscar usuários'}</p>
              </div>
            ) : (
              <div className="user-search-list">
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    className="user-search-item"
                  >
                    <div className="user-search-avatar">
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                      />
                    </div>
                    <div className="user-search-info">
                      <div className="user-search-name">{user.username}</div>
                      {user.bio && (
                        <div className="user-search-bio">{user.bio}</div>
                      )}
                    </div>
                    <md-icon className="user-search-arrow">arrow_forward</md-icon>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserSearch

