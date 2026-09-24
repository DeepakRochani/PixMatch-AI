'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, ShieldCheck, Check } from 'lucide-react';

interface SelfieUploadProps {
  onSelectImage: (base64Image: string) => void;
  onError: (error: string) => void;
}

export const SelfieUpload: React.FC<SelfieUploadProps> = ({
  onSelectImage,
  onError,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      onError('File size exceeds 15MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreview(result);
        onSelectImage(result);
      }
    };
    reader.onerror = () => {
      onError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {preview ? (
        <div className="relative w-full aspect-[3/4] bg-slate-950 rounded-3xl overflow-hidden border border-indigo-500/50 shadow-2xl flex items-center justify-center group">
          <img src={preview} alt="Selfie Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => {
              setPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-colors"
            title="Choose different photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full aspect-[3/4] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-102'
              : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/60 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Upload a Selfie or Portrait</p>
          <p className="text-xs text-slate-400 mb-4">
            Drag & drop here or browse files from your device
          </p>
          <span className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors">
            Choose Photo
          </span>
        </div>
      )}

      {/* Biometric Privacy Note */}
      <div className="mt-4 flex items-center space-x-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Your photo is analyzed in-memory and never saved.</span>
      </div>
    </div>
  );
};
