import React, { useState, useRef, useEffect } from 'react'
import { RiCameraLine, RiUploadCloud2Line, RiZoomInLine, RiRefreshLine, RiCheckLine } from 'react-icons/ri'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import patientService from '../services/patientService'

export default function PhotoSelector({ value, onChange, onUploadingChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState('select') // 'select' | 'camera' | 'crop'
  const [imageSrc, setImageSrc] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  // Camera state
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)

  // Cropper state
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const imageRef = useRef(null)
  const [dimensions, setDimensions] = useState({ naturalWidth: 0, naturalHeight: 0 })
  
  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  // Bind camera stream to video element once it is rendered
  useEffect(() => {
    if (mode === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
  }, [mode, cameraStream])

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  // Start camera helper
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' }
      })
      setCameraStream(stream)
      setMode('camera')
    } catch (err) {
      toast.error('Could not access camera. Please check permissions.')
    }
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 480
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')
    
    // Draw mirrored video if it's user facing
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    
    const dataUrl = canvas.toDataURL('image/jpeg')
    setImageSrc(dataUrl)
    stopCamera()
    setMode('crop')
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG and WEBP images are supported.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result)
      setMode('crop')
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  // Image load details for crop sizing
  const handleImageLoaded = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    setDimensions({ naturalWidth, naturalHeight })
    
    // Auto center offset
    const baseScale = Math.max(300 / naturalWidth, 300 / naturalHeight)
    const w = naturalWidth * baseScale
    const h = naturalHeight * baseScale
    setOffset({
      x: (300 - w) / 2,
      y: (300 - h) / 2
    })
  }

  // Dragging / Panning handlers
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    
    // Clamp to boundaries so image always covers 300x300 area
    const baseScale = Math.max(300 / dimensions.naturalWidth, 300 / dimensions.naturalHeight)
    const currentScale = baseScale * zoom
    const w = dimensions.naturalWidth * currentScale
    const h = dimensions.naturalHeight * currentScale

    const clampedX = Math.max(Math.min(newX, 0), 300 - w)
    const clampedY = Math.max(Math.min(newY, 0), 300 - h)
    
    setOffset({ x: clampedX, y: clampedY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Finalize crop and upload
  const handleCropAndSave = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    const ctx = canvas.getContext('2d')

    const baseScale = Math.max(300 / dimensions.naturalWidth, 300 / dimensions.naturalHeight)
    const currentScale = baseScale * zoom
    const w = dimensions.naturalWidth * currentScale
    const h = dimensions.naturalHeight * currentScale

    // Draw image at exact offsets and scaled size
    const img = new Image()
    img.src = imageSrc
    img.onload = async () => {
      ctx.drawImage(img, offset.x, offset.y, w, h)
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
        
        setUploading(true)
        if (onUploadingChange) onUploadingChange(true)
        try {
          const res = await patientService.uploadImage(file)
          onChange(res.data.url)
          toast.success('Photo uploaded successfully.')
          closeModal()
        } catch (err) {
          toast.error('Failed to upload cropped image.')
        } finally {
          setUploading(false)
          if (onUploadingChange) onUploadingChange(false)
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const closeModal = () => {
    stopCamera()
    setIsOpen(false)
    setMode('select')
    setImageSrc(null)
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-surface-base border border-surface-border overflow-hidden flex items-center justify-center text-xs text-ink-disabled font-medium relative group">
          {value ? (
            <img src={value} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            'No Photo'
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-surface-border text-ink-primary hover:bg-surface-hover text-xs"
          onClick={() => setIsOpen(true)}
        >
          {value ? 'Change Photo' : 'Attach Photo'}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-md bg-surface-card border border-surface-border">
          <DialogHeader>
            <DialogTitle className="text-ink-primary">Profile Photo</DialogTitle>
          </DialogHeader>

          {/* MODE: Select Camera or Upload */}
          {mode === 'select' && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-6 border border-surface-border rounded-xl hover:bg-surface-hover hover:border-brand-blue group transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy group-hover:bg-brand-blue group-hover:text-ink-inverse transition-colors mb-3">
                  <RiCameraLine size={24} />
                </div>
                <span className="text-sm font-semibold text-ink-primary">Use Camera</span>
                <span className="text-xs text-ink-secondary mt-1">Take a live photo</span>
              </button>

              <label className="flex flex-col items-center justify-center p-6 border border-surface-border rounded-xl hover:bg-surface-hover hover:border-brand-blue group cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy group-hover:bg-brand-blue group-hover:text-ink-inverse transition-colors mb-3">
                  <RiUploadCloud2Line size={24} />
                </div>
                <span className="text-sm font-semibold text-ink-primary">Browse Files</span>
                <span className="text-xs text-ink-secondary mt-1">Upload image file</span>
              </label>
            </div>
          )}

          {/* MODE: Live Camera Stream */}
          {mode === 'camera' && (
            <div className="space-y-4 py-2 flex flex-col items-center">
              <div className="w-[300px] h-[300px] bg-black rounded-lg overflow-hidden relative border border-surface-border">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-surface-border text-ink-primary hover:bg-surface-hover"
                  onClick={() => setMode('select')}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse flex items-center gap-1"
                >
                  <RiCameraLine size={16} /> Capture Photo
                </Button>
              </div>
            </div>
          )}

          {/* MODE: Drag, Zoom and Crop Image */}
          {mode === 'crop' && (
            <div className="space-y-4 py-2 flex flex-col items-center">
              {/* Crop Container with Circle Overlay */}
              <div
                className="w-[300px] h-[300px] bg-surface-base rounded-lg overflow-hidden relative cursor-move border border-surface-border"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={handleImageLoaded}
                  style={{
                    position: 'absolute',
                    left: `${offset.x}px`,
                    top: `${offset.y}px`,
                    width: `${dimensions.naturalWidth * Math.max(300 / dimensions.naturalWidth, 300 / dimensions.naturalHeight) * zoom}px`,
                    height: `${dimensions.naturalHeight * Math.max(300 / dimensions.naturalWidth, 300 / dimensions.naturalHeight) * zoom}px`,
                    maxWidth: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Crop Cutout Overlay (Circular Mask) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-full bg-black/50 border-[1px] border-dashed border-white/40 rounded-full" 
                       style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }} />
                </div>
              </div>

              {/* Zoom Slider */}
              <div className="w-full flex items-center gap-2 px-4">
                <RiZoomInLine className="text-ink-secondary" size={16} />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-brand-blue h-1.5 bg-surface-hover rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Crop Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-surface-border text-ink-primary hover:bg-surface-hover flex items-center gap-1"
                  onClick={() => {
                    if (cameraStream) stopCamera()
                    setMode('select')
                    setImageSrc(null)
                  }}
                >
                  <RiRefreshLine size={16} /> Retake / Reselect
                </Button>
                <Button
                  type="button"
                  disabled={uploading}
                  onClick={handleCropAndSave}
                  className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse flex items-center gap-1"
                >
                  {uploading ? 'Saving...' : <><RiCheckLine size={16} /> Save Crop</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
