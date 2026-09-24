'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit2,
  ChevronRight,
  Kanban,
  List,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  StudioLeadDTO,
  StudioLeadStatus,
  StudioLeadSource,
  StudioProjectType,
  CreateStudioLeadDTO,
  ConvertLeadDTO,
} from '@pixmatch/types';

const PIPELINE_STAGES: { key: StudioLeadStatus; label: string; color: string }[] = [
  { key: StudioLeadStatus.NEW, label: 'New Inquiry', color: 'border-blue-500/50 bg-blue-500/5' },
  { key: StudioLeadStatus.CONTACTED, label: 'Contacted', color: 'border-indigo-500/50 bg-indigo-500/5' },
  { key: StudioLeadStatus.QUALIFIED, label: 'Qualified', color: 'border-purple-500/50 bg-purple-500/5' },
  { key: StudioLeadStatus.PROPOSAL_SENT, label: 'Proposal Sent', color: 'border-amber-500/50 bg-amber-500/5' },
  { key: StudioLeadStatus.NEGOTIATING, label: 'Negotiating', color: 'border-cyan-500/50 bg-cyan-500/5' },
  { key: StudioLeadStatus.WON, label: 'Won / Booked', color: 'border-emerald-500/50 bg-emerald-500/5' },
  { key: StudioLeadStatus.LOST, label: 'Lost / Closed', color: 'border-rose-500/50 bg-rose-500/5' },
];

export default function LeadsPipelinePage() {
  const { token, studio } = useAuth();
  const [leads, setLeads] = useState<StudioLeadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<StudioLeadDTO | null>(null);

  // New Lead Form State
  const [newLead, setNewLead] = useState<CreateStudioLeadDTO>({
    name: '',
    email: '',
    phone: '',
    source: StudioLeadSource.WEBSITE,
    project_type: StudioProjectType.WEDDING,
    estimated_value: 0,
    target_event_date: '',
    notes: '',
  });

  // Convert Form State
  const [convertData, setConvertData] = useState<ConvertLeadDTO>({
    create_project: true,
    project_title: '',
    project_type: StudioProjectType.WEDDING,
    shoot_date: '',
    total_amount: 0,
    deposit_amount: 0,
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/v1/operations/leads?limit=100';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (sourceFilter !== 'ALL') url += `&source=${sourceFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to fetch leads');
      const json = await res.json();
      setLeads(json.data?.leads || json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLeads();
    }
  }, [token, studio?.id, statusFilter, sourceFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/operations/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(newLead),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create lead');
      }

      setShowCreateModal(false);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        source: StudioLeadSource.WEBSITE,
        project_type: StudioProjectType.WEDDING,
        estimated_value: 0,
        target_event_date: '',
        notes: '',
      });
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (leadId: string, status: StudioLeadStatus) => {
    try {
      const res = await fetch(`/api/v1/operations/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to update lead status');
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const res = await fetch(`/api/v1/operations/leads/${selectedLead.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify(convertData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to convert lead');
      }

      setShowConvertModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/v1/operations/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to delete lead');
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openConvertModalForLead = (lead: StudioLeadDTO) => {
    setSelectedLead(lead);
    const pType = (lead.project_type || lead.service_type || 'Wedding') as string;
    setConvertData({
      create_project: true,
      project_title: `${lead.name} — ${pType.replace(/_/g, ' ')}`,
      project_type: (lead.project_type as StudioProjectType) || StudioProjectType.WEDDING,
      shoot_date: (lead.target_event_date as string) || '',
      total_amount: lead.estimated_value || 0,
      deposit_amount: lead.estimated_value ? Math.round(lead.estimated_value * 0.3) : 0,
    });
    setShowConvertModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserPlus className="h-6 w-6 text-primary" />
            Leads Pipeline & Inquiry CRM
          </h1>
          <p className="text-sm text-muted">
            Track inquiries from initial contact to shoot booking with automated client conversion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-card rounded-lg border border-card-border p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'kanban' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
              title="Kanban View"
            >
              <Kanban className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            New Inquiry
          </button>
        </div>
      </div>

      <OperationsNavTabs />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border border-card-border rounded-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
              className="w-full bg-card-border/30 border border-card-border/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Stages</option>
              {Object.values(StudioLeadStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Sources</option>
              {Object.values(StudioLeadSource).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-1.5 text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
            title="Refresh Leads"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Content: Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-6">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.status === stage.key);
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

            return (
              <div
                key={stage.key}
                className={`p-3 rounded-xl border flex flex-col justify-between min-h-[500px] ${stage.color}`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-card-border/40">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {stage.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card text-muted">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="text-[10px] text-muted mb-3">
                    Est. Value: <strong className="text-white">₹{stageValue.toLocaleString()}</strong>
                  </div>

                  <div className="space-y-2.5">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-lg bg-card border border-card-border shadow-sm hover:border-primary/50 transition flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white line-clamp-1">
                              {lead.name}
                            </span>
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-card-border text-muted uppercase">
                              {lead.project_type || lead.service_type || 'OTHER'}
                            </span>
                          </div>

                          {lead.email && (
                            <div className="text-[11px] text-muted flex items-center gap-1.5 mt-1 line-clamp-1">
                              <Mail className="h-3 w-3 text-muted" />
                              {lead.email}
                            </div>
                          )}

                          {lead.phone && (
                            <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                              <Phone className="h-3 w-3 text-muted" />
                              {lead.phone}
                            </div>
                          )}

                          {lead.target_event_date && (
                            <div className="text-[11px] text-indigo-400 flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.target_event_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-card-border/40 text-[11px]">
                          <span className="text-emerald-400 font-semibold">
                            ₹{(lead.estimated_value || 0).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {lead.status !== StudioLeadStatus.WON && (
                              <button
                                onClick={() => openConvertModalForLead(lead)}
                                className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold transition flex items-center gap-1"
                                title="Convert to Booked Project"
                              >
                                Book <ArrowRight className="h-3 w-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 text-muted hover:text-rose-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stage Mover Selector */}
                        <div className="pt-1">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as StudioLeadStatus)}
                            className="w-full bg-card-border/30 border border-card-border/60 rounded px-1.5 py-1 text-[10px] text-muted hover:text-white focus:outline-none"
                          >
                            {Object.values(StudioLeadStatus).map((st) => (
                              <option key={st} value={st}>
                                → {st.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content: List View */}
      {viewMode === 'list' && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-card-border/40 text-muted uppercase text-[10px] tracking-wider border-b border-card-border">
              <tr>
                <th className="px-4 py-3">Lead Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Type & Source</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Est. Value</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-card-border/20 transition">
                    <td className="px-4 py-3 font-semibold text-white">{lead.name}</td>
                    <td className="px-4 py-3 text-muted">
                      <div>{lead.email || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{lead.phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-card-border text-white">
                        {lead.project_type || lead.service_type || 'GENERAL'}
                      </span>
                      <span className="ml-1.5 text-[10px] text-muted">via {lead.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as StudioLeadStatus)}
                        className="bg-card-border/40 border border-card-border rounded px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {Object.values(StudioLeadStatus).map((st) => (
                          <option key={st} value={st}>
                            {st.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {lead.target_event_date
                        ? new Date(lead.target_event_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      ₹{(lead.estimated_value || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {lead.status !== StudioLeadStatus.WON && (
                        <button
                          onClick={() => openConvertModalForLead(lead)}
                          className="px-2.5 py-1 rounded bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition"
                        >
                          Book Project
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1 text-muted hover:text-rose-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Inquiry */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Record New Lead / Inquiry
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Lead / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditi Sharma & Rohan Verma"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Project Type</label>
                  <select
                    value={newLead.project_type}
                    onChange={(e) => setNewLead({ ...newLead, project_type: e.target.value as StudioProjectType })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(StudioProjectType).map((pt) => (
                      <option key={pt} value={pt}>
                        {pt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Lead Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value as StudioLeadSource })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(StudioLeadSource).map((src) => (
                      <option key={src} value={src}>
                        {src.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="75000"
                    value={newLead.estimated_value || ''}
                    onChange={(e) => setNewLead({ ...newLead, estimated_value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Target Event Date</label>
                  <input
                    type="date"
                    value={(newLead.target_event_date as string) || ''}
                    onChange={(e) => setNewLead({ ...newLead, target_event_date: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Initial Notes / Requirements
                </label>
                <textarea
                  rows={3}
                  value={newLead.notes || ''}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="e.g. Wedding with 300 guests, need 2 cinematographers and drone footage..."
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted/50 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-card-border text-xs font-semibold text-muted hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div>
                <h3 className="font-bold text-white text-base">Book Project from Lead</h3>
                <p className="text-xs text-muted">
                  Convert <span className="text-primary font-semibold">{selectedLead.name}</span> into an active client and booked project.
                </p>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-card-border/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={convertData.project_title}
                  onChange={(e) => setConvertData({ ...convertData, project_title: e.target.value })}
                  className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Project Type
                  </label>
                  <select
                    value={convertData.project_type}
                    onChange={(e) => setConvertData({ ...convertData, project_type: e.target.value as StudioProjectType })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(StudioProjectType).map((pt) => (
                      <option key={pt} value={pt}>
                        {pt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Shoot Date
                  </label>
                  <input
                    type="date"
                    value={(convertData.shoot_date as string) || ''}
                    onChange={(e) => setConvertData({ ...convertData, shoot_date: e.target.value })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Total Agreed Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={convertData.total_amount || ''}
                    onChange={(e) => setConvertData({ ...convertData, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Initial Deposit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={convertData.deposit_amount || ''}
                    onChange={(e) => setConvertData({ ...convertData, deposit_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-card-border/30 border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-500/30 transition"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
