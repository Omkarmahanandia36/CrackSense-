import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async (deviceId?: string) => {
    stopStream();
    setIsLoading(true);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: { ideal: 'environment' },
            },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback to basic video constraint if resolution or facingMode fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enumerate camera devices for switching
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);
        if (!selectedDeviceId && videoDevices.length > 0) {
          const currentTrack = stream.getVideoTracks()[0];
          const settings = currentTrack.getSettings();
          setSelectedDeviceId(settings.deviceId || videoDevices[0].deviceId);
        }
      } catch (e) {
        // Device enumeration non-critical
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsLoading(false);
      setError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your system settings.'
          : 'Unable to connect to camera device. Please ensure a webcam is connected.'
      );
    }
  }, [stopStream, selectedDeviceId]);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
      setError(null);
      setIsLoading(true);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startStream, stopStream]);

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    setSelectedDeviceId(nextDeviceId);
    startStream(nextDeviceId);
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `crack_inspection_snap_${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          stopStream();
          onCapture(file);
          onClose();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      stopStream();
      onCapture(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          stopStream();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Viewfinder Surface */}
      <div
        className="relative z-10 w-full max-w-2xl bg-[#08151D] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-rise"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#061017]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Live Camera Viewfinder
            </h3>
            {!error && !isLoading && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/60">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <p className="text-xs text-cyan-300 font-mono">Initializing camera feed...</p>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center max-w-md flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Select Photo from Device
              </button>
              <input
                ref={fallbackFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFallbackFileSelect}
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                <div className="relative w-48 h-48 sm:w-64 sm:h-64 border border-cyan-400/40 rounded-xl">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                  {/* Center crosshair */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                    <div className="w-full h-[1px] bg-cyan-400/60" />
                    <div className="h-full w-[1px] bg-cyan-400/60 absolute" />
                  </div>
                </div>
              </div>

              {/* Viewfinder Instructions Tag */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/80 pointer-events-none select-none">
                Align concrete crack within reticle & tap shutter
              </div>
            </>
          )}
        </div>

        {/* Footer Bar & Shutter Button */}
        <div className="p-4 bg-[#061017] border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!error && (
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={isLoading}
              className="relative group p-1 rounded-full border-2 border-white/80 hover:border-cyan-400 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Capture Snapshot"
            >
              <div className="w-12 h-12 rounded-full bg-white group-hover:bg-cyan-400 flex items-center justify-center shadow-lg transition-colors">
                <Camera className="w-6 h-6 text-black" />
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => fallbackFileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Browse Files
          </button>
          <input
            ref={fallbackFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFallbackFileSelect}
          />
        </div>
      </div>
    </div>
  );
};
