'use client';

import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = true,
  loading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDestructive ? 'bg-red-500/15 text-red-400' : 'bg-primary/15 text-primary'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card-border/50 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 text-xs text-muted leading-relaxed">
          <p>{message}</p>
        </div>

        <div className="p-4 border-t border-card-border bg-card/90 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                : 'bg-primary hover:bg-primary-hover shadow-primary/20'
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
