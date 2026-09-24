'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  FolderUp,
} from 'lucide-react';
import { formatBytes } from '@pixmatch/ui';

interface UploadTask {
  id: string;
  file: File;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'DUPLICATE';
  progress: number;
  error?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  onUploadComplete: () => void;
}

export function BulkUploadModal({ isOpen, onClose, galleryId, onUploadComplete }: BulkUploadModalProps) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | File[]) => {
    const newTasks: UploadTask[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|tiff|heic)$/i.test(f.name))
      .map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'PENDING',
        progress: 0,
      }));

    setTasks((prev) => [...prev, ...newTasks]);
  };

  const uploadSingleFile = async (task: UploadTask): Promise<'COMPLETED' | 'FAILED' | 'DUPLICATE'> => {
    const formData = new FormData();
    formData.append('photo', task.file);
    formData.append('galleryId', galleryId);

    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : null;
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : null;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/photos/upload?galleryId=${galleryId}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(studioId ? { 'x-studio-id': studioId } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        if (json.data?.duplicates && json.data.duplicates.length > 0) {
          return 'DUPLICATE';
        }
        return 'COMPLETED';
      } else {
        return 'FAILED';
      }
    } catch {
      return 'FAILED';
    }
  };

  const startUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const pendingTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'FAILED');
    const CONCURRENCY = 5;

    for (let i = 0; i < pendingTasks.length; i += CONCURRENCY) {
      const batch = pendingTasks.slice(i, i + CONCURRENCY);

      // Mark batch as uploading
      setTasks((prev) =>
        prev.map((t) => (batch.some((b) => b.id === t.id) ? { ...t, status: 'UPLOADING', progress: 50 } : t))
      );

      await Promise.all(
        batch.map(async (task) => {
          const result = await uploadSingleFile(task);
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: result, progress: 100 } : t))
          );
        })
      );
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const totalCompleted = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalDuplicates = tasks.filter((t) => t.status === 'DUPLICATE').length;
  const totalFailed = tasks.filter((t) => t.status === 'FAILED').length;
  const overallProgress = tasks.length === 0 ? 0 : Math.round(((totalCompleted + totalDuplicates) / tasks.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-card-border flex items-center justify-between bg-card/80">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Upload Photos
            </h3>
            <p className="text-xs text-muted">Upload high-resolution photographs to this gallery</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card-border/50 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) {
                handleFilesAdded(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-card-border hover:border-primary/50 hover:bg-card-border/20'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Drag & drop photos here, or browse files</p>
            <p className="text-xs text-muted mt-1">Supports JPEG, PNG, WebP, HEIC (Max 50MB per photo)</p>

            <div className="flex items-center justify-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold bg-card-border hover:bg-card-border/80 text-white rounded-lg transition"
              >
                Select Files
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold bg-card-border hover:bg-card-border/80 text-white rounded-lg transition flex items-center gap-1.5"
              >
                <FolderUp className="h-3.5 w-3.5" />
                Select Folder
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is standard for folder picking
              webkitdirectory=""
              className="hidden"
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            />
          </div>

          {/* Queue & Progress */}
          {tasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {tasks.length} photos queued ({totalCompleted} uploaded
                  {totalDuplicates > 0 && `, ${totalDuplicates} duplicates`}
                  {totalFailed > 0 && `, ${totalFailed} failed`})
                </span>
                <span className="font-semibold text-white">{overallProgress}%</span>
              </div>

              <div className="w-full bg-card-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Task Items List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-card-border/30">
                {tasks.map((task) => (
                  <div key={task.id} className="pt-1.5 flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <FileImage className="h-4 w-4 text-muted flex-shrink-0" />
                      <span className="text-white truncate font-medium">{task.file.name}</span>
                      <span className="text-muted text-[11px] flex-shrink-0">({formatBytes(task.file.size)})</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.status === 'PENDING' && <span className="text-muted text-[11px]">Queued</span>}
                      {task.status === 'UPLOADING' && (
                        <span className="text-primary text-[11px] flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading
                        </span>
                      )}
                      {task.status === 'COMPLETED' && (
                        <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </span>
                      )}
                      {task.status === 'DUPLICATE' && (
                        <span className="text-amber-400 text-[11px] flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Exists
                        </span>
                      )}
                      {task.status === 'FAILED' && (
                        <span className="text-red-400 text-[11px] flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}

                      {!isUploading && task.status === 'PENDING' && (
                        <button
                          onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                          className="text-muted hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-card-border bg-card/90 flex items-center justify-between">
          <button
            onClick={() => setTasks([])}
            disabled={isUploading || tasks.length === 0}
            className="px-3 py-2 text-xs font-semibold text-muted hover:text-white transition disabled:opacity-40"
          >
            Clear Queue
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-white bg-card-border/50 hover:bg-card-border rounded-xl transition disabled:opacity-50"
            >
              Close
            </button>

            <button
              onClick={startUpload}
              disabled={isUploading || tasks.filter((t) => t.status === 'PENDING' || t.status === 'FAILED').length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition shadow-lg shadow-primary/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading (5 concurrent)...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Start Upload ({tasks.filter((t) => t.status === 'PENDING' || t.status === 'FAILED').length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
