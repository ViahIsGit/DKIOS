import { useState, useEffect } from 'react'
import { getFriends, getConversations, sendMessage, getOrCreateConversation } from '../services/messages'
import './ShareModal.css'

function ShareModal({ video, onClose, currentUser, onShare }) {
  const [sharing, setSharing] = useState(false)
  const [showUserSelect, setShowUserSelect] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (showUserSelect && currentUser) {
      loadUsers()
    }
  }, [showUserSelect, currentUser])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      // Load friends and recent conversations
      const friends = await getFriends(currentUser.uid)
      // We could also load conversations to show recent chats even if not friends
      // For now, let's just show friends
      setUsers(friends)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSendToChat = async (targetUserId) => {
    if (!currentUser || sharing) return

    setSharing(true)
    try {
      const conversationId = await getOrCreateConversation(currentUser.uid, targetUserId)
      if (conversationId) {
        // Send a special message with type 'reel_share'
        // We need to update sendMessage to support this or just send text with metadata?
        // The service supports mediaUrl and mediaType. We can use that or add a new field.
        // Let's use text for description and a special marker or just add metadata if we modify the service.
        // For now, let's send a text message with the link and a special prefix/flag if possible, 
        // OR better: modify sendMessage to accept 'reelId' and 'reelData'.
        // Since I can't easily modify the service signature everywhere without breaking things,
        // I'll use the existing `sendMessage` but pass the video thumbnail as mediaUrl and type 'reel_share' (if I modify service to allow custom types)
        // OR just send a text link and handle it in UI.
        // The plan said: "Update sendMessage or create shareVideo to handle type: 'reel_share'"
        // Let's assume I will update the service next.

        // Construct a special payload or use a new function. 
        // I'll call a new function `shareVideoToChat` which I'll implement in services/messages.js
        // But I can't import it yet if it doesn't exist.
        // I'll use sendMessage for now with a special mediaType 'reel_share'

        await sendMessage(
          conversationId,
          currentUser.uid,
          `Shared video: ${video.description || ''}`,
          video.thumbnail || video.videoUrl,
          'reel_share', // Special type
          { reelId: video.id, username: video.username } // Extra data if I update service to accept it
        )

        if (onShare) await onShare()
        onClose()
      }
    } catch (error) {
      console.error("Error sending to chat:", error)
    } finally {
      setSharing(false)
    }
  }

  const handleShare = async (platform) => {
    if (!currentUser) {
      return
    }

    setSharing(true)
    const shareUrl = `${window.location.origin}?reel=${video.reelId}`
    const shareText = `Vídeo de @${video.username} - ${video.description || ''}`
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)

    try {
      switch (platform) {
        case 'chat':
          setShowUserSelect(true)
          break
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank')
          break
        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank')
          break
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
          break
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
          break
        case 'copy':
          await navigator.clipboard.writeText(shareUrl)
          if (onShare) {
            await onShare()
          }
          break
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: `Vídeo de @${video.username}`,
              text: video.description,
              url: shareUrl
            })
            if (onShare) {
              await onShare()
            }
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    } finally {
      setSharing(false)
    }
  }

  const shareOptions = [
    { id: 'chat', label: 'Enviar no Chat', icon: 'send', available: true },
    { id: 'native', label: 'Compartilhar', icon: 'share', available: !!navigator.share },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', available: true },
    { id: 'telegram', label: 'Telegram', icon: 'send', available: true },
    { id: 'twitter', label: 'Twitter', icon: 'article', available: true },
    { id: 'facebook', label: 'Facebook', icon: 'public', available: true },
    { id: 'copy', label: 'Copiar link', icon: 'link', available: true }
  ].filter(option => option.available)

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {sharing && (
          <div style={{ padding: '8px 0' }}>
            <md-linear-progress value="0.5" buffer="0.8"></md-linear-progress>
          </div>
        )}
        <div className="share-header">
          <h2 className="share-title">Compartilhar</h2>
          <md-icon-button onClick={onClose} className="close-button">
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>

        <div className="share-options">
          {shareOptions.map((option) => (
            <button
              key={option.id}
              className="share-option-item"
              onClick={() => handleShare(option.id)}
              disabled={sharing}
            >
              <div className="share-option-icon">
                <md-icon>{option.icon}</md-icon>
              </div>
              <span className="share-option-label">{option.label}</span>
            </button>
          ))}
        </div>

        {showUserSelect && (
          <div className="share-user-select">
            <div className="share-user-header">
              <h3>Enviar para...</h3>
              <button onClick={() => setShowUserSelect(false)}>Voltar</button>
            </div>
            <div className="share-user-list">
              {loadingUsers ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>
              ) : users.length > 0 ? (
                users.map(user => (
                  <div key={user.id} className="share-user-item" onClick={() => handleSendToChat(user.id)}>
                    <img src={user.avatar} alt={user.username} />
                    <span>{user.username}</span>
                    <md-icon>send</md-icon>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Nenhum amigo encontrado</div>
              )}
            </div>
          </div>
        )}

        {!currentUser && (
          <div className="share-login-prompt">
            <p>Faça login para compartilhar</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareModal

