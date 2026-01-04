import {
  argbFromHex,
  themeFromSourceColor,
  sourceColorFromImage,
  Hct
} from '@material/material-color-utilities'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)

/**
 * Aumenta a vibração da cor usando HCT
 */
function expressiveColor(hex, chromaBoost = 1.25) {
  const argb = argbFromHex(hex)
  const hct = Hct.fromInt(argb)

  const boosted = Hct.from(
    hct.hue,
    Math.min(hct.chroma * chromaBoost, 120),
    hct.tone
  )

  return boosted.toInt()
}

/**
 * Decide light / dark baseado na cor
 */
function isDarkFromColor(argb) {
  const hct = Hct.fromInt(argb)
  return hct.tone < 50
}

export function ThemeProvider({ children }) {
  const [wallpaper, setWallpaper] = useState(
    localStorage.getItem('app_wallpaper')
  )
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem('app_primary_color') || '#6750A4'
  )

  const applyThemeFromColor = useCallback((hex) => {
    // Cor mais vibrante (Expressive)
    const expressiveArgb = expressiveColor(hex)

    // Decide o modo pela cor
    const darkByColor = isDarkFromColor(expressiveArgb)

    const theme = themeFromSourceColor(expressiveArgb)
    const scheme = darkByColor ? theme.schemes.dark : theme.schemes.light

    const root = document.documentElement
    root.style.setProperty('color-scheme', darkByColor ? 'dark' : 'light')

    // Tokens principais
    for (const [key, value] of Object.entries(scheme.toJSON())) {
      const token = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const hex = '#' + value.toString(16).slice(2).padStart(6, '0')
      root.style.setProperty(`--md-sys-color-${token}`, hex)
    }

    // Surface containers (Material 3 atualizado)
    const neutral = theme.palettes.neutral
    const setTone = (name, tone) => {
      const c = neutral.tone(tone)
      const hex = '#' + (c & 0xffffff).toString(16).padStart(6, '0')
      root.style.setProperty(`--md-sys-color-${name}`, hex)
    }

    if (darkByColor) {
      setTone('surface-container-lowest', 4)
      setTone('surface-container-low', 10)
      setTone('surface-container', 12)
      setTone('surface-container-high', 17)
      setTone('surface-container-highest', 22)
      setTone('surface-dim', 6)
      setTone('surface-bright', 24)
    } else {
      setTone('surface-container-lowest', 100)
      setTone('surface-container-low', 96)
      setTone('surface-container', 94)
      setTone('surface-container-high', 92)
      setTone('surface-container-highest', 90)
      setTone('surface-dim', 87)
      setTone('surface-bright', 98)
    }

    localStorage.setItem('app_primary_color', hex)
    setPrimaryColor(hex)
  }, [])

  const handleSetWallpaper = useCallback(async (file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setWallpaper(dataUrl)
      localStorage.setItem('app_wallpaper', dataUrl)

      const img = new Image()
      img.src = dataUrl
      img.onload = async () => {
        const color = await sourceColorFromImage(img)
        const hex =
          '#' + (color & 0xffffff).toString(16).padStart(6, '0')
        applyThemeFromColor(hex)
      }
    }
    reader.readAsDataURL(file)
  }, [applyThemeFromColor])

  const resetTheme = useCallback(() => {
    setWallpaper(null)
    localStorage.removeItem('app_wallpaper')
    applyThemeFromColor('#6750A4')
  }, [applyThemeFromColor])

  useEffect(() => {
    applyThemeFromColor(primaryColor)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ wallpaper, setWallpaper: handleSetWallpaper, resetTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
                                          }
