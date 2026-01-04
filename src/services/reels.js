import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp
} from '../firebase/config'

/**
 * Busca o perfil de um usuário no Firestore.
 * @param {string} userId - O UID do usuário.
 * @returns {Promise<object|null>} Os dados do perfil do usuário ou null se não encontrado.
 */
export async function getUserProfile(userId) {
  if (!userId) return null

  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data()
    }
    return null
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error)
    return null
  }
}

/**
 * Função para calcular score de popularidade de um reel
 */
function calculatePopularityScore(reel) {
  const likes = reel.likesUsers?.length || 0
  const comments = reel.comments || 0
  const views = reel.views || 0
  const favorites = reel.favoritesUsers?.length || 0
  const reposts = reel.repostsCount || 0

  // Score ponderado:
  // Likes: peso 3 (mais importante)
  // Comentários: peso 2
  // Reposts: peso 2
  // Favoritos: peso 1
  // Visualizações: peso 0.1 (menos importante)
  const score = (likes * 3) + (comments * 2) + (reposts * 2) + (favorites * 1) + (views * 0.1)

  return score
}

/**
 * Função para buscar reels do Firestore
 * Ordena por popularidade (vídeos mais famosos primeiro)
 */
export async function fetchReels() {
  try {
    const reelsRef = collection(db, 'reels')
    const q = query(reelsRef, orderBy('createdAt', 'desc'), limit(100))
    const snapshot = await getDocs(q)

    const allReels = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Converter timestamp do Firestore para Date
        timestamp: data.createdAt?.toMillis() || Date.now(),
        // Calcular score de popularidade
        popularityScore: calculatePopularityScore(data)
      }
    })

    // Ordenar por popularidade (mais famosos primeiro)
    allReels.sort((a, b) => b.popularityScore - a.popularityScore)

    // Retornar os 50 mais populares
    return allReels.slice(0, 50)
  } catch (error) {
    console.error("Erro ao buscar reels:", error)
    return []
  }
}

/**
 * Função para criar um novo reel
 */
export async function createReel({ videoFile, thumbnailFile, files, desc, type = 'video', onProgress }) {
  console.log("Iniciando criação do reel...", type)

  if (!auth.currentUser) {
    throw new Error('Usuário não autenticado')
  }

  try {
    const userProfile = await getUserProfile(auth.currentUser.uid)
    const username = userProfile?.username || 'Usuário Anônimo'
    const avatar = userProfile?.profilePicture || '/feed/logo.png'

    if (onProgress) onProgress(10)

    const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dwhnhrdjh/auto/upload"
    const CLOUDINARY_UPLOAD_PRESET = "DKSocial"

    let mediaUrls = []
    let mainVideoUrl = null
    let mainThumbnailUrl = null

    // Helper to upload single file
    const uploadFile = async (file) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData })
      if (!res.ok) throw new Error('Falha no upload')
      const data = await res.json()
      return data.secure_url
    }

    if (type === 'slideshow' && files && files.length > 0) {
      // Upload all images
      const totalFiles = files.length
      for (let i = 0; i < totalFiles; i++) {
        const url = await uploadFile(files[i])
        mediaUrls.push(url)
        if (onProgress) onProgress(10 + ((i + 1) / totalFiles) * 80)
      }
      mainVideoUrl = mediaUrls[0] // Fallback
    } else {
      // Single video/image (legacy or simple mode)
      const fileToUpload = videoFile || (files ? files[0] : null)
      if (!fileToUpload) throw new Error('Nenhum arquivo para envio')

      mainVideoUrl = await uploadFile(fileToUpload)
      mediaUrls = [mainVideoUrl]

      if (onProgress) onProgress(80)

      // Thumbnail for video
      if (thumbnailFile) {
        mainThumbnailUrl = await uploadFile(thumbnailFile)
      }
    }

    if (onProgress) onProgress(90)

    // Salvar no Firestore
    const reel = {
      videoUrl: mainVideoUrl, // Main URL or first slide
      mediaUrls: mediaUrls, // Array of all media
      thumbnailUrl: mainThumbnailUrl,
      desc: desc || '',
      type: type, // 'video', 'image', 'slideshow'
      userId: auth.currentUser.uid,
      username: username,
      avatar: avatar,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0,
      likesUsers: [],
      favoritesUsers: []
    }

    const docRef = await addDoc(collection(db, 'reels'), reel)
    console.log("Reel salvo com ID:", docRef.id)

    if (onProgress) onProgress(100)

    return { id: docRef.id, ...reel, createdAt: new Date() }
  } catch (error) {
    console.error("Erro ao criar reel:", error)
    throw new Error(`Erro ao enviar o reel: ${error.message}`)
  }
}

/**
 * Função para curtir um reel
 */
export async function likeReel(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const reelRef = doc(db, 'reels', reelId)
  await updateDoc(reelRef, {
    likesUsers: arrayUnion(userId)
  })
}

/**
 * Função para remover curtida
 */
export async function unlikeReel(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const reelRef = doc(db, 'reels', reelId)
  await updateDoc(reelRef, {
    likesUsers: arrayRemove(userId)
  })
}

/**
 * Função para favoritar um reel
 */
export async function favoriteReel(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const reelRef = doc(db, 'reels', reelId)
  await updateDoc(reelRef, {
    favoritesUsers: arrayUnion(userId)
  })
}

/**
 * Função para remover dos favoritos
 */
export async function unfavoriteReel(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const reelRef = doc(db, 'reels', reelId)
  await updateDoc(reelRef, {
    favoritesUsers: arrayRemove(userId)
  })
}

/**
 * Busca os reels de um usuário específico.
 */
export async function fetchReelsByUserId(userId) {
  if (!userId) return []

  try {
    const reelsRef = collection(db, 'reels')
    const q = query(
      reelsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
  } catch (error) {
    console.error("ERRO GRAVE ao buscar reels do usuário:", error)
    return []
  }
}

/**
 * Buscar comentários de um reel
 */
export async function getComments(reelId) {
  try {
    const commentsRef = collection(db, 'reels', reelId, 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        date: data.createdAt
          ? new Date(data.createdAt.toMillis()).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })
          : ''
      }
    })
  } catch (error) {
    console.error("Erro ao buscar comentários:", error)
    return []
  }
}

/**
 * Adicionar comentário
 */
export async function addComment(reelId, { text }) {
  if (!auth.currentUser) throw new Error('Usuário não autenticado')

  const userProfile = await getUserProfile(auth.currentUser.uid)
  const username = userProfile?.username || 'Usuário Anônimo'
  const avatar = userProfile?.profilePicture || '/feed/fizz.png'

  const commentsRef = collection(db, 'reels', reelId, 'comments')
  await addDoc(commentsRef, {
    text,
    userId: auth.currentUser.uid,
    username: username,
    avatar: avatar,
    createdAt: serverTimestamp(),
    likesUsers: []
  })
}

/**
 * Curte um comentário específico.
 */
export async function likeComment(reelId, commentId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const commentRef = doc(db, 'reels', reelId, 'comments', commentId)
  await updateDoc(commentRef, {
    likesUsers: arrayUnion(userId)
  })
}

/**
 * Remove a curtida de um comentário.
 */
export async function unlikeComment(reelId, commentId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const commentRef = doc(db, 'reels', reelId, 'comments', commentId)
  await updateDoc(commentRef, {
    likesUsers: arrayRemove(userId)
  })
}

/**
 * Função para reportar um reel
 */
export async function reportReel(reelId, reason, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  const reportData = {
    reelId: reelId,
    userId: userId,
    reason: reason,
    createdAt: serverTimestamp()
  }

  await addDoc(collection(db, 'reports'), reportData)
}

/**
 * Função para bloquear um usuário
 */
export async function blockUser(blockedUserId, currentUserId) {
  if (!currentUserId) throw new Error("Usuário não autenticado")

  const blockData = {
    blockedUserId: blockedUserId,
    blockedBy: currentUserId,
    createdAt: serverTimestamp()
  }

  await addDoc(collection(db, 'blockedUsers'), blockData)
}

/**
 * Função para seguir um usuário
 */
export async function followUser(followedUserId, currentUserId) {
  if (!currentUserId) throw new Error("Usuário não autenticado")

  const followData = {
    followedUserId: followedUserId,
    followerId: currentUserId,
    createdAt: serverTimestamp()
  }

  // Salvar em duas coleções: quem está seguindo e quem está sendo seguido
  await setDoc(doc(db, 'followers', followedUserId, 'userFollowers', currentUserId), followData)
  await setDoc(doc(db, 'followers', currentUserId, 'userFollowing', followedUserId), {
    followedUserId: followedUserId,
    followerId: currentUserId,
    createdAt: serverTimestamp()
  })
}

/**
 * Função para deixar de seguir um usuário
 */
export async function unfollowUser(followedUserId, currentUserId) {
  if (!currentUserId) throw new Error("Usuário não autenticado")

  await deleteDoc(doc(db, 'followers', followedUserId, 'userFollowers', currentUserId))
  await deleteDoc(doc(db, 'followers', currentUserId, 'userFollowing', followedUserId))
}

/**
 * Função para verificar se está seguindo um usuário
 */
export async function isFollowing(followedUserId, currentUserId) {
  if (!currentUserId) return false

  try {
    const followDoc = await getDoc(
      doc(db, 'followers', followedUserId, 'userFollowers', currentUserId)
    )
    return followDoc.exists()
  } catch (error) {
    console.error("Erro ao verificar follow:", error)
    return false
  }
}

/**
 * Função para obter estatísticas de um reel
 */
export async function getReelStats(reelId) {
  try {
    const reelDoc = await getDoc(doc(db, 'reels', reelId))
    if (!reelDoc.exists()) return null

    const reelData = reelDoc.data()

    return {
      likes: reelData.likesUsers?.length || 0,
      comments: reelData.comments || 0,
      favorites: reelData.favoritesUsers?.length || 0,
      views: reelData.views || 0
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return null
  }
}

/**
 * Função para incrementar visualizações
 */
export async function incrementViews(reelId) {
  const reelRef = doc(db, 'reels', reelId)
  await updateDoc(reelRef, {
    views: increment(1)
  })
}

/**
 * Função para buscar reels por hashtag
 */
export async function fetchReelsByHashtag(hashtag) {
  try {
    const reelsRef = collection(db, 'reels')
    const q = query(
      reelsRef,
      where('hashtags', 'array-contains', hashtag),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
  } catch (error) {
    console.error("Erro ao buscar reels por hashtag:", error)
    return []
  }
}

/**
 * Função para buscar reels de usuários seguidos
 */
export async function fetchFollowingReels(currentUserId) {
  if (!currentUserId) return []

  try {
    // Buscar usuários seguidos
    const followingRef = collection(db, 'followers', currentUserId, 'userFollowing')
    const followingSnapshot = await getDocs(followingRef)

    const followingIds = followingSnapshot.docs.map(doc => doc.id)

    if (followingIds.length === 0) return []

    // Buscar reels dos usuários seguidos
    const reelsRef = collection(db, 'reels')
    const q = query(
      reelsRef,
      where('userId', 'in', followingIds),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
  } catch (error) {
    console.error("Erro ao buscar reels de seguidos:", error)
    return []
  }
}

/**
 * Função para buscar reels recomendados baseado na popularidade
 * Prioriza vídeos mais famosos (com mais likes, comentários, visualizações)
 */
export async function fetchRecommendedReels(currentUserId) {
  try {
    const reelsRef = collection(db, 'reels')
    const q = query(reelsRef, orderBy('createdAt', 'desc'), limit(200))
    const snapshot = await getDocs(q)

    const allReels = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis() || Date.now(),
        // Calcular score de popularidade
        popularityScore: calculatePopularityScore(data)
      }
    })

    // Ordenar por popularidade (mais famosos primeiro)
    allReels.sort((a, b) => b.popularityScore - a.popularityScore)

    // Retornar os 30 mais populares como recomendados
    return allReels.slice(0, 30)
  } catch (error) {
    console.error("Erro ao buscar reels recomendados:", error)
    return []
  }
}

/**
 * Função para compartilhar um reel
 */
export async function shareReel(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  try {
    const reelRef = doc(db, 'reels', reelId)
    await updateDoc(reelRef, {
      shares: increment(1),
      sharesUsers: arrayUnion(userId)
    })
  } catch (error) {
    console.error("Erro ao compartilhar reel:", error)
    throw error
  }
}

/**
 * Função para fazer repost (republicar) um reel
 */
export async function repostReel(reelId, userId, desc = '') {
  if (!userId) throw new Error("Usuário não autenticado")

  try {
    // Buscar o reel original
    const originalReel = await getDoc(doc(db, 'reels', reelId))
    if (!originalReel.exists()) {
      throw new Error("Reel não encontrado")
    }

    const originalData = originalReel.data()
    const userProfile = await getUserProfile(userId)

    // Criar novo reel com referência ao original
    const repostReel = {
      videoUrl: originalData.videoUrl,
      thumbnailUrl: originalData.thumbnailUrl,
      desc: desc || originalData.desc || '',
      userId: userId,
      username: userProfile?.username || 'Usuário Anônimo',
      avatar: userProfile?.profilePicture || '/feed/logo.png',
      originalReelId: reelId,
      originalUserId: originalData.userId,
      isRepost: true,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0,
      likesUsers: [],
      favoritesUsers: [],
      shares: 0
    }

    const docRef = await addDoc(collection(db, 'reels'), repostReel)

    // Incrementar contador de reposts no original
    await updateDoc(doc(db, 'reels', reelId), {
      reposts: increment(1),
      repostsUsers: arrayUnion(userId)
    })

    return { id: docRef.id, ...repostReel, createdAt: new Date() }
  } catch (error) {
    console.error("Erro ao fazer repost:", error)
    throw error
  }
}

/**
 * Função para buscar reposts de um reel
 */
export async function fetchReposts(reelId) {
  try {
    const reelsRef = collection(db, 'reels')
    const q = query(
      reelsRef,
      where('originalReelId', '==', reelId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
  } catch (error) {
    console.error("Erro ao buscar reposts:", error)
    return []
  }
}

/**
 * Função para marcar repost (gostou) de um reel no Firestore
 * Agora apenas marca que o usuário gostou, sem criar novo post
 */
export async function markRepost(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  try {
    // Verificar se já repostou
    const repostDocRef = doc(db, 'reels', reelId, 'reposts', userId)
    const repostDoc = await getDoc(repostDocRef)

    if (repostDoc.exists()) {
      // Já repostou, retornar sem fazer nada
      return false
    }

    // Buscar dados do usuário
    const userProfile = await getUserProfile(userId)

    // Criar documento de repost na subcoleção
    await setDoc(repostDocRef, {
      userId: userId,
      username: userProfile?.username || 'Usuário',
      userHandle: userProfile?.userHandle || 'usuario',
      avatar: userProfile?.profilePicture || '/feed/fizz.png',
      reelId: reelId,
      createdAt: serverTimestamp()
    })

    // Incrementar contador de reposts no reel
    const reelRef = doc(db, 'reels', reelId)
    await updateDoc(reelRef, {
      repostsCount: increment(1),
      repostsUsers: arrayUnion(userId)
    })

    return true
  } catch (error) {
    console.error("Erro ao marcar repost:", error)
    throw error
  }
}

/**
 * Função para remover marcação de repost
 */
export async function unmarkRepost(reelId, userId) {
  if (!userId) throw new Error("Usuário não autenticado")

  try {
    const repostDocRef = doc(db, 'reels', reelId, 'reposts', userId)
    const repostDoc = await getDoc(repostDocRef)

    if (!repostDoc.exists()) {
      return false
    }

    // Remover documento de repost
    await deleteDoc(repostDocRef)

    // Decrementar contador de reposts no reel
    const reelRef = doc(db, 'reels', reelId)
    await updateDoc(reelRef, {
      repostsCount: increment(-1),
      repostsUsers: arrayRemove(userId)
    })

    return true
  } catch (error) {
    console.error("Erro ao remover repost:", error)
    throw error
  }
}

/**
 * Função para verificar se usuário já repostou um reel
 */
export async function checkIfReposted(reelId, userId) {
  if (!userId) return false

  try {
    const repostDocRef = doc(db, 'reels', reelId, 'reposts', userId)
    const repostDoc = await getDoc(repostDocRef)
    return repostDoc.exists()
  } catch (error) {
    console.error("Erro ao verificar repost:", error)
    return false
  }
}

/**
 * Função para obter contagem de reposts de um reel
 */
export async function getRepostCount(reelId) {
  try {
    // Primeiro, tentar buscar do campo repostsCount do reel
    const reelDoc = await getDoc(doc(db, 'reels', reelId))
    if (reelDoc.exists()) {
      const reelData = reelDoc.data()
      if (reelData.repostsCount !== undefined) {
        return reelData.repostsCount
      }
    }

    // Se não tiver campo, contar documentos na subcoleção
    const repostsRef = collection(db, 'reels', reelId, 'reposts')
    const snapshot = await getDocs(repostsRef)
    return snapshot.size
  } catch (error) {
    console.error("Erro ao contar reposts:", error)
    return 0
  }
}

/**
 * Função para obter dados de repost de um reel
 * Retorna informações sobre quem repostou (para exibir na UI)
 */
export async function getRepostData(reelId, currentUserId) {
  if (!currentUserId) return null

  try {
    const following = JSON.parse(localStorage.getItem('following') || '[]')

    // Verificar se o usuário atual já repostou
    const userRepostRef = doc(db, 'reels', reelId, 'reposts', currentUserId)
    const userRepostDoc = await getDoc(userRepostRef)

    if (userRepostDoc.exists()) {
      const userRepostData = userRepostDoc.data()
      const userProfile = await getUserProfile(currentUserId)

      return {
        reposterId: currentUserId,
        username: userProfile?.username || userRepostData.username || 'Você',
        userHandle: userProfile?.userHandle || userRepostData.userHandle || 'voce',
        avatar: userProfile?.profilePicture || userRepostData.avatar || '/feed/fizz.png',
        repostedAt: userRepostData.createdAt?.toMillis() || Date.now(),
        isOwnRepost: true
      }
    }

    // Se não for repost próprio, buscar reposts de usuários seguidos
    const repostsRef = collection(db, 'reels', reelId, 'reposts')
    const snapshot = await getDocs(repostsRef)

    for (const repostDoc of snapshot.docs) {
      const reposterId = repostDoc.id

      if (following.includes(reposterId)) {
        const repostData = repostDoc.data()
        const userProfile = await getUserProfile(reposterId)

        return {
          reposterId: reposterId,
          username: userProfile?.username || repostData.username || 'Usuário',
          userHandle: userProfile?.userHandle || repostData.userHandle || 'usuario',
          avatar: userProfile?.profilePicture || repostData.avatar || '/feed/fizz.png',
          repostedAt: repostData.createdAt?.toMillis() || Date.now(),
          isOwnRepost: false
        }
      }
    }

    return null
  } catch (error) {
    console.error("Erro ao buscar dados de repost:", error)
    return null
  }
}

/**
 * Função para buscar todos os reposts de um reel (para exibição)
 */
export async function getAllReposts(reelId) {
  try {
    const repostsRef = collection(db, 'reels', reelId, 'reposts')
    const q = query(repostsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
  } catch (error) {
    console.error("Erro ao buscar todos os reposts:", error)
    return []
  }
}

