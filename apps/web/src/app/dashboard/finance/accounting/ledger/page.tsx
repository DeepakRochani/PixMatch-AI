'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  BookMarked,
  Download,
  Filter,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function GeneralLedgerPage() {
  const [ledger, setLedger] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/finance/accounting/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('account_id', selectedAccountId);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/finance/accounting/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
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

  useEffect(() => {
    fetchLedger();
  }, [selectedAccountId, fromDate, toDate]);

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(minor / 100);
  };

  const handleExportCSV = () => {
    if (!ledger?.accounts) return;
    const rows = [
      ['Account Code', 'Account Name', 'Date', 'Entry #', 'Description', 'Source Event', 'Debit ($)', 'Credit ($)', 'Running Balance ($)'],
    ];

    ledger.accounts.forEach((acc: any) => {
      acc.lines.forEach((l: any) => {
        rows.push([
          acc.account_code,
          acc.account_name,
          new Date(l.date).toLocaleDateString(),
          l.entry_number,
          `"${(l.description || '').replace(/"/g, '""')}"`,
          l.source_event_type || 'MANUAL',
          (l.debit_minor / 100).toFixed(2),
          (l.credit_minor / 100).toFixed(2),
          (l.running_balance_minor / 100).toFixed(2),
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `general_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-cyan-400" />
            General Ledger
          </h1>
          <p className="text-sm text-muted">
            Detailed account-by-account transaction activity, debits, credits, and running balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLedger}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-card-border/60 hover:bg-card-border text-white rounded-lg text-xs font-semibold transition-all border border-card-border"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <FinanceNavTabs />
      <AccountingNavTabs />

      {/* Filter Bar */}
      <div className="p-4 bg-card border border-card-border/60 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">Filter by Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-surface-dark border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-surface-dark border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-surface-dark border border-card-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-muted">
          <div>
            Total Debits:{' '}
            <span className="text-emerald-400 font-bold">
              {formatCurrency(ledger?.total_debit_minor || 0)}
            </span>
          </div>
          <div>
            Total Credits:{' '}
            <span className="text-rose-400 font-bold">
              {formatCurrency(ledger?.total_credit_minor || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Accounts & Transactions */}
      {loading ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          Loading general ledger records...
        </div>
      ) : !ledger?.accounts || ledger.accounts.length === 0 ? (
        <div className="p-12 text-center text-muted text-xs bg-card border border-card-border rounded-xl">
          No ledger transactions found for selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          {ledger.accounts.map((acc: any) => (
            <div key={acc.account_id} className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-surface-dark/70 border-b border-card-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-primary">{acc.account_code}</span>
                  <span className="text-sm font-semibold text-white">{acc.account_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-card-border/40 text-muted">
                    {acc.account_type}
                  </span>
                  <span className="text-[10px] text-muted">Normal: {acc.normal_balance}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-muted">
                    Opening: <span className="text-white font-semibold">{formatCurrency(acc.opening_balance_minor)}</span>
                  </span>
                  <span className="text-muted">
                    Closing: <span className="text-emerald-400 font-bold">{formatCurrency(acc.closing_balance_minor)}</span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-dark/40 text-muted uppercase text-[9px] tracking-wider border-b border-card-border/40">
                    <tr>
                      <th className="py-2.5 px-4 w-28">Date</th>
                      <th className="py-2.5 px-4 w-32">Entry #</th>
                      <th className="py-2.5 px-4">Description / Memo</th>
                      <th className="py-2.5 px-4 w-28">Source</th>
                      <th className="py-2.5 px-4 w-32 text-right">Debit ($)</th>
                      <th className="py-2.5 px-4 w-32 text-right">Credit ($)</th>
                      <th className="py-2.5 px-4 w-36 text-right">Running Balance ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/30 text-white">
                    {acc.lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No transactions in period.
                        </td>
                      </tr>
                    ) : (
                      acc.lines.map((line: any, lIdx: number) => (
                        <tr key={lIdx} className="hover:bg-surface-dark/30 transition-colors">
                          <td className="py-2.5 px-4 text-muted">
                            {new Date(line.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                            <Link
                              href={`/dashboard/finance/accounting/journal-entries/${line.journal_entry_id}`}
                              className="hover:underline"
                            >
                              {line.entry_number}
                            </Link>
                          </td>
                          <td className="py-2.5 px-4 max-w-sm truncate text-white">
                            {line.description || '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[10px] text-muted">
                            {line.source_event_type || 'MANUAL'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                            {line.debit_minor > 0 ? formatCurrency(line.debit_minor) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-rose-400">
                            {line.credit_minor > 0 ? formatCurrency(line.credit_minor) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-white">
                            {formatCurrency(line.running_balance_minor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
