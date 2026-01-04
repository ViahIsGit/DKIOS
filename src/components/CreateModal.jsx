import { useState, useRef, useEffect } from 'react'
import { createReel } from '../services/reels'
import Camera from './Camera'
import './CreateModal.css'

export default function CreateModal({ isOpen, onClose, currentUser }) {
    const [step, setStep] = useState('select') // 'select', 'camera', 'editor'
    const [mediaType, setMediaType] = useState('video') // 'video', 'image', 'slideshow'
    const [mediaFiles, setMediaFiles] = useState([])
    const [previewUrls, setPreviewUrls] = useState([])
    const [description, setDescription] = useState('')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentSlide, setCurrentSlide] = useState(0)
    const dialogRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            setStep('select')
            setMediaFiles([])
            setPreviewUrls([])
            setDescription('')
            setProgress(0)
            setUploading(false)
            setCurrentSlide(0)
            dialogRef.current?.showModal()
        } else {
            dialogRef.current?.close()
        }
    }, [isOpen])

    const handleClose = () => {
        onClose()
    }

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        if (files.length > 27) {
            alert('Máximo de 27 arquivos permitidos.')
            return
        }

        const newPreviewUrls = files.map(file => URL.createObjectURL(file))
        setMediaFiles(files)
        setPreviewUrls(newPreviewUrls)

        if (files.length > 1) {
            setMediaType('slideshow')
        } else if (files[0].type.startsWith('video')) {
            setMediaType('video')
        } else {
            setMediaType('image')
        }
        setStep('editor')
    }

    const handleCameraCapture = (file, type) => {
        setMediaFiles([file])
        setPreviewUrls([URL.createObjectURL(file)])
        setMediaType(type) // 'video' or 'image'
        setStep('editor')
    }

    const handlePost = async () => {
        if (mediaFiles.length === 0) return

        setUploading(true)
        try {
            await createReel({
                files: mediaFiles,
                desc: description,
                type: mediaType,
                onProgress: setProgress
            })
            handleClose()
        } catch (error) {
            console.error('Error creating post:', error)
            alert('Erro ao criar post: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // Slideshow preview logic
    useEffect(() => {
        let interval
        if (step === 'editor' && mediaType === 'slideshow' && !uploading) {
            interval = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % previewUrls.length)
            }, 3000)
        }
        return () => clearInterval(interval)
    }, [step, mediaType, previewUrls.length, uploading])

    if (!isOpen) return null

    return (
        <dialog ref={dialogRef} className="create-modal">
            <div className="create-modal-content">
                <button className="close-btn" onClick={handleClose}>
                    <md-icon>close</md-icon>
                </button>

                {step === 'select' && (
                    <div className="step-select">
                        <h2>Criar novo post</h2>
                        <div className="select-options">
                            <button className="select-option" onClick={() => setStep('camera')}>
                                <div className="option-icon">
                                    <md-icon>camera_alt</md-icon>
                                </div>
                                <span>Câmera</span>
                            </button>
                            <button className="select-option" onClick={() => document.getElementById('modal-file-input').click()}>
                                <div className="option-icon">
                                    <md-icon>photo_library</md-icon>
                                </div>
                                <span>Galeria</span>
                            </button>
                            <input
                                id="modal-file-input"
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>
                )}

                {step === 'camera' && (
                    <div className="step-camera">
                        <Camera onCapture={handleCameraCapture} onBack={() => setStep('select')} />
                    </div>
                )}

                {step === 'editor' && (
                    <div className="step-editor">
                        <div className="editor-preview">
                            {mediaType === 'video' && (
                                <video src={previewUrls[0]} controls className="preview-media" />
                            )}
                            {mediaType === 'image' && (
                                <img src={previewUrls[0]} alt="Preview" className="preview-media" />
                            )}
                            {mediaType === 'slideshow' && (
                                <div className="slideshow-preview">
                                    <img src={previewUrls[currentSlide]} alt={`Slide ${currentSlide}`} className="preview-media" />
                                    <div className="slideshow-indicators">
                                        {previewUrls.map((_, idx) => (
                                            <div key={idx} className={`indicator ${idx === currentSlide ? 'active' : ''}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="editor-controls">
                            <textarea
                                placeholder="Escreva uma legenda..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="description-input"
                            />
                            <button
                                className="post-btn"
                                onClick={handlePost}
                                disabled={uploading}
                            >
                                {uploading ? `Enviando ${Math.round(progress * 100)}%` : 'Publicar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </dialog>
    )
}
