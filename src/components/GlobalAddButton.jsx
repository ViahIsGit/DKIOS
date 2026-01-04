import { useNavigate } from 'react-router-dom'
import './GlobalAddButton.css'

function GlobalAddButton({ onOpen }) {
    return (
        <button
            className="global-add-button"
            onClick={onOpen}
            aria-label="Adicionar novo post"
        >
            <md-icon>add</md-icon>
        </button>
    )
}

export default GlobalAddButton
