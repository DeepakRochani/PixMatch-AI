'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

export default function TeamSettingsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Department creation
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptColor, setDeptColor] = useState('#6366f1');
  const [creatingDept, setCreatingDept] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, invRes] = await Promise.all([
        fetchApi<any>('/v1/team/departments'),
        fetchApi<any>('/v1/team/invitations'),
      ]);

      const deptData = (deptRes as any)?.data || deptRes;
      const invData = (invRes as any)?.data || invRes;

      if (deptData && (deptData.items || Array.isArray(deptData))) {
        setDepartments(deptData.items || deptData);
      }
      if (invData && (invData.items || Array.isArray(invData))) {
        setInvitations(invData.items || invData);
      }
    } catch (err) {
      console.error('Failed to load team settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setCreatingDept(true);
    try {
      const res = await fetchApi<any>('/v1/team/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptName.trim(),
          description: deptDesc.trim() || undefined,
          color: deptColor,
        }),
      });

      if (res && res.error) {
        alert(res.error.message);
      } else {
        setDeptName('');
        setDeptDesc('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingDept(false);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await fetchApi<any>(`/v1/team/departments/${deptId}`, { method: 'DELETE' });
      if (res && res.error) {
        alert(res.error.message);
      } else {
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this pending invitation?')) return;
    try {
      const res = await fetchApi<any>(`/v1/team/invitations/${invitationId}`, { method: 'DELETE' });
      if (res && res.error) {
        alert(res.error.message);
      } else {
        alert('Invitation revoked');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const res = await fetchApi<any>(`/v1/team/invitations/${invitationId}/resend`, { method: 'POST' });
      if (res && res.error) {
        alert(res.error.message);
      } else {
        alert('Invitation refreshed and resent!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Workforce Settings & Governance</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure studio departments, track pending team invitations, and inspect role matrix hierarchies.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        <Link href="/dashboard/team" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Directory
        </Link>
        <Link href="/dashboard/team/workload" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Workload Engine
        </Link>
        <Link href="/dashboard/team/calendar" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Team Calendar
        </Link>
        <Link href="/dashboard/team/settings" className="px-4 py-2 bg-slate-800/90 text-white font-semibold rounded-lg text-sm border border-slate-700">
          Departments & Invites
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Departments Management */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">Studio Departments</h3>
            
            <form onSubmit={handleCreateDept} className="space-y-3 mb-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
              <div className="font-semibold text-xs text-slate-300 uppercase">Create New Department</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Department Name *"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Optional Description"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Color Tag:</label>
                  <input
                    type="color"
                    value={deptColor}
                    onChange={(e) => setDeptColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingDept || !deptName.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  {creatingDept ? 'Adding...' : '+ Add Department'}
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-800">
              {departments.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No departments configured yet.</div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: dept.color || '#6366f1' }} />
                      <div>
                        <div className="font-semibold text-white text-sm">{dept.name}</div>
                        {dept.description && <div className="text-xs text-slate-400">{dept.description}</div>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDept(dept.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/50"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Invitations Management */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">Pending & Recent Invitations</h3>

            <div className="divide-y divide-slate-800">
              {invitations.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No invitations logged for this studio.</div>
              ) : (
                invitations.map((inv) => (
                  <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{inv.email}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {inv.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          inv.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          inv.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Expires: {new Date(inv.expires_at).toLocaleDateString()}
                        {inv.department && <span> • Dept: {inv.department}</span>}
                      </div>
                    </div>

                    {inv.status === 'PENDING' && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleResendInvitation(inv.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs rounded border border-rose-800/50 transition"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
