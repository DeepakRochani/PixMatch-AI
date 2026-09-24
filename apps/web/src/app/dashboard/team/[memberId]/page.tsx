'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api-client';

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.memberId as string;

  const [member, setMember] = useState<any>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [reassignPlan, setReassignPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'leaves' | 'role'>('overview');

  // Edit profile state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role change state
  const [selectedRole, setSelectedRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);

  // Leave creation state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('LEAVE');
  const [leaveReason, setLeaveReason] = useState('');
  const [savingLeave, setSavingLeave] = useState(false);
  const [leavesList, setLeavesList] = useState<any[]>([]);

  // Reassignment & Deactivation modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [reassigning, setReassigning] = useState(false);

  const loadData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [memberRes, workloadRes, planRes, leavesRes, allMembersRes] = await Promise.all([
        fetchApi<any>(`/v1/team/members/${memberId}`),
        fetchApi<any>(`/v1/team/workload/${memberId}`),
        fetchApi<any>(`/v1/team/reassignment-plan/${memberId}`),
        fetchApi<any>(`/v1/team/leaves?member_id=${memberId}`),
        fetchApi<any>(`/v1/team/members?status=ACTIVE&limit=100`),
      ]);

      const memberData = (memberRes as any)?.data || memberRes;
      const workloadData = (workloadRes as any)?.data || workloadRes;
      const planData = (planRes as any)?.data || planRes;
      const leavesData = (leavesRes as any)?.data || leavesRes;
      const allMembersData = (allMembersRes as any)?.data || allMembersRes;

      if (memberData && memberData.id) {
        setMember(memberData);
        setTitle(memberData.title || '');
        setDepartment(memberData.department || '');
        setPhone(memberData.phone || '');
        setBio(memberData.bio || '');
        setSkillsInput((memberData.skills || []).join(', '));
        setTimezone(memberData.timezone || 'UTC');
        setSelectedRole(memberData.role || 'PHOTOGRAPHER');
      }

      if (workloadData && workloadData.workload_score !== undefined) {
        setWorkload(workloadData);
      }

      if (planData && planData.tasks) {
        setReassignPlan(planData);
      }

      if (leavesData && leavesData.items) {
        setLeavesList(leavesData.items);
      }

      if (allMembersData && (allMembersData.items || Array.isArray(allMembersData))) {
        const list = allMembersData.items || allMembersData;
        setAllMembers(list.filter((m: any) => m.id !== memberId));
      }
    } catch (err) {
      console.error('Failed to load member profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetchApi<any>(`/v1/team/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          department,
          phone,
          bio,
          skills,
          timezone,
        }),
      });

      if (res && res.error) {
        setProfileMsg({ type: 'error', text: res.error.message || 'Failed to update profile' });
      } else {
        setProfileMsg({ type: 'success', text: 'Member profile updated successfully!' });
        loadData();
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Network error saving profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingRole(true);
    try {
      const res = await fetchApi<any>(`/v1/team/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res && res.error) {
        alert(res.error.message || 'Failed to change role');
      } else {
        alert('Role changed successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error changing role');
    } finally {
      setChangingRole(false);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLeave(true);
    try {
      const res = await fetchApi<any>('/v1/team/leaves', {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId,
          leave_type: leaveType,
          start_date: leaveStart,
          end_date: leaveEnd,
          reason: leaveReason || undefined,
        }),
      });

      if (res && res.error) {
        alert(res.error.message || 'Failed to book leave');
      } else {
        setShowLeaveModal(false);
        setLeaveReason('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error booking leave');
    } finally {
      setSavingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave schedule?')) return;
    try {
      await fetchApi<any>(`/v1/team/leaves/${leaveId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error removing leave');
    }
  };

  const handleReassignAndDeactivate = async () => {
    if (!targetMemberId) {
      alert('Please select a target team member to inherit active assignments');
      return;
    }

    setReassigning(true);
    try {
      // 1. Reassign
      const reassignRes = await fetchApi<any>('/v1/team/reassign', {
        method: 'POST',
        body: JSON.stringify({
          source_member_id: memberId,
          target_member_id: targetMemberId,
          transfer_tasks: true,
          transfer_projects: true,
          transfer_shoots: true,
          transfer_equipment: true,
          transfer_clients: true,
        }),
      });

      if (reassignRes && reassignRes.error) {
        alert(`Reassignment failed: ${reassignRes.error.message}`);
        setReassigning(false);
        return;
      }

      // 2. Deactivate
      const deactRes = await fetchApi<any>(`/v1/team/members/${memberId}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Reassigned and deactivated via Workforce UI' }),
      });

      if (deactRes && deactRes.error) {
        alert(`Deactivation failed: ${deactRes.error.message}`);
      } else {
        alert('Member successfully reassigned and deactivated.');
        setShowDeactivateModal(false);
        router.push('/dashboard/team');
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`);
    } finally {
      setReassigning(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Reactivate this team member?')) return;
    try {
      const res = await fetchApi<any>(`/v1/team/members/${memberId}/reactivate`, { method: 'POST' });
      if (res && res.error) {
        alert(res.error.message);
      } else {
        alert('Member reactivated!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 p-8">Loading member profile...</div>;
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="text-xl font-bold text-white mb-2">Member Not Found</div>
        <Link href="/dashboard/team" className="text-indigo-400 text-sm">← Back to Team Directory</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/dashboard/team" className="hover:text-slate-200">Team Directory</Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{member.user_name}</span>
      </div>

      {/* Header Profile Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center font-bold text-indigo-200 text-2xl shadow-inner">
            {member.user_name ? member.user_name.slice(0, 2).toUpperCase() : 'TM'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{member.user_name}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {member.role}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${member.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {member.status}
              </span>
            </div>
            <div className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-4">
              <span>{member.user_email}</span>
              {member.title && <span>• {member.title}</span>}
              {member.department && <span>• {member.department}</span>}
              <span>• Timezone: {member.timezone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {member.status === 'ACTIVE' ? (
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-sm font-medium transition"
            >
              Reassign & Deactivate
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/80 rounded-lg text-sm font-medium transition"
            >
              Reactivate Member
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'overview' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Overview & Workload
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'assignments' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Assignments ({reassignPlan ? reassignPlan.tasks.length + reassignPlan.projects.length + reassignPlan.shoot_crew_assignments.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'leaves' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Availability & Leaves ({leavesList.length})
        </button>
        <button
          onClick={() => setActiveTab('role')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'role' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Role & Permissions
        </button>
      </div>

      {/* Tab 1: Overview & Workload */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workload Stats Card */}
          {workload && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 lg:col-span-1 space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Workload State</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current State:</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                  workload.state === 'OVERLOADED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  workload.state === 'HEAVY' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  workload.state === 'NORMAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {workload.state}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Workload Score:</span>
                  <span className="font-bold text-white">{workload.workload_score} / 100</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      workload.workload_score > 80 ? 'bg-rose-500' :
                      workload.workload_score > 60 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(workload.workload_score, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-500">Open Tasks</div>
                  <div className="text-lg font-bold text-white mt-0.5">{workload.open_tasks_count}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-500">Overdue Tasks</div>
                  <div className={`text-lg font-bold mt-0.5 ${workload.overdue_tasks_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {workload.overdue_tasks_count}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-500">Active Projects</div>
                  <div className="text-lg font-bold text-white mt-0.5">{workload.active_projects_count}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-500">Upcoming Shoots</div>
                  <div className="text-lg font-bold text-indigo-400 mt-0.5">{workload.upcoming_shoots_count}</div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Edit Form */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 mb-6">Profile & Skills</h3>

            {profileMsg && (
              <div className={`p-3 rounded-lg text-xs mb-4 border ${profileMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Job Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  placeholder="Wedding, Drone, Lighting, Studio Portrait, Color Grading"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Bio / Internal Background</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Assignments */}
      {activeTab === 'assignments' && reassignPlan && (
        <div className="space-y-6">
          {/* Active Tasks */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
              <span>Assigned Tasks ({reassignPlan.tasks.length})</span>
            </h3>
            {reassignPlan.tasks.length === 0 ? (
              <div className="text-sm text-slate-500">No active tasks assigned to this member.</div>
            ) : (
              <div className="space-y-2">
                {reassignPlan.tasks.map((task: any) => (
                  <div key={task.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-white">{task.title}</div>
                      <div className="text-xs text-slate-400">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'} • Priority: {task.priority}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Projects */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Participating Projects ({reassignPlan.projects.length})</h3>
            {reassignPlan.projects.length === 0 ? (
              <div className="text-sm text-slate-500">No active projects linked.</div>
            ) : (
              <div className="space-y-2">
                {reassignPlan.projects.map((proj: any) => (
                  <div key={proj.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-white">{proj.name}</div>
                      <div className="text-xs text-slate-400">Status: {proj.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shoot Sessions & Crew */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Production Crew Shoots ({reassignPlan.shoot_crew_assignments.length})</h3>
            {reassignPlan.shoot_crew_assignments.length === 0 ? (
              <div className="text-sm text-slate-500">No upcoming shoot assignments.</div>
            ) : (
              <div className="space-y-2">
                {reassignPlan.shoot_crew_assignments.map((shoot: any) => (
                  <div key={shoot.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-white">{shoot.shoot_title || 'Shoot Session'}</div>
                      <div className="text-xs text-slate-400">Date: {shoot.shoot_date ? new Date(shoot.shoot_date).toLocaleString() : 'TBD'} • Role: {shoot.crew_role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Equipment Assignments */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Assigned Equipment ({reassignPlan.equipment_assignments.length})</h3>
            {reassignPlan.equipment_assignments.length === 0 ? (
              <div className="text-sm text-slate-500">No equipment currently assigned.</div>
            ) : (
              <div className="space-y-2">
                {reassignPlan.equipment_assignments.map((eq: any) => (
                  <div key={eq.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-white">{eq.item_name}</div>
                      <div className="text-xs text-slate-400">Category: {eq.category || 'Gear'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Scheduled Time-Off & Leaves</h3>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Record Leave
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            {leavesList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No leave records registered for this member.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {leavesList.map((leave) => (
                  <div key={leave.id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-800/20 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {leave.leave_type}
                        </span>
                        <span className="font-semibold text-white">
                          {new Date(leave.start_date).toLocaleDateString()} – {new Date(leave.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {leave.reason && <div className="text-xs text-slate-400 mt-1">{leave.reason}</div>}
                    </div>

                    <button
                      onClick={() => handleDeleteLeave(leave.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-950/40 border border-rose-800/50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Role & Permissions */}
      {activeTab === 'role' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 max-w-2xl space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Role & Permissions Hierarchy</h3>
          
          <form onSubmit={handleChangeRole} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Change Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="OWNER">Owner (Full Studio Control)</option>
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
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">RBAC Governance Rules:</div>
              <div>• You cannot escalate a role higher than your own role rank.</div>
              <div>• Only existing Owners can grant or transfer Owner permissions.</div>
              <div>• A studio must retain at least one active Owner at all times.</div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingRole}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
              >
                {changingRole ? 'Updating Role...' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Record Time-Off / Leave</h3>
            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  <option value="LEAVE">Vacation / Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="PERSONAL">Personal Day</option>
                  <option value="BLOCKED">Blocked Availability</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Leave, Family Event"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                >
                  {savingLeave ? 'Saving...' : 'Record Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign & Deactivate Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reassign & Deactivate Member</h3>
            <p className="text-sm text-slate-400">
              Before deactivating <span className="text-white font-semibold">{member.user_name}</span>, all active tasks, projects, shoot crew assignments, and equipment must be safely reassigned to an active staff member.
            </p>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-300">Items to Reassign:</div>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>• Tasks: {reassignPlan?.tasks.length || 0}</div>
                <div>• Projects: {reassignPlan?.projects.length || 0}</div>
                <div>• Shoots: {reassignPlan?.shoot_crew_assignments.length || 0}</div>
                <div>• Equipment: {reassignPlan?.equipment_assignments.length || 0}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Select Inheriting Team Member *
              </label>
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">-- Choose active member --</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user_name} ({m.role} - {m.department || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reassigning || !targetMemberId}
                onClick={handleReassignAndDeactivate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {reassigning ? 'Processing Reassignment...' : 'Execute Reassignment & Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
