'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { fetchApi } from '@/lib/api-client';
import {
  ProofingPublicSessionDTO,
  PhotoProofingItemDTO,
  ProofingItemStatus,
  ProofingCommentType,
  PhotoProofingCommentDTO,
} from '@pixmatch/types';

export default function ClientProofingPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [session, setSession] = useState<ProofingPublicSessionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Filters & View State
  const [filter, setFilter] = useState<'ALL' | 'SELECTED' | 'FAVORITES' | 'UNREVIEWED' | 'REJECTED'>('ALL');
  const [gridColumns, setGridColumns] = useState<3 | 4 | 5>(4);
  const [activePhoto, setActivePhoto] = useState<PhotoProofingItemDTO | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Comment Drawer State
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentType, setCommentType] = useState<ProofingCommentType>(ProofingCommentType.GENERAL);
  const [activePin, setActivePin] = useState<{ x: number; y: number } | null>(null);

  // Submission State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [finalNotes, setFinalNotes] = useState('');
  const [confirmExtras, setConfirmExtras] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load Session
  const loadSession = async (pin?: string) => {
    setLoading(true);
    setError(null);
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    const res = await fetchApi<ProofingPublicSessionDTO>(`/v1/public/session/${token}${query}`);
    if (res.success && res.data) {
      setSession(res.data);
    } else {
      setError(res.error?.message || 'Failed to load proofing session.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSession();
  }, [token]);

  // Handle PIN verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const res = await fetchApi<ProofingPublicSessionDTO>(`/v1/public/session/${token}/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin_code: pinCode }),
    });

    if (res.success && res.data) {
      setSession(res.data);
    } else {
      setPinError(res.error?.message || 'Invalid PIN code. Please try again.');
    }
  };

  // Toggle Selection status
  const handleToggleStatus = async (item: PhotoProofingItemDTO, newStatus: ProofingItemStatus) => {
    if (!session) return;
    const finalStatus = item.status === newStatus ? ProofingItemStatus.UNREVIEWED : newStatus;

    // Optimistic UI update
    const updatedItems = session.items.map((i) =>
      i.id === item.id ? { ...i, status: finalStatus } : i
    );
    setSession({ ...session, items: updatedItems });

    const res = await fetchApi<{ item: PhotoProofingItemDTO; quota: any }>(
      `/v1/public/session/${token}/items/${item.id}/toggle${pinCode ? `?pin=${encodeURIComponent(pinCode)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ status: finalStatus }),
      }
    );

    if (res.success && res.data) {
      setSession((prev) =>
        prev ? { ...prev, quota: res.data!.quota } : null
      );
      if (activePhoto?.id === item.id) {
        setActivePhoto(res.data.item);
      }
    } else {
      // Rollback on error
      loadSession(pinCode);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (item: PhotoProofingItemDTO) => {
    if (!session) return;
    const newFav = !item.is_favorite;

    // Optimistic update
    const updatedItems = session.items.map((i) =>
      i.id === item.id ? { ...i, is_favorite: newFav } : i
    );
    setSession({ ...session, items: updatedItems });

    const res = await fetchApi<{ item: PhotoProofingItemDTO; quota: any }>(
      `/v1/public/session/${token}/items/${item.id}/toggle${pinCode ? `?pin=${encodeURIComponent(pinCode)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ is_favorite: newFav }),
      }
    );

    if (res.success && res.data) {
      setSession((prev) =>
        prev ? { ...prev, quota: res.data!.quota } : null
      );
      if (activePhoto?.id === item.id) {
        setActivePhoto(res.data.item);
      }
    } else {
      loadSession(pinCode);
    }
  };

  // Click photo to pin coordinate
  const handlePhotoClickForPin = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setActivePin({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhoto || !newCommentText.trim()) return;

    const res = await fetchApi<PhotoProofingCommentDTO>(
      `/v1/public/session/${token}/items/${activePhoto.id}/comments${pinCode ? `?pin=${encodeURIComponent(pinCode)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({
          comment_type: commentType,
          comment_text: newCommentText.trim(),
          pin_x: activePin?.x,
          pin_y: activePin?.y,
          author_name: clientName || 'Client',
        }),
      }
    );

    if (res.success && res.data) {
      const updatedComments = [...(activePhoto.comments || []), res.data];
      const updatedItem = { ...activePhoto, comments: updatedComments };
      setActivePhoto(updatedItem);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === activePhoto.id ? updatedItem : i)),
            }
          : null
      );
      setNewCommentText('');
      setActivePin(null);
    }
  };

  // Toggle Compare selection
  const toggleCompare = (photoId: string) => {
    setCompareList((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  // Submit Final Selections
  const handleSubmitSelections = async () => {
    if (!session) return;
    setSubmitting(true);

    const res = await fetchApi(
      `/v1/public/session/${token}/submit${pinCode ? `?pin=${encodeURIComponent(pinCode)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          final_notes: finalNotes,
          confirm_extra_charges: confirmExtras,
        }),
      }
    );

    setSubmitting(false);
    if (res.success) {
      setSubmittedSuccess(true);
      setIsSubmitModalOpen(false);
      loadSession(pinCode);
    } else {
      alert(res.error?.message || 'Failed to submit selections.');
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!session?.items) return [];
    if (filter === 'SELECTED') return session.items.filter((i) => i.status === ProofingItemStatus.SELECTED);
    if (filter === 'FAVORITES') return session.items.filter((i) => i.is_favorite);
    if (filter === 'UNREVIEWED') return session.items.filter((i) => i.status === ProofingItemStatus.UNREVIEWED);
    if (filter === 'REJECTED') return session.items.filter((i) => i.status === ProofingItemStatus.REJECTED);
    return session.items;
  }, [session?.items, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading proofing workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-semibold">Access Unavailable</h1>
          <p className="text-slate-400 text-sm">{error || 'This proofing link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  // PIN Gate
  if (session.requires_pin && !session.is_pin_verified) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>
          <div>
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <p className="text-slate-400 text-sm mt-1">This gallery is protected. Please enter the PIN code provided by your photographer.</p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter PIN code"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {pinError && <p className="text-rose-400 text-xs font-medium">{pinError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition"
            >
              Access Proofing Gallery
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isLocked = session.status === 'SUBMITTED' || session.status === 'APPROVED' || session.status === 'EXPIRED';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">{session.name}</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              session.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              session.status === 'SUBMITTED' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
              session.status === 'CHANGES_REQUESTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {session.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {session.gallery.title} • {session.items.length} Photos Total
          </p>
        </div>

        {/* Live Quota Bar & Action Button */}
        <div className="flex items-center gap-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2 flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Selected</span>
              <span className="font-semibold text-slate-100 text-sm">
                {session.quota.selected_count} / {session.quota.included_count}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400 block">Favorites</span>
              <span className="font-semibold text-amber-400 text-sm">{session.quota.favorites_count}</span>
            </div>
            {session.quota.extra_count > 0 && (
              <>
                <div className="h-6 w-px bg-slate-700" />
                <div>
                  <span className="text-slate-400 block">Extra ({session.quota.extra_count})</span>
                  <span className="font-semibold text-emerald-400 text-sm">{session.quota.formatted_extra_total}</span>
                </div>
              </>
            )}
          </div>

          {!isLocked ? (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={!session.quota.is_valid_for_submission}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm transition shadow-lg ${
                session.quota.is_valid_for_submission
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              Submit Selections ({session.quota.selected_count})
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2 rounded-xl font-medium flex items-center gap-2">
              <span>✓</span> Selections Locked ({session.status})
            </div>
          )}
        </div>
      </header>

      {/* Subheader Controls & Filter Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {(['ALL', 'SELECTED', 'FAVORITES', 'UNREVIEWED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === tab
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab === 'SELECTED' && ` (${session.quota.selected_count})`}
              {tab === 'FAVORITES' && ` (${session.quota.favorites_count})`}
            </button>
          ))}
        </div>

        {/* View Controls & Compare Launch */}
        <div className="flex items-center gap-3">
          {session.rules.allow_side_by_side_compare && compareList.length >= 2 && (
            <button
              onClick={() => setIsCompareOpen(true)}
              className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition"
            >
              <span>⚖️</span> Compare Selected ({compareList.length})
            </button>
          )}

          {/* Grid sizing */}
          <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-lg p-0.5">
            {[3, 4, 5].map((cols) => (
              <button
                key={cols}
                onClick={() => setGridColumns(cols as any)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  gridColumns === cols ? 'bg-slate-700 text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cols} cols
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-4 lg:p-8 max-w-[1920px] mx-auto w-full">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-4xl">📸</p>
            <h3 className="text-lg font-semibold text-slate-300">No photos match this filter</h3>
            <p className="text-slate-500 text-xs">Switch to All to view your entire collection.</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              gridColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : gridColumns === 4
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            }`}
          >
            {filteredItems.map((item) => {
              const isSelected = item.status === ProofingItemStatus.SELECTED;
              const isRejected = item.status === ProofingItemStatus.REJECTED;
              const isCompared = compareList.includes(item.photo_id);
              const commentCount = item.comments?.length || 0;

              return (
                <div
                  key={item.id}
                  className={`group relative bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : isRejected
                      ? 'border-rose-900/40 opacity-50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Image container */}
                  <div
                    onClick={() => {
                      setActivePhoto(item);
                      setIsCommentDrawerOpen(false);
                    }}
                    className="aspect-[4/3] bg-slate-950 relative cursor-pointer overflow-hidden"
                  >
                    <img
                      src={item.photo?.thumbnail_url || item.photo?.original_url || ''}
                      alt={item.photo?.original_filename || 'Photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />

                    {/* Watermark Overlay if enabled */}
                    {session.watermark_enabled && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-slate-100 font-bold tracking-widest text-lg select-none">
                        PIXMATCH PROOF
                      </div>
                    )}
                  </div>

                  {/* Top Bar Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      {item.is_favorite && (
                        <span className="bg-amber-500/90 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold shadow">
                          ★ Favorite
                        </span>
                      )}
                      {commentCount > 0 && (
                        <span className="bg-slate-900/80 backdrop-blur-md text-indigo-400 border border-indigo-500/30 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shadow">
                          💬 {commentCount}
                        </span>
                      )}
                    </div>

                    {session.rules.allow_side_by_side_compare && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(item.photo_id);
                        }}
                        className={`pointer-events-auto text-xs px-2 py-0.5 rounded-full font-medium transition backdrop-blur-md ${
                          isCompared
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        {isCompared ? '✓ Compared' : '+ Compare'}
                      </button>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {/* Select Button */}
                      <button
                        disabled={isLocked}
                        onClick={() => handleToggleStatus(item, ProofingItemStatus.SELECTED)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '○'}</span>
                        <span>{isSelected ? 'Selected' : 'Select'}</span>
                      </button>

                      {/* Favorite Button */}
                      {session.rules.allow_favorite_starring && (
                        <button
                          disabled={isLocked}
                          onClick={() => handleToggleFavorite(item)}
                          className={`p-1.5 rounded-xl text-xs transition ${
                            item.is_favorite
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800'
                          }`}
                          title="Star as Favorite"
                        >
                          ★
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Comment Trigger */}
                      {session.rules.allow_pinpoint_feedback && (
                        <button
                          onClick={() => {
                            setActivePhoto(item);
                            setIsCommentDrawerOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-xs text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-750 transition"
                          title="Add pinpoint notes"
                        >
                          💬
                        </button>
                      )}

                      {/* Reject Trigger */}
                      <button
                        disabled={isLocked}
                        onClick={() => handleToggleStatus(item, ProofingItemStatus.REJECTED)}
                        className={`p-1.5 rounded-xl text-xs transition ${
                          isRejected
                            ? 'text-rose-400 bg-rose-500/20'
                            : 'text-slate-500 hover:text-rose-400 bg-slate-800'
                        }`}
                        title="Mark as Rejected / Exclude"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Modal & Coordinate Pinpoint Drawer */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col">
          {/* Lightbox Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActivePhoto(null)}
                className="text-slate-400 hover:text-slate-100 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                ← Back to Gallery
              </button>
              <div>
                <h3 className="font-semibold text-sm">{activePhoto.photo?.original_filename}</h3>
                <p className="text-xs text-slate-400">Click anywhere on photo to drop a retouching pin.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={isLocked}
                onClick={() => handleToggleStatus(activePhoto, ProofingItemStatus.SELECTED)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  activePhoto.status === ProofingItemStatus.SELECTED
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{activePhoto.status === ProofingItemStatus.SELECTED ? '✓' : '○'}</span>
                <span>{activePhoto.status === ProofingItemStatus.SELECTED ? 'Selected' : 'Select Photo'}</span>
              </button>

              <button
                onClick={() => setIsCommentDrawerOpen(!isCommentDrawerOpen)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  isCommentDrawerOpen
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                💬 Notes ({activePhoto.comments?.length || 0})
              </button>
            </div>
          </div>

          {/* Lightbox Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* High-res Image Preview */}
            <div
              className="flex-1 relative flex items-center justify-center p-6 cursor-crosshair overflow-hidden"
              onClick={handlePhotoClickForPin}
            >
              <div className="relative inline-block max-w-full max-h-full">
                <img
                  src={activePhoto.photo?.original_url || activePhoto.photo?.preview_url || activePhoto.photo?.thumbnail_url || ''}
                  alt="High Res Preview"
                  className="max-h-[calc(100vh-140px)] max-w-full object-contain rounded-xl shadow-2xl"
                />

                {/* Existing Coordinate Pins */}
                {activePhoto.comments?.map((c, idx) => {
                  if (c.pin_x == null || c.pin_y == null) return null;
                  return (
                    <div
                      key={c.id}
                      style={{ left: `${c.pin_x * 100}%`, top: `${c.pin_y * 100}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-lg shadow-indigo-600/50 animate-pulse"
                      title={c.comment_text}
                    >
                      {idx + 1}
                    </div>
                  );
                })}

                {/* Active Pending Pin */}
                {activePin && (
                  <div
                    style={{ left: `${activePin.x * 100}%`, top: `${activePin.y * 100}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg animate-bounce"
                  >
                    📍
                  </div>
                )}
              </div>
            </div>

            {/* Comment Drawer */}
            {isCommentDrawerOpen && (
              <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800">
                  <h4 className="font-semibold text-sm">Retouching & Feedback</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Add precise notes for the editing team.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activePhoto.comments?.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No comments on this photo yet. Drop a pin or type below.
                    </div>
                  ) : (
                    activePhoto.comments?.map((c, idx) => (
                      <div key={c.id} className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {c.pin_x != null ? `Pin #${idx + 1}` : 'General Note'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                            {c.comment_type}
                          </span>
                        </div>
                        <p className="text-slate-300">{c.comment_text}</p>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                          <span>{c.author_name || 'Client'}</span>
                          <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/90">
                  {activePin && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between">
                      <span>📍 Pin attached at ({Math.round(activePin.x * 100)}%, {Math.round(activePin.y * 100)}%)</span>
                      <button type="button" onClick={() => setActivePin(null)} className="text-rose-400 font-bold hover:text-rose-300">✕</button>
                    </div>
                  )}

                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={ProofingCommentType.GENERAL}>General Feedback</option>
                    <option value={ProofingCommentType.COLOR_CORRECTION}>Color Correction</option>
                    <option value={ProofingCommentType.RETOUCH_BLEMISH}>Blemish / Skin Retouch</option>
                    <option value={ProofingCommentType.RETOUCH_BODY_OBJECT}>Object / Distraction Removal</option>
                    <option value={ProofingCommentType.CROP_ALIGNMENT}>Crop & Alignment</option>
                    <option value={ProofingCommentType.LIGHTING_EXPOSURE}>Lighting & Exposure</option>
                    <option value={ProofingCommentType.SPECIAL_INSTRUCTION}>Special Instruction</option>
                  </select>

                  <textarea
                    placeholder="Type instructions here..."
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium py-2 rounded-lg text-xs transition"
                  >
                    Post Retouch Note
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Compare Modal */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold">Side-by-Side Photo Comparison</h3>
              <p className="text-xs text-slate-400">Compare your shortlisted shots and choose the winner.</p>
            </div>
            <button
              onClick={() => setIsCompareOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl"
            >
              Close Compare
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-6 overflow-y-auto">
            {compareList.map((photoId) => {
              const item = session.items.find((i) => i.photo_id === photoId);
              if (!item) return null;
              const isSelected = item.status === ProofingItemStatus.SELECTED;

              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] bg-slate-950 overflow-hidden">
                    <img
                      src={item.photo?.original_url || item.photo?.thumbnail_url || ''}
                      alt={item.photo?.original_filename || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-xs text-slate-300">{item.photo?.original_filename}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Rating: {item.rating ? `${item.rating} ★` : 'None'}</p>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(item, ProofingItemStatus.SELECTED)}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isSelected ? '✓ Picked as Winner' : 'Choose as Winner'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submission Final Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold">Submit Final Selections</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your selections will be locked and sent directly to your photographer for master editing.
              </p>
            </div>

            {/* Quota Review Box */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Photos Selected:</span>
                <span className="font-semibold text-slate-200">{session.quota.selected_count} photos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Included in Package:</span>
                <span className="font-semibold text-slate-200">{session.quota.included_count} photos</span>
              </div>
              {session.quota.extra_count > 0 && (
                <div className="flex justify-between border-t border-slate-700/80 pt-2 text-emerald-400 font-semibold">
                  <span>Extra Photos Charge ({session.quota.extra_count} × {(session.quota.extra_price_cents / 100).toFixed(2)}):</span>
                  <span>{session.quota.formatted_extra_total}</span>
                </div>
              )}
            </div>

            {/* Extra Charge Checkbox */}
            {session.quota.extra_count > 0 && (
              <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmExtras}
                  onChange={(e) => setConfirmExtras(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I approve the additional charge of <strong className="text-emerald-400">{session.quota.formatted_extra_total}</strong> for the {session.quota.extra_count} extra selected photos.
                </span>
              </label>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="eleanor@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Final Instructions / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any general notes for the editing team..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (session.quota.extra_count > 0 && !confirmExtras)}
                onClick={handleSubmitSelections}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-semibold transition"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit Selections'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Success Modal */}
      {submittedSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold">Selections Received!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thank you! Your photographer has been notified and will begin final post-production. You will receive an email once your high-resolution gallery is ready.
            </p>
            <button
              onClick={() => setSubmittedSuccess(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs transition mt-4"
            >
              View My Selections
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
