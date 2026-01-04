import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { auth } from '../firebase/config'
import { fetchReels, fetchFollowingReels, incrementViews, getUserProfile } from '../services/reels'
import VideoCard from './VideoCard'
import GlobalSearch from './GlobalSearch'
import './Feed.css'

export default function Feed() {
    const [activeTab, setActiveTab] = useState('foryou') // 'foryou' | 'following'
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [activeVideoId, setActiveVideoId] = useState(null)
    const [currentUser, setCurrentUser] = useState(auth.currentUser)

    // Cache for user profiles to avoid repeated fetches
    const userCache = useRef({})

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user)
        })
        return () => unsubscribe()
    }, [])

    // Helper to format videos
    const formatVideos = useCallback(async (reels) => {
        // Helper to get user info with cache
        const getUserInfo = async (userId) => {
            if (userCache.current[userId]) return userCache.current[userId]
            try {
                const profile = await getUserProfile(userId)
                const info = {
                    username: profile?.username || 'Usuário',
                    avatar: profile?.profilePicture || '/feed/logo.png'
                }
                userCache.current[userId] = info
                return info
            } catch (e) {
                return { username: 'Usuário', avatar: '/feed/logo.png' }
            }
        }

        const formatted = await Promise.all(reels.map(async (reel) => {
            const userInfo = await getUserInfo(reel.userId)
            return {
                id: reel.id,
                ...reel,
                username: userInfo.username,
                avatar: userInfo.avatar,
                thumbnail: reel.thumbnailUrl || reel.videoUrl,
                videoUrl: reel.videoUrl,
                description: reel.desc || '',
                likes: reel.likesUsers?.length || 0,
                comments: reel.comments || 0,
                shares: 0,
                isLiked: currentUser ? reel.likesUsers?.includes(currentUser.uid) : false,
                isFavorited: currentUser ? reel.favoritesUsers?.includes(currentUser.uid) : false,
                reelId: reel.id
            }
        }))
        return formatted
    }, [currentUser])

    // Fetch videos
    const loadVideos = useCallback(async () => {
        setLoading(true)
        try {
            let rawReels = []
            if (activeTab === 'following' && currentUser) {
                rawReels = await fetchFollowingReels(currentUser.uid)
            } else {
                rawReels = await fetchReels()
                // Shuffle for "For You"
                rawReels = rawReels.sort(() => Math.random() - 0.5)
            }

            const formatted = await formatVideos(rawReels)
            setVideos(formatted)

            // Set first video active if available
            if (formatted.length > 0) {
                setActiveVideoId(String(formatted[0].id))
            }
        } catch (error) {
            console.error("Error loading feed:", error)
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentUser, formatVideos])

    useEffect(() => {
        loadVideos()
    }, [loadVideos])

    // Intersection Observer for active video
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const videoId = entry.target.dataset.id
                        if (videoId) {
                            setActiveVideoId(videoId)
                            // Increment views
                            incrementViews(videoId).catch(console.error)
                        }
                    }
                })
            },
            { threshold: 0.7 }
        )

        const elements = document.querySelectorAll('.feed-video-item')
        elements.forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [videos])

    const handlePlayRequest = (videoId) => {
        setActiveVideoId(videoId)
    }

    return (
        <div className="feed-container">
            <div className="feed-header">
                <div className="feed-tabs-container">
                    <button
                        className={`feed-tab ${activeTab === 'following' ? 'active' : ''}`}
                        onClick={() => setActiveTab('following')}
                    >
                        Seguindo
                    </button>
                    <div className="tab-divider"></div>
                    <button
                        className={`feed-tab ${activeTab === 'foryou' ? 'active' : ''}`}
                        onClick={() => setActiveTab('foryou')}
                    >
                        Para você
                    </button>
                </div>
                <button className="feed-search-btn" onClick={() => setIsSearchOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                </button>
            </div>

            <div className="feed-scroll-container">
                {videos.map((video, index) => (
                    <div key={video.id} className="feed-video-item" data-id={video.id}>
                        <VideoCard
                            video={video}
                            currentUser={currentUser}
                            isActive={activeVideoId === String(video.id)}
                            isFirst={index === 0}
                            onPlayRequest={handlePlayRequest}
                        />
                    </div>
                ))}

                {loading && <div className="feed-loader">Carregando...</div>}

                {!loading && videos.length === 0 && (
                    <div className="feed-empty-state">
                        <span className="material-symbols-outlined">videocam_off</span>
                        <p>Nenhum vídeo encontrado</p>
                    </div>
                )}
            </div>

            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                currentUser={currentUser}
            />
        </div>
    )
                  }

