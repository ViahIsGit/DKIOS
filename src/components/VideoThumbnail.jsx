import './VideoThumbnail.css'

export default function VideoThumbnail({ video, onClick }) {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="video-thumbnail-card" onClick={onClick}>
      <div className="thumbnail-container">
        <img 
          src={video.thumbnail || video.videoUrl} 
          alt={video.description || 'Video'}
          className="thumbnail-image"
        />
        <div className="thumbnail-overlay">
          <div className="thumbnail-play-button">
            <md-icon>play_circle</md-icon>
          </div>
          <div className="thumbnail-duration">{video.duration || '0:00'}</div>
        </div>
      </div>
      <div className="thumbnail-info">
        <div className="thumbnail-stats">
          <div className="thumbnail-stat">
            <md-icon>favorite</md-icon>
            <span>{formatNumber(video.likes || 0)}</span>
          </div>
          <div className="thumbnail-stat">
            <md-icon>chat_bubble</md-icon>
            <span>{formatNumber(video.comments || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

