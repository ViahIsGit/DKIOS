import { useState, useEffect, useRef } from 'react'
import { auth, onAuthStateChanged } from '../firebase/config'
import { getComments, addComment, likeComment, unlikeComment } from '../services/reels'
 
import './CommentsModal.css'

function CommentsModal({ reelId, onClose, currentUser }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(currentUser)
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })
  const alertDialogRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser || currentUser)
    })
    return () => unsubscribe()
  }, [currentUser])

  useEffect(() => {
    loadComments()
  }, [reelId])

  // Controlar o md-dialog usando os métodos show() e close()
  useEffect(() => {
    if (alertDialogRef.current) {
      if (alertDialog.open) {
        alertDialogRef.current.show()
      } else {
        alertDialogRef.current.close()
      }
    }
  }, [alertDialog.open])

  const loadComments = async () => {
    try {
      setLoading(true)
      const commentsData = await getComments(reelId)
      setComments(commentsData)
    } catch (error) {
      console.error("Erro ao carregar comentários:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !user) return

    try {
      setSubmitting(true)
      await addComment(reelId, { text: commentText.trim() })
      setCommentText('')
      await loadComments() // Recarregar comentários
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error)
      setAlertDialog({ open: true, title: 'Erro', message: 'Erro ao adicionar comentário' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId) => {
    if (!user) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para curtir comentários' })
      return
    }

    try {
      const comment = comments.find(c => c.id === commentId)
      const isLiked = comment?.likesUsers?.includes(user.uid)

      if (isLiked) {
        await unlikeComment(reelId, commentId, user.uid)
      } else {
        await likeComment(reelId, commentId, user.uid)
      }

      await loadComments() // Recarregar comentários
    } catch (error) {
      console.error("Erro ao curtir comentário:", error)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const now = Date.now()
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    const diff = now - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  return (
    <div className="comments-modal-overlay" onClick={onClose}>
      <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comments-header">
          <h2 className="comments-title">Comentários</h2>
          <md-icon-button onClick={onClose} className="close-button">
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>

        <div className="comments-list">
          {loading ? (
            <div className="comments-loading">
              <md-linear-progress value="0.5" buffer="0.8"></md-linear-progress>
              <span>Carregando comentários...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <md-icon>chat_bubble_outline</md-icon>
              <span>Nenhum comentário ainda</span>
              <p>Seja o primeiro a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isLiked = user ? comment.likesUsers?.includes(user.uid) : false
              const likesCount = comment.likesUsers?.length || 0

              return (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar">
                    <img src={comment.avatar || '/feed/fizz.png'} alt={comment.username} />
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-username">@{comment.username}</span>
                      <span className="comment-time">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    <div className="comment-actions">
                      <button
                        className={`comment-like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLikeComment(comment.id)}
                      >
                        <md-icon>{isLiked ? 'favorite' : 'favorite_border'}</md-icon>
                        <span>{formatNumber(likesCount)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {user && (
          <form className="comments-form" onSubmit={handleSubmitComment}>
            <div className="comment-input-container">
              <div className="comment-input-avatar">
                <img src={user.photoURL || '/feed/fizz.png'} alt="Você" />
              </div>
              <input
                type="text"
                className="comment-input"
                placeholder="Adicione um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={submitting}
              />
              <md-icon-button
                type="submit"
                className="comment-send-btn"
                aria-label="Enviar comentário"
              >
                <md-icon>send</md-icon>
              </md-icon-button>
            </div>
          </form>
        )}

        {!user && (
          <div className="comments-login-prompt">
            <p>Faça login para comentar</p>
          </div>
        )}
      </div>

      <md-dialog 
        ref={alertDialogRef}
        onClose={() => setAlertDialog({ open: false, title: '', message: '' })}
      >
        <div slot="headline">{alertDialog.title}</div>
        <form slot="content" method="dialog">
          <p>{alertDialog.message}</p>
        </form>
        <div slot="actions">
          <md-text-button onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>Ok</md-text-button>
        </div>
      </md-dialog>
    </div>
  )
}

export default CommentsModal

