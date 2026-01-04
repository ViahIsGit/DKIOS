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
  serverTimestamp,
  Timestamp,
  onSnapshot,
  increment
} from '../firebase/config'
import { getUserProfile } from './reels'

/**
 * Buscar todos os usuários da rede
 */
export async function getAllUsers(currentUserId, searchTerm = '') {
  if (!currentUserId) return []

  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    const users = []
    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id
      // Não incluir o próprio usuário
      if (userId === currentUserId) continue

      const userData = userDoc.data()
      const username = userData.username || 'Usuário'

      // Filtrar por termo de busca se fornecido
      if (searchTerm && !username.toLowerCase().includes(searchTerm.toLowerCase())) {
        continue
      }

      users.push({
        id: userId,
        username: username,
        avatar: userData.profilePicture || '/feed/logo.png',
        ...userData
      })
    }

    // Ordenar por username
    return users.sort((a, b) => a.username.localeCompare(b.username))
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return []
  }
}

/**
 * Buscar todos os amigos (follow mútuo)
 */
export async function getFriends(currentUserId) {
  if (!currentUserId) return []

  try {
    // Buscar quem o usuário está seguindo
    const followingRef = collection(db, 'followers', currentUserId, 'userFollowing')
    const followingSnapshot = await getDocs(followingRef)
    const followingIds = followingSnapshot.docs.map(doc => doc.id)

    if (followingIds.length === 0) return []

    // Verificar quais também seguem o usuário atual (amigos - follow mútuo)
    const friends = []
    for (const userId of followingIds) {
      // Verificar se o userId também segue o currentUserId (follow mútuo)
      // Se currentUserId segue userId E userId segue currentUserId = são amigos
      const mutualFollowRef = doc(db, 'followers', userId, 'userFollowers', currentUserId)
      const mutualFollowDoc = await getDoc(mutualFollowRef)

      if (mutualFollowDoc.exists()) {
        // São amigos (follow mútuo)
        const userProfile = await getUserProfile(userId)
        friends.push({
          id: userId,
          username: userProfile?.username || 'Usuário',
          avatar: userProfile?.profilePicture || '/feed/logo.png',
          ...userProfile
        })
      }
    }

    return friends
  } catch (error) {
    console.error("Erro ao buscar amigos:", error)
    return []
  }
}

/**
 * Criar ou obter ID da conversa entre dois usuários
 */
export async function getOrCreateConversation(userId1, userId2) {
  if (!userId1 || !userId2) return null

  // Ordenar IDs para garantir consistência
  const [id1, id2] = [userId1, userId2].sort()
  const conversationId = `${id1}_${id2}`

  try {
    const conversationRef = doc(db, 'conversations', conversationId)
    const conversationDoc = await getDoc(conversationRef)

    if (!conversationDoc.exists()) {
      // Criar nova conversa
      const user1Profile = await getUserProfile(id1)
      const user2Profile = await getUserProfile(id2)

      await setDoc(conversationRef, {
        participants: [id1, id2],
        participantNames: {
          [id1]: user1Profile?.username || 'Usuário',
          [id2]: user2Profile?.username || 'Usuário'
        },
        participantAvatars: {
          [id1]: user1Profile?.profilePicture || '/feed/logo.png',
          [id2]: user2Profile?.profilePicture || '/feed/logo.png'
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCounts: {
          [id1]: 0,
          [id2]: 0
        }
      })
    }

    return conversationId
  } catch (error) {
    console.error("Erro ao criar/buscar conversa:", error)
    return null
  }
}

/**
 * Enviar mensagem
 */
export async function sendMessage(conversationId, senderId, text, mediaUrl = null, mediaType = null, extraData = {}) {
  if (!conversationId || !senderId || (!text && !mediaUrl)) {
    throw new Error("Dados inválidos para enviar mensagem")
  }

  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const messageData = {
      senderId,
      text: text || '',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      read: false,
      readBy: [],
      createdAt: serverTimestamp(),
      ...extraData
    }

    const messageRef = await addDoc(messagesRef, messageData)

    // Atualizar última mensagem da conversa
    const conversationRef = doc(db, 'conversations', conversationId)
    await updateDoc(conversationRef, {
      lastMessage: text || (mediaType === 'image' ? '📷 Imagem' : mediaType === 'video' ? '🎥 Vídeo' : '📎 Arquivo'),
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
      [`unreadCounts.${senderId === conversationId.split('_')[0] ? conversationId.split('_')[1] : conversationId.split('_')[0]}`]: increment(1)
    })

    return messageRef.id
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    throw error
  }
}

/**
 * Buscar mensagens de uma conversa
 */
export async function getMessages(conversationId, limitCount = 50) {
  if (!conversationId) return []

  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(limitCount))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    })).reverse() // Reverter para ordem cronológica
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error)
    return []
  }
}

/**
 * Escutar mensagens em tempo real
 */
export function subscribeToMessages(conversationId, callback) {
  if (!conversationId) return () => { }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const q = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toMillis() || Date.now()
    }))
    callback(messages)
  }, (error) => {
    console.error("Erro ao escutar mensagens:", error)
  })
}

/**
 * Marcar mensagens como lidas
 */
export async function markMessagesAsRead(conversationId, userId, messageIds = null) {
  if (!conversationId || !userId) return

  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')

    if (messageIds) {
      // Marcar mensagens específicas
      for (const messageId of messageIds) {
        const messageRef = doc(messagesRef, messageId)
        const messageDoc = await getDoc(messageRef)

        if (messageDoc.exists() && messageDoc.data().senderId !== userId) {
          const readBy = messageDoc.data().readBy || []
          if (!readBy.includes(userId)) {
            await updateDoc(messageRef, {
              read: true,
              readBy: [...readBy, userId]
            })
          }
        }
      }
    } else {
      // Marcar todas as mensagens não lidas
      const q = query(messagesRef, where('read', '==', false), where('senderId', '!=', userId))
      const snapshot = await getDocs(q)

      for (const messageDoc of snapshot.docs) {
        const readBy = messageDoc.data().readBy || []
        if (!readBy.includes(userId)) {
          await updateDoc(doc(messagesRef, messageDoc.id), {
            read: true,
            readBy: [...readBy, userId]
          })
        }
      }

      // Resetar contador de não lidas para o usuário
      const conversationRef = doc(db, 'conversations', conversationId)
      await updateDoc(conversationRef, {
        [`unreadCounts.${userId}`]: 0
      })
    }
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error)
  }
}

/**
 * Buscar conversas do usuário
 */
export async function getConversations(userId) {
  if (!userId) return []

  try {
    // Buscar conversas onde o usuário é participante
    const conversationsRef = collection(db, 'conversations')
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    )
    const snapshot = await getDocs(q)

    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessageTime: doc.data().lastMessageTime?.toMillis() || Date.now()
    }))

    // Ordenar por última mensagem (client-side para evitar necessidade de índice composto)
    return conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
  } catch (error) {
    console.error("Erro ao buscar conversas:", error)
    return []
  }
}

/**
 * Escutar conversas em tempo real
 */
export function subscribeToConversations(userId, callback) {
  if (!userId) return () => { }

  const conversationsRef = collection(db, 'conversations')
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId)
  )

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessageTime: doc.data().lastMessageTime?.toMillis() || Date.now()
    }))
    // Ordenar por última mensagem (client-side)
    conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
    callback(conversations)
  }, (error) => {
    console.error("Erro ao escutar conversas:", error)
  })
}

/**
 * Deletar mensagem
 */
export async function deleteMessage(conversationId, messageId) {
  if (!conversationId || !messageId) return

  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId)
    await deleteDoc(messageRef)
  } catch (error) {
    console.error("Erro ao deletar mensagem:", error)
    throw error
  }
}

/**
 * Upload de mídia para mensagem
 */
export async function uploadMessageMedia(file, conversationId) {
  if (!file || !conversationId) return null

  try {
    // Usar Cloudinary para upload de mídia
    const CLOUDINARY_UPLOAD_URL = file.type.startsWith('image/')
      ? "https://api.cloudinary.com/v1_1/dwhnhrdjh/image/upload"
      : "https://api.cloudinary.com/v1_1/dwhnhrdjh/video/upload"
    const CLOUDINARY_UPLOAD_PRESET = "DKSocial"

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Erro no upload de mídia')
    }

    const data = await response.json()
    return {
      url: data.secure_url,
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
    }
  } catch (error) {
    console.error("Erro ao fazer upload de mídia:", error)
    throw error
  }
}

/**
 * Bloquear um usuário
 */
export async function blockUser(currentUserId, userIdToBlock) {
  if (!currentUserId || !userIdToBlock) throw new Error("IDs inválidos")

  try {
    const blockRef = doc(db, 'blockedUsers', currentUserId)
    const blockDoc = await getDoc(blockRef)

    const blockedUsers = blockDoc.exists() ? blockDoc.data().blocked || [] : []

    if (!blockedUsers.includes(userIdToBlock)) {
      await setDoc(blockRef, {
        blocked: [...blockedUsers, userIdToBlock],
        updatedAt: serverTimestamp()
      }, { merge: true })
    }
  } catch (error) {
    console.error("Erro ao bloquear usuário:", error)
    throw error
  }
}

/**
 * Desbloquear um usuário
 */
export async function unblockUser(currentUserId, userIdToUnblock) {
  if (!currentUserId || !userIdToUnblock) throw new Error("IDs inválidos")

  try {
    const blockRef = doc(db, 'blockedUsers', currentUserId)
    const blockDoc = await getDoc(blockRef)

    if (blockDoc.exists()) {
      const blockedUsers = blockDoc.data().blocked || []
      const updatedBlocked = blockedUsers.filter(id => id !== userIdToUnblock)

      await setDoc(blockRef, {
        blocked: updatedBlocked,
        updatedAt: serverTimestamp()
      }, { merge: true })
    }
  } catch (error) {
    console.error("Erro ao desbloquear usuário:", error)
    throw error
  }
}

/**
 * Verificar se um usuário está bloqueado
 */
export async function isUserBlocked(currentUserId, userId) {
  if (!currentUserId || !userId) return false

  try {
    const blockRef = doc(db, 'blockedUsers', currentUserId)
    const blockDoc = await getDoc(blockRef)

    if (blockDoc.exists()) {
      const blockedUsers = blockDoc.data().blocked || []
      return blockedUsers.includes(userId)
    }
    return false
  } catch (error) {
    console.error("Erro ao verificar bloqueio:", error)
    return false
  }
}

/**
 * Alterar nickname de um usuário na conversa
 */
export async function setConversationNickname(conversationId, currentUserId, targetUserId, nickname) {
  if (!conversationId || !currentUserId || !targetUserId) throw new Error("IDs inválidos")

  try {
    const nicknameRef = doc(db, 'conversations', conversationId, 'nicknames', currentUserId)
    await setDoc(nicknameRef, {
      [targetUserId]: nickname || null,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error("Erro ao alterar nickname:", error)
    throw error
  }
}

/**
 * Obter nickname customizado de um usuário na conversa
 */
export async function getConversationNickname(conversationId, currentUserId, targetUserId) {
  if (!conversationId || !currentUserId || !targetUserId) return null

  try {
    const nicknameRef = doc(db, 'conversations', conversationId, 'nicknames', currentUserId)
    const nicknameDoc = await getDoc(nicknameRef)

    if (nicknameDoc.exists()) {
      return nicknameDoc.data()[targetUserId] || null
    }
    return null
  } catch (error) {
    console.error("Erro ao obter nickname:", error)
    return null
  }
}

