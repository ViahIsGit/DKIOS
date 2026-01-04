import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  auth,
  db,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  onAuthStateChanged
} from '../firebase/config'

import { followUser, unfollowUser, isFollowing } from '../services/reels'
import { getOrCreateConversation } from '../services/messages'

import ProfileVideoViewer from './ProfileVideoViewer'
import VideoThumbnail from './VideoThumbnail'
import SettingsSheet from './SettingsSheet'

import './Profile.css'

export default function Profile() {
  const { handle } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [isFriend, setIsFriend] = useState(false)

  const [activeTab, setActiveTab] = useState('posts')
  const [userPosts, setUserPosts] = useState([])
  const [favorites, setFavorites] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerVideos, setViewerVideos] = useState([])
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const isOwnProfile =
    user && profileData && user.uid === profileData.uid

  /* =========================
     Auth
     ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) {
        navigate('/login')
      } else {
        setUser(u)
      }
    })
    return () => unsub()
  }, [navigate])

  /* =========================
     Load profile by handle
     ========================= */
  useEffect(() => {
    if (!handle) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const q = query(
          collection(db, 'users'),
          where('userHandle', '==', handle)
        )
        const snap = await getDocs(q)

        if (snap.empty) {
          navigate('/404')
          return
        }

        const d = snap.docs[0]
        setProfileData({ uid: d.id, ...d.data() })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [handle, navigate])

  /* =========================
     Follow stats
     ========================= */
  useEffect(() => {
    if (!user || !profileData) return

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

      const [f1, f2] = await Promise.all([
        getDocs(followersRef),
        getDocs(followingRef)
      ])

      setFollowersCount(f1.size)
      setFollowingCount(f2.size)

      if (!isOwnProfile) {
        const following = await isFollowing(profileData.uid, user.uid)
        setIsFollowingUser(following)

        if (following) {
          const mutual = await isFollowing(user.uid, profileData.uid)
          setIsFriend(mutual)
        }
      }
    }

    loadStats()
  }, [user, profileData, isOwnProfile])

  /* =========================
     Load posts
     ========================= */
  useEffect(() => {
    if (!profileData?.uid || activeTab !== 'posts') return

    const loadPosts = async () => {
      setPostsLoading(true)
      try {
        const q = query(
          collection(db, 'reels'),
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
        console.error(e)
      } finally {
        setPostsLoading(false)
      }
    }

    loadPosts()
  }, [profileData, activeTab])

  /* =========================
     Favorites
     ========================= */
  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'favorites') return

    const loadFavs = async () => {
      setPostsLoading(true)
      try {
        const snap = await getDocs(collection(db, 'reels'))
        const favs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.favoritesUsers?.includes(user.uid))
        setFavorites(favs)
      } finally {
        setPostsLoading(false)
      }
    }

    loadFavs()
  }, [activeTab, isOwnProfile, user])

  /* =========================
     Actions
     ========================= */
  const handleFollow = async () => {
    if (!user || isOwnProfile) return

    if (isFollowingUser) {
      await unfollowUser(profileData.uid, user.uid)
      setIsFollowingUser(false)
      setIsFriend(false)
      setFollowersCount(v => v - 1)
    } else {
      await followUser(profileData.uid, user.uid)
      setIsFollowingUser(true)
      setFollowersCount(v => v + 1)

      const mutual = await isFollowing(user.uid, profileData.uid)
      setIsFriend(mutual)
    }
  }

  const handleStartChat = async () => {
    await getOrCreateConversation(user.uid, profileData.uid)
    navigate('/messages')
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const handleVideoClick = (video, list) => {
    setViewerVideos(list)
    setViewerInitialIndex(list.findIndex(v => v.id === video.id))
    setViewerOpen(true)
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <md-circular-progress indeterminate />
      </div>
    )
  }

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
              <md-filled-tonal-button onClick={() => navigate('/u/edit')}>
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
