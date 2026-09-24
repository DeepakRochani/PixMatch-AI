'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  DollarSign,
  Save,
  Send,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Calendar,
  User,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import { CreateProposalDTO, CreateProposalItemDTO } from '@pixmatch/types';

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface LeadOption {
  id: string;
  name: string;
  service_type?: string;
  estimated_value?: number;
}

function NewProposalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, studio } = useAuth();

  const prefillClientId = searchParams?.get('clientId') || '';
  const prefillLeadId = searchParams?.get('leadId') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form State
  const [clientId, setClientId] = useState(prefillClientId);
  const [leadId, setLeadId] = useState(prefillLeadId);
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. 50% retainer required upon proposal acceptance to secure event date.\n2. Balance due on or before event date.\n3. High-resolution digital gallery delivered within 4 weeks.'
  );

  const [items, setItems] = useState<CreateProposalItemDTO[]>([
    {
      title: 'Full Day Event Coverage',
      description: 'Up to 8 hours continuous shooting with primary & second photographer',
      quantity: 1,
      unit_price: 2500,
      is_optional: false,
      is_selected: true,
      sort_order: 0,
    },
    {
      title: 'Drone Aerial Photography & 4K Highlights',
      description: 'FAA certified pilot coverage of venue and outdoor moments',
      quantity: 1,
      unit_price: 600,
      is_optional: true,
      is_selected: false,
      sort_order: 1,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Clients and Leads
  useEffect(() => {
    if (!token || !studio?.id) return;
    const loadData = async () => {
      try {
        setLoadingClients(true);
        const [clientsRes, leadsRes] = await Promise.all([
          fetch('/api/v1/clients', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
          fetch('/api/v1/operations/leads', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
        ]);

        const clientsJson = await clientsRes.json();
        const leadsJson = await leadsRes.json();

        if (clientsJson.success) {
          setClients(clientsJson.data || []);
        }
        if (leadsJson.success) {
          setLeads(leadsJson.data || []);
        }
      } catch (err: any) {
        console.warn('Error loading clients/leads:', err);
      } finally {
        setLoadingClients(false);
      }
    };
    loadData();
  }, [token, studio?.id]);

  // Handle lead auto-fill
  useEffect(() => {
    if (leadId && leads.length > 0) {
      const selected = leads.find((l) => l.id === leadId);
      if (selected) {
        if (!title) {
          setTitle(`${selected.name} — ${selected.service_type || 'Photography'} Proposal`);
        }
        if (selected.estimated_value && items.length === 0) {
          setItems([
            {
              title: `${selected.service_type || 'Photography'} Package`,
              description: 'Custom photography package based on inquiry requirements',
              quantity: 1,
              unit_price: selected.estimated_value,
              is_optional: false,
              is_selected: true,
              sort_order: 0,
            },
          ]);
        }
      }
    }
  }, [leadId, leads]);

  // Calculations
  const subtotal = items.reduce((acc, item) => {
    if (!item.is_optional || item.is_selected) {
      return acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }
    return acc;
  }, 0);

  const totalAmount = Math.max(0, subtotal - Number(discountAmount || 0) + Number(taxAmount || 0));

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        title: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        is_optional: false,
        is_selected: true,
        sort_order: items.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateProposalItemDTO, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async (andSend: boolean = false) => {
    if (!token || !studio?.id) return;
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!title.trim()) {
      setError('Proposal title is required');
      return;
    }
    if (items.length === 0 || items.some((it) => !it.title.trim())) {
      setError('All proposal items must have a title');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateProposalDTO = {
        client_id: clientId,
        lead_id: leadId || undefined,
        title: title.trim(),
        currency,
        discount_amount: Number(discountAmount) || 0,
        tax_amount: Number(taxAmount) || 0,
        valid_until: validUntil || undefined,
        notes: notes.trim() || undefined,
        terms_and_conditions: termsAndConditions.trim() || undefined,
        items: items.map((it, idx) => ({
          ...it,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          sort_order: idx,
        })),
      };

      const res = await fetch('/api/v1/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio.id,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to create proposal');
      }

      const created = json.data;

      if (andSend && created?.id) {
        await fetch(`/api/v1/proposals/${created.id}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio.id,
          },
          body: JSON.stringify({}),
        });
      }

      router.push(`/dashboard/operations/proposals/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-card-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/operations/proposals"
            className="p-2 rounded-lg bg-card/60 hover:bg-card-border/40 text-muted hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create New Proposal
            </h1>
            <p className="text-xs text-muted">Draft a quote with itemized packages, optional add-ons, and terms.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card/60 hover:bg-card text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
          >
            {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            Create & Send
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Details & Line Items) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Proposal Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Proposal Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Photography Collection — Sarah & Michael"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Select Client *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose a Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Link to Lead (Optional)</label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- No Linked Lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.service_type || 'Inquiry'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Deliverables Table */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Deliverables & Pricing Items
                </h2>
                <p className="text-[11px] text-muted">Add packages, shooting hours, and optional client add-ons.</p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card/60 hover:bg-card-border/40 text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-card/60 border border-card-border/70 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Item Title (e.g. 6 Hours Coverage)"
                      value={item.title}
                      onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-xs font-bold text-white placeholder-muted focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Description of deliverables, inclusions, photographer count, resolution..."
                    value={item.description || ''}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-card-border/40 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1 bg-background border border-card-border rounded-lg text-center text-white"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-muted">Unit Price ($):</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 bg-background border border-card-border rounded-lg text-right text-white font-mono"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-muted hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={item.is_optional || false}
                          onChange={(e) => handleItemChange(index, 'is_optional', e.target.checked)}
                          className="rounded border-card-border text-primary focus:ring-0"
                        />
                        <span>Optional Add-on</span>
                      </label>
                    </div>

                    <div className="font-mono font-bold text-white text-xs">
                      ${((Number(item.quantity) || 1) * (Number(item.unit_price) || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Notes Card */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-3 text-xs">
            <h2 className="text-sm font-bold text-white">Terms & Conditions & Notes</h2>

            <div>
              <label className="block text-muted font-medium mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">Internal Notes (Visible only to studio)</label>
              <textarea
                rows={2}
                placeholder="Client mentioned outdoor sunset session preferred..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Right Column (Summary & Calculation Card) */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card/50 border border-card-border space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-card-border">Proposal Summary</h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal (Selected Items)</span>
                <span className="font-mono font-bold text-white">${subtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Discount ($)</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-background border border-card-border rounded text-right text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Tax / VAT ($)</span>
                <input
                  type="number"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-background border border-card-border rounded text-right text-white font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-card-border flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Amount</span>
                <span className="text-xl font-black text-primary font-mono">${totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-card-border text-xs space-y-2">
              <label className="block text-muted font-medium">Valid Until (Expiry Date)</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-4 space-y-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="w-full py-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Publish & Send Link
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="w-full py-2 bg-card/60 hover:bg-card text-muted hover:text-white text-xs font-semibold rounded-xl border border-card-border transition-all"
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted">Loading proposal editor...</p>
          </div>
        </div>
      }
    >
      <NewProposalForm />
    </Suspense>
  );
}
