'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Save,
  X,
  Code2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { IClientMessageTemplate } from '@pixmatch/types';

const ALLOWED_VARS = [
  'clientName',
  'projectName',
  'galleryName',
  'orderNumber',
  'studioName',
  'deliveryStatus',
];

export default function MessageTemplatesPage() {
  const { token, studio } = useAuth();
  const [templates, setTemplates] = useState<IClientMessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IClientMessageTemplate | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/communication/templates?search=${search}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.data.items || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && studio?.id) {
      fetchTemplates();
    }
  }, [token, studio?.id, search]);

  const handleOpenModal = (template?: IClientMessageTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setSubjectTemplate(template.subject_template || '');
      setBodyTemplate(template.body_template);
      setCategory(template.category);
      setIsDefault(template.is_default);
    } else {
      setEditingTemplate(null);
      setName('');
      setSubjectTemplate('');
      setBodyTemplate('');
      setCategory('GENERAL');
      setIsDefault(false);
    }
    setError(null);
    setShowModal(true);
  };

  const handleInsertVariable = (varName: string) => {
    const chip = `{{${varName}}}`;
    setBodyTemplate((prev) => `${prev} ${chip} `);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bodyTemplate) {
      setError('Template name and body are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingTemplate
        ? `/api/v1/communication/templates/${editingTemplate.id}`
        : '/api/v1/communication/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          name,
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
          category,
          is_default: isDefault,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to save template');
      }

      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/v1/communication/templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch {
      // Non-blocking
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/communications"
            className="p-2 rounded-xl bg-card hover:bg-card-hover border border-card-border text-muted hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Message Templates
            </h1>
            <p className="text-xs text-muted">
              Standardized email and portal communication templates with automatic merge variables
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by name or content..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-card-border text-xs text-white placeholder:text-muted/60 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-muted">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-muted">No templates found.</div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-4 rounded-2xl bg-card border border-card-border hover:border-card-border/80 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    {tpl.category}
                  </span>
                  {tpl.is_default && (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Default
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white mt-2">{tpl.name}</h3>
                {tpl.subject_template && (
                  <p className="text-[11px] text-primary/90 mt-0.5 font-mono">Subject: {tpl.subject_template}</p>
                )}
                <p className="text-xs text-muted/90 line-clamp-3 mt-1 leading-relaxed">{tpl.body_template}</p>

                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {tpl.variables.map((v) => (
                      <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 border border-white/10">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-card-border text-[11px] text-muted">
                <span>Applied {tpl.usage_count} times</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(tpl)}
                    className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-white transition"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-card-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="font-bold text-sm text-white">
                {editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gallery Delivery Ready Notification"
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="GENERAL">General</option>
                  <option value="INQUIRY_RESPONSE">Inquiry Response</option>
                  <option value="BOOKING_CONFIRMATION">Booking Confirmation</option>
                  <option value="PROOFING_READY">Proofing Ready</option>
                  <option value="ORDER_UPDATE">Order Update</option>
                  <option value="DELIVERY_NOTIFICATION">Delivery Notification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Subject Template (optional)</label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="Your photos for {{projectName}} are ready!"
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-muted">Body Template</label>
                  <span className="text-[10px] text-muted">Click a variable chip to insert:</span>
                </div>

                {/* Variable Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ALLOWED_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="px-2 py-0.5 rounded-md bg-card-hover hover:bg-primary/20 text-[11px] font-mono text-white/80 hover:text-primary border border-card-border transition"
                    >
                      + {`{{${v}}}`}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  placeholder="Hi {{clientName}}, your photos for {{galleryName}} are now ready to view..."
                  className="w-full p-2.5 rounded-xl bg-background border border-card-border text-xs text-white focus:outline-none focus:border-primary resize-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-card-border bg-background text-primary"
                />
                <label htmlFor="is_default" className="text-xs text-white font-medium cursor-pointer">
                  Set as default template for category &quot;{category}&quot;
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-card-hover border border-card-border text-xs font-medium text-muted hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
