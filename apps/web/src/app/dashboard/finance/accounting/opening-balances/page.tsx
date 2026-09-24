'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';

export default function OpeningBalancesPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [lines, setLines] = useState<Array<{ account_id: string; debit_dollars: string; credit_dollars: string; description: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/accounting/accounts');
      if (res.ok) {
        const data = await res.json();
        const accs = data.accounts || [];
        setAccounts(accs);
        // Default 2 balanced rows: Cash (1000) and Owner Equity (3000)
        const cashAcc = accs.find((a: any) => a.code === '1000') || accs[0];
        const equityAcc = accs.find((a: any) => a.code === '3000') || accs[1] || accs[0];

        setLines([
          {
            account_id: cashAcc?.id || '',
            debit_dollars: '10000.00',
            credit_dollars: '',
            description: 'Initial studio cash balance',
          },
          {
            account_id: equityAcc?.id || '',
            debit_dollars: '',
            credit_dollars: '10000.00',
            description: 'Initial owner equity contribution',
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        account_id: accounts[0]?.id || '',
        debit_dollars: '',
        credit_dollars: '',
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      alert('Opening balance entry requires at least 2 lines.');
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: string) => {
    const updated = [...lines];
    if (field === 'debit_dollars' && value !== '') {
      updated[idx].debit_dollars = value;
      updated[idx].credit_dollars = '';
    } else if (field === 'credit_dollars' && value !== '') {
      updated[idx].credit_dollars = value;
      updated[idx].debit_dollars = '';
    } else {
      (updated[idx] as any)[field] = value;
    }
    setLines(updated);
  };

  const totalDebitMinor = lines.reduce((acc, l) => {
    const val = parseFloat(l.debit_dollars) || 0;
    return acc + Math.round(val * 100);
  }, 0);

  const totalCreditMinor = lines.reduce((acc, l) => {
    const val = parseFloat(l.credit_dollars) || 0;
    return acc + Math.round(val * 100);
  }, 0);

  const differenceMinor = Math.abs(totalDebitMinor - totalCreditMinor);
  const isBalanced = totalDebitMinor > 0 && totalDebitMinor === totalCreditMinor && lines.length >= 2;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSubmitOpeningBalances = async () => {
    if (!isBalanced) return;
    if (!confirm('Are you sure you want to POST opening balances? This creates an immutable opening balance journal entry in the General Ledger.')) return;

    try {
      setSaving(true);
      const balances = lines
        .map((l) => ({
          account_id: l.account_id,
          debit_minor: Math.round((parseFloat(l.debit_dollars) || 0) * 100),
          credit_minor: Math.round((parseFloat(l.credit_dollars) || 0) * 100),
          description: l.description,
        }))
        .filter((l) => l.debit_minor > 0 || l.credit_minor > 0);

      const res = await fetch('/api/finance/accounting/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_date: openingDate,
          currency,
          balances,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ text: 'Opening balances posted to General Ledger successfully!', type: 'success' });
        window.location.href = `/dashboard/finance/accounting/journal-entries/${data.journal_entry.id}`;
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to post opening balances', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error posting opening balances', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Opening Balances
          </h1>
          <p className="text-sm text-muted">
            Establish initial double-entry asset, liability, and equity balances for your studio.
          </p>
        </div>
        <button
          onClick={handleSubmitOpeningBalances}
          disabled={saving || !isBalanced}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {saving ? 'Posting...' : 'Post Opening Balances'}
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

      {/* Date and Currency Settings */}
      <div className="p-4 bg-card border border-card-border/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Effective Opening Date</label>
          <input
            type="date"
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
            className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="INR">INR - Indian Rupee</option>
          </select>
        </div>
      </div>

      {/* Balancing Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isBalanced
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-bold">
              {isBalanced ? 'OPENING BALANCES ARE BALANCED' : 'OPENING BALANCES OUT OF BALANCE'}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isBalanced
                ? 'Total Debits match Total Credits exactly.'
                : `Debits and Credits differ by ${formatCurrency(differenceMinor)}. Please balance before posting.`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div>
            <span className="text-muted text-[10px] block uppercase">Total Debit</span>
            <span className="font-bold text-white">{formatCurrency(totalDebitMinor)}</span>
          </div>
          <div>
            <span className="text-muted text-[10px] block uppercase">Total Credit</span>
            <span className="font-bold text-white">{formatCurrency(totalCreditMinor)}</span>
          </div>
          <div>
            <span className="text-muted text-[10px] block uppercase">Difference</span>
            <span className={`font-bold ${differenceMinor === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(differenceMinor)}
            </span>
          </div>
        </div>
      </div>

      {/* Lines Table */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-card-border/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Opening Accounts
          </h2>
          <button
            onClick={handleAddLine}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card-border/40 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add Account
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-72">Account</th>
                <th className="py-3 px-4">Line Memo / Description</th>
                <th className="py-3 px-4 w-36 text-right">Debit ($)</th>
                <th className="py-3 px-4 w-36 text-right">Credit ($)</th>
                <th className="py-3 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-surface-dark/40 transition-colors">
                  <td className="py-3 px-4 text-center font-mono text-muted">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <select
                      value={line.account_id}
                      onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                      className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.account_type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="e.g. Initial balance from legacy bank statement..."
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.debit_dollars}
                      onChange={(e) => handleLineChange(idx, 'debit_dollars', e.target.value)}
                      className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-right text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.credit_dollars}
                      onChange={(e) => handleLineChange(idx, 'credit_dollars', e.target.value)}
                      className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-right text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
                      title="Remove Line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-dark/90 font-mono font-bold border-t border-card-border/80">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right uppercase text-muted text-[10px]">
                  Totals
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 text-xs">
                  {formatCurrency(totalDebitMinor)}
                </td>
                <td className="py-3 px-4 text-right text-rose-400 text-xs">
                  {formatCurrency(totalCreditMinor)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
