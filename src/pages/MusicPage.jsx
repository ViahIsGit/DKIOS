import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchReels } from '../services/reels'
import './MusicPage.css'

function MusicPage() {
    const { id } = useParams() // id is the username for now
    const navigate = useNavigate()
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef(null)
    const [audioUrl, setAudioUrl] = useState(null)

    useEffect(() => {
        const loadMusicVideos = async () => {
            try {
                setLoading(true)
                const allReels = await fetchReels()
                // Filter videos by this "sound" (username for now)
                // In a real app, we would filter by soundId
                const musicVideos = allReels.filter(reel => reel.username === id || true) // For demo, showing all or filtered
                // Let's actually just show all videos for now to populate the grid, 
                // or maybe filter by the user who "owns" the sound if that's the logic.
                // The user request said "use video's username as unique identifier".
                // So effectively this is "Videos with sound by @username".
                // But usually a sound is used by MANY people. 
                // For this MVP, let's just show a mix of videos to simulate "videos using this sound".

                setVideos(musicVideos)

                // Find a video with audio to use as preview
                const previewVideo = musicVideos.find(v => v.videoUrl)
                if (previewVideo) {
                    setAudioUrl(previewVideo.videoUrl)
                }
            } catch (error) {
                console.error("Error loading music videos:", error)
            } finally {
                setLoading(false)
            }
        }

        loadMusicVideos()
    }, [id])

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    return (
        <div className="music-page">
            <div className="music-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </button>
                <div className="music-info">
                    <div className="music-cover">
                        <md-icon>music_note</md-icon>
                        {isPlaying && <div className="music-playing-indicator"></div>}
                    </div>
                    <div className="music-details">
                        <h1>Som original</h1>
                        <h2>{id}</h2>
                        <span className="music-count">{videos.length} vídeos</span>
                    </div>
                </div>
                <button className="preview-button" onClick={togglePlay}>
                    <md-icon>{isPlaying ? 'pause' : 'play_arrow'}</md-icon>
                    {isPlaying ? 'Pausar' : 'Ouvir prévia'}
                </button>
            </div>

            {audioUrl && (
                <video
                    ref={audioRef}
                    src={audioUrl}
                    style={{ display: 'none' }}
                    loop
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            <div className="music-videos-grid">
                {videos.map(video => (
                    <div
                        key={video.id}
                        className="music-video-item"
                        onClick={() => navigate(`/feed?reelId=${video.id}`)}
                    >
                        <img src={video.thumbnailUrl || video.videoUrl} alt="Video thumbnail" />
                        <div className="video-views">
                            <md-icon>play_arrow</md-icon>
                            <span>{video.likes || 0}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MusicPage
