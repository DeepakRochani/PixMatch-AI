'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Zap,
  Lock,
  Clock,
  Filter,
} from 'lucide-react';
import { SecurityTimelineItemDTO } from '@pixmatch/types';

function TimelineContent() {
  const [timeline, setTimeline] = useState<SecurityTimelineItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [service, setService] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (service) q.set('service', service);
      if (category) q.set('category', category);
      q.set('limit', '50');

      const res = await fetch(`/api/admin/security-center/timeline?${q.toString()}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setTimeline(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [service, category]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/security-center"
              className="p-1 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">Security Timeline</h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Unified chronological audit trail correlating security signals, platform alerts, and admin operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter service..."
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0E1422] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="rounded-2xl bg-[#0B0F17] border border-card-border p-6">
        {loading ? (
          <div className="p-8 text-center text-muted text-xs">Loading unified security timeline...</div>
        ) : timeline.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            No chronological timeline events found.
          </div>
        ) : (
          <div className="relative border-l border-card-border/80 pl-6 ml-4 space-y-6">
            {timeline.map((item) => (
              <div key={item.id} className="relative group">
                {/* Bullet */}
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-card-border border-2 border-amber-400 group-hover:scale-125 transition" />

                <div className="p-4 rounded-xl bg-[#0E1422] border border-card-border/80 space-y-2 hover:border-card-border transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted font-mono">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">{item.summary}</p>

                  <div className="flex items-center gap-3 text-[10px] text-muted pt-2 border-t border-card-border/40 font-mono">
                    <span>Source: {item.source}</span>
                    {item.studio_id && <span>Studio: {item.studio_id}</span>}
                    {item.correlation_id && <span>Correlation: {item.correlation_id}</span>}
                    <span className="ml-auto font-bold text-amber-400">{item.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted text-xs">Loading Timeline...</div>}>
      <TimelineContent />
    </Suspense>
  );
}
