'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { IClientSavedReply } from '@pixmatch/types';

export default function SavedRepliesPage() {
  const { token, studio } = useAuth();
  const [replies, setReplies] = useState<IClientSavedReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReply, setEditingReply] = useState<IClientSavedReply | null>(null);

  // Form State
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchReplies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/communication/saved-replies?search=${search}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setReplies(json.data.items || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && studio?.id) {
      fetchReplies();
    }
  }, [token, studio?.id, search]);

  const handleOpenModal = (reply?: IClientSavedReply) => {
    if (reply) {
      setEditingReply(reply);
      setShortcut(reply.shortcut);
      setTitle(reply.title);
      setContent(reply.content);
      setCategory(reply.category);
    } else {
      setEditingReply(null);
      setShortcut('');
      setTitle('');
      setContent('');
      setCategory('GENERAL');
    }
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut || !title || !content) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingReply
        ? `/api/v1/communication/saved-replies/${editingReply.id}`
        : '/api/v1/communication/saved-replies';
      const method = editingReply ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ shortcut, title, content, category }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to save reply');
      }

      setShowModal(false);
      fetchReplies();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved reply?')) return;
    try {
      const res = await fetch(`/api/v1/communication/saved-replies/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        fetchReplies();
      }
    } catch {
      // Non-blocking
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/communications"
            className="p-2 rounded-xl bg-card hover:bg-card-hover border border-card-border text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Saved Replies
            </h1>
            <p className="text-xs text-muted">
              Fast canned responses triggered by slash shortcuts (e.g. /pricing, /faq)
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          Create Saved Reply
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts, titles, or content..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-card-border text-xs text-white placeholder:text-muted/60 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Replies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-muted">Loading saved replies...</div>
        ) : replies.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-muted">No saved replies found.</div>
        ) : (
          replies.map((reply) => (
            <div
              key={reply.id}
              className="p-4 rounded-2xl bg-card border border-card-border hover:border-card-border/80 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-primary/20 text-primary font-mono font-bold text-xs">
                    {reply.shortcut}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-muted tracking-wider">
                    {reply.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white mt-2">{reply.title}</h3>
                <p className="text-xs text-muted/90 line-clamp-3 mt-1 leading-relaxed">{reply.content}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-card-border text-[11px] text-muted">
                <span>Used {reply.usage_count} times</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(reply)}
                    className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-white transition"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(reply.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="font-bold text-sm text-white">
                {editingReply ? 'Edit Saved Reply' : 'Create Saved Reply'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Shortcut (e.g. /pricing)</label>
                <input
                  type="text"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="/pricing"
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Standard Wedding Pricing Breakdown"
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="GENERAL">General</option>
                  <option value="PRICING">Pricing</option>
                  <option value="BOOKING">Booking</option>
                  <option value="PROOFING">Proofing</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Reply Content</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Thank you for reaching out! Here are our standard package details..."
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-card-hover border border-card-border text-xs font-medium text-muted hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
