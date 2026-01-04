import { useState, useEffect, useRef } from 'react'
import { getAllUsers } from '../services/messages'
import { fetchReels } from '../services/reels'
import ProfileVideoViewer from './ProfileVideoViewer'
import './GlobalSearch.css'

export default function GlobalSearch({ isOpen, onClose, currentUser }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('users') // 'users' or 'videos'
    const [userResults, setUserResults] = useState([])
    const [videoResults, setVideoResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedVideoIndex, setSelectedVideoIndex] = useState(null)
    const searchInputRef = useRef(null)

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 100)
        }
    }, [isOpen])

    useEffect(() => {
        const doSearch = async () => {
            if (!searchQuery.trim()) {
                setUserResults([])
                setVideoResults([])
                return
            }

            setLoading(true)
            try {
                if (activeTab === 'users') {
                    const users = await getAllUsers(currentUser?.uid, searchQuery)
                    setUserResults(users)
                } else {
                    // Client-side filtering for videos for now as per plan
                    // In a real app with many videos, this should be a backend query
                    const allReels = await fetchReels()
                    const filtered = allReels.filter(reel =>
                        (reel.desc && reel.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (reel.username && reel.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    setVideoResults(filtered)
                }
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setLoading(false)
            }
        }

        const timeoutId = setTimeout(doSearch, 500)
        return () => clearTimeout(timeoutId)
    }, [searchQuery, activeTab, currentUser])

    const handleVideoClick = (index) => {
        setSelectedVideoIndex(index)
    }

    const closeVideoViewer = () => {
        setSelectedVideoIndex(null)
    }

    if (!isOpen) return null

    return (
        <>
            <div className="global-search-overlay" onClick={onClose}>
                <div className="global-search-container" onClick={e => e.stopPropagation()}>
                    <div className="global-search-header">
                        <md-icon-button onClick={onClose}>
                            <md-icon>arrow_back</md-icon>
                        </md-icon-button>
                        <div className="global-search-input-wrapper">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="global-search-input"
                                placeholder="Pesquisar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <md-icon-button onClick={() => setSearchQuery('')}>
                                    <md-icon>close</md-icon>
                                </md-icon-button>
                            )}
                        </div>
                    </div>

                    <div className="global-search-tabs">
                        <button
                            className={`global-search-tab ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            Usuários
                        </button>
                        <button
                            className={`global-search-tab ${activeTab === 'videos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('videos')}
                        >
                            Vídeos
                        </button>
                    </div>

                    <div className="global-search-content">
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                <md-circular-progress indeterminate></md-circular-progress>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'users' && (
                                    <div className="user-results">
                                        {userResults.map(user => (
                                            <div key={user.id} className="search-result-item">
                                                <div className="search-result-avatar">
                                                    <img src={user.avatar || '/feed/logo.png'} alt={user.username} />
                                                </div>
                                                <div className="search-result-info">
                                                    <div className="search-result-name">{user.username}</div>
                                                    <div className="search-result-sub">{user.fullName}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {userResults.length === 0 && searchQuery && (
                                            <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                                                Nenhum usuário encontrado
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'videos' && (
                                    <div className="video-search-grid">
                                        {videoResults.map((video, index) => (
                                            <div
                                                key={video.id}
                                                className="video-search-item"
                                                onClick={() => handleVideoClick(index)}
                                            >
                                                <img src={video.thumbnailUrl || video.videoUrl} alt="Thumbnail" />
                                            </div>
                                        ))}
                                        {videoResults.length === 0 && searchQuery && (
                                            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', marginTop: '20px' }}>
                                                Nenhum vídeo encontrado
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {selectedVideoIndex !== null && (
                <ProfileVideoViewer
                    videos={videoResults}
                    initialIndex={selectedVideoIndex}
                    onClose={closeVideoViewer}
                />
            )}
        </>
    )
}
