'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, SwitchCamera, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';

interface SelfieCameraProps {
  onCapture: (base64Image: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export const SelfieCamera: React.FC<SelfieCameraProps> = ({
  onCapture,
  onError,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const startCamera = useCallback(async () => {
    setPermissionDenied(false);
    setCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please upload a photo instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      setPermissionDenied(true);
      onError(msg);
    }
  }, [facingMode, onError]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;

    setFlashing(true);
    setTimeout(() => setFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        // Mirror image for front camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.92);
      onCapture(base64);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Video Container */}
      <div className="relative w-full aspect-[3/4] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
        {flashing && <div className="absolute inset-0 z-40 bg-white animate-out fade-out duration-200" />}

        {permissionDenied ? (
          <div className="p-6 text-center text-slate-300 flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-sm font-semibold mb-2">Camera Access Blocked</p>
            <p className="text-xs text-slate-400 mb-4">
              Please grant browser camera permissions or switch to photo upload.
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Oval Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-52 h-72 rounded-[50%] border-2 border-dashed border-indigo-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] animate-pulse" />
              <p className="absolute bottom-6 text-[11px] font-semibold text-slate-200 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 backdrop-blur-md">
                Align your face within the frame
              </p>
            </div>
          </>
        )}
      </div>

      {/* Camera Controls */}
      <div className="w-full mt-5 flex items-center justify-between px-6">
        <button
          type="button"
          onClick={onCancel}
          className="p-3 text-slate-400 hover:text-white bg-slate-800/80 rounded-2xl transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Shutter Button */}
        <button
          type="button"
          disabled={!cameraReady || permissionDenied}
          onClick={capturePhoto}
          title="Take Selfie"
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-purple-500 p-1 shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <div className="w-full h-full rounded-full border-2 border-white flex items-center justify-center bg-white/20">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </button>

        {/* Camera Flip */}
        <button
          type="button"
          onClick={toggleCamera}
          className="p-3 text-slate-400 hover:text-white bg-slate-800/80 rounded-2xl transition-colors"
          title="Switch Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Biometric Privacy Badge */}
      <div className="mt-4 flex items-center space-x-1 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Processed in-memory. Never stored or shared.</span>
      </div>
    </div>
  );
};
