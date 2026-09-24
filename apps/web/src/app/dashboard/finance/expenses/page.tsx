'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Plus, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Filter, Search, ShieldCheck } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterApproval, setFilterApproval] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [costType, setCostType] = useState('DIRECT');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterApproval) params.append('approval_status', filterApproval);

      const [expRes, catRes, venRes] = await Promise.all([
        fetchApi(`/finance/expenses?${params.toString()}`),
        fetchApi('/finance/categories'),
        fetchApi('/finance/vendors'),
      ]);

      if (expRes && !expRes.error) {
        setExpenses(expRes.data?.expenses || (Array.isArray(expRes.data) ? expRes.data : []));
      }
      if (catRes && !catRes.error) {
        setCategories(Array.isArray(catRes.data) ? catRes.data : Array.isArray(catRes) ? catRes : []);
      }
      if (venRes && !venRes.error) {
        setVendors(Array.isArray(venRes.data) ? venRes.data : Array.isArray(venRes) ? venRes : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterApproval]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount_cents = Math.round(parseFloat(amount) * 100);
      const tax_cents = Math.round(parseFloat(taxAmount || '0') * 100);

      const res = await fetchApi('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          description,
          amount_cents,
          tax_cents,
          category_id: categoryId || (categories[0]?.id || 'cat-general'),
          vendor_id: vendorId || undefined,
          cost_type: costType,
          expense_date: expenseDate,
        }),
      });

      if (res.error) throw new Error(res.error.message);
      setShowModal(false);
      setDescription('');
      setAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error recording expense');
    }
  };

  const handleApprove = async (expenseId: string, approved: boolean) => {
    try {
      const res = await fetchApi(`/finance/expenses/${expenseId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved, notes: approved ? 'Approved via web UI' : 'Rejected via web UI' }),
      });
      if (res.error) throw new Error(res.error.message);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Approval action failed');
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
            <Receipt className="h-7 w-7 text-primary" />
            Studio Expense Operations
          </h1>
          <p className="text-sm text-muted mt-1">
            Track direct job costs, equipment overhead, vendor invoices, dual-control approvals, and receipt reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
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
            Record Expense
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

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card-bg border border-card-border rounded-xl">
        <Filter className="h-4 w-4 text-muted ml-2" />
        <select
          value={filterApproval}
          onChange={(e) => setFilterApproval(e.target.value)}
          className="px-3 py-1.5 bg-card-border/30 border border-card-border rounded-lg text-xs text-white focus:outline-none focus:border-primary"
        >
          <option value="">All Approval States</option>
          <option value="PENDING">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-card-border/30 border border-card-border rounded-lg text-xs text-white focus:outline-none focus:border-primary"
        >
          <option value="">All Expense Statuses</option>
          <option value="RECORDED">Recorded</option>
          <option value="DRAFT">Draft</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-card-border/40 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-card-border">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category & Cost Type</th>
                <th className="px-5 py-3.5">Vendor</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Approval</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/30">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-card-border/20 transition">
                  <td className="px-5 py-4 whitespace-nowrap text-white">
                    {new Date(exp.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-primary font-medium">{exp.category?.name || 'General'}</span>
                    <span className="text-[10px] text-muted block">{exp.cost_type}</span>
                  </td>
                  <td className="px-5 py-4 text-white">
                    {exp.vendor?.name || '—'}
                  </td>
                  <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                    {formatCents(exp.amount_cents)}
                    {exp.tax_cents > 0 && (
                      <span className="text-[10px] text-muted block">+ {formatCents(exp.tax_cents)} tax</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      exp.approval_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      exp.approval_status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                      exp.approval_status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-card-border/40 text-muted'
                    }`}>
                      {exp.approval_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      exp.payment_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                      exp.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {exp.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    {exp.approval_status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleApprove(exp.id, true)}
                          title="Approve Expense"
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(exp.id, false)}
                          title="Reject Expense"
                          className="p-1 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted">
                    No expense records found matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Record New Expense</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Description / Memo</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony A7IV Sensor Cleaning & Calibration"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cost Classification</label>
                  <select
                    value={costType}
                    onChange={(e) => setCostType(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="DIRECT">Direct Cost</option>
                    <option value="ALLOCATED">Allocated Overhead</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
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
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
