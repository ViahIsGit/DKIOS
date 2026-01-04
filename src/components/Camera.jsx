import { useEffect, useRef, useState } from 'react'
import { useLayout } from '../context/LayoutContext'
import './Camera.css'

function Camera({ onCapture, onBack }) {
  const { hideChrome, showChrome } = useLayout()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [chunks, setChunks] = useState([])
  const [recording, setRecording] = useState(false)
  const [mode, setMode] = useState('photo') // 'photo' | 'video'
  const [facingMode, setFacingMode] = useState('user') // 'user' | 'environment'
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    hideChrome()
    startCamera() // Auto-start when mounted in modal
    return () => {
      stopCamera()
      showChrome()
    }
  }, [hideChrome, showChrome, facingMode])

  const startCamera = async () => {
    try {
      const getUM = async (constraints) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(constraints)
        }
        const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia
        if (legacy) {
          return new Promise((res, rej) => legacy.call(navigator, constraints, res, rej))
        }
        throw new Error('getUserMedia não suportado neste navegador. Use HTTPS e um navegador atualizado.')
      }
      const media = await getUM({ video: { facingMode }, audio: true })
      setStream(media)
      setCameraError('')
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
    } catch (e) {
      setCameraError(e.message || 'Falha ao acessar a câmera')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!stream) return
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    setChunks([])
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        setChunks(prev => [...prev, e.data])
      }
    }
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const file = new File([blob], `camera-${Date.now()}.webm`, { type: 'video/webm' })
      onCapture(file, 'video')
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' })
      onCapture(file, 'image')
    }, 'image/png')
  }

  return (
    <div className="camera-page">
      <video ref={videoRef} playsInline muted className="camera-video" />
      <canvas ref={canvasRef} className="camera-canvas" style={{ display: 'none' }} />

      {/* Top bar */}
      <div className="camera-topbar">
        <md-icon-button onClick={onBack} aria-label="Voltar">
          <md-icon>arrow_back</md-icon>
        </md-icon-button>
        <md-icon-button aria-label="Trocar câmera" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}>
          <md-icon>cameraswitch</md-icon>
        </md-icon-button>
      </div>

      {/* Error State */}
      {(!stream && cameraError) && (
        <div className="camera-permission">
          <div className="camera-permission-card">
            <md-icon style={{ fontSize: 48 }}>videocam_off</md-icon>
            <p>{cameraError}</p>
            <md-filled-button onClick={() => startCamera().catch(() => { })}>Tentar novamente</md-filled-button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="camera-bottombar">
        <div className="mode-switch">
          <button className={`mode-btn ${mode === 'photo' ? 'active' : ''}`} onClick={() => setMode('photo')}>FOTO</button>
          <button className={`mode-btn ${mode === 'video' ? 'active' : ''}`} onClick={() => setMode('video')}>VÍDEO</button>
        </div>
        <div className="shutter-row">
          <div style={{ width: 48 }}></div> {/* Spacer */}
          <button
            className={`shutter ${recording ? 'recording' : ''}`}
            onClick={() => (mode === 'photo' ? capturePhoto() : toggleRecording())}
            aria-label={mode === 'photo' ? 'Capturar foto' : (recording ? 'Parar gravação' : 'Iniciar gravação')}
          >
            <span className="inner" />
          </button>
          <div style={{ width: 48 }}></div> {/* Spacer */}
        </div>
      </div>
    </div>
  )
}

export default Camera
