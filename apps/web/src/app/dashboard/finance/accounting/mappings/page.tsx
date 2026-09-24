'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  Sliders,
  Save,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';

interface Mapping {
  id: string;
  event_type: string;
  debit_account: { id: string; code: string; name: string };
  credit_account: { id: string; code: string; name: string };
  description?: string;
  is_active: boolean;
}

export default function AccountMappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchMappingsAndAccounts = async () => {
    try {
      setLoading(true);
      const [mapsRes, accsRes] = await Promise.all([
        fetch('/api/finance/accounting/mappings'),
        fetch('/api/finance/accounting/accounts'),
      ]);

      if (mapsRes.ok) {
        const mapsData = await mapsRes.json();
        setMappings(mapsData.mappings || []);
      }
      if (accsRes.ok) {
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappingsAndAccounts();
  }, []);

  const handleUpdateMapping = async (id: string, debitAccountId: string, creditAccountId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/finance/accounting/mappings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debit_account_id: debitAccountId,
          credit_account_id: creditAccountId,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'System accounting mapping updated successfully', type: 'success' });
        fetchMappingsAndAccounts();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to update mapping', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error updating mapping', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getEventDescription = (eventType: string) => {
    switch (eventType) {
      case 'CLIENT_PAYMENT':
        return 'Posted when a client completes a payment on an invoice or booking deposit.';
      case 'INVOICE_ISSUED':
        return 'Posted when an operational client invoice/receivable is finalized.';
      case 'EXPENSE_APPROVED':
        return 'Posted when an operational studio expense is approved and accounts payable recognized.';
      case 'EXPENSE_PAID':
        return 'Posted when a studio expense or vendor bill payment is settled.';
      case 'PRINT_ORDER_REVENUE':
        return 'Posted when client print laboratory or fulfillment orders are confirmed.';
      case 'PRINT_FULFILLMENT_COST':
        return 'Posted when print lab manufacturing or shipping COGS are recognized.';
      case 'REFUND_ISSUED':
        return 'Posted when client refunds or transaction reversals are issued.';
      default:
        return 'Operational event mapping to general ledger accounts.';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            System Account Mappings
          </h1>
          <p className="text-sm text-muted">
            Configure how operational events (Payments, Invoices, Expenses, COGS) automatically map to double-entry general ledger accounts.
          </p>
        </div>
        <button
          onClick={fetchMappingsAndAccounts}
          className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {message && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
        }`}>
          {message.text}
        </div>
      )}

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/30 flex items-start gap-3 text-xs text-blue-300">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Architectural Principle:</span> Operational systems (Phase 18, 21, 22, 26, 33) remain authoritative. When operational events occur, these mappings determine which Debit and Credit ledger accounts receive the double-entry accounting records.
        </div>
      </div>

      {/* Mappings Grid / Table */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4 w-52">Operational Event</th>
                <th className="py-3 px-4">Event Purpose & Impact</th>
                <th className="py-3 px-4 w-60">Debit Account (DR)</th>
                <th className="py-3 px-4 w-60">Credit Account (CR)</th>
                <th className="py-3 px-4 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">
                    Loading mappings...
                  </td>
                </tr>
              ) : mappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">
                    No mappings configured. Standard default mappings will be initialized on first operational transaction.
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-dark/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {m.event_type}
                    </td>
                    <td className="py-3.5 px-4 text-muted max-w-xs">
                      {getEventDescription(m.event_type)}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        defaultValue={m.debit_account?.id}
                        onChange={(e) => handleUpdateMapping(m.id, e.target.value, m.credit_account?.id)}
                        className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-primary"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            DR {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        defaultValue={m.credit_account?.id}
                        onChange={(e) => handleUpdateMapping(m.id, m.debit_account?.id, e.target.value)}
                        className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-rose-400 font-mono focus:outline-none focus:border-primary"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            CR {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
