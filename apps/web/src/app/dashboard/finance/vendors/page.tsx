'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Mail, Phone, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [taxId, setTaxId] = useState('');
  const [termsDays, setTermsDays] = useState('30');
  const [notes, setNotes] = useState('');

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/vendors');
      if (res && !res.error) {
        setVendors(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/finance/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          category: category || undefined,
          tax_id: taxId || undefined,
          payment_terms_days: parseInt(termsDays || '30', 10),
          notes: notes || undefined,
        }),
      });

      if (res.error) throw new Error(res.error.message);
      setShowModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setTaxId('');
      setNotes('');
      loadVendors();
    } catch (err: any) {
      alert(err.message || 'Error creating vendor');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-primary" />
            Vendor & Supplier Directory
          </h1>
          <p className="text-sm text-muted mt-1">
            Maintain print labs, equipment rental houses, studio contractors, payment terms (Net 15/30), and tax IDs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadVendors}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg text-xs font-medium text-white hover:bg-card-border/40 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-black rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </button>
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {v.category || 'General Supplier'}
                </span>
                <h3 className="text-base font-semibold text-white mt-2">{v.name}</h3>
                {v.tax_id && <p className="text-xs text-muted">Tax ID: {v.tax_id}</p>}
              </div>
              <div className="h-9 w-9 rounded-xl bg-card-border/40 flex items-center justify-center text-primary">
                <Building2 className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted pt-2 border-t border-card-border/40">
              {v.email && (
                <div className="flex items-center gap-2 text-white">
                  <Mail className="h-3.5 w-3.5 text-muted" /> {v.email}
                </div>
              )}
              {v.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted" /> {v.phone}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted" /> Payment Terms: Net {v.payment_terms_days || 30} Days
              </div>
            </div>
          </div>
        ))}

        {vendors.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-card-bg border border-card-border text-muted">
            <Building2 className="h-12 w-12 mx-auto text-muted mb-3" />
            <h3 className="text-sm font-semibold text-white">No vendors added yet</h3>
            <p className="text-xs text-muted mt-1">Add labs, equipment rental providers, and 2nd shooters.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Studio Vendor</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WHCC Professional Print Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Print Lab, Gear Rental"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Terms (Days)</label>
                  <input
                    type="number"
                    value={termsDays}
                    onChange={(e) => setTermsDays(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Tax ID / EIN (Optional)</label>
                <input
                  type="text"
                  placeholder="XX-XXXXXXX"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-card-border/40 text-white rounded-lg text-xs font-medium hover:bg-card-border/60 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-semibold hover:bg-primary-hover transition"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
