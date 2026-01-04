import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import VideoCard from './VideoCard'
import './ProfileVideoViewer.css'

export default function ProfileVideoViewer({ videos, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { hideChrome, showChrome } = useLayout()

  useEffect(() => {
    hideChrome()
    return () => showChrome()
  }, [hideChrome, showChrome])

  useEffect(() => {
    if (videos.length > 0 && videos[currentIndex]) {
      setActiveVideoId(String(videos[currentIndex].id))
    }
  }, [currentIndex, videos])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, videos.length, onClose])

  useEffect(() => {
    // Prevenir scroll do body quando o viewer está aberto
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleVideoClick = (videoId) => {
    const index = videos.findIndex(v => String(v.id) === String(videoId))
    if (index !== -1) {
      setCurrentIndex(index)
    }
  }

  const handleSwipe = (direction) => {
    if (direction === 'up' && currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  if (!videos || videos.length === 0) {
    return null
  }

  const currentVideo = videos[currentIndex]

  if (!currentVideo) {
    return null
  }

  // Formatar vídeo para o VideoCard
  const formattedVideo = {
    id: currentVideo.id,
    username: currentVideo.username || 'Usuário',
    avatar: currentVideo.avatar || '',
    thumbnail: currentVideo.thumbnail || currentVideo.videoUrl,
    videoUrl: currentVideo.videoUrl,
    description: currentVideo.description || currentVideo.desc || '',
    duration: currentVideo.duration || '0:00',
    timestamp: currentVideo.timestamp || Date.now(),
    likes: currentVideo.likes || currentVideo.likesUsers?.length || 0,
    comments: currentVideo.comments || 0,
    shares: currentVideo.shares || 0,
    isLiked: currentVideo.isLiked || false,
    isFavorited: currentVideo.isFavorited || false,
    likesUsers: currentVideo.likesUsers || [],
    reelId: currentVideo.reelId || currentVideo.id,
    userId: currentVideo.userId
  }

  return (
    <div className="profile-video-viewer" ref={containerRef}>
      <div className="viewer-back-button" onClick={onClose}>
        <md-icon-button>
          <md-icon>arrow_back</md-icon>
        </md-icon-button>
      </div>

      <div className="viewer-content">
        <div className="viewer-video-container">
          <VideoCard
            video={formattedVideo}
            currentUser={currentVideo.currentUser}
            isFirst={currentIndex === 0}
            isActive={activeVideoId === String(currentVideo.id)}
            onPlayRequest={handleVideoClick}
          />
        </div>

        {videos.length > 1 && (
          <div className="viewer-nav-indicator">
            <span>{currentIndex + 1} / {videos.length}</span>
          </div>
        )}
      </div>

      {videos.length > 1 && (
        <>
          <button
            className="viewer-nav-button viewer-nav-up"
            onClick={() => handleSwipe('up')}
            disabled={currentIndex >= videos.length - 1}
            aria-label="Próximo vídeo"
          >
            <md-icon>keyboard_arrow_up</md-icon>
          </button>
          <button
            className="viewer-nav-button viewer-nav-down"
            onClick={() => handleSwipe('down')}
            disabled={currentIndex <= 0}
            aria-label="Vídeo anterior"
          >
            <md-icon>keyboard_arrow_down</md-icon>
          </button>
        </>
      )}
    </div>
  )
}

