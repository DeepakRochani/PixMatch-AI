'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileSignature,
  ArrowLeft,
  Save,
  Send,
  RefreshCw,
  AlertCircle,
  Layers,
  Sparkles,
  Eye,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  StudioContractCategory,
  StudioContractTemplateDTO,
  CreateContractDTO,
} from '@pixmatch/types';

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface ProposalOption {
  id: string;
  proposal_number: string;
  title: string;
  total_amount: number;
  client_id: string;
}

interface ProjectOption {
  id: string;
  title: string;
  client_id: string;
}

function NewContractForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, studio } = useAuth();

  const prefillProposalId = searchParams?.get('proposalId') || '';
  const prefillClientId = searchParams?.get('clientId') || '';
  const prefillTemplateId = searchParams?.get('templateId') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [templates, setTemplates] = useState<StudioContractTemplateDTO[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form
  const [clientId, setClientId] = useState(prefillClientId);
  const [proposalId, setProposalId] = useState(prefillProposalId);
  const [projectId, setProjectId] = useState('');
  const [templateId, setTemplateId] = useState(prefillTemplateId);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StudioContractCategory>(StudioContractCategory.WEDDING);
  const [bodyContent, setBodyContent] = useState('');
  const [activePreview, setActivePreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !studio?.id) return;
    const loadAll = async () => {
      try {
        setLoadingData(true);
        const [cRes, pRes, projRes, tplRes] = await Promise.all([
          fetch('/api/v1/clients', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
          fetch('/api/v1/proposals', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
          fetch('/api/v1/operations/projects', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
          fetch('/api/v1/contracts/templates', {
            headers: { Authorization: `Bearer ${token}`, 'x-studio-id': studio.id },
          }),
        ]);

        const cJson = await cRes.json();
        const pJson = await pRes.json();
        const projJson = await projRes.json();
        const tplJson = await tplRes.json();

        if (cJson.success) setClients(cJson.data || []);
        if (pJson.success) setProposals(pJson.data || []);
        if (projJson.success) setProjects(projJson.data || []);
        if (tplJson.success) {
          const tpls = tplJson.data || [];
          setTemplates(tpls);
          if (tpls.length > 0 && !bodyContent) {
            const chosen = prefillTemplateId ? tpls.find((t: any) => t.id === prefillTemplateId) : tpls[0];
            if (chosen) {
              setTemplateId(chosen.id);
              setCategory(chosen.category);
              setBodyContent(chosen.body_content);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading initial contract data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    loadAll();
  }, [token, studio?.id]);

  // Handle template selection
  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const chosen = templates.find((t) => t.id === id);
    if (chosen) {
      setBodyContent(chosen.body_content);
      setCategory(chosen.category);
    }
  };

  // Handle proposal auto-link
  useEffect(() => {
    if (proposalId && proposals.length > 0) {
      const prop = proposals.find((p) => p.id === proposalId);
      if (prop) {
        if (!clientId) setClientId(prop.client_id);
        if (!title) setTitle(`Photography Agreement — ${prop.title}`);
      }
    }
  }, [proposalId, proposals]);

  const handleSubmit = async (andSend: boolean = false) => {
    if (!token || !studio?.id) return;
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!title.trim()) {
      setError('Contract title is required');
      return;
    }
    if (!bodyContent.trim()) {
      setError('Contract body content cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateContractDTO = {
        client_id: clientId,
        proposal_id: proposalId || undefined,
        project_id: projectId || undefined,
        template_id: templateId || undefined,
        title: title.trim(),
        category,
        body_content: bodyContent,
      };

      const res = await fetch('/api/v1/contracts', {
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
        throw new Error(json.error || 'Failed to create contract');
      }

      const created = json.data;

      if (andSend && created?.id) {
        await fetch(`/api/v1/contracts/${created.id}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-studio-id': studio.id,
          },
          body: JSON.stringify({}),
        });
      }

      router.push(`/dashboard/operations/contracts/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating contract');
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
            href="/dashboard/operations/contracts"
            className="p-2 rounded-lg bg-card/60 hover:bg-card-border/40 text-muted hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-emerald-400" />
              Draft Contract Agreement
            </h1>
            <p className="text-xs text-muted">Generate a legally binding agreement with dynamic variable interpolation.</p>
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
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all"
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details & Markdown Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Contract Scope & Client
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Contract Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Photography Agreement — Sarah & Michael"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-card-border rounded-lg text-white placeholder-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Client *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Agreement Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StudioContractCategory)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    {Object.values(StudioContractCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Link to Accepted Proposal</label>
                  <select
                    value={proposalId}
                    onChange={(e) => setProposalId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- No Linked Proposal --</option>
                    {proposals.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.proposal_number} — {p.title} (${p.total_amount?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Load Template</label>
                  <select
                    value={templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title} ({tpl.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Body Markdown Editor */}
          <div className="p-5 rounded-2xl bg-card/40 border border-card-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Agreement Body (Markdown)
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePreview(!activePreview)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-card/60 hover:bg-card-border/40 text-white text-xs font-semibold rounded-lg border border-card-border transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {activePreview ? 'Edit Raw Text' : 'Render Preview'}
                </button>
              </div>
            </div>

            {activePreview ? (
              <div className="p-4 rounded-xl bg-background/80 border border-card-border text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {bodyContent}
              </div>
            ) : (
              <textarea
                rows={16}
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                className="w-full px-3.5 py-3 bg-background border border-card-border rounded-xl text-xs text-white font-mono placeholder-muted focus:outline-none focus:border-primary leading-relaxed"
              />
            )}
          </div>
        </div>

        {/* Right Column: Whitelisted Variables Assistant */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card/50 border border-card-border space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-card-border flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Dynamic Placeholders
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              These tags are automatically filled with client and studio data upon sending and e-signing.
            </p>

            <div className="space-y-1.5 text-xs">
              {[
                { tag: '{{studio_name}}', desc: 'Studio Business Name' },
                { tag: '{{client_name}}', desc: 'Client Full Name' },
                { tag: '{{client_email}}', desc: 'Client Email' },
                { tag: '{{project_name}}', desc: 'Project / Shoot Title' },
                { tag: '{{project_date}}', desc: 'Event / Session Date' },
                { tag: '{{project_location}}', desc: 'Venue / Shoot Location' },
                { tag: '{{proposal_number}}', desc: 'Linked Quote #' },
                { tag: '{{contract_number}}', desc: 'Agreement #' },
                { tag: '{{total_amount}}', desc: 'Agreed Fee with Currency' },
                { tag: '{{current_date}}', desc: 'Today\'s Date' },
              ].map((v) => (
                <div
                  key={v.tag}
                  onClick={() => setBodyContent((prev) => prev + ` ${v.tag}`)}
                  className="p-2 rounded-lg bg-card/60 hover:bg-card-border/40 border border-card-border/60 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <code className="text-primary group-hover:text-white font-mono text-[11px]">{v.tag}</code>
                  <span className="text-muted text-[10px]">{v.desc}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-card-border">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Publish & Send for E-Sign
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted">Loading contract editor...</p>
          </div>
        </div>
      }
    >
      <NewContractForm />
    </Suspense>
  );
}
