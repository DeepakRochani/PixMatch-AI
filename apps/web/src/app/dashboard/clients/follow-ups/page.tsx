'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { IFollowUpCenterSummaryDTO, IFollowUpCenterItemDTO } from '@pixmatch/types';

export default function FollowUpsPage() {
  const [summary, setSummary] = useState<IFollowUpCenterSummaryDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'due_today' | 'upcoming'>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/clients/follow-ups/center');
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleComplete = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetchApi(`/clients/follow-ups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.success) {
        loadFollowUps();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this follow-up recommendation?')) return;
    setProcessingId(id);
    try {
      const res = await fetchApi(`/clients/follow-ups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.success) {
        loadFollowUps();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const getFilteredItems = (): IFollowUpCenterItemDTO[] => {
    if (!summary || !summary.items) return [];
    let list: IFollowUpCenterItemDTO[] = summary.items;
    
    if (activeTab === 'overdue') {
      list = list.filter((i) => i.is_overdue);
    } else if (activeTab === 'due_today') {
      const todayStr = new Date().toISOString().split('T')[0];
      list = list.filter((i) => i.due_date && String(i.due_date).startsWith(todayStr));
    } else if (activeTab === 'upcoming') {
      list = list.filter((i) => !i.is_overdue);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.client_name.toLowerCase().includes(q) ||
          (item.client_email && item.client_email.toLowerCase().includes(q)) ||
          item.title.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const items = getFilteredItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-400 mb-1">
            <Link href="/dashboard/clients" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Clients CRM
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Follow-Up Action Center</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>Client Follow-Up Center</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium">
              CRM 2.0
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track, prioritize, and resolve scheduled reminders and studio follow-ups.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'all'
              ? 'bg-slate-800/90 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total Items</span>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {summary?.items.length ?? (loading ? '—' : 0)}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'overdue'
              ? 'bg-red-950/30 border-red-500/50 shadow-lg shadow-red-500/10'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-400">Overdue</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2">
            {summary?.overdue_count ?? (loading ? '—' : 0)}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('due_today')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'due_today'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-400">Due Today</span>
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {summary?.due_today_count ?? (loading ? '—' : 0)}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'upcoming'
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-400">Upcoming</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {summary?.upcoming_count ?? (loading ? '—' : 0)}
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search follow-ups by client, title, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Follow-up List */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 divide-y divide-slate-800">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-sm">Loading follow-ups...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-300">All caught up!</p>
            <p className="text-sm mt-1">No pending follow-ups found in this view.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/clients/${item.client_id}`}
                    className="font-medium text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>{item.client_name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.priority === 'HIGH' || item.priority === 'URGENT'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : item.priority === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.priority}
                  </span>

                  {item.is_overdue && (
                    <span className="text-xs bg-red-950/40 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  )}

                  {item.waiting_for && item.waiting_for !== 'NONE' && (
                    <span className="text-xs bg-indigo-950/30 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                      Waiting for: {item.waiting_for}
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-200 font-medium">{item.title}</p>
                <p className="text-xs text-slate-400">{item.reason}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right text-xs text-slate-400 mr-2">
                  <div className="font-medium text-slate-300">
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}
                  </div>
                  <div>{item.status}</div>
                </div>

                <button
                  onClick={() => handleComplete(item.id)}
                  disabled={processingId === item.id}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Mark Completed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>

                <button
                  onClick={() => handleCancel(item.id)}
                  disabled={processingId === item.id}
                  className="px-2 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-colors disabled:opacity-50"
                  title="Cancel Follow-up"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
