'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, RefreshCw, CheckCircle2, AlertTriangle, Building2, CreditCard, Landmark } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('BANK');
  const [currency, setCurrency] = useState('USD');
  const [openingBalance, setOpeningBalance] = useState('0.00');

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/finance/accounts');
      if (res && !res.error) {
        setAccounts(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const opening_cents = Math.round(parseFloat(openingBalance || '0') * 100);
      const res = await fetchApi('/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          account_type: accountType,
          currency,
          opening_balance_cents: opening_cents,
        }),
      });
      if (res.error) throw new Error(res.error.message);
      setShowModal(false);
      setName('');
      setOpeningBalance('0.00');
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-primary" />
            Studio Financial Accounts
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage operating bank accounts, credit cards, cash vaults, and digital payment wallets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAccounts}
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
            Add Account
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

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
                  {acc.account_type}
                </span>
                <h3 className="text-base font-semibold text-white mt-2">{acc.name}</h3>
                <p className="text-xs text-muted">{acc.institution_name || 'Primary Operating Account'}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-card-border/40 flex items-center justify-center text-primary">
                {acc.account_type === 'BANK' ? <Landmark className="h-5 w-5" /> : acc.account_type === 'CARD' ? <CreditCard className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
              </div>
            </div>

            <div className="pt-3 border-t border-card-border/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Current Balance</span>
                <div className="text-xl font-bold text-white">{formatCents(acc.current_balance_cents)}</div>
              </div>
              <div className="text-right text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
                <span className="text-muted text-[10px]">Currency: {acc.currency || 'USD'}</span>
              </div>
            </div>
          </div>
        ))}

        {accounts.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-card-bg border border-card-border text-muted">
            <Wallet className="h-12 w-12 mx-auto text-muted mb-3" />
            <h3 className="text-sm font-semibold text-white">No accounts configured</h3>
            <p className="text-xs text-muted mt-1">Add your studio operating bank or cash account to track liquidity.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Financial Account</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Main Operating"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash Vault</option>
                    <option value="DIGITAL_WALLET">Digital Wallet (Stripe/PayPal)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Opening Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
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
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
