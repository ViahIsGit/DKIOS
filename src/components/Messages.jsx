import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { useMessages } from '../context/MessagesContext'
import { auth, onAuthStateChanged } from '../firebase/config'
import {
  getFriends,
  getOrCreateConversation,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  getConversations,
  subscribeToConversations,
  uploadMessageMedia,
  deleteMessage,
  blockUser,
  unblockUser,
  isUserBlocked,
  setConversationNickname,
  getConversationNickname
} from '../services/messages'
import { getUserProfile } from '../services/reels'
import UserSearch from './UserSearch'
import EmojiPicker from './EmojiPicker'
import './Messages.css'

function Messages() {
  const navigate = useNavigate()
  const { hideChrome, showChrome } = useLayout()
  const { conversations } = useMessages()
  const [activeChatId, setActiveChatId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [friends, setFriends] = useState([])
  // const [conversations, setConversations] = useState([]) // Removed local state
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFriend, setActiveFriend] = useState(null)
  const [typing, setTyping] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [customNickname, setCustomNickname] = useState(null)
  const [conversationNicknames, setConversationNicknames] = useState({}) // { conversationId: { userId: nickname } }
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const unsubscribeMessagesRef = useRef(null)
  // const unsubscribeConversationsRef = useRef(null) // Removed ref
  const menuRef = useRef(null)
  const nicknameDialogRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  // Carregar amigos quando o usuário mudar
  useEffect(() => {
    const loadFriends = async () => {
      if (!currentUser) {
        setFriends([])
        return
      }

      try {
        const friendsList = await getFriends(currentUser.uid)
        setFriends(friendsList)
      } catch (error) {
        console.error("Erro ao carregar amigos:", error)
      }
    }

    loadFriends()
  }, [currentUser])

  // Escutar conversas em tempo real - Substituído pelo Context
  useEffect(() => {
    if (!currentUser || conversations.length === 0) return

    // Carregar nicknames de todas as conversas
    const loadNicknames = async () => {
      const nicknamesMap = {}
      for (const conv of conversations) {
        const otherUserId = conv.participants.find(id => id !== currentUser.uid)
        if (otherUserId) {
          try {
            const nickname = await getConversationNickname(conv.id, currentUser.uid, otherUserId)
            if (nickname) {
              if (!nicknamesMap[conv.id]) {
                nicknamesMap[conv.id] = {}
              }
              nicknamesMap[conv.id][otherUserId] = nickname
            }
          } catch (error) {
            console.error("Erro ao carregar nickname:", error)
          }
        }
      }
      setConversationNicknames(nicknamesMap)
    }

    loadNicknames()
  }, [currentUser, conversations])

  // Escutar mensagens quando uma conversa está ativa
  useEffect(() => {
    if (!activeChatId || !currentUser) {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current()
        unsubscribeMessagesRef.current = null
      }
      setMessages([])
      return
    }

    unsubscribeMessagesRef.current = subscribeToMessages(activeChatId, (msgs) => {
      setMessages(msgs)
      // Marcar mensagens como lidas
      const unreadIds = msgs
        .filter(m => m.senderId !== currentUser.uid && !m.readBy?.includes(currentUser.uid))
        .map(m => m.id)
      if (unreadIds.length > 0) {
        markMessagesAsRead(activeChatId, currentUser.uid, unreadIds)
      }
    })

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current()
      }
    }
  }, [activeChatId, currentUser])

  // Scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (activeChatId) {
      hideChrome()
      const newUrl = `/chat/${activeChatId}`
      window.history.pushState({}, '', newUrl)
    } else {
      showChrome()
      const newUrl = `/messages`
      window.history.pushState({}, '', newUrl)
    }
    return () => {
      showChrome()
    }
  }, [activeChatId, hideChrome, showChrome])

  // Carregar informações do amigo ativo
  useEffect(() => {
    const loadActiveFriend = async () => {
      if (!activeChatId || !currentUser) {
        setActiveFriend(null)
        setIsBlocked(false)
        setCustomNickname(null)
        return
      }

      try {
        const conv = conversations.find(c => c.id === activeChatId)
        if (conv) {
          const otherUserId = conv.participants.find(id => id !== currentUser.uid)
          if (otherUserId) {
            const userProfile = await getUserProfile(otherUserId)
            const blocked = await isUserBlocked(currentUser.uid, otherUserId)
            const nickname = await getConversationNickname(activeChatId, currentUser.uid, otherUserId)

            setIsBlocked(blocked)
            setCustomNickname(nickname)

            setActiveFriend({
              id: otherUserId,
              username: userProfile?.username || 'Usuário',
              avatar: userProfile?.profilePicture || '/feed/logo.png',
              ...userProfile
            })
          }
        }
      } catch (error) {
        console.error("Erro ao carregar amigo ativo:", error)
      }
    }

    loadActiveFriend()
  }, [activeChatId, conversations, currentUser])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Controlar dialog de nickname
  useEffect(() => {
    if (nicknameDialogRef.current) {
      if (showNicknameDialog) {
        nicknameDialogRef.current.show()
        setNicknameInput(customNickname || '')
      } else {
        nicknameDialogRef.current.close()
      }
    }
  }, [showNicknameDialog, customNickname])

  const handleStartChat = async (friendId) => {
    if (!currentUser) return

    try {
      const conversationId = await getOrCreateConversation(currentUser.uid, friendId)
      if (conversationId) {
        setActiveChatId(conversationId)
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim() || !activeChatId || !currentUser || sending) return

    try {
      setSending(true)
      await sendMessage(activeChatId, currentUser.uid, messageText.trim())
      setMessageText('')
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeChatId || !currentUser) return

    try {
      setSending(true)
      const media = await uploadMessageMedia(file, activeChatId)
      if (media) {
        await sendMessage(activeChatId, currentUser.uid, '', media.url, media.type)
      }
    } catch (error) {
      console.error("Erro ao enviar mídia:", error)
    } finally {
      setSending(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!activeChatId || !currentUser) return

    try {
      await deleteMessage(activeChatId, messageId)
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  // Obter nome de exibição de um usuário em uma conversa (com nickname se disponível)
  const getDisplayNameForConversation = (conversationId, userId, originalUsername) => {
    if (!conversationId || !userId || !currentUser) return originalUsername || 'Usuário'

    const nickname = conversationNicknames[conversationId]?.[userId]
    return nickname || originalUsername || 'Usuário'
  }

  const getConversationDisplay = (conv) => {
    if (!currentUser) return null
    const otherUserId = conv.participants.find(id => id !== currentUser.uid)
    const friend = friends.find(f => f.id === otherUserId)
    const originalUsername = friend?.username || conv.participantNames?.[otherUserId] || 'Usuário'
    const displayName = getDisplayNameForConversation(conv.id, otherUserId, originalUsername)

    return {
      id: otherUserId,
      username: displayName,
      originalUsername: originalUsername,
      avatar: friend?.avatar || conv.participantAvatars?.[otherUserId] || '/feed/logo.png'
    }
  }

  const handleSelectUserFromSearch = (conversationId) => {
    if (conversationId) {
      setActiveChatId(conversationId)
    }
  }

  const handleEmojiSelect = (emoji) => {
    setMessageText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleBlockUser = async () => {
    if (!activeFriend || !currentUser || !activeChatId) return

    try {
      if (isBlocked) {
        await unblockUser(currentUser.uid, activeFriend.id)
        setIsBlocked(false)
      } else {
        await blockUser(currentUser.uid, activeFriend.id)
        setIsBlocked(true)
      }
      setShowMenu(false)
    } catch (error) {
      console.error("Erro ao bloquear/desbloquear usuário:", error)
    }
  }

  const handleSaveNickname = async () => {
    if (!activeFriend || !currentUser || !activeChatId) return

    try {
      const nickname = nicknameInput.trim() || null
      await setConversationNickname(activeChatId, currentUser.uid, activeFriend.id, nickname)
      setCustomNickname(nickname)

      // Atualizar o estado de nicknames da conversa
      setConversationNicknames(prev => {
        const updated = { ...prev }
        if (!updated[activeChatId]) {
          updated[activeChatId] = {}
        }
        if (nickname) {
          updated[activeChatId][activeFriend.id] = nickname
        } else {
          delete updated[activeChatId][activeFriend.id]
          if (Object.keys(updated[activeChatId]).length === 0) {
            delete updated[activeChatId]
          }
        }
        return updated
      })

      setShowNicknameDialog(false)
      setShowMenu(false)
    } catch (error) {
      console.error("Erro ao salvar nickname:", error)
    }
  }

  // Obter nome de exibição (nickname customizado ou username original)
  const getDisplayName = () => {
    if (!activeChatId || !activeFriend) return activeFriend?.username || 'Usuário'
    return getDisplayNameForConversation(activeChatId, activeFriend.id, activeFriend.username)
  }

  // Combinar amigos e conversas
  const displayList = conversations.length > 0
    ? conversations.map(conv => {
      const friend = getConversationDisplay(conv)
      return {
        ...friend,
        conversationId: conv.id,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: (currentUser && conv.unreadCounts?.[currentUser.uid]) || 0
      }
    }).filter(item => item)
    : friends.map(friend => ({
      ...friend,
      conversationId: null,
      lastMessage: '',
      lastMessageTime: 0
    }))

  // Filtrar por busca
  const filteredList = searchQuery.trim()
    ? displayList.filter(item =>
      item.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : displayList

  const inConversation = !!activeChatId

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.timestamp)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(msg)
    return groups
  }, {})

  return (
    <div className={`messages-page font-google-sans ${inConversation ? 'in-conversation' : ''}`}>
      <div className="messages-container">
        <aside className="messages-sidebar">
          <div className="sidebar-header">
            <h2>Mensagens</h2>
            <md-icon-button
              aria-label="Nova conversa"
              onClick={() => setShowUserSearch(true)}
            >
              <md-icon>edit</md-icon>
            </md-icon-button>
          </div>

          <div className="sidebar-search">
            <md-icon className="search-icon">search</md-icon>
            <input
              type="text"
              placeholder="Buscar conversas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <md-icon-button
                className="search-clear"
                aria-label="Limpar"
                onClick={() => setSearchQuery('')}
              >
                <md-icon>close</md-icon>
              </md-icon-button>
            )}
          </div>

          <div className="conversations-list">
            {!currentUser ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                <p>Faça login para ver suas conversas</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                <p>{searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma conversa ainda'}</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isActive = activeChatId === item.conversationId
                return (
                  <button
                    key={item.id || item.conversationId}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (item.conversationId) {
                        setActiveChatId(item.conversationId)
                      } else {
                        handleStartChat(item.id)
                      }
                    }}
                  >
                    <div className="avatar">
                      <img src={item.avatar} alt={item.username} />
                    </div>
                    <div className="conversation-meta">
                      <div className="row-1">
                        <span className="name">{item.username}</span>
                        {item.lastMessageTime && (
                          <span className="time">
                            {formatTime(item.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="row-2">
                        <span className="last-message">
                          {item.lastMessage || 'Iniciar conversa'}
                        </span>
                        {item.unreadCount > 0 && (
                          <span className="badge">{item.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <main className="messages-chat">
          <div className="chat-header">
            <div className="chat-peer">
              {inConversation && (
                <md-icon-button
                  aria-label="Voltar"
                  className="mobile-only"
                  onClick={() => setActiveChatId(null)}
                >
                  <md-icon>arrow_back</md-icon>
                </md-icon-button>
              )}
              <div className="avatar">
                <img src={activeFriend?.avatar || '/feed/logo.png'} alt={activeFriend?.username || 'Avatar'} />
              </div>
              <div className="peer-info">
                <h3>{inConversation ? getDisplayName() : (activeFriend?.username || 'Selecione uma conversa')}</h3>
                {inConversation && customNickname && activeFriend && (
                  <span style={{ fontSize: '12px', opacity: 0.6, display: 'block', marginTop: '2px' }}>
                    {activeFriend.username}
                  </span>
                )}
                <span className="status">
                  {typing ? 'digitando...' : inConversation ? 'online' : ''}
                </span>
              </div>
            </div>
            {inConversation && (
              <div className="chat-actions" ref={menuRef}>
                <md-icon-button
                  aria-label="Mais opções"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <md-icon>more_vert</md-icon>
                </md-icon-button>
                {showMenu && (
                  <div className="chat-menu">
                    <button
                      className="menu-item"
                      onClick={() => {
                        setShowNicknameDialog(true)
                        setShowMenu(false)
                      }}
                    >
                      <md-icon>edit</md-icon>
                      <span>Alterar apelido</span>
                    </button>
                    <button
                      className="menu-item"
                      onClick={handleBlockUser}
                    >
                      <md-icon>{isBlocked ? 'lock_open' : 'block'}</md-icon>
                      <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="chat-body">
            {!inConversation ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--md-sys-color-on-surface-variant)'
              }}>
                <p>Selecione uma conversa para começar</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--md-sys-color-on-surface-variant)'
              }}>
                <p>Nenhuma mensagem ainda. Envie a primeira!</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="day-separator">
                    <span>{date}</span>
                  </div>
                  {dateMessages.map((msg) => {
                    const isYou = msg.senderId === currentUser?.uid
                    return (
                      <div key={msg.id} className={`message-row ${isYou ? 'you' : 'peer'}`}>
                        <div className="bubble">
                          {msg.mediaUrl && (
                            <div className="message-media">
                              {msg.mediaType === 'image' ? (
                                <img src={msg.mediaUrl} alt="Imagem" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '4px' }} />
                              ) : msg.mediaType === 'video' ? (
                                <video src={msg.mediaUrl} controls style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '4px' }} />
                              ) : msg.mediaType === 'reel_share' ? (
                                <div
                                  className="shared-reel-bubble"
                                  onClick={() => navigate(`/feed?reelId=${msg.reelId || (msg.mediaUrl.includes('reel=') ? msg.mediaUrl.split('reel=')[1] : '')}`)}
                                  style={{ cursor: 'pointer', maxWidth: '200px' }}
                                >
                                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '9/16', marginBottom: '4px' }}>
                                    <img src={msg.mediaUrl} alt="Vídeo compartilhado" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                      <md-icon style={{ color: 'white', fontSize: '32px' }}>play_circle</md-icon>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                    {msg.text || 'Vídeo compartilhado'}
                                  </div>
                                </div>
                              ) : (
                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: '4px' }}>
                                  📎 Arquivo
                                </a>
                              )}
                            </div>
                          )}
                          {msg.text && <div>{msg.text}</div>}
                          <span className="meta">
                            {formatTime(msg.timestamp)}
                            {isYou && msg.read && msg.readBy?.length > 0 && (
                              <md-icon style={{ fontSize: '14px', marginLeft: '4px' }}>done_all</md-icon>
                            )}
                          </span>
                          {isYou && (
                            <md-icon-button
                              className="message-delete"
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{ position: 'absolute', top: '4px', right: '4px', opacity: 0.5 }}
                            >
                              <md-icon style={{ fontSize: '16px' }}>delete</md-icon>
                            </md-icon-button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {inConversation && (
            <form className="chat-input" onSubmit={handleSendMessage}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <md-icon-button
                type="button"
                aria-label="Abrir anexos"
                onClick={() => fileInputRef.current?.click()}
              >
                <md-icon>attach_file</md-icon>
              </md-icon-button>
              <div className="input-box">
                <md-icon-button
                  type="button"
                  className="emoji-button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <md-icon>mood</md-icon>
                </md-icon-button>
                <input
                  type="text"
                  placeholder="Escreva uma mensagem"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                />
              </div>
              <md-icon-button
                type="submit"
                aria-label="Enviar"
                disabled={!messageText.trim() || sending}
              >
                <md-icon>send</md-icon>
              </md-icon-button>
            </form>
          )}
        </main>

        <aside className="messages-details only-desktop">
          {activeFriend && (
            <>
              <div className="details-header">
                <h4>Detalhes</h4>
              </div>
              <div className="details-section">
                <div className="section-title">Participantes</div>
                <div className="participant">
                  <div className="avatar small">
                    <img src={activeFriend.avatar} alt={activeFriend.username} />
                  </div>
                  <div className="participant-info">
                    <span className="name">{activeFriend.username}</span>
                    <span className="handle">@{activeFriend.username.toLowerCase().replace(/\s/g, '')}</span>
                  </div>
                </div>
              </div>
              <div className="details-section">
                <div className="section-title">Mídias</div>
                <div className="media-grid">
                  {messages
                    .filter(m => m.mediaUrl && m.mediaType === 'image')
                    .slice(0, 6)
                    .map((msg, i) => (
                      <div key={i} className="media-thumb" style={{ backgroundImage: `url(${msg.mediaUrl})`, backgroundSize: 'cover' }} />
                    ))}
                  {messages.filter(m => m.mediaUrl && m.mediaType === 'image').length === 0 && (
                    <p style={{ fontSize: '12px', opacity: 0.6, padding: '8px' }}>Nenhuma mídia ainda</p>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <UserSearch
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUserFromSearch}
      />

      {showEmojiPicker && (
        <>
          <div className="emoji-picker-backdrop" onClick={() => setShowEmojiPicker(false)} />
          <EmojiPicker
            isOpen={showEmojiPicker}
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </>
      )}

      <md-dialog
        ref={nicknameDialogRef}
        onClose={() => setShowNicknameDialog(false)}
      >
        <div slot="headline">Alterar apelido</div>
        <form slot="content" method="dialog">
          <p style={{ marginBottom: '16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Digite um apelido para {activeFriend?.username}. Apenas você verá este apelido.
          </p>
          <input
            type="text"
            placeholder="Apelido"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: '8px',
              background: 'var(--md-sys-color-surface-container)',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '1rem',
              fontFamily: 'Google Sans, sans-serif',
              outline: 'none'
            }}
            autoFocus
          />
        </form>
        <div slot="actions">
          <md-text-button onClick={() => setShowNicknameDialog(false)}>Cancelar</md-text-button>
          <md-text-button onClick={handleSaveNickname}>Salvar</md-text-button>
        </div>
      </md-dialog>
    </div>
  )
}

export default Messages
