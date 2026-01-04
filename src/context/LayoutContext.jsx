import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const LayoutContext = createContext(null)

export function LayoutProvider({ children }) {
  const [chromeHidden, setChromeHidden] = useState(false)
  const [bottomNavHidden, setBottomNavHidden] = useState(false)

  const hideChrome = useCallback(() => setChromeHidden(true), [])
  const showChrome = useCallback(() => setChromeHidden(false), [])

  const value = useMemo(() => ({
    chromeHidden,
    hideChrome,
    showChrome,
    bottomNavHidden,
    setBottomNavHidden
  }), [chromeHidden, hideChrome, showChrome, bottomNavHidden])
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider')
  return ctx
}


