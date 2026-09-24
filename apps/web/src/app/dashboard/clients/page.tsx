'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { fetchApi } from '@/lib/api-client';
import { formatDate } from '@pixmatch/ui';
import {
  Users,
  Mail,
  Phone,
  Images,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Send,
  Eye,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building,
  Tag,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Loader2,
  X,
  Check
} from 'lucide-react';
import { ClientDTO, ClientStatus } from '@pixmatch/types';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    with_galleries: 0,
    recent_activity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'HAS_GALLERIES' | 'NO_GALLERIES' | 'RECENT_ACTIVITY'>('ALL');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('Wedding, VIP');
  const [savingClient, setSavingClient] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string; email: string; phone?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Send Gallery Modal State
  const [sendModalClient, setSendModalClient] = useState<ClientDTO | null>(null);
  const [availableGalleries, setAvailableGalleries] = useState<any[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingDelivery, setSendingDelivery] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  // Load Clients from API
  const loadClients = useCallback(async (reset = false, cursor?: string) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('filter', statusFilter);
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '25');

      const res = await fetchApi(`/clients?${params.toString()}`);
      if (res.success && res.data) {
        if (reset || !cursor) {
          setClients(res.data.clients || []);
        } else {
          setClients((prev) => [...prev, ...(res.data.clients || [])]);
        }
        setNextCursor(res.data.next_cursor || null);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadClients(true);
  }, [loadClients]);

  // Check duplicate on email/phone change
  const handleCheckDuplicate = async () => {
    if (!formEmail && (!formName || !formPhone)) {
      setDuplicateWarning(null);
      return;
    }

    try {
      const res = await fetchApi('/clients/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({
          email: formEmail || undefined,
          name: formName || undefined,
          phone: formPhone || undefined,
        }),
      });

      if (res.success && res.data?.is_duplicate) {
        setDuplicateWarning(res.data.existing_client);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      setDuplicateWarning(null);
    }
  };

  // Submit Add Client
  const handleCreateClient = async (ignoreDuplicate = false) => {
    if (!formName.trim() || !formEmail.trim()) {
      setErrorMessage('Client name and email are required');
      return;
    }

    setSavingClient(true);
    setErrorMessage('');

    try {
      const tagsArray = formTags.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetchApi('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim() || undefined,
          company: formCompany.trim() || undefined,
          notes: formNotes.trim() || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          allow_duplicate: ignoreDuplicate,
        }),
      });

      if (res.success) {
        setShowAddModal(false);
        resetForm();
        loadClients(true);
      } else {
        const errText = typeof res.error === 'object' && res.error ? (res.error as any).message || 'Failed to create client' : String(res.error || 'Failed to create client');
        setErrorMessage(errText);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating client');
    } finally {
      setSavingClient(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormNotes('');
    setFormTags('Wedding, VIP');
    setDuplicateWarning(null);
    setErrorMessage('');
  };

  // Open Send Gallery Modal
  const openSendModal = async (client: ClientDTO) => {
    setSendModalClient(client);
    setDeliverySuccess(false);
    setSelectedGalleryId('');
    setCustomMessage(`Hi ${client.name}, your photos are ready to view!`);

    try {
      const res = await fetchApi('/galleries?limit=50&status=PUBLISHED');
      if (res.success && res.data?.galleries) {
        setAvailableGalleries(res.data.galleries);
        if (client.gallery_id) {
          setSelectedGalleryId(client.gallery_id);
        } else if (res.data.galleries.length > 0) {
          setSelectedGalleryId(res.data.galleries[0].id);
        }
      }
    } catch {
      // Handle error
    }
  };

  // Dispatch Delivery Email
  const handleSendDelivery = async () => {
    if (!sendModalClient || !selectedGalleryId) return;

    setSendingDelivery(true);
    try {
      const res = await fetchApi(`/galleries/${selectedGalleryId}/delivery/send`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: sendModalClient.id,
          recipient_email: sendModalClient.email,
          recipient_name: sendModalClient.name,
          custom_message: customMessage,
          send_email: true,
          idempotency_key: `client-${sendModalClient.id}-gal-${selectedGalleryId}-${Date.now()}`,
        }),
      });

      if (res.success) {
        setDeliverySuccess(true);
        setTimeout(() => {
          setSendModalClient(null);
          loadClients(true);
        }, 1200);
      }
    } catch {
      // Error handling
    } finally {
      setSendingDelivery(false);
    }
  };

  // Archive Client
  const handleArchiveClient = async (client: ClientDTO) => {
    if (confirm(`Archive ${client.name}? They will be hidden from the active list.`)) {
      await fetchApi(`/clients/${client.id}`, { method: 'DELETE' });
      loadClients(true);
    }
  };

  // Restore Client
  const handleRestoreClient = async (client: ClientDTO) => {
    await fetchApi(`/clients/${client.id}/restore`, { method: 'POST' });
    loadClients(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Client CRM & Directory"
        subtitle="Manage client relationships, track gallery deliveries, and oversee selections"
      />

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-card-border">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Clients</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-[11px] text-muted mt-1">Registered client directory</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Clients</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
            <p className="text-[11px] text-muted mt-1">Currently engaged clients</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">With Galleries</span>
              <Images className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.with_galleries}</p>
            <p className="text-[11px] text-muted mt-1">Linked to delivered events</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-card-border">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Recent Activity</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.recent_activity}</p>
            <p className="text-[11px] text-muted mt-1">Interactions in past 30 days</p>
          </div>
        </div>

        {/* Controls: Search, Filters, Add Client */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-card-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'HAS_GALLERIES', label: 'Has Galleries' },
                  { id: 'NO_GALLERIES', label: 'No Galleries' },
                  { id: 'RECENT_ACTIVITY', label: 'Recent Activity' },
                  { id: 'ARCHIVED', label: 'Archived' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-card border border-card-border text-muted hover:text-white hover:border-card-border/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Client Button */}
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition shadow-md whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Client List Section */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted">Loading client directory...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-card-border space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No clients found</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {search || statusFilter !== 'ALL'
                  ? 'No clients match your search criteria. Try adjusting your search query or filters.'
                  : 'Start building your client relationship manager by adding your first client.'}
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Client
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl bg-card border border-card-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-card-border bg-background/50 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Client Name</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Galleries</th>
                      <th className="p-4">Tags</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border text-xs">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-card-border/20 transition">
                        {/* Name & Company */}
                        <td className="p-4 pl-6">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white group-hover:text-primary transition">
                                {client.name}
                              </p>
                              {client.company && (
                                <p className="text-[11px] text-muted flex items-center gap-1">
                                  <Building className="h-3 w-3" /> {client.company}
                                </p>
                              )}
                            </div>
                          </Link>
                        </td>

                        {/* Contact */}
                        <td className="p-4 text-muted">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-white">
                              <Mail className="h-3 w-3 text-muted" /> {client.email}
                            </div>
                            {client.phone && (
                              <div className="flex items-center gap-1.5 text-muted">
                                <Phone className="h-3 w-3" /> {client.phone}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Galleries */}
                        <td className="p-4 text-white">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Images className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium">
                                {(client as any)._count?.galleries || ((client as any).gallery ? 1 : 0)} Galleries
                              </span>
                            </div>
                            {(client as any).gallery && (
                              <p className="text-[11px] text-muted truncate max-w-[140px]">
                                {(client as any).gallery.title}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Tags */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {client.tags && client.tags.length > 0 ? (
                              client.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-md bg-background border border-card-border text-[10px] text-muted font-medium"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted italic">No tags</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              client.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : client.status === 'ARCHIVED'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-card border border-card-border text-muted'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="p-4 text-muted">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-muted" />
                            {client.created_at ? formatDate(client.created_at) : '—'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openSendModal(client)}
                              title="Send Gallery Delivery"
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              title="View Client Profile"
                              className="p-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-white hover:border-card-border/80 transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            {client.status === 'ARCHIVED' ? (
                              <button
                                onClick={() => handleRestoreClient(client)}
                                title="Restore Client"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchiveClient(client)}
                                title="Archive Client"
                                className="p-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-red-400 hover:border-red-500/30 transition"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-2xl bg-card border border-card-border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{client.name}</h4>
                        {client.company && (
                          <p className="text-xs text-muted">{client.company}</p>
                        )}
                      </div>
                    </Link>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        client.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-card border border-card-border text-muted'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted pt-2 border-t border-card-border">
                    <div className="flex items-center gap-2 text-white">
                      <Mail className="h-3.5 w-3.5 text-muted" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="text-xs font-semibold text-primary flex items-center gap-1"
                    >
                      View Profile <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => openSendModal(client)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition flex items-center gap-1.5"
                    >
                      <Send className="h-3 w-3" /> Send Gallery
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {nextCursor && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => loadClients(false, nextCursor)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl bg-card border border-card-border text-xs font-semibold text-white hover:border-primary transition disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load Next Clients'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-card-border p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white">Add New Client</h3>
                <p className="text-xs text-muted">Create client contact and manage delivery permissions</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-muted hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Duplicate Detection Alert */}
            {duplicateWarning && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4" /> Possible Duplicate Client Found
                </div>
                <p className="text-[11px] text-amber-200/80">
                  A client named <strong>{duplicateWarning.name}</strong> ({duplicateWarning.email}) already exists in your studio directory.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      router.push(`/dashboard/clients/${duplicateWarning.id}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px] hover:bg-amber-400 transition"
                  >
                    Use Existing Client
                  </button>
                  <button
                    onClick={() => handleCreateClient(true)}
                    className="px-2.5 py-1 rounded-lg bg-background border border-amber-500/30 text-amber-300 text-[11px] hover:bg-card transition"
                  >
                    Create Anyway
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted font-medium">Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onBlur={handleCheckDuplicate}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted font-medium">Company (Optional)</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Sharma Weddings"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted font-medium">Email Address *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onBlur={handleCheckDuplicate}
                    placeholder="rahul@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted font-medium">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    onBlur={handleCheckDuplicate}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Wedding, Engagement, VIP"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Private Internal Notes</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Internal notes (Never visible to client)..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateClient(false)}
                disabled={savingClient}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-2"
              >
                {savingClient && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Gallery Delivery Modal */}
      {sendModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-card-border p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white">Send Gallery Delivery</h3>
                <p className="text-xs text-muted">
                  Deliver professional photo invitation to <strong>{sendModalClient.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSendModalClient(null)}
                className="p-1 rounded-lg text-muted hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {deliverySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Delivery Sent Successfully!</h4>
                <p className="text-xs text-muted">Invitation email has been dispatched to {sendModalClient.email}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-muted font-medium">Select Gallery to Deliver *</label>
                  {availableGalleries.length === 0 ? (
                    <p className="text-muted italic py-2">No published galleries found</p>
                  ) : (
                    <select
                      value={selectedGalleryId}
                      onChange={(e) => setSelectedGalleryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary"
                    >
                      {availableGalleries.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.event_type || 'General'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-muted font-medium">Recipient Email</label>
                  <input
                    type="email"
                    value={sendModalClient.email}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-background/50 border border-card-border text-muted cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted font-medium">Personal Invitation Message</label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Write a custom message for the client..."
                    className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-white focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border space-y-1.5">
                  <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                    Delivery Safety & Privacy Check
                  </span>
                  <div className="space-y-1 text-[11px] text-muted">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" /> Public slug URL link only (zero internal IDs)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400" /> Studio branding and custom greeting included
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setSendModalClient(null)}
                    className="px-4 py-2 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendDelivery}
                    disabled={sendingDelivery || !selectedGalleryId}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingDelivery && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Send Gallery Invitation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
