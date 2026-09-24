'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Ban,
  ArrowLeft,
  Lock,
  Send,
  Save,
} from 'lucide-react';
import Link from 'next/link';

interface Line {
  id?: string;
  account_id: string;
  description: string;
  debit_dollars: string;
  credit_dollars: string;
}

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [entry, setEntry] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchEntryAndAccounts = async () => {
    try {
      setLoading(true);
      const [entryRes, accRes] = await Promise.all([
        fetch(`/api/finance/accounting/journal-entries/${id}`),
        fetch('/api/finance/accounting/accounts'),
      ]);

      if (entryRes.ok) {
        const entryData = await entryRes.json();
        setEntry(entryData.journal_entry);
        setDescription(entryData.journal_entry.description);
        setEntryDate(new Date(entryData.journal_entry.entry_date).toISOString().split('T')[0]);
        setLines(
          (entryData.journal_entry.lines || []).map((l: any) => ({
            id: l.id,
            account_id: l.account_id,
            description: l.description || '',
            debit_dollars: l.debit_minor > 0 ? (l.debit_minor / 100).toFixed(2) : '',
            credit_dollars: l.credit_minor > 0 ? (l.credit_minor / 100).toFixed(2) : '',
          }))
        );
      }
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
    } catch {
      setMessage({ text: 'Failed to load journal entry details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEntryAndAccounts();
  }, [id]);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        account_id: accounts[0]?.id || '',
        description: '',
        debit_dollars: '',
        credit_dollars: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      alert('A journal entry requires at least 2 lines.');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof Line, value: string) => {
    const updated = [...lines];
    if (field === 'debit_dollars' && value !== '') {
      updated[index].debit_dollars = value;
      updated[index].credit_dollars = '';
    } else if (field === 'credit_dollars' && value !== '') {
      updated[index].credit_dollars = value;
      updated[index].debit_dollars = '';
    } else {
      (updated[index] as any)[field] = value;
    }
    setLines(updated);
  };

  // Live Totals calculation in Minor Units (cents)
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
  const isDraft = entry?.status === 'DRAFT';
  const isPosted = entry?.status === 'POSTED';

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSaveLines = async () => {
    try {
      setSaving(true);
      const formattedLines = lines.map((l, idx) => ({
        account_id: l.account_id,
        description: l.description,
        debit_minor: Math.round((parseFloat(l.debit_dollars) || 0) * 100),
        credit_minor: Math.round((parseFloat(l.credit_dollars) || 0) * 100),
        line_order: idx + 1,
      }));

      const res = await fetch(`/api/finance/accounting/journal-entries/${id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: formattedLines }),
      });

      if (res.ok) {
        setMessage({ text: 'Journal entry lines saved', type: 'success' });
        fetchEntryAndAccounts();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to save lines', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error saving lines', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePostEntry = async () => {
    if (!isBalanced) return;
    if (!confirm('Are you sure you want to POST this journal entry? Once posted, it becomes immutable.')) return;
    try {
      setPosting(true);
      // First save lines if draft
      await handleSaveLines();

      const res = await fetch(`/api/finance/accounting/journal-entries/${id}/post`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage({ text: 'Journal entry POSTED to general ledger successfully!', type: 'success' });
        fetchEntryAndAccounts();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to post entry', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error posting journal entry', type: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const handleReverseEntry = async () => {
    const reason = prompt('Reason for reversing this journal entry:', 'Correction / voiding transaction');
    if (reason === null) return;
    try {
      setReversing(true);
      const res = await fetch(`/api/finance/accounting/journal-entries/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ text: 'Journal entry reversed successfully!', type: 'success' });
        router.push(`/dashboard/finance/accounting/journal-entries/${data.reversal_entry.id}`);
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to reverse entry', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error reversing entry', type: 'error' });
    } finally {
      setReversing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <FinanceNavTabs />
        <AccountingNavTabs />
        <div className="p-12 text-center text-muted text-xs">Loading journal entry...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <FinanceNavTabs />
        <AccountingNavTabs />
        <div className="p-12 text-center text-rose-400 text-xs">Journal entry not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/finance/accounting/journal-entries"
            className="p-2 rounded-lg bg-card hover:bg-card-border/40 text-muted hover:text-white border border-card-border transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
                {entry.entry_number}
              </h1>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                isPosted
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isDraft
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {entry.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">{entry.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <button
                onClick={handleSaveLines}
                disabled={saving}
                className="flex items-center gap-2 px-3.5 py-2 bg-card hover:bg-card-border/40 text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handlePostEntry}
                disabled={posting || !isBalanced}
                title={!isBalanced ? 'Journal entry must balance before posting' : 'Post to General Ledger'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {posting ? 'Posting...' : 'Post Journal Entry'}
              </button>
            </>
          )}
          {isPosted && (
            <button
              onClick={handleReverseEntry}
              disabled={reversing}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-semibold transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              {reversing ? 'Reversing...' : 'Reverse Entry'}
            </button>
          )}
        </div>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {message && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          message.type === 'success'
            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
            : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
        }`}>
          {message.text}
        </div>
      )}

      {/* Metadata Card */}
      <div className="p-4 rounded-xl bg-card border border-card-border/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-muted block text-[10px] uppercase font-bold">Entry Date</span>
          <span className="text-white font-medium">{new Date(entry.entry_date).toLocaleDateString()}</span>
        </div>
        <div>
          <span className="text-muted block text-[10px] uppercase font-bold">Posting Date</span>
          <span className="text-white font-medium">
            {entry.posting_date ? new Date(entry.posting_date).toLocaleDateString() : 'Pending Post'}
          </span>
        </div>
        <div>
          <span className="text-muted block text-[10px] uppercase font-bold">Source Event</span>
          <span className="text-white font-mono">{entry.source_event_type || 'MANUAL'}</span>
        </div>
        <div>
          <span className="text-muted block text-[10px] uppercase font-bold">Reversal Reference</span>
          <span className="text-white font-mono">{entry.reversal_of_entry_id || 'None'}</span>
        </div>
      </div>

      {/* Double-Entry Balancing Verification Indicator */}
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
              {isBalanced ? 'JOURNAL ENTRY IS BALANCED' : 'JOURNAL ENTRY OUT OF BALANCE'}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isBalanced
                ? 'Total Debits match Total Credits exactly.'
                : `Debits and Credits differ by ${formatCurrency(differenceMinor)}.`}
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

      {/* Lines Table Editor */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-card-border/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Journal Entry Lines
          </h2>
          {isDraft && (
            <button
              onClick={handleAddLine}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card-border/40 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Add Line
            </button>
          )}
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
                {isDraft && <th className="py-3 px-4 w-16 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-surface-dark/40 transition-colors">
                  <td className="py-3 px-4 text-center font-mono text-muted">{idx + 1}</td>
                  <td className="py-3 px-4">
                    {isDraft ? (
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
                    ) : (
                      <div className="font-mono font-semibold text-primary">
                        {accounts.find((a) => a.id === line.account_id)?.code || '—'} -{' '}
                        {accounts.find((a) => a.id === line.account_id)?.name || 'Account'}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isDraft ? (
                      <input
                        type="text"
                        placeholder="Memo for this line..."
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <span className="text-muted">{line.description || '—'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isDraft ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.debit_dollars}
                        onChange={(e) => handleLineChange(idx, 'debit_dollars', e.target.value)}
                        className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-right text-white focus:outline-none focus:border-primary font-mono"
                      />
                    ) : (
                      <span className="font-mono font-semibold text-emerald-400">
                        {line.debit_dollars ? `$${line.debit_dollars}` : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isDraft ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.credit_dollars}
                        onChange={(e) => handleLineChange(idx, 'credit_dollars', e.target.value)}
                        className="w-full bg-surface-dark border border-card-border rounded px-2.5 py-1.5 text-xs text-right text-white focus:outline-none focus:border-primary font-mono"
                      />
                    ) : (
                      <span className="font-mono font-semibold text-rose-400">
                        {line.credit_dollars ? `$${line.credit_dollars}` : '—'}
                      </span>
                    )}
                  </td>
                  {isDraft && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveLine(idx)}
                        className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
                        title="Remove Line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
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
                {isDraft && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
