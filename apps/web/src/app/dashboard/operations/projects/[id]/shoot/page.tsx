'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  StickyNote,
  Sparkles,
  MapPin,
  Users,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ProductionStage,
  ProjectProductionDTO,
  ProjectShotListDTO,
  ProjectShotListItemDTO,
  ProjectTimelineItemDTO,
  ShotListItemStatus,
} from '@pixmatch/types';

export default function MobileShootDayWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { token, studio } = useAuth();

  const [production, setProduction] = useState<ProjectProductionDTO | null>(null);
  const [shotLists, setShotLists] = useState<ProjectShotListDTO[]>([]);
  const [timeline, setTimeline] = useState<ProjectTimelineItemDTO[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchShootData = async () => {
    if (!projectId || !token) return;
    try {
      setLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-studio-id': studio?.id || '',
      };

      const [prodRes, shotRes, timeRes] = await Promise.all([
        fetch(`/api/v1/operations/production/projects/${projectId}`, { headers }),
        fetch(`/api/v1/operations/production/projects/${projectId}/shot-lists`, { headers }),
        fetch(`/api/v1/operations/production/projects/${projectId}/timeline`, { headers }),
      ]);

      if (prodRes.ok) setProduction((await prodRes.json()).data);
      if (shotRes.ok) setShotLists((await shotRes.json()).data?.shot_lists || []);
      if (timeRes.ok) setTimeline((await timeRes.json()).data?.timeline_events || []);
    } catch (err) {
      console.error('Error fetching shoot data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShootData();
  }, [projectId, token]);

  const handleStageAction = async (nextStage: ProductionStage) => {
    const actionPayload = {
      action_type: 'UPDATE_STAGE',
      payload: { stage: nextStage },
      client_timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, actionPayload]);
      if (production) {
        setProduction({ ...production, production_stage: nextStage });
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) fetchShootData();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleToggleShotItem = async (shotListId: string, item: ProjectShotListItemDTO) => {
    const nextStatus =
      item.status === ShotListItemStatus.CAPTURED
        ? ShotListItemStatus.PENDING
        : ShotListItemStatus.CAPTURED;

    // Update local state immediately
    setShotLists((prev) =>
      prev.map((sl) =>
        sl.id === shotListId
          ? {
              ...sl,
              items: sl.items?.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)),
            }
          : sl
      )
    );

    const actionPayload = {
      action_type: 'TOGGLE_SHOT_ITEM',
      payload: { shot_list_id: shotListId, item_id: item.id, status: nextStatus },
      client_timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, actionPayload]);
      return;
    }

    try {
      await fetch(
        `/api/v1/operations/production/projects/${projectId}/shot-lists/${shotListId}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
    } catch (err) {
      console.error('Failed to toggle shot:', err);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isOnline) return;
    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/offline-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          client_id: `mobile-shooter-${Date.now()}`,
          actions: offlineQueue,
        }),
      });

      if (res.ok) {
        setOfflineQueue([]);
        await fetchShootData();
      }
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
    }
  };

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineQueue]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#070A0F] text-white p-4 space-y-4 pb-20">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between border-b border-card-border/80 pb-3">
        <Link
          href={`/dashboard/operations/projects/${projectId}/production`}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Studio
        </Link>

        {/* Network & Offline Queue Status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <Wifi className="h-3 w-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              <WifiOff className="h-3 w-3" /> Offline ({offlineQueue.length})
            </span>
          )}
        </div>
      </div>

      {/* Project Header */}
      <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-2">
        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
          LIVE SHOOT DAY WORKSPACE
        </span>
        <h1 className="text-lg font-bold text-white tracking-tight">
          {production?.project?.name || 'Active Project Shoot'}
        </h1>
        <p className="text-xs text-muted">
          Client: {production?.project?.client?.name || 'Direct Booking'}
        </p>

        {/* Shoot Actions (Start / Complete) */}
        <div className="pt-2 flex gap-2">
          {production?.production_stage !== ProductionStage.SHOOT_IN_PROGRESS && (
            <button
              onClick={() => handleStageAction(ProductionStage.SHOOT_IN_PROGRESS)}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
            >
              <Camera className="h-4 w-4" /> Start Shoot Now
            </button>
          )}

          {production?.production_stage === ProductionStage.SHOOT_IN_PROGRESS && (
            <button
              onClick={() => handleStageAction(ProductionStage.SHOOT_COMPLETED)}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <CheckCircle2 className="h-4 w-4" /> Complete Shoot
            </button>
          )}
        </div>
      </div>

      {/* Run of Show - Current Timeline Block */}
      {timeline.length > 0 && (
        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase">Run-of-Show Timeline</span>
            <Clock className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="space-y-1.5">
            {timeline.slice(0, 3).map((evt) => (
              <div
                key={evt.id}
                className="p-2 rounded-lg bg-[#070A0F] border border-card-border/50 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{evt.title}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {evt.event_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shot Lists Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Live Shot List Checkoff
          </h2>
          <span className="text-[10px] text-muted">
            {shotLists.reduce((acc, sl) => acc + (sl.items?.filter((it) => it.status === ShotListItemStatus.CAPTURED).length || 0), 0)} /{' '}
            {shotLists.reduce((acc, sl) => acc + (sl.items?.length || 0), 0)} Captured
          </span>
        </div>

        {shotLists.map((sl) => (
          <div key={sl.id} className="bg-[#0E1422] border border-card-border rounded-xl p-3 space-y-2">
            <h3 className="text-xs font-bold text-amber-300">{sl.name}</h3>
            <div className="space-y-1">
              {sl.items?.map((item) => {
                const isCaptured = item.status === ShotListItemStatus.CAPTURED;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggleShotItem(sl.id, item)}
                    className={`w-full p-2.5 rounded-lg text-left flex items-start gap-2.5 transition border ${
                      isCaptured
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-[#070A0F] border-card-border/60 text-white hover:border-card-border'
                    }`}
                  >
                    {isCaptured ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight ${isCaptured ? 'line-through opacity-80' : ''}`}>
                        {item.title}
                      </p>
                      {item.category && (
                        <span className="text-[9px] text-muted uppercase font-bold tracking-wider">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
