'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Cpu, Database, CheckCircle2 } from 'lucide-react';

interface SelfieProcessingProps {
  selfieImage?: string | null;
}

const STAGES = [
  { label: 'Preparing your photo...', icon: Cpu, duration: 800 },
  { label: 'Checking face quality...', icon: ShieldCheck, duration: 900 },
  { label: 'Searching gallery photos...', icon: Database, duration: 1100 },
  { label: 'Preparing matched results...', icon: CheckCircle2, duration: 700 },
];

export const SelfieProcessing: React.FC<SelfieProcessingProps> = ({ selfieImage }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (currentStage < STAGES.length - 1) {
      timeout = setTimeout(() => {
        setCurrentStage((prev) => prev + 1);
      }, STAGES[currentStage].duration);
    }
    return () => clearTimeout(timeout);
  }, [currentStage]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center py-6 text-center">
      {/* Animated Face Scanner Preview */}
      <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-slate-950 border-2 border-indigo-500/40 p-2 shadow-2xl flex items-center justify-center overflow-hidden mb-6">
        {selfieImage ? (
          <img
            src={selfieImage}
            alt="Scanning"
            className="w-full h-full object-cover rounded-full filter brightness-85"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-indigo-950/40 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
        )}

        {/* Laser Scanning Line */}
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#38bdf8] animate-bounce duration-1000" />

        {/* Subtle Pulse */}
        <div className="absolute inset-0 rounded-full border border-indigo-400/25 animate-ping duration-1000" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Searching Gallery Photos...</span>
      </h3>

      {/* Dynamic Stage Tracker */}
      <div className="w-full space-y-2.5 mt-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left">
        {STAGES.map((stg, idx) => {
          const Icon = stg.icon;
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div
              key={stg.label}
              className={`flex items-center space-x-3 text-xs transition-opacity duration-300 ${
                isCurrent
                  ? 'text-indigo-300 font-semibold opacity-100'
                  : isDone
                  ? 'text-emerald-400 opacity-80'
                  : 'text-slate-600 opacity-40'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
              )}
              <span className="truncate">{stg.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 mt-4">
        Searching exclusively within this gallery.
      </p>
    </div>
  );
};

