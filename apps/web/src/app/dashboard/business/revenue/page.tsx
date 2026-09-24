'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Download,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Ban,
  Calendar,
  DollarSign,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import {
  StudioBusinessTransactionDTO,
  BusinessTransactionType,
  BusinessTransactionStatus,
} from '@pixmatch/types';

export default function BusinessRevenuePage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<StudioBusinessTransactionDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<StudioBusinessTransactionDTO | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: BusinessTransactionType.INCOME,
    category: 'Wedding Photography',
    amount: '',
    currency: studio?.currency || 'USD',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: '',
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '100');

      const res = await fetch(`/api/v1/business/transactions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token, filterType]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);
      const numAmount = parseFloat(formData.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid positive transaction amount');
      }

      const res = await fetch('/api/v1/business/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({
          ...formData,
          amount: numAmount,
          currency: studio?.currency || 'USD',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create transaction');
      }

      setIsCreateOpen(false);
      setFormData({
        type: BusinessTransactionType.INCOME,
        category: 'Wedding Photography',
        amount: '',
        currency: studio?.currency || 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'Bank Transfer',
        reference_number: '',
        notes: '',
      });
      fetchTransactions();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidTransaction = async () => {
    if (!selectedTx || !voidReason.trim()) {
      setActionError('A void reason is required');
      return;
    }
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/v1/business/transactions/${selectedTx.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to void transaction');
      }

      setIsVoidOpen(false);
      setSelectedTx(null);
      setVoidReason('');
      fetchTransactions();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCsv = () => {
    const url = `/api/v1/business/transactions/export/csv`;
    window.open(url, '_blank');
  };

  const currency = studio?.currency || 'USD';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Revenue & Expense Ledger
          </h1>
          <p className="text-sm text-muted mt-1">
            Complete financial audit trail with multi-tenant isolation, voiding, and formula-safe CSV export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-card-border text-white hover:bg-card-border/40 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setActionError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      <BusinessNavTabs />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-card-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['ALL', 'INCOME', 'EXPENSE', 'REFUND'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-white hover:bg-card-border/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search category, client, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-card-border/30 border border-card-border text-xs text-white placeholder:text-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-white">No transactions found</p>
            <p className="text-xs text-muted">Record income from client shoots or operating expenses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card-border/20 border-b border-card-border text-muted font-semibold">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Client / Gallery</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-card-border/20 transition ${
                      tx.is_void ? 'opacity-50 bg-red-500/5' : ''
                    }`}
                  >
                    <td className="p-3.5 font-mono text-muted whitespace-nowrap">
                      {new Date(tx.transaction_date).toISOString().split('T')[0]}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'EXPENSE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {tx.type === 'INCOME' ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-white">{tx.category}</td>
                    <td className="p-3.5 font-bold font-mono">
                      <span
                        className={
                          tx.type === 'INCOME'
                            ? 'text-emerald-400'
                            : tx.type === 'EXPENSE'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {tx.currency} {tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted">
                      {tx.client_name || tx.gallery_title ? (
                        <span>
                          {tx.client_name && <strong>{tx.client_name}</strong>}
                          {tx.client_name && tx.gallery_title && ' • '}
                          {tx.gallery_title}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 text-muted">{tx.payment_method || '—'}</td>
                    <td className="p-3.5">
                      {tx.is_void ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                          VOIDED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-card-border/40 text-muted capitalize">
                          {tx.status.toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {!tx.is_void && (
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setVoidReason('');
                            setActionError(null);
                            setIsVoidOpen(true);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Transaction */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <h3 className="text-base font-bold text-white">Record Business Transaction</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted hover:text-white">
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Transaction Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  >
                    <option value={BusinessTransactionType.INCOME}>INCOME (Client Payment)</option>
                    <option value={BusinessTransactionType.EXPENSE}>EXPENSE (Cost / Supplier)</option>
                    <option value={BusinessTransactionType.REFUND}>REFUND (Client Return)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wedding, Equipment, Second Shooter"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Payment Method</label>
                  <input
                    type="text"
                    placeholder="Bank Transfer, Cash, Card"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Reference / Invoice #</label>
                  <input
                    type="text"
                    placeholder="INV-2026-001"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Description / Shoot Details</label>
                <textarea
                  rows={2}
                  placeholder="Full wedding package coverage + drone footage"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded-lg bg-card-border/30 border border-card-border text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-md"
                >
                  {submitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Void Transaction */}
      {isVoidOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Void Financial Transaction</h3>
                <p className="text-[11px] text-muted">
                  {selectedTx.category} ({selectedTx.currency} {selectedTx.amount.toFixed(2)})
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Voiding cancels this entry from net revenue calculations while permanently preserving an immutable audit log.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Void Reason (Required)
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Accidental duplicate entry, customer cheque bounced"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-card-border/30 border border-card-border text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-card-border">
              <button
                onClick={() => setIsVoidOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidTransaction}
                disabled={submitting || !voidReason.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition shadow-md"
              >
                {submitting ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
