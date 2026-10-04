import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

/**
 * Custom hook to manage camera lifecycle, stream binding,
 * and seamless Front Camera (user) ↔ Back Camera (environment) switching.
 */
export function useCamera({ defaultFacingMode = 'user' } = {}) {
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState(defaultFacingMode)
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [videoDevices, setVideoDevices] = useState([])
  const [cameraError, setCameraError] = useState(null)
  
  // Track active stream in ref to safely stop tracks without stale closures
  const activeStreamRef = useRef(null)

  // Stop all active tracks on a media stream
  const stopMediaTracks = useCallback((mediaStream) => {
    if (!mediaStream) return
    try {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore already stopped tracks
        }
      })
    } catch {
      // ignore track stop errors
    }
  }, [])

  // Safely stop currently running camera stream
  const stopCamera = useCallback(() => {
    if (activeStreamRef.current) {
      stopMediaTracks(activeStreamRef.current)
      activeStreamRef.current = null
    }
    setStream(null)
    setCameraError(null)
  }, [stopMediaTracks])

  // Refresh and query available video input devices
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return []
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput')
      setVideoDevices(videoInputs)
      return videoInputs
    } catch {
      return []
    }
  }, [])

  // Start camera with requested facing mode ('user' | 'environment')
  const startCamera = useCallback(async (requestedFacingMode = facingMode) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = 'Camera API is not supported in this browser or requires a secure connection (HTTPS / localhost).'
      setCameraError(err)
      toast.error(err)
      return null
    }

    setIsLoading(true)
    setCameraError(null)

    // Critical: Stop old stream tracks first so hardware is freed on mobile/iOS
    if (activeStreamRef.current) {
      stopMediaTracks(activeStreamRef.current)
      activeStreamRef.current = null
      setStream(null)
    }

    let newStream = null

    try {
      // Attempt 1: High quality with ideal facingMode
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: requestedFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        })
      } catch {
        // Attempt 2: Basic constraint with string facingMode
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: requestedFacingMode },
            audio: false,
          })
        } catch {
          // Attempt 3: Fallback to any available video camera
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        }
      }

      activeStreamRef.current = newStream
      setStream(newStream)
      setFacingMode(requestedFacingMode)
      setIsLoading(false)

      // Query devices after permission is granted to get accurate labels/count
      refreshDevices()

      return newStream
    } catch (err) {
      setIsLoading(false)
      let userMsg = 'Could not access camera. Please check camera permissions.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMsg = 'Camera permission was denied. Please allow camera access in your browser settings.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userMsg = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userMsg = 'Camera is already in use by another application or tab.'
      } else if (err.name === 'OverconstrainedError') {
        userMsg = 'The requested camera mode is not supported by your hardware.'
      }

      setCameraError(userMsg)
      toast.error(userMsg)
      return null
    }
  }, [facingMode, stopMediaTracks, refreshDevices])

  // Switch camera between Front ('user') and Rear ('environment')
  const switchCamera = useCallback(async () => {
    if (isSwitching || isLoading) return
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    const nextLabel = nextMode === 'environment' ? 'Rear (Back)' : 'Front'

    setIsSwitching(true)
    try {
      const newStream = await startCamera(nextMode)
      if (newStream) {
        toast.info(`Switched to ${nextLabel} Camera`)
      }
    } finally {
      setIsSwitching(false)
    }
  }, [facingMode, isSwitching, isLoading, startCamera])

  // Capture current video frame to a base64 data URL
  const captureFrame = useCallback((videoElement) => {
    if (!videoElement) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 480
    canvas.height = videoElement.videoHeight || 480
    const ctx = canvas.getContext('2d')

    if (facingMode === 'user') {
      // Mirror front/selfie camera so picture is intuitively oriented
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    } else {
      // Rear/environment camera: Draw as-is (do NOT mirror lesions, scans, or text)
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    }

    return canvas.toDataURL('image/jpeg', 0.92)
  }, [facingMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        stopMediaTracks(activeStreamRef.current)
        activeStreamRef.current = null
      }
    }
  }, [stopMediaTracks])

  // Listen to device connect/disconnect events
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return
    const handleDeviceChange = () => {
      refreshDevices()
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [refreshDevices])

  return {
    stream,
    facingMode,
    isLoading,
    isSwitching,
    videoDevices,
    hasMultipleCameras: videoDevices.length > 1,
    cameraError,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
  }
}

export default useCamera
