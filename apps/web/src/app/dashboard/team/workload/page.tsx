'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

export default function WorkloadDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<any>('/v1/team/workload');
      const data = (res as any)?.data || res;
      if (data && data.members) {
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to load workload dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getFilteredMembers = () => {
    if (!dashboard || !dashboard.members) return [];
    if (!filterState) return dashboard.members;
    return dashboard.members.filter((m: any) => m.state === filterState);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Workload Intelligence Engine</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">Real-time</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Deterministic capacity modeling across open tasks, project milestones, shoot sessions, and assigned equipment.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition"
        >
          ↻ Refresh Metrics
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        <Link href="/dashboard/team" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Directory
        </Link>
        <Link href="/dashboard/team/workload" className="px-4 py-2 bg-slate-800/90 text-white font-semibold rounded-lg text-sm border border-slate-700">
          Workload Engine
        </Link>
        <Link href="/dashboard/team/calendar" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Team Calendar
        </Link>
        <Link href="/dashboard/team/settings" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Departments & Invites
        </Link>
      </div>

      {/* Summary Metrics */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 uppercase font-semibold">Total Monitored Staff</div>
            <div className="text-3xl font-bold text-white mt-1">{dashboard.total_active_members}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 uppercase font-semibold">Average Workload Score</div>
            <div className="text-3xl font-bold text-indigo-400 mt-1">{dashboard.average_workload_score} <span className="text-xs text-slate-500 font-normal">/ 100</span></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 uppercase font-semibold">Overloaded Team Members</div>
            <div className={`text-3xl font-bold mt-1 ${dashboard.overloaded_members_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {dashboard.overloaded_members_count}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 uppercase font-semibold">Available For Booking</div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">
              {dashboard.members.filter((m: any) => m.state === 'AVAILABLE' || m.state === 'LIGHT').length}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterState('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!filterState ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'}`}
          >
            All States ({dashboard?.members?.length || 0})
          </button>
          <button
            onClick={() => setFilterState('OVERLOADED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterState === 'OVERLOADED' ? 'bg-rose-950/80 text-rose-300 border border-rose-700' : 'text-slate-400 hover:text-white'}`}
          >
            Overloaded
          </button>
          <button
            onClick={() => setFilterState('HEAVY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterState === 'HEAVY' ? 'bg-amber-950/80 text-amber-300 border border-amber-700' : 'text-slate-400 hover:text-white'}`}
          >
            Heavy
          </button>
          <button
            onClick={() => setFilterState('NORMAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterState === 'NORMAL' ? 'bg-blue-950/80 text-blue-300 border border-blue-700' : 'text-slate-400 hover:text-white'}`}
          >
            Normal
          </button>
          <button
            onClick={() => setFilterState('AVAILABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterState === 'AVAILABLE' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700' : 'text-slate-400 hover:text-white'}`}
          >
            Available
          </button>
        </div>
      </div>

      {/* Grid of Workload Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Computing workload metrics...</div>
      ) : getFilteredMembers().length === 0 ? (
        <div className="p-12 bg-slate-900/30 border border-slate-800 rounded-xl text-center text-slate-500 text-sm">
          No team members match the selected workload filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredMembers().map((item: any) => (
            <div key={item.member_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{item.member_name}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-slate-300">{item.role}</span>
                      {item.department && <span>• {item.department}</span>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    item.state === 'OVERLOADED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    item.state === 'HEAVY' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    item.state === 'NORMAL' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {item.state}
                  </span>
                </div>

                {/* Meter */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Score</span>
                    <span className="font-bold text-slate-200">{item.workload_score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        item.workload_score > 80 ? 'bg-rose-500' :
                        item.workload_score > 60 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(item.workload_score, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Signals breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex justify-between items-center">
                    <span className="text-slate-400">Open Tasks:</span>
                    <span className="font-bold text-white">{item.open_tasks_count}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex justify-between items-center">
                    <span className="text-slate-400">Overdue:</span>
                    <span className={`font-bold ${item.overdue_tasks_count > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {item.overdue_tasks_count}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex justify-between items-center">
                    <span className="text-slate-400">Projects:</span>
                    <span className="font-bold text-white">{item.active_projects_count}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex justify-between items-center">
                    <span className="text-slate-400">Shoots:</span>
                    <span className="font-bold text-indigo-400">{item.upcoming_shoots_count}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">Equipment: {item.equipment_assigned_count} items</span>
                <Link
                  href={`/dashboard/team/${item.member_id}`}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  Manage Assignments →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
