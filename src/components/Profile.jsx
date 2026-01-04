import { useEffect, useState } from 'react'
import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from '../firebase/config'
import { signOut } from 'firebase/auth'
import { useNavigate, useParams } from 'react-router-dom'
import { followUser, unfollowUser, isFollowing } from '../services/reels'
import { getOrCreateConversation } from '../services/messages'
import ProfileVideoViewer from './ProfileVideoViewer'
import VideoThumbnail from './VideoThumbnail'
import SettingsSheet from './SettingsSheet'
import './Profile.css'

export default function Profile({ onMenuClick, drawerOpen }) {
  const { handle } = useParams()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerVideos, setViewerVideos] = useState([])
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)

  const [userPosts, setUserPosts] = useState([])
  const [favorites, setFavorites] = useState([])
  const [activeTab, setActiveTab] = useState('posts')
  const [postsLoading, setPostsLoading] = useState(false)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const isOwnProfile =
    currentUser && profileData && currentUser.uid === profileData.uid

  /* =========================
     Auth (quem está logado)
     ========================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  /* =========================
     Carregar perfil pelo handle
     ========================= */
  useEffect(() => {
    if (!handle) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('userHandle', '==', handle))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          navigate('/404')
          return
        }

        const snap = snapshot.docs[0]
        setProfileData({
          uid: snap.id,
          ...snap.data()
        })
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [handle, navigate])

  /* =========================
     Estatísticas de follow
     ========================= */
  useEffect(() => {
    if (!currentUser || !profileData) return

    const loadStats = async () => {
      const followersRef = collection(
        db,
        'followers',
        profileData.uid,
        'userFollowers'
      )
      const followingRef = collection(
        db,
        'followers',
        profileData.uid,
        'userFollowing'
      )

      const followersSnap = await getDocs(followersRef)
      const followingSnap = await getDocs(followingRef)

      setFollowersCount(followersSnap.size)
      setFollowingCount(followingSnap.size)

      if (!isOwnProfile) {
        const following = await isFollowing(profileData.uid, currentUser.uid)
        setIsFollowingUser(following)

        if (following) {
          const mutual = await isFollowing(
            currentUser.uid,
            profileData.uid
          )
          setIsFriend(mutual)
        }
      }
    }

    loadStats()
  }, [currentUser, profileData, isOwnProfile])

  /* =========================
     Posts do usuário
     ========================= */
  useEffect(() => {
    if (!profileData?.uid || activeTab !== 'posts') return

    const loadPosts = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const q = query(
          reelsRef,
          where('userId', '==', profileData.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        setUserPosts(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().createdAt?.toMillis() || Date.now()
          }))
        )
      } catch (e) {
        console.error('Erro ao carregar posts:', e)
      } finally {
        setPostsLoading(false)
      }
    }

    loadPosts()
  }, [profileData, activeTab])

  /* =========================
     Favoritos (apenas próprio)
     ========================= */
  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'favorites') return

    const loadFavorites = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const snap = await getDocs(reelsRef)

        const favs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.favoritesUsers?.includes(currentUser.uid))

        setFavorites(favs)
      } finally {
        setPostsLoading(false)
      }
    }

    loadFavorites()
  }, [activeTab, isOwnProfile, currentUser])

  /* =========================
     Actions
     ========================= */
  const handleFollow = async () => {
    if (!currentUser || isOwnProfile) return

    if (isFollowingUser) {
      await unfollowUser(profileData.uid, currentUser.uid)
      setIsFollowingUser(false)
      setIsFriend(false)
      setFollowersCount(v => v - 1)
    } else {
      await followUser(profileData.uid, currentUser.uid)
      setIsFollowingUser(true)
      setFollowersCount(v => v + 1)

      const mutual = await isFollowing(
        currentUser.uid,
        profileData.uid
      )
      setIsFriend(mutual)
    }
  }

  const handleStartChat = async () => {
    if (!currentUser || isOwnProfile) return
    await getOrCreateConversation(currentUser.uid, profileData.uid)
    navigate('/messages')
  }

  const handleEditProfile = () => navigate('/u/edit')

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  /* =========================
     Viewer
     ========================= */
  const handleVideoClick = (video, all) => {
    setViewerVideos(all)
    setViewerInitialIndex(all.findIndex(v => v.id === video.id))
    setViewerOpen(true)
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <md-circular-progress indeterminate />
      </div>
    )
  }

  /* =========================
     Render
     ========================= */
  return (
    <>
      {viewerOpen && (
        <ProfileVideoViewer
          videos={viewerVideos}
          initialIndex={viewerInitialIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profileUrl={window.location.href}
        onLogout={handleLogout}
      />

      <div className="profile-page">
        <div className="profile-header">
          <img
            src={profileData.avatarBase64}
            alt=""
            className="profile-avatar"
          />

          <h2>{profileData.username}</h2>
          <p>@{profileData.userHandle}</p>

          <div className="profile-actions">
            {isOwnProfile ? (
              <md-filled-tonal-button onClick={handleEditProfile}>
                Editar perfil
              </md-filled-tonal-button>
            ) : (
              <>
                <md-filled-button onClick={handleFollow}>
                  {isFriend
                    ? 'Amigo'
                    : isFollowingUser
                    ? 'Seguindo'
                    : 'Seguir'}
                </md-filled-button>
                <md-filled-tonal-button onClick={handleStartChat}>
                  Mensagem
                </md-filled-tonal-button>
              </>
            )}
          </div>
        </div>

        <div className="posts-grid">
          {userPosts.map(post => (
            <VideoThumbnail
              key={post.id}
              video={post}
              onClick={() => handleVideoClick(post, userPosts)}
            />
          ))}
        </div>
      </div>
    </>
  )
}
          const userRef = doc(db, 'users', currentUser.uid)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            setProfileData({
              ...userSnap.data(),
              uid: currentUser.uid,
              email: currentUser.email,
              fullName: userSnap.data().fullName || currentUser.displayName || ''
            })
          } else {
            setProfileData({
              uid: currentUser.uid,
              email: currentUser.email,
              fullName: currentUser.displayName || ''
            })
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error)
        }
      } else {
        navigate('/login')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  // Carregar estatísticas de follow
  useEffect(() => {
    if (!user || !profileData) return

    const loadFollowStats = async () => {
      try {
        // Contar seguidores
        const followersRef = collection(db, 'followers', profileData.uid, 'userFollowers')
        const followersSnapshot = await getDocs(followersRef)
        setFollowersCount(followersSnapshot.size)

        // Contar seguindo
        const followingRef = collection(db, 'followers', profileData.uid, 'userFollowing')
        const followingSnapshot = await getDocs(followingRef)
        setFollowingCount(followingSnapshot.size)

        // Verificar se está seguindo (se não for o próprio perfil)
        if (!isOwnProfile && user.uid !== profileData.uid) {
          const following = await isFollowing(profileData.uid, user.uid)
          setIsFollowingUser(following)

          // Verificar se são amigos
          if (following) {
            const mutualFollow = await isFollowing(user.uid, profileData.uid)
            setIsFriend(mutualFollow)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }

    loadFollowStats()
  }, [user, profileData, isOwnProfile])

  // Carregar posts do usuário
  useEffect(() => {
    if (!profileData?.uid || activeTab !== 'posts') return

    const loadUserPosts = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const q = query(
          reelsRef,
          where('userId', '==', profileData.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const snapshot = await getDocs(q)
        const posts = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toMillis() || Date.now(),
            username: profileData?.username || 'Usuário',
            avatar: profileData?.avatarBase64 || ''
          }
        })
        setUserPosts(posts)
      } catch (error) {
        console.error('Erro ao carregar posts:', error)
        // Se der erro com orderBy, tentar sem orderBy
        try {
          const reelsRef = collection(db, 'reels')
          const q = query(
            reelsRef,
            where('userId', '==', profileData.uid),
            limit(20)
          )
          const snapshot = await getDocs(q)
          const posts = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              timestamp: data.createdAt?.toMillis() || Date.now(),
              username: profileData?.username || 'Usuário',
              avatar: profileData?.avatarBase64 || ''
            }
          }).sort((a, b) => b.timestamp - a.timestamp)
          setUserPosts(posts)
        } catch (err) {
          console.error('Erro ao carregar posts (fallback):', err)
        }
      } finally {
        setPostsLoading(false)
      }
    }

    loadUserPosts()
  }, [profileData?.uid, profileData?.username, profileData?.avatarBase64, activeTab])

  // Carregar favoritos
  useEffect(() => {
    if (!user || !profileData || activeTab !== 'favorites') return

    const loadFavorites = async () => {
      setPostsLoading(true)
      try {
        const reelsRef = collection(db, 'reels')
        const snapshot = await getDocs(reelsRef)
        const allReels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.toMillis() || Date.now()
        }))

        // Filtrar apenas os que o usuário favoritou
        const favoritedReels = allReels.filter(reel =>
          reel.favoritesUsers?.includes(user.uid)
        )

        // Buscar informações dos usuários para cada reel
        const reelsWithUserInfo = await Promise.all(
          favoritedReels.map(async (reel) => {
            try {
              const userRef = doc(db, 'users', reel.userId)
              const userSnap = await getDoc(userRef)
              if (userSnap.exists()) {
                const userData = userSnap.data()
                return {
                  ...reel,
                  username: userData.username || 'Usuário',
                  avatar: userData.avatarBase64 || ''
                }
              }
              return {
                ...reel,
                username: 'Usuário',
                avatar: ''
              }
            } catch (err) {
              return {
                ...reel,
                username: 'Usuário',
                avatar: ''
              }
            }
          })
        )

        setFavorites(reelsWithUserInfo.sort((a, b) => b.timestamp - a.timestamp))
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error)
      } finally {
        setPostsLoading(false)
      }
    }

    if (isOwnProfile) {
      loadFavorites()
    }
  }, [user, profileData, activeTab, isOwnProfile])

  const handleFollow = async () => {
    if (!user || isOwnProfile) return

    try {
      if (isFollowingUser) {
        await unfollowUser(profileData.uid, user.uid)
        setIsFollowingUser(false)
        setIsFriend(false)
        setFollowersCount(prev => Math.max(0, prev - 1))
      } else {
        await followUser(profileData.uid, user.uid)
        setIsFollowingUser(true)
        setFollowersCount(prev => prev + 1)
        // Verificar se agora são amigos
        const mutualFollow = await isFollowing(user.uid, profileData.uid)
        setIsFriend(mutualFollow)
      }
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error)
    }
  }

  const handleStartChat = async () => {
    if (!user || !profileData || isOwnProfile) return

    try {
      const conversationId = await getOrCreateConversation(user.uid, profileData.uid)
      if (conversationId) {
        navigate('/messages')
      }
    } catch (error) {
      console.error('Erro ao iniciar chat:', error)
    }
  }

  const handleEditProfile = () => {
    navigate('/u/edit')
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.localStorage.removeItem('logged')
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleVideoClick = (video, allVideos) => {
    const formattedVideos = allVideos.map(v => ({
      id: v.id,
      username: v.username || profileData?.username || 'Usuário',
      avatar: v.avatar || profileData?.avatarBase64 || '',
      thumbnail: v.thumbnailUrl || v.videoUrl,
      videoUrl: v.videoUrl,
      description: v.desc || v.description || '',
      duration: v.duration || '0:00',
      timestamp: v.timestamp || Date.now(),
      likes: v.likesUsers?.length || 0,
      comments: v.comments || 0,
      shares: 0,
      isLiked: user ? v.likesUsers?.includes(user.uid) : false,
      isFavorited: user ? v.favoritesUsers?.includes(user.uid) : false,
      likesUsers: v.likesUsers || [],
      reelId: v.id,
      userId: v.userId || profileData?.uid,
      currentUser: user
    }))
    const index = formattedVideos.findIndex(v => v.id === video.id)
    setViewerVideos(formattedVideos)
    setViewerInitialIndex(index >= 0 ? index : 0)
    setViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    setViewerVideos([])
    setViewerInitialIndex(0)
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <md-circular-progress indeterminate></md-circular-progress>
        </div>
      </div>
    )
  }

  return (
    <>
      {viewerOpen && (
        <ProfileVideoViewer
          videos={viewerVideos}
          initialIndex={viewerInitialIndex}
          onClose={handleCloseViewer}
        />
      )}

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profileUrl={window.location.href}
        onLogout={handleLogout}
        anchor="right"
      />

      <div className="profile-page">
        <div className="profile-container">
          {/* Cover Area - New for Expressive Design */}
          <div
            className="profile-cover"
            style={
              profileData?.bannerColor
                ? { background: `linear-gradient(135deg, ${profileData.bannerColor} 0%, var(--md-sys-color-surface-container-low) 100%)` }
                : {}
            }
          >
            <div className="profile-cover-gradient" style={profileData?.bannerColor ? { background: 'transparent' } : {}}></div>
          </div>

          {isOwnProfile && (
            <div className="profile-menu-button">
              <md-filled-icon-button onClick={() => setIsSettingsOpen(true)}>
                <md-icon>menu</md-icon>
              </md-filled-icon-button>
            </div>
          )}

          <div className="profile-content-wrapper">
            {/* Header do Perfil */}
            <div className="profile-header-section">
              <div className="profile-avatar-container">
                {profileData?.avatarBase64 ? (
                  <img
                    src={profileData.avatarBase64}
                    alt="Avatar"
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <md-icon>account_circle</md-icon>
                  </div>
                )}
              </div>

              <div className="profile-title-section">
                <h2 className="profile-name">
                  {profileData?.username || profileData?.fullName || 'Usuário'}
                </h2>
                {profileData?.userHandle && (
                  <p className="profile-handle">@{profileData.userHandle}</p>
                )}
                {profileData?.bio && (
                  <p className="profile-bio-text">{profileData.bio}</p>
                )}
              </div>

              {/* Estatísticas - Moved inside header for better grouping */}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{formatNumber(userPosts.length)}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item" onClick={() => setActiveTab('following')}>
                  <span className="stat-number">{formatNumber(followingCount)}</span>
                  <span className="stat-label">Seguindo</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{formatNumber(followersCount)}</span>
                  <span className="stat-label">Seguidores</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="profile-actions">
                {isOwnProfile ? (
                  <>
                    <md-filled-tonal-button onClick={handleEditProfile} className="action-btn">
                      <md-icon slot="icon">edit</md-icon>
                      Editar Perfil
                    </md-filled-tonal-button>
                  </>
                ) : (
                  <>
                    <md-filled-button
                      onClick={handleFollow}
                      className={`action-btn follow-btn ${isFollowingUser ? 'following' : ''} ${isFriend ? 'friend' : ''}`}
                    >
                      <md-icon slot="icon">
                        {isFriend ? 'group' : isFollowingUser ? 'check' : 'person_add'}
                      </md-icon>
                      {isFriend ? 'Amigo' : isFollowingUser ? 'Seguindo' : 'Seguir'}
                    </md-filled-button>
                    <md-filled-tonal-button onClick={handleStartChat} className="action-btn">
                      <md-icon slot="icon">chat</md-icon>
                      Mensagem
                    </md-filled-tonal-button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs-container">
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  <md-icon>grid_view</md-icon>
                  Posts
                </button>
                {isOwnProfile && (
                  <button
                    className={`profile-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                    onClick={() => setActiveTab('favorites')}
                  >
                    <md-icon>bookmark</md-icon>
                    Favoritos
                  </button>
                )}
                <button
                  className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                  onClick={() => setActiveTab('following')}
                >
                  <md-icon>people</md-icon>
                  Seguindo
                </button>
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            <div className="profile-content">
              {activeTab === 'posts' && (
                <div className="posts-grid">
                  {postsLoading ? (
                    <div className="loading-posts">
                      <md-circular-progress indeterminate></md-circular-progress>
                    </div>
                  ) : userPosts.length > 0 ? (
                    userPosts.map((post) => {
                      const videoData = {
                        id: post.id,
                        username: post.username || profileData?.username || 'Usuário',
                        avatar: post.avatar || profileData?.avatarBase64 || '',
                        thumbnail: post.thumbnailUrl || post.videoUrl,
                        videoUrl: post.videoUrl,
                        description: post.desc || '',
                        duration: post.duration || '0:00',
                        timestamp: post.timestamp,
                        likes: post.likesUsers?.length || 0,
                        comments: post.comments || 0,
                        shares: 0,
                        isLiked: user ? post.likesUsers?.includes(user.uid) : false,
                        isFavorited: user ? post.favoritesUsers?.includes(user.uid) : false,
                        likesUsers: post.likesUsers || [],
                        reelId: post.id,
                        userId: post.userId || profileData?.uid
                      }
                      return (
                        <VideoThumbnail
                          key={post.id}
                          video={videoData}
                          onClick={() => handleVideoClick(videoData, userPosts)}
                        />
                      )
                    })
                  ) : (
                    <div className="empty-state">
                      <md-icon>video_library</md-icon>
                      <p>Nenhum post ainda</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'favorites' && isOwnProfile && (
                <div className="posts-grid">
                  {postsLoading ? (
                    <div className="loading-posts">
                      <md-circular-progress indeterminate></md-circular-progress>
                    </div>
                  ) : favorites.length > 0 ? (
                    favorites.map((post) => {
                      const videoData = {
                        id: post.id,
                        username: post.username || 'Usuário',
                        avatar: post.avatar || '',
                        thumbnail: post.thumbnailUrl || post.videoUrl,
                        videoUrl: post.videoUrl,
                        description: post.desc || '',
                        duration: post.duration || '0:00',
                        timestamp: post.timestamp,
                        likes: post.likesUsers?.length || 0,
                        comments: post.comments || 0,
                        shares: 0,
                        isLiked: user ? post.likesUsers?.includes(user.uid) : false,
                        isFavorited: true,
                        likesUsers: post.likesUsers || [],
                        reelId: post.id,
                        userId: post.userId
                      }
                      return (
                        <VideoThumbnail
                          key={post.id}
                          video={videoData}
                          onClick={() => handleVideoClick(videoData, favorites)}
                        />
                      )
                    })
                  ) : (
                    <div className="empty-state">
                      <md-icon>bookmark_border</md-icon>
                      <p>Nenhum favorito ainda</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'following' && (
                <div className="following-list">
                  {postsLoading ? (
                    <div className="loading-posts">
                      <md-circular-progress indeterminate></md-circular-progress>
                    </div>
                  ) : (
                    <p className="coming-soon">Lista de seguindo em breve...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

