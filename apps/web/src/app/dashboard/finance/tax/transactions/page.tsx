'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { TaxNavTabs } from '@/components/dashboard/TaxNavTabs';
import { Receipt, Plus, RefreshCw, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, FileText, Check, X, RotateCcw } from 'lucide-react';

export default function TaxTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/tax/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Failed to load tax transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePost = async (id: string) => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch(`/api/finance/tax/transactions/${id}/post`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax transaction posted & linked to General Ledger entry.' });
        loadData();
        setSelectedTx(null);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to post tax transaction.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = prompt('Please enter reversal reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch(`/api/finance/tax/transactions/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax transaction reversed successfully.' });
        loadData();
        setSelectedTx(null);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to reverse transaction.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (minor: number) => {
    const major = (minor || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(major);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Tax Transactions & Postings
          </h1>
          <p className="text-xs text-muted mt-1">
            Auditable subledger records of taxable sales, vendor bills, reverse charges, credit notes, and GL journal links
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card hover:bg-card-border/50 text-xs text-muted hover:text-white transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <FinanceNavTabs />
      <TaxNavTabs />

      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-xl border border-card-border bg-card/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-border/30 text-muted uppercase tracking-wider font-semibold border-b border-card-border">
            <tr>
              <th className="py-3 px-4">Transaction No.</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Party</th>
              <th className="py-3 px-4 text-right">Taxable</th>
              <th className="py-3 px-4 text-right">Tax Total</th>
              <th className="py-3 px-4 text-right">Gross</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-muted">Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-muted">
                  No tax transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-card-border/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-1.5">
                    {tx.transaction_type === 'OUTPUT_TAX' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    {tx.transaction_number}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-card-border/50 text-white">
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">{new Date(tx.tax_date || tx.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-white/90">
                    <div>{tx.party_name || 'Anonymous'}</div>
                    {tx.party_gstin && <div className="text-[10px] font-mono text-muted">{tx.party_gstin}</div>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white/90">{formatCurrency(tx.taxable_amount_minor)}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-primary">{formatCurrency(tx.tax_amount_minor)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatCurrency(tx.total_amount_minor)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      tx.status === 'POSTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : tx.status === 'REVERSED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="px-2.5 py-1 rounded border border-card-border hover:bg-card-border text-[11px] text-white transition-all"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Tax Transaction: {selectedTx.transaction_number}</h3>
                <p className="text-[11px] text-muted">Created: {new Date(selectedTx.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-background border border-card-border space-y-1">
                <span className="text-muted font-medium">Party Information</span>
                <div className="text-white font-semibold">{selectedTx.party_name || 'N/A'}</div>
                <div className="text-muted font-mono">GSTIN: {selectedTx.party_gstin || 'None (B2C)'}</div>
                <div className="text-muted">State Code: {selectedTx.place_of_supply || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-card-border space-y-1">
                <span className="text-muted font-medium">Posting & Ledger Status</span>
                <div className="text-white font-semibold">Status: {selectedTx.status}</div>
                <div className="text-muted font-mono truncate">GL Entry: {selectedTx.accounting_journal_entry_id || 'Not Posted'}</div>
                <div className="text-muted">Inter-state: {selectedTx.is_inter_state ? 'Yes (IGST)' : 'No (CGST+SGST)'}</div>
              </div>
            </div>

            {/* Tax Splits */}
            <div className="p-3 rounded-lg bg-background/50 border border-card-border space-y-2 text-xs">
              <h4 className="font-semibold text-white">Tax Splits & Minor Units</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-card border border-card-border">
                  <span className="text-muted block text-[10px]">CGST</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(selectedTx.cgst_amount_minor || 0)}</span>
                </div>
                <div className="p-2 rounded bg-card border border-card-border">
                  <span className="text-muted block text-[10px]">SGST</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(selectedTx.sgst_amount_minor || 0)}</span>
                </div>
                <div className="p-2 rounded bg-card border border-card-border">
                  <span className="text-muted block text-[10px]">IGST</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(selectedTx.igst_amount_minor || 0)}</span>
                </div>
                <div className="p-2 rounded bg-card border border-card-border">
                  <span className="text-muted block text-[10px]">CESS</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(selectedTx.cess_amount_minor || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-card-border">
              <div className="flex gap-2">
                {selectedTx.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePost(selectedTx.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {actionLoading ? 'Posting...' : 'Post to General Ledger'}
                  </button>
                )}
                {selectedTx.status === 'POSTED' && (
                  <button
                    onClick={() => handleReverse(selectedTx.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reverse Transaction
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-lg border border-card-border text-xs text-muted hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
