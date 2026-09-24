'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Users,
  CheckSquare,
  ListOrdered,
  FileQuestion,
  Clock,
  HardDrive,
  Activity,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Sparkles,
  Layers,
  MapPin,
  RefreshCw,
  Edit2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ProductionStage,
  ProductionHealthStatus,
  ChecklistItemStatus,
  ShotListItemStatus,
  ShotListCategory,
  ProjectProductionDTO,
  ProjectShootSessionDTO,
  ProjectCrewAssignmentDTO,
  ProjectEquipmentChecklistDTO,
  ProjectChecklistDTO,
  ProjectShotListDTO,
  ProjectQuestionnaireDTO,
  ProjectTimelineItemDTO,
  ProductionHealthDTO,
} from '@pixmatch/types';

export default function ProjectProductionWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { token, studio } = useAuth();

  const [production, setProduction] = useState<ProjectProductionDTO | null>(null);
  const [healthAudit, setHealthAudit] = useState<ProductionHealthDTO | null>(null);
  const [sessions, setSessions] = useState<ProjectShootSessionDTO[]>([]);
  const [crew, setCrew] = useState<ProjectCrewAssignmentDTO[]>([]);
  const [equipment, setEquipment] = useState<ProjectEquipmentChecklistDTO[]>([]);
  const [checklists, setChecklists] = useState<ProjectChecklistDTO[]>([]);
  const [shotLists, setShotLists] = useState<ProjectShotListDTO[]>([]);
  const [questionnaire, setQuestionnaire] = useState<ProjectQuestionnaireDTO | null>(null);
  const [timeline, setTimeline] = useState<ProjectTimelineItemDTO[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sessions' | 'crew' | 'equipment' | 'checklists' | 'shots' | 'questionnaire' | 'timeline' | 'media'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Forms State
  const [newSession, setNewSession] = useState({
    title: 'Main Shoot Session',
    shoot_type: 'WEDDING',
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
    location_name: '',
    location_address: '',
    call_time: '',
  });

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category: 'CAMERA_BODY',
    serial_number: '',
    required: true,
  });

  const [newChecklist, setNewChecklist] = useState({
    name: '',
    category: 'PRE_PRODUCTION',
    priority: 'HIGH',
  });

  const [newShotItem, setNewShotItem] = useState({
    title: '',
    category: 'FAMILY_FORMALS',
    priority: 'HIGH',
    description: '',
  });

  const [newTimelineEvent, setNewTimelineEvent] = useState({
    title: '',
    event_type: 'SHOOT_BLOCK',
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 1800000).toISOString().slice(0, 16),
    location: '',
  });

  const fetchWorkspaceData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-studio-id': studio?.id || '',
      };

      const [prodRes, auditRes, sessRes, crewRes, equipRes, checkRes, shotRes, questRes, timeRes] =
        await Promise.all([
          fetch(`/api/v1/operations/production/projects/${projectId}`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/health`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/sessions`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/crew`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/equipment`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/checklists`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/shot-lists`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/questionnaires`, { headers }),
          fetch(`/api/v1/operations/production/projects/${projectId}/timeline`, { headers }),
        ]);

      if (prodRes.ok) setProduction((await prodRes.json()).data);
      if (auditRes.ok) setHealthAudit((await auditRes.json()).data);
      if (sessRes.ok) setSessions((await sessRes.json()).data?.sessions || []);
      if (crewRes.ok) setCrew((await crewRes.json()).data?.crew || []);
      if (equipRes.ok) setEquipment((await equipRes.json()).data?.equipment || []);
      if (checkRes.ok) setChecklists((await checkRes.json()).data?.checklists || []);
      if (shotRes.ok) setShotLists((await shotRes.json()).data?.shot_lists || []);
      if (questRes.ok) setQuestionnaire((await questRes.json()).data?.questionnaires?.[0] || null);
      if (timeRes.ok) setTimeline((await timeRes.json()).data?.timeline_events || []);
    } catch (err) {
      console.error('Error fetching production workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && projectId) {
      fetchWorkspaceData();
    }
  }, [token, projectId, studio?.id]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newSession),
      });
      if (res.ok) {
        fetchWorkspaceData();
        setNewSession({
          title: '',
          shoot_type: 'WEDDING',
          start_at: new Date().toISOString().slice(0, 16),
          end_at: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
          location_name: '',
          location_address: '',
          call_time: '',
        });
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newEquipment),
      });
      if (res.ok) {
        fetchWorkspaceData();
        setNewEquipment({ name: '', category: 'CAMERA_BODY', serial_number: '', required: true });
      }
    } catch (err) {
      console.error('Failed to add equipment:', err);
    }
  };

  const handleApplyChecklistTemplate = async (templateType: string) => {
    try {
      const res = await fetch(
        `/api/v1/operations/production/projects/${projectId}/checklists/template/${templateType}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }
      );
      if (res.ok) fetchWorkspaceData();
    } catch (err) {
      console.error('Failed to apply template:', err);
    }
  };

  const handleApplyWeddingFamilyFormals = async (shotListId: string) => {
    try {
      const res = await fetch(
        `/api/v1/operations/production/projects/${projectId}/shot-lists/${shotListId}/template/wedding-formals`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio?.id || '',
          },
        }
      );
      if (res.ok) fetchWorkspaceData();
    } catch (err) {
      console.error('Failed to apply family formals template:', err);
    }
  };

  const handleGenerateQuestionnaire = async () => {
    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/questionnaires`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          title: `${production?.project?.name || 'Project'} Pre-Shoot Questionnaire`,
          description: 'Please help us prepare for your upcoming shoot with essential preferences and timeline details.',
        }),
      });
      if (res.ok) fetchWorkspaceData();
    } catch (err) {
      console.error('Failed to generate questionnaire:', err);
    }
  };

  const handleAddTimelineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/operations/production/projects/${projectId}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newTimelineEvent),
      });
      if (res.ok) {
        fetchWorkspaceData();
        setNewTimelineEvent({
          title: '',
          event_type: 'SHOOT_BLOCK',
          start_at: new Date().toISOString().slice(0, 16),
          end_at: new Date(Date.now() + 1800000).toISOString().slice(0, 16),
          location: '',
        });
      }
    } catch (err) {
      console.error('Failed to add timeline event:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/operations/production"
            className="p-2 rounded-lg bg-card-border/40 hover:bg-card-border text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {production?.project?.name || 'Production Workspace'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/20 text-primary border border-primary/30">
                {production?.production_stage || 'PRE_PRODUCTION'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Client: {production?.project?.client?.name || 'Direct Client'} • Shoot:{' '}
              {production?.shoot_type || 'STANDARD'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/operations/projects/${projectId}/shoot`}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-amber-500/20 transition"
          >
            <Camera className="h-4 w-4" />
            Shoot-Day Workspace
          </Link>
          <button
            onClick={fetchWorkspaceData}
            disabled={loading}
            className="p-2 rounded-lg bg-card-border/60 hover:bg-card-border text-muted hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-card-border scrollbar-none">
        {[
          { key: 'overview', label: 'Health & Overview', icon: Activity },
          { key: 'sessions', label: `Sessions (${sessions.length})`, icon: Calendar },
          { key: 'crew', label: `Crew (${crew.length})`, icon: Users },
          { key: 'equipment', label: `Equipment (${equipment.length})`, icon: HardDrive },
          { key: 'checklists', label: `Checklists (${checklists.length})`, icon: CheckSquare },
          { key: 'shots', label: `Shot Lists (${shotLists.length})`, icon: ListOrdered },
          { key: 'questionnaire', label: 'Client Questionnaire', icon: FileQuestion },
          { key: 'timeline', label: `Run of Show (${timeline.length})`, icon: Clock },
          { key: 'media', label: 'Media & Delivery Pipeline', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'text-muted hover:text-white hover:bg-card-border/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Health Audit */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {healthAudit && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Score Gauge */}
              <div className="bg-[#0E1422] border border-card-border rounded-xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Production Health Score
                  </h3>
                  <p className="text-xs text-muted mt-1">Multi-dimensional operational risk assessment</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-5xl font-black text-white">{healthAudit.score}</div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                        healthAudit.score >= 80
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : healthAudit.score >= 50
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {healthAudit.status}
                    </span>
                    <p className="text-[10px] text-muted mt-1">
                      Target Delivery: {production?.delivery_target_date ? new Date(production.delivery_target_date).toLocaleDateString() : 'Unscheduled'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-card-border/60">
                  <span className="text-[11px] font-bold text-white">Critical Action Items:</span>
                  {(healthAudit.warnings || []).concat(healthAudit.blockers || []).slice(0, 4).map((rec, i) => (
                    <div key={i} className="text-xs text-amber-300/90 flex items-start gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8 Dimensions Breakdown */}
              <div className="lg:col-span-2 bg-[#0E1422] border border-card-border rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  8-Dimension Health Audit
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(healthAudit.dimensions || []).map((dim) => (
                    <div
                      key={dim.dimension}
                      className="p-3 rounded-lg bg-[#070A0F] border border-card-border/60 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-semibold text-white capitalize">
                          {dim.dimension.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[10px] text-muted">{dim.detail || 'Operational weight'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-card-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${(dim.score / dim.max_score) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {dim.score}/{dim.max_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sessions */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateSession} className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Schedule Shoot Session</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Session Title (e.g. Ceremony & Reception)"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
              <input
                type="datetime-local"
                value={newSession.start_at}
                onChange={(e) => setNewSession({ ...newSession, start_at: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
              <input
                type="datetime-local"
                value={newSession.end_at}
                onChange={(e) => setNewSession({ ...newSession, end_at: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold"
            >
              Add Session
            </button>
          </form>

          <div className="space-y-3">
            {sessions.map((sess) => (
              <div key={sess.id} className="bg-[#0E1422] border border-card-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{sess.title}</h4>
                  <p className="text-xs text-muted">
                    {new Date(sess.start_at).toLocaleString()} - {new Date(sess.end_at).toLocaleTimeString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-card-border text-muted">
                  {sess.shoot_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Crew */}
      {activeTab === 'crew' && (
        <div className="space-y-6">
          <div className="bg-[#0E1422] border border-card-border rounded-xl p-6 text-center space-y-3">
            <Users className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-sm font-bold text-white">Assigned Crew Members ({crew.length})</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Photographers, second shooters, assistants, and videographers assigned to this project. Includes 4-hour conflict detection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {crew.map((member) => (
              <div key={member.id} className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white capitalize">{member.role}</span>
                  {member.role?.toLowerCase().includes('lead') && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Lead Photographer
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">Resource: {member.resource?.name || member.resource_id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Equipment */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <form onSubmit={handleAddEquipment} className="bg-[#0E1422] border border-card-border rounded-xl p-4 flex gap-3">
            <input
              type="text"
              placeholder="Gear / Item Name (e.g. Sony A7IV Body #1)"
              value={newEquipment.name}
              onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              className="flex-1 bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
              required
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold"
            >
              Add Equipment
            </button>
          </form>

          <div className="space-y-2">
            {equipment.map((item) => (
              <div key={item.id} className="bg-[#0E1422] border border-card-border rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{item.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card-border text-muted">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Checklists */}
      {activeTab === 'checklists' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplyChecklistTemplate('WEDDING')}
              className="px-3 py-1.5 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold border border-card-border"
            >
              + Apply Wedding Checklist Template
            </button>
            <button
              onClick={() => handleApplyChecklistTemplate('COMMERCIAL')}
              className="px-3 py-1.5 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold border border-card-border"
            >
              + Commercial Template
            </button>
          </div>

          <div className="space-y-2">
            {checklists.map((chk) => (
              <div key={chk.id} className="bg-[#0E1422] border border-card-border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-white">{chk.name}</span>
                </div>
                <span className="text-[10px] font-bold text-muted">{chk.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Shot Lists */}
      {activeTab === 'shots' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {shotLists.map((sl) => (
              <div key={sl.id} className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{sl.name}</h4>
                  <button
                    onClick={() => handleApplyWeddingFamilyFormals(sl.id)}
                    className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded text-xs font-semibold"
                  >
                    + Add 20-Min Wedding Family Formals
                  </button>
                </div>

                <div className="space-y-1.5">
                  {sl.items?.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-[#070A0F] border border-card-border/60 flex items-center justify-between">
                      <span className="text-xs text-white">{item.title}</span>
                      <span className="text-[10px] font-bold text-amber-400">{item.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Questionnaire */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-6">
          {!questionnaire ? (
            <div className="bg-[#0E1422] border border-card-border rounded-xl p-8 text-center space-y-3">
              <FileQuestion className="h-10 w-10 text-primary mx-auto" />
              <h3 className="text-sm font-bold text-white">No Pre-Shoot Questionnaire</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Generate a secure public questionnaire for the client to capture timeline details, family groupings, and special requests.
              </p>
              <button
                onClick={handleGenerateQuestionnaire}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold"
              >
                Create Client Questionnaire
              </button>
            </div>
          ) : (
            <div className="bg-[#0E1422] border border-card-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{questionnaire.title}</h3>
                  <p className="text-xs text-muted">Status: {questionnaire.status}</p>
                </div>
                {questionnaire.public_token && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/portal/project/${questionnaire.public_token}/questionnaire`;
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card-border/60 hover:bg-card-border text-white text-xs font-semibold border border-card-border transition"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedLink ? 'Copied Link!' : 'Copy Client Portal Link'}
                    </button>
                    <Link
                      href={`/portal/project/${questionnaire.public_token}/questionnaire`}
                      target="_blank"
                      className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-card-border/60">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Questions ({questionnaire.questions?.length || 0})
                </span>
                {questionnaire.questions?.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-[#070A0F] border border-card-border/60 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-white">
                      {idx + 1}. {q.question}
                    </p>
                    {q.answer && (
                      <p className="text-xs text-primary/90 bg-primary/10 p-2 rounded border border-primary/20">
                        {typeof q.answer.answer === 'string' ? q.answer.answer : JSON.stringify(q.answer.answer)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Run of Show Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <form onSubmit={handleAddTimelineEvent} className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Run-of-Show Event</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Event Title (e.g. First Look)"
                value={newTimelineEvent.title}
                onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, title: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
              <input
                type="datetime-local"
                value={newTimelineEvent.start_at}
                onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, start_at: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
              <input
                type="datetime-local"
                value={newTimelineEvent.end_at}
                onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, end_at: e.target.value })}
                className="bg-[#070A0F] border border-card-border rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold"
            >
              Add Timeline Event
            </button>
          </form>

          <div className="space-y-2">
            {timeline.map((evt) => (
              <div key={evt.id} className="bg-[#0E1422] border border-card-border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">{evt.title}</span>
                  <p className="text-[10px] text-muted">
                    {new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(evt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card-border text-muted">
                  {evt.event_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 9: Media & Delivery Pipeline */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase">Ingestion Status</span>
              <p className="text-sm font-bold text-white">{production?.media_ingestion_status || 'NOT_STARTED'}</p>
            </div>
            <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase">Backup Status</span>
              <p className="text-sm font-bold text-emerald-400">{production?.media_backup_status || 'NOT_STARTED'}</p>
            </div>
            <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase">Raw Captured</span>
              <p className="text-sm font-bold text-primary">{production?.raw_captured_count || 0} Assets</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
