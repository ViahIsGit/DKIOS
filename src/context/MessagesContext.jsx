import { createContext, useContext, useState, useEffect } from 'react'
import { auth, onAuthStateChanged } from '../firebase/config'
import { subscribeToConversations } from '../services/messages'

const MessagesContext = createContext()

export function useMessages() {
    return useContext(MessagesContext)
}

export function MessagesProvider({ children }) {
    const [conversations, setConversations] = useState([])
    const [totalUnreadCount, setTotalUnreadCount] = useState(0)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user)
            if (!user) {
                setConversations([])
                setTotalUnreadCount(0)
                setLoading(false)
            }
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!currentUser) return

        const unsubscribe = subscribeToConversations(currentUser.uid, (convs) => {
            setConversations(convs)

            // Calculate total unread count
            const count = convs.reduce((total, conv) => {
                const unread = conv.unreadCounts?.[currentUser.uid] || 0
                return total + unread
            }, 0)

            setTotalUnreadCount(count)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [currentUser])

    const value = {
        conversations,
        totalUnreadCount,
        loading
    }

    return (
        <MessagesContext.Provider value={value}>
            {children}
        </MessagesContext.Provider>
    )
}
