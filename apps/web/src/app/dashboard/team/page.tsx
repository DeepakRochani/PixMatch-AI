'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  title?: string;
  department?: string;
  bio?: string;
  phone?: string;
  skills: string[];
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'INACTIVE' | 'REMOVED';
  timezone: string;
  created_at: string;
}

interface TeamMetrics {
  total_members: number;
  active_members: number;
  invited_members: number;
  suspended_members: number;
  departments_count: number;
  pending_invitations: number;
  overloaded_members_count: number;
}

export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('PHOTOGRAPHER');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRole) params.append('role', selectedRole);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);

      const [membersRes, metricsRes] = await Promise.all([
        fetchApi<any>(`/v1/team/members?${params.toString()}`),
        fetchApi<any>('/v1/team/metrics'),
      ]);

      const membersData = (membersRes as any)?.data || membersRes;
      const metricsData = (metricsRes as any)?.data || metricsRes;

      if (membersData && (membersData.items || Array.isArray(membersData))) {
        setMembers(membersData.items || membersData);
      }
      if (metricsData && metricsData.total_members !== undefined) {
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error('Failed to load team data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRole, selectedDept, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await fetchApi<any>('/v1/team/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          department: inviteDept || undefined,
          title: inviteTitle || undefined,
          notes: inviteNotes || undefined,
        }),
      });

      if (res && res.error) {
        setInviteError(res.error.message || 'Failed to send invitation');
      } else {
        setInviteSuccess(`Invitation successfully created for ${inviteEmail}!`);
        setInviteEmail('');
        setInviteTitle('');
        setInviteNotes('');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccess('');
          loadData();
        }, 1500);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Unexpected error creating invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_token') : null;
    const studioId = typeof window !== 'undefined' ? localStorage.getItem('pixmatch_studio_id') : null;
    const url = `/api/v1/team/export/csv`;
    window.open(url, '_blank');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-900/60 text-purple-300 border-purple-700';
      case 'ADMIN':
        return 'bg-blue-900/60 text-blue-300 border-blue-700';
      case 'MANAGER':
        return 'bg-cyan-900/60 text-cyan-300 border-cyan-700';
      case 'PHOTOGRAPHER':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      case 'VIDEOGRAPHER':
        return 'bg-teal-900/60 text-teal-300 border-teal-700';
      case 'EDITOR':
        return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'PRODUCER':
        return 'bg-indigo-900/60 text-indigo-300 border-indigo-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
      case 'INVITED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Invited</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">Suspended</span>;
      case 'INACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600">Inactive</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Studio Team & Workforce</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">Internal</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage studio members, roles, workload, scheduling, skills, and equipment responsibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        <Link href="/dashboard/team" className="px-4 py-2 bg-slate-800/90 text-white font-semibold rounded-lg text-sm border border-slate-700">
          Directory
        </Link>
        <Link href="/dashboard/team/collaboration" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Collaboration
        </Link>
        <Link href="/dashboard/team/attention" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Attention Center
        </Link>
        <Link href="/dashboard/team/workload" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Workload Engine
        </Link>
        <Link href="/dashboard/team/calendar" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Team Calendar
        </Link>
        <Link href="/dashboard/team/settings" className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-sm transition">
          Departments & Invites
        </Link>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Members</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.total_members}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Staff</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.active_members}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Departments</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{metrics.departments_count}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Invites</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.pending_invitations}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overloaded</div>
            <div className={`text-2xl font-bold mt-1 ${metrics.overloaded_members_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {metrics.overloaded_members_count}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Suspended</div>
            <div className="text-2xl font-bold text-slate-400 mt-1">{metrics.suspended_members}</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Search team members by name, email, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="PHOTOGRAPHER">Photographer</option>
            <option value="VIDEOGRAPHER">Videographer</option>
            <option value="EDITOR">Editor</option>
            <option value="ASSISTANT">Assistant</option>
            <option value="PRODUCER">Producer</option>
            <option value="SALES">Sales</option>
            <option value="SUPPORT">Support</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading studio workforce...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 font-medium">No team members found</div>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role & Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                          {member.user_name ? member.user_name.slice(0, 2).toUpperCase() : 'TM'}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{member.user_name || 'Unnamed Member'}</div>
                          <div className="text-xs text-slate-400">{member.user_email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        {member.title && <span className="text-xs text-slate-400">{member.title}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {member.department || <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.skills && member.skills.length > 0 ? (
                          member.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                        {member.skills && member.skills.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            +{member.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(member.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/team/${member.id}`}
                        className="inline-flex items-center px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
                      >
                        Profile & Workload →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@studio.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Assigned Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">Admin (Full studio management)</option>
                  <option value="MANAGER">Manager (Department / crew lead)</option>
                  <option value="PHOTOGRAPHER">Photographer (Shoots & galleries)</option>
                  <option value="VIDEOGRAPHER">Videographer (Video shoots)</option>
                  <option value="EDITOR">Editor (Culling & retouching)</option>
                  <option value="ASSISTANT">Assistant (Shoots & equipment)</option>
                  <option value="PRODUCER">Producer (Logistics & schedule)</option>
                  <option value="SALES">Sales (CRM & proposals)</option>
                  <option value="SUPPORT">Support (Client communications)</option>
                  <option value="VIEWER">Viewer (Read-only internal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Photography, Post-Production, Operations"
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Wedding Photographer"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Internal Note</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal onboarding notes..."
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
