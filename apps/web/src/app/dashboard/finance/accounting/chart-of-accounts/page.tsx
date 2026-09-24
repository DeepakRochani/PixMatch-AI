'use client';

import React, { useState, useEffect } from 'react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { AccountingNavTabs } from '@/components/dashboard/AccountingNavTabs';
import {
  ListTree,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Archive,
  RefreshCw,
} from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  description?: string;
  account_type: string;
  normal_balance: 'DEBIT' | 'CREDIT';
  is_system: boolean;
  is_active: boolean;
  currency: string;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('EXPENSE');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/accounting/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    try {
      setSaving(true);
      const normalBalance = ['ASSET', 'EXPENSE', 'COGS', 'OTHER_EXPENSE'].includes(newType) ? 'DEBIT' : 'CREDIT';
      const res = await fetch('/api/finance/accounting/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          account_type: newType,
          normal_balance: normalBalance,
          description: newDesc,
          currency: 'USD',
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Account created successfully', type: 'success' });
        setShowModal(false);
        setNewCode('');
        setNewName('');
        setNewDesc('');
        fetchAccounts();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to create account', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error creating account', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this account?')) return;
    try {
      const res = await fetch(`/api/finance/accounting/accounts/${id}/archive`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage({ text: 'Account archived', type: 'success' });
        fetchAccounts();
      }
    } catch {
      // ignore
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.code.toLowerCase().includes(search.toLowerCase()) ||
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      (acc.description && acc.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || acc.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LIABILITY': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'EQUITY': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'REVENUE':
      case 'OTHER_INCOME': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'EXPENSE':
      case 'COGS':
      case 'OTHER_EXPENSE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-card-border text-muted border-card-border';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ListTree className="h-6 w-6 text-primary" />
            Chart of Accounts
          </h1>
          <p className="text-sm text-muted">
            Manage your studio's standard ledger accounts, normal balances, and classifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-card-border/40 text-muted hover:text-white rounded-lg text-xs font-semibold border border-card-border transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border border-card-border/60 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by code, name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-dark border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Account Types</option>
            <option value="ASSET">Assets</option>
            <option value="LIABILITY">Liabilities</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expense</option>
            <option value="COGS">Cost of Goods Sold (COGS)</option>
            <option value="OTHER_INCOME">Other Income</option>
            <option value="OTHER_EXPENSE">Other Expense</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-card border border-card-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark/80 text-muted uppercase text-[10px] tracking-wider border-b border-card-border/60">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Normal Balance</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">System</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40 text-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted">
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted">
                    No accounts found matching filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-surface-dark/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold">{acc.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getTypeBadgeClass(acc.account_type)}`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted">
                      {acc.normal_balance}
                    </td>
                    <td className="py-3 px-4 text-muted max-w-xs truncate">{acc.description || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {acc.is_system ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          <Lock className="h-3 w-3" /> System
                        </span>
                      ) : (
                        <span className="text-muted text-[10px]">Custom</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {acc.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-muted text-[10px]">Archived</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!acc.is_system && acc.is_active && (
                        <button
                          onClick={() => handleArchive(acc.id)}
                          className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
                          title="Archive Account"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Chart of Account
            </h2>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Account Code</label>
                <input
                  type="text"
                  placeholder="e.g. 6400"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Studio Utilities Expense"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Account Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="ASSET">Asset (Normal: Debit)</option>
                  <option value="LIABILITY">Liability (Normal: Credit)</option>
                  <option value="EQUITY">Equity (Normal: Credit)</option>
                  <option value="REVENUE">Revenue (Normal: Credit)</option>
                  <option value="EXPENSE">Expense (Normal: Debit)</option>
                  <option value="COGS">Cost of Goods Sold (Normal: Debit)</option>
                  <option value="OTHER_INCOME">Other Income (Normal: Credit)</option>
                  <option value="OTHER_EXPENSE">Other Expense (Normal: Debit)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Notes about when to use this account..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-surface-dark border border-card-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white bg-card-border/30 hover:bg-card-border/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
