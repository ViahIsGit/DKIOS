import './Download.css';

export default function Download() {
  return (
    <div className="download-page">
      <div className="download-card">

        {/* Logo SVG (Material You) */}
        <svg
          className="download-logo"
          viewBox="0 0 291 382"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="72"
            y="56"
            width="200"
            height="270"
            rx="30"
            fill="var(--md-sys-color-surface-container)"
          />

          <path
            d="M259.453 167.091C275.293 179.095 275.293 202.905 259.453 214.909L120.871 319.94C101.113 334.915 72.75 320.822 72.75 296.031L72.75 85.9687C72.75 61.1778 101.113 47.0853 120.871 62.0596L259.453 167.091Z"
            fill="var(--md-sys-color-primary)"
          />
        </svg>

        <h1 className="download-title">Baixe o app</h1>

        <p className="download-subtitle">
          Tenha a melhor experiência usando o app nativo
        </p>

        <div className="download-actions">

          {/* Download direto do APK */}
          <a
            href="/DK - Beta 1.0.apk"
            className="download-btn primary"
            download
          >
            <span className="material-symbols-outlined">download</span>
            Baixar APK
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=com.seuapp"
            target="_blank"
            rel="noopener noreferrer"
            className="download-btn tonal"
          >
            <span className="material-symbols-outlined">shop</span>
            Play Store
          </a>

        </div>

        <span className="download-note">
          Compatível com Android 8+
        </span>

      </div>
    </div>
  );
}
