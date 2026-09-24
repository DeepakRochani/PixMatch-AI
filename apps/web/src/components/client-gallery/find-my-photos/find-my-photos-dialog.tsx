'use client';

import React, { useState } from 'react';
import { X, Sparkles, Camera, Upload, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { SelfieCamera } from './selfie-camera';
import { SelfieUpload } from './selfie-upload';
import { SelfieProcessing } from './selfie-processing';
import { MatchResults } from './match-results';
import { AiMatchItem, PublicPhotoItem } from '../gallery-types';

interface FindMyPhotosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gallerySlug: string;
  galleryTitle: string;
  onMatchesFound: (matches: AiMatchItem[]) => void;
  onOpenLightboxWithPhoto: (photo: PublicPhotoItem) => void;
  favorites: Set<string>;
  selected: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onToggleSelect: (photoId: string) => void;
  onDownloadBulk: (photoIds: string[]) => void;
}

type Step = 'PRIVACY' | 'CAPTURE' | 'PROCESSING' | 'RESULTS';
type InputMode = 'CAMERA' | 'UPLOAD';

export const FindMyPhotosDialog: React.FC<FindMyPhotosDialogProps> = ({
  isOpen,
  onClose,
  gallerySlug,
  galleryTitle,
  onMatchesFound,
  onOpenLightboxWithPhoto,
  favorites,
  selected,
  onToggleFavorite,
  onToggleSelect,
  onDownloadBulk,
}) => {
  const [step, setStep] = useState<Step>('PRIVACY');
  const [inputMode, setInputMode] = useState<InputMode>('CAMERA');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matches, setMatches] = useState<AiMatchItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchTimeMs, setSearchTimeMs] = useState<number | undefined>(undefined);

  if (!isOpen) return null;

  const handleStartSearch = async (base64: string) => {
    setSelfieImage(base64);
    setErrorMessage(null);
    setStep('PROCESSING');

    try {
      const response = await fetch('/api/v1/ai/selfie/search-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallerySlug,
          image: base64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes('NO_FACE_DETECTED')) {
          throw new Error('No face was detected in your photo. Please ensure your face is clearly visible.');
        } else if (data.message?.includes('MULTIPLE_FACES_DETECTED')) {
          throw new Error('Multiple faces were detected. Please use a solo selfie for accurate matching.');
        } else if (data.message?.includes('POOR_FACE_QUALITY')) {
          throw new Error('Face image quality was too blurry or dark. Please try a well-lit front photo.');
        } else {
          throw new Error(data.message || 'Unable to perform face search at this time.');
        }
      }

      const matchResults: AiMatchItem[] = data.matches || [];
      setMatches(matchResults);
      setTotalMatches(data.total_matches ?? matchResults.length);
      setSearchTimeMs(data.search_time_ms);
      onMatchesFound(matchResults);
      setStep('RESULTS');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Face search encountered an error.');
      setStep('CAPTURE');
    }
  };

  const handleReset = () => {
    setSelfieImage(null);
    setErrorMessage(null);
    setMatches([]);
    setStep('CAPTURE');
  };

  const handleSelectAllMatches = () => {
    const idsToSelect = matches.map((m) => m.photo_id);
    idsToSelect.forEach((id) => {
      if (!selected.has(id)) {
        onToggleSelect(id);
      }
    });
  };

  const handleDownloadAllMatches = () => {
    const ids = matches.map((m) => m.photo_id);
    onDownloadBulk(ids);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-y-auto bg-slate-900 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-3xl shadow-2xl p-5 sm:p-8 text-slate-100 relative flex flex-col justify-between pt-safe pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center space-x-3 mb-6 pr-10">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Find My Photos</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">{galleryTitle}</p>
            </div>
          </div>

          {/* STEP 1: Privacy Notice */}
          {step === 'PRIVACY' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-4">
                <div className="flex items-center space-x-2 text-indigo-300 text-sm font-semibold">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Biometric Privacy & Data Safety</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  PixMatch AI finds photos of you in this event gallery using fast in-memory facial matching.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300/90">
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Your selfie is processed in-memory only and is <strong>never stored, saved, or shared</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Search is strictly scoped to <strong>this gallery only</strong> and cannot match against other galleries.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>No registration, login, or personal profile is required.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep('CAPTURE')}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all min-h-[48px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Capture / Upload */}
          {step === 'CAPTURE' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Mode Switcher */}
              <div className="flex items-center justify-center p-1 bg-slate-950 rounded-2xl border border-slate-800 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('CAMERA');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[40px] ${
                    inputMode === 'CAMERA'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('UPLOAD');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[40px] ${
                    inputMode === 'UPLOAD'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </button>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-300 text-xs font-medium flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {inputMode === 'CAMERA' ? (
                <SelfieCamera
                  onCapture={handleStartSearch}
                  onError={(err) => {
                    setErrorMessage(err);
                    setInputMode('UPLOAD');
                  }}
                  onCancel={onClose}
                />
              ) : (
                <SelfieUpload
                  onSelectImage={handleStartSearch}
                  onError={(err) => setErrorMessage(err)}
                />
              )}
            </div>
          )}

          {/* STEP 3: Processing Animation */}
          {step === 'PROCESSING' && (
            <SelfieProcessing selfieImage={selfieImage} />
          )}

          {/* STEP 4: Results */}
          {step === 'RESULTS' && (
            <MatchResults
              matches={matches}
              totalMatches={totalMatches}
              searchTimeMs={searchTimeMs}
              onApplyMatchesToGallery={onClose}
              onSelectAllMatches={handleSelectAllMatches}
              onDownloadAllMatches={handleDownloadAllMatches}
              onResetSearch={handleReset}
              onOpenLightboxWithPhoto={onOpenLightboxWithPhoto}
              favorites={favorites}
              selected={selected}
              onToggleFavorite={onToggleFavorite}
              onToggleSelect={onToggleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
};

