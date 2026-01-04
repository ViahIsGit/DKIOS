import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { likeReel, unlikeReel, favoriteReel, unfavoriteReel, shareReel, followUser, unfollowUser, isFollowing } from '../services/reels'
import { useLayout } from '../context/LayoutContext'
import CommentsModal from './CommentsModal'
import ShareModal from './ShareModal'
import './VideoCard.css'

// --- HOOK DE GESTOS PERSONALIZADO (Substitui react-swipe/react-swipeable) ---
// Isso garante que funcione sem precisar instalar dependências extras
const useSmartGestures = ({ onDoubleTap, onTap, onSwipeLeft, onSwipeRight }) => {
  const lastTap = useRef(0)
  const touchStart = useRef({ x: 0, y: 0 })
  const touchEnd = useRef({ x: 0, y: 0 })

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  }

  const handleTouchEnd = (e) => {
    touchEnd.current = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    const SWIPE_THRESHOLD = 50

    // Detectar Swipe Horizontal
    const diffX = touchStart.current.x - touchEnd.current.x
    const diffY = touchStart.current.y - touchEnd.current.y

    // Se o movimento horizontal for maior que o vertical e maior que o threshold, é um swipe
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
      if (diffX > 0 && onSwipeLeft) onSwipeLeft() // Swipe para esquerda (Próximo)
      if (diffX < 0 && onSwipeRight) onSwipeRight() // Swipe para direita (Anterior)
      return // Se foi swipe, não processa taps
    }

    // Detectar Tap / Double Tap (apenas se houve pouco movimento)
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        if (onDoubleTap) onDoubleTap(e)
        lastTap.current = 0
      } else {
        lastTap.current = now
        // Pequeno delay para diferenciar single de double tap
        setTimeout(() => {
          if (now === lastTap.current && onTap) {
            onTap(e)
          }
        }, DOUBLE_TAP_DELAY)
      }
    }
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  }
}

function VideoCard({ video, currentUser, isFirst = false, isActive = false, onPlayRequest }) {
  const navigate = useNavigate()
  const { setBottomNavHidden } = useLayout()
  
  // Estados de Interação
  const [isLiked, setIsLiked] = useState(video.isLiked || false)
  const [isFavorited, setIsFavorited] = useState(video.isFavorited || false)
  const [likes, setLikes] = useState(video.likes || 0)
  const [shares, setShares] = useState(video.shares || 0)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  
  // Estados de UI
  const [showComments, setShowComments] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })
  
  // Estados do Player
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(isFirst ? true : false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  // Refs
  const videoRef = useRef(null)
  const savedTimeRef = useRef(0) // Armazena o tempo quando o vídeo é desmontado
  const alertDialogRef = useRef(null)

  // Slideshow
  const isSlideshow = video.type === 'slideshow' || (video.mediaUrls && video.mediaUrls.length > 1)
  const slides = video.mediaUrls || [video.videoUrl]
  const [currentSlide, setCurrentSlide] = useState(0)

  // --- EFEITO 1: Sincronizar dados iniciais ---
  useEffect(() => {
    setIsLiked(video.isLiked || false)
    setIsFavorited(video.isFavorited || false)
    setLikes(video.likes || 0)
    setShares(video.shares || 0)
  }, [video])

  // --- EFEITO 2: Gerenciamento de Memória e Playback (CRUCIAL) ---
  // Quando !isActive, o vídeo é "eliminado" (não renderizado), mas salvamos o tempo.
  useEffect(() => {
    if (!isActive) {
      // Se saindo do vídeo, pausa e salva estado
      setIsPlaying(false)
      if (videoRef.current) {
        savedTimeRef.current = videoRef.current.currentTime
        videoRef.current.pause()
      }
    } else {
      // Se entrando no vídeo (retorno)
      setIsPlaying(true)
      // Nota: O play real acontece no onCanPlay ou autoPlay do elemento re-renderizado
    }
  }, [isActive])

  // --- Handlers do Vídeo ---
  
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      // Restaura o tempo salvo quando o vídeo "volta"
      if (savedTimeRef.current > 0) {
        videoRef.current.currentTime = savedTimeRef.current
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration || 1
      setCurrentTime(current)
      setProgress((current / total) * 100)
    }
  }

  const handleEnded = () => {
    setIsPlaying(true) // Mantém estado de playing para loop
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  const togglePlay = useCallback(() => {
    if (isSlideshow) {
      setIsPlaying(!isPlaying)
      return
    }

    if (!videoRef.current) return

    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log('Play error:', err))
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [isSlideshow, isPlaying])

  // --- Lógica de Likes e Interações ---

  const performLike = useCallback(async () => {
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Faça login para curtir.' })
      return
    }

    // Otimistic update
    const newLikedState = !isLiked
    setIsLiked(newLikedState)
    setLikes(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1))

    try {
      if (!newLikedState) {
        await unlikeReel(video.reelId, currentUser.uid)
      } else {
        await likeReel(video.reelId, currentUser.uid)
      }
    } catch (error) {
      console.error("Erro ao curtir:", error)
      // Reverter em caso de erro
      setIsLiked(!newLikedState)
      setLikes(prev => !newLikedState ? prev + 1 : Math.max(0, prev - 1))
    }
  }, [currentUser, video.reelId, isLiked])

  const handleFavorite = async (e) => {
    e.stopPropagation()
    if (!currentUser) {
      setAlertDialog({ open: true, title: 'Login necessário', message: 'Login para favoritar.' })
      return
    }
    const newFavState = !isFavorited
    setIsFavorited(newFavState)
    try {
      if (!newFavState) await unfavoriteReel(video.reelId, currentUser.uid)
      else await favoriteReel(video.reelId, currentUser.uid)
    } catch (error) {
      setIsFavorited(!newFavState)
    }
  }

  // --- Configuração dos Gestos (Substituindo listeners manuais) ---
  
  const gestures = useSmartGestures({
    onDoubleTap: (e) => {
      // Animação de coração poderia ser disparada aqui
      performLike()
    },
    onTap: (e) => {
      // Ignora toques nos controles ou info
      if (e.target.closest('.video-actions-right') || 
          e.target.closest('.video-info') || 
          e.target.closest('.video-controls-container')) {
        return
      }
      togglePlay()
    },
    onSwipeLeft: () => {
      if (isSlideshow) {
        setCurrentSlide(prev => (prev + 1) % slides.length)
      }
    },
    onSwipeRight: () => {
      if (isSlideshow) {
        setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)
      }
    }
  })

  // --- Handlers Auxiliares ---

  const handleSeek = (e) => {
    e.stopPropagation() // Impede que o seek pause o vídeo pelo gesto de tap
    const newProgress = parseFloat(e.target.value)
    if (videoRef.current && duration) {
      const newTime = (newProgress / 100) * duration
      videoRef.current.currentTime = newTime
      setProgress(newProgress)
      setCurrentTime(newTime)
    }
  }

  const toggleSpeed = (e) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2, 0.5]
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(nextSpeed)
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed
  }

  const handleFollow = async (e) => {
    e.stopPropagation()
    if (!currentUser) return setAlertDialog({ open: true, title: 'Login', message: 'Faça login para seguir.' })
    if (video.userId === currentUser.uid) return

    try {
      if (isFollowingUser) {
        await unfollowUser(video.userId, currentUser.uid)
        setIsFollowingUser(false)
        setIsFriend(false)
      } else {
        await followUser(video.userId, currentUser.uid)
        setIsFollowingUser(true)
        const mutual = await isFollowing(currentUser.uid, video.userId)
        setIsFriend(mutual)
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Verificar Follow Status ao carregar
  useEffect(() => {
    const checkStatus = async () => {
      if (!currentUser || !video.userId || video.userId === currentUser.uid) return
      try {
        const following = await isFollowing(video.userId, currentUser.uid)
        setIsFollowingUser(following)
        if (following) setIsFriend(await isFollowing(currentUser.uid, video.userId))
      } catch (e) { console.error(e) }
    }
    checkStatus()
  }, [currentUser, video.userId])

  // Dialog Helper
  useEffect(() => {
    if (alertDialogRef.current) {
      alertDialog.open ? alertDialogRef.current.show() : alertDialogRef.current.close()
    }
  }, [alertDialog.open])

  // Slideshow Auto-play
  useEffect(() => {
    let interval
    if (isSlideshow && isPlaying && isActive) {
      interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isSlideshow, isPlaying, isActive, slides.length])


  // Formatação
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDuration = (s) => {
    if (!s) return '0:00'
    const m = Math.floor(s / 60)
    const sc = Math.floor(s % 60)
    return `${m}:${sc.toString().padStart(2, '0')}`
  }

  // --- RENDERIZAÇÃO ---

  return (
    <div 
      className="video-card" 
      data-video-card-id={video.id}
      {...gestures} // Aplica os gestos de Swipe e Tap aqui
    >
      <div className="video-container">
        {!isSlideshow ? (
          <>
            {/* LÓGICA PRINCIPAL: Se isActive, renderiza VIDEO. Se não, renderiza IMAGEM. */}
            {isActive ? (
              <video
                ref={videoRef}
                className="custom-video-player"
                src={video.videoUrl}
                poster={video.thumbnail || video.videoUrl}
                playsInline
                loop
                autoPlay // Garante play ao montar
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => {
                  setIsBuffering(false)
                  // Reaplica velocidade se necessário
                  if(videoRef.current) videoRef.current.playbackRate = playbackRate
                }}
                onEnded={handleEnded}
                // Previne menu de contexto padrão
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              // Placeholder leve quando fora de vista
              <img 
                src={video.thumbnail || video.videoUrl} 
                className="custom-video-player" // Mesma classe para manter layout
                style={{ objectFit: 'cover' }}
                alt="Thumbnail"
              />
            )}

            {/* Buffering Indicator */}
            {isBuffering && isActive && (
              <div className="buffering-indicator">
                <md-circular-progress indeterminate></md-circular-progress>
              </div>
            )}

            {/* Play/Pause Overlay Icon */}
            {!isPlaying && !isBuffering && (
              <div className="pause-overlay">
                <md-icon>play_arrow</md-icon>
              </div>
            )}

            {/* Controles Flutuantes (Só aparecem se ativo) */}
            {isActive && (
              <>
                <div className="mute-toggle" onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
                  <md-icon>{isMuted ? 'volume_off' : 'volume_up'}</md-icon>
                </div>

                <div className="speed-toggle" onClick={toggleSpeed}>
                  <span>{playbackRate}x</span>
                </div>

                <div className="video-controls-container" onClick={(e) => e.stopPropagation()}>
                  <div className="video-seeker-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={handleSeek}
                      className="video-seeker"
                    />
                    <div className="video-time-display">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          // Renderização do Slideshow
          <div className="slideshow-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={slides[currentSlide]}
              alt={`Slide ${currentSlide}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            <div className="slideshow-indicators" style={{
              position: 'absolute', bottom: '100px', left: 0, width: '100%',
              display: 'flex', justifyContent: 'center', gap: '4px', zIndex: 15
            }}>
              {slides.map((_, idx) => (
                <div key={idx} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: idx === currentSlide ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.3s',
                  transform: idx === currentSlide ? 'scale(1.2)' : 'scale(1)'
                }} />
              ))}
            </div>
            
            {/* Zonas de navegação manuais (fallback para clique) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '100%', zIndex: 10 }}
                 onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length); }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '20%', height: '100%', zIndex: 10 }}
                 onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => (prev + 1) % slides.length); }} />
          </div>
        )}
      </div>

      {/* Interface Lateral (Ações) */}
      <div className="video-actions-right">
        <div className="video-avatar">
          <img src={video.avatar} alt={video.username} />
          {currentUser && video.userId && video.userId !== currentUser.uid && !isFollowingUser && !isFriend && (
            <button className="video-follow-badge" onClick={handleFollow}><md-icon>add</md-icon></button>
          )}
          {isFollowingUser && !isFriend && (
            <div className="video-follow-badge following"><md-icon>check</md-icon></div>
          )}
        </div>

        <div className={`action-button ${isLiked ? 'liked' : ''}`} onClick={(e) => { e.stopPropagation(); performLike(); }}>
          <md-icon className={isLiked ? 'liked' : ''}>favorite</md-icon>
          <span>{formatNumber(likes)}</span>
        </div>

        <div className="action-button" onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
          <md-icon>comment</md-icon>
          <span>{formatNumber(video.comments || 0)}</span>
        </div>

        <div className="action-button action-button-share" onClick={(e) => { e.stopPropagation(); setBottomNavHidden(true); setShowShareModal(true); }}>
          <md-icon>share</md-icon>
          <span>{formatNumber(shares)}</span>
        </div>

        <div className={`action-button ${isFavorited ? 'favorited' : ''}`} onClick={handleFavorite}>
          <md-icon className={isFavorited ? 'favorited' : ''}>bookmark</md-icon>
        </div>
      </div>

      {/* Informações do Rodapé */}
      <div className="video-info">
        <div className="video-main-info">
          <div className="video-details">
            <div className="video-header">
              <span className="video-username">@{video.username}</span>
              {isFriend && <span className="video-friend-badge"><md-icon>group</md-icon></span>}
            </div>
            <p className="video-description">{video.description}</p>
            <div className="video-music" onClick={(e) => { e.stopPropagation(); navigate(`/music/${video.username}`) }}>
              <md-icon>music_note</md-icon>
              <div className="music-ticker-container">
                <div className="music-ticker-text">Som original - @{video.username}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modais e Dialogs */}
      {showComments && <CommentsModal reelId={video.reelId} onClose={() => setShowComments(false)} currentUser={currentUser} />}
      {showShareModal && (
        <ShareModal 
          video={video} 
          onClose={() => { setShowShareModal(false); setBottomNavHidden(false); }} 
          currentUser={currentUser} 
          onShare={() => { shareReel(video.reelId, currentUser.uid).catch(console.error); setShares(s => s + 1); }} 
        />
      )}

      <md-dialog ref={alertDialogRef} onClose={() => setAlertDialog(p => ({ ...p, open: false }))}>
        <div slot="headline">{alertDialog.title}</div>
        <form slot="content" method="dialog"><p>{alertDialog.message}</p></form>
        <div slot="actions"><md-text-button onClick={() => setAlertDialog(p => ({ ...p, open: false }))}>Ok</md-text-button></div>
      </md-dialog>
    </div>
  )
}

export default VideoCard

