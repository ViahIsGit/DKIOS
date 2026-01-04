import { useState } from 'react'
import './EmojiPicker.css'

const EMOJI_CATEGORIES = [
  { name: 'Frequent', icon: '🕐', emojis: ['😀', '😂', '❤️', '😍', '😊', '🥰', '😘', '👍', '👏', '🙏'] },
  { name: 'Smileys', icon: '😀', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'] },
  { name: 'Gestures', icon: '👍', emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'] },
  { name: 'Hearts', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
  { name: 'Objects', icon: '🎉', emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '🎣', '🎽', '🎯', '🎮', '🎰', '🎲'] }
]

function EmojiPicker({ isOpen, onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0)

  const handleEmojiClick = (emoji) => {
    if (onSelect) {
      onSelect(emoji)
    }
  }

  if (!isOpen) return null

  return (
    <div className="emoji-picker-overlay" onClick={onClose}>
      <div className="emoji-picker-container" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <span className="emoji-picker-title">Emojis</span>
          <md-icon-button onClick={onClose}>
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>
        
        <div className="emoji-picker-tabs">
          {EMOJI_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              className={`emoji-tab ${activeCategory === index ? 'active' : ''}`}
              onClick={() => setActiveCategory(index)}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>

        <div className="emoji-picker-content">
          <div className="emoji-grid">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
              <button
                key={`${activeCategory}-${index}`}
                className="emoji-item"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmojiPicker

