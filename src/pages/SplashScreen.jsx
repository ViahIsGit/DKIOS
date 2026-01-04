import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div
      className="splash-screen"
      role="img"
      aria-label="Tela inicial do DK Material"
    >
      <div className="splash-content">
        <svg
          className="splash-logo"
          viewBox="0 0 291 382"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Fundo */}
          <rect
            x="72"
            y="56"
            width="200"
            height="270"
            rx="30"
            fill="var(--md-sys-color-surface-container)"
          />

          {/* Logo DK */}
          <path
            d="M259.453 167.091C275.293 179.095 275.293 202.905 259.453 214.909L120.871 319.94C101.113 334.915 72.75 320.822 72.75 296.031L72.75 85.9687C72.75 61.1778 101.113 47.0853 120.871 62.0596L259.453 167.091Z"
            fill="var(--md-sys-color-primary)"
          />
        </svg>
      </div>
    </div>
  );
}
