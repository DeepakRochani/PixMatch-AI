'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Settings,
  ListFilter,
  RefreshCw,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

interface TemplateItem {
  id: string;
  template_key: string;
  name: string;
  category: string;
  description: string;
  required_variables: string[];
  sample_subject: string;
  sample_html: string;
  sample_text: string;
  is_active: boolean;
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Test Email Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<TemplateItem[]>('/admin/email/templates');
      if (res.success && res.data) {
        setTemplates(res.data);
        if (res.data.length > 0 && !activeTemplate) {
          setActiveTemplate(res.data[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filtered = selectedCategory === 'ALL'
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate || !testRecipient) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetchApi(`/admin/email/templates/${activeTemplate.template_key}/test`, {
        method: 'POST',
        body: JSON.stringify({ recipient: testRecipient }),
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `Test email "${activeTemplate.template_key}" dispatched to ${testRecipient}`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error?.message || 'Failed to dispatch test email',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error executing test dispatch',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-amber-400" /> Email Templates & Preview
          </h1>
          <p className="text-xs text-muted mt-1">
            Production templates with safe HTML escaping, studio branding, and controlled test dispatch.
          </p>
        </div>

        <button
          onClick={() => loadTemplates()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#131B2A] border border-card-border/80 text-muted hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3 overflow-x-auto">
        <Link
          href="/dashboard/admin/email"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition"
        >
          Overview
        </Link>
        <Link
          href="/dashboard/admin/email/logs"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <ListFilter className="h-3.5 w-3.5" /> Delivery Logs
        </Link>
        <Link
          href="/dashboard/admin/email/templates"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" /> Templates
        </Link>
        <Link
          href="/dashboard/admin/email/settings"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white hover:bg-card-border/30 transition flex items-center gap-1.5"
        >
          <Settings className="h-3.5 w-3.5" /> Provider Settings
        </Link>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2">
        {['ALL', 'GALLERY', 'TRANSACTIONAL', 'BILLING', 'SYSTEM'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === cat
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#0E1422] border border-card-border text-muted hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Split: Template List & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates Sidebar */}
        <div className="lg:col-span-4 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
          {filtered.map((tmpl) => {
            const isSelected = activeTemplate?.template_key === tmpl.template_key;
            return (
              <div
                key={tmpl.template_key}
                onClick={() => setActiveTemplate(tmpl)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#131B2A] border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-[#0E1422] border-card-border hover:border-card-border/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white tracking-tight">{tmpl.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-card-border/40 text-amber-300">
                    {tmpl.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1 line-clamp-2">{tmpl.description}</p>
                <div className="mt-2 text-[10px] font-mono text-muted/70 truncate">
                  Key: {tmpl.template_key}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-8 rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-5 shadow-2xl">
          {activeTemplate ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-card-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    {activeTemplate.name}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Subject: <span className="text-white font-medium">{activeTemplate.sample_subject}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setTestRecipient('');
                    setTestResult(null);
                    setTestModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
                >
                  <Send className="h-3.5 w-3.5" /> Send Test Email
                </button>
              </div>

              {/* Sandboxed Iframe Preview */}
              <div className="rounded-xl border border-card-border bg-[#0B0F19] overflow-hidden">
                <div className="p-2.5 bg-[#080C14] border-b border-card-border flex items-center justify-between text-[11px] text-muted font-mono">
                  <span>SANDBOXED HTML PREVIEW</span>
                  <span className="text-emerald-400 font-semibold">100% XSS-Safe</span>
                </div>
                <iframe
                  srcDoc={activeTemplate.sample_html}
                  title="Template Preview"
                  sandbox="allow-same-origin"
                  className="w-full h-[540px] bg-transparent border-0"
                />
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-muted">
              Select a template on the left to preview its compiled layout.
            </div>
          )}
        </div>
      </div>

      {/* Send Test Email Modal */}
      {testModalOpen && activeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1422] border border-card-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-400" /> Dispatch Test Email
              </h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-muted hover:text-white text-xs font-semibold px-2 py-1 rounded-lg bg-card-border/40"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Target Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A0F] border border-card-border text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500/50 font-mono"
                />
                <p className="text-[11px] text-muted">
                  Will dispatch template <span className="text-amber-300 font-mono">{activeTemplate.template_key}</span> with mock test data.
                </p>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card-border/40 hover:bg-card-border text-xs font-medium text-white transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest || !testRecipient}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black text-xs font-semibold transition shadow-md shadow-amber-500/20"
                >
                  {isSendingTest ? 'Sending...' : 'Confirm & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
