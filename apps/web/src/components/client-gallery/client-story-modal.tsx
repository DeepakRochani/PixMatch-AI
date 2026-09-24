'use client';

import React from 'react';
import { X, BookOpen, Layers, Star, Sparkles, Calendar, Heart } from 'lucide-react';
import { EventStoryPublicDTO } from '@pixmatch/types';

interface ClientStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyData: EventStoryPublicDTO | null;
  onSelectChapter?: (chapterId: string) => void;
}

export function ClientStoryModal({ isOpen, onClose, storyData, onSelectChapter }: ClientStoryModalProps) {
  if (!isOpen || !storyData) return null;

  const galleryTitle = (storyData as any).gallery_title || (storyData as any).galleryTitle || 'Event Story';
  const eventType = (storyData as any).event_type || (storyData as any).eventType || 'EVENT';
  const story = storyData.story as any;
  const chapters = (storyData.chapters || []) as any[];
  const highlights = (storyData.highlights || []) as any[];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/20 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                  AI Event Story
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {String(eventType).replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {story?.title || story?.headline || galleryTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Executive Summary */}
          {story?.summary && (
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs sm:text-sm text-purple-200 leading-relaxed font-medium">
              {story.summary}
            </div>
          )}

          {/* Full Narrative */}
          {story?.body && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                The Narrative Arc
              </h3>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-serif bg-slate-950/30 p-5 rounded-2xl border border-slate-800/80">
                {story.body}
              </div>
            </div>
          )}

          {/* Chapters Breakdown */}
          {chapters && chapters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Event Chapters ({chapters.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    onClick={() => {
                      if (onSelectChapter) onSelectChapter(ch.id);
                    }}
                    className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase mb-1">
                        <span>Chapter {idx + 1}</span>
                        <span className="text-slate-500 font-normal">{ch.photo_count ?? ch.photoCount ?? 0} photos</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{ch.title}</h4>
                      {(story?.chapter_summaries?.[ch.id] || story?.chapterSummaries?.[ch.id]) && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {story.chapter_summaries?.[ch.id] || story.chapterSummaries?.[ch.id]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Highlights Preview */}
          {highlights && highlights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Curated Event Highlights
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {highlights.slice(0, 6).map((hl) => (
                  <div key={hl.id} className="aspect-square rounded-xl overflow-hidden border border-slate-800 relative group">
                    <img
                      src={hl.thumbnail_url || hl.thumbnailUrl || hl.original_url || hl.url}
                      alt="Highlight"
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    {(hl.is_pinned || hl.isPinned) && (
                      <div className="absolute top-1 right-1 p-0.5 rounded bg-amber-500 text-slate-950">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
          <span>PIXMatch AI Event Storytelling</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-medium"
          >
            Close Story
          </button>
        </div>
      </div>
    </div>
  );
}
