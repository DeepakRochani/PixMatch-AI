'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Clock,
  ExternalLink,
  Ban,
  Plus,
  Receipt,
  Scale,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  MessageSquare,
  History,
  Copy,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'items' | 'payments' | 'tax' | 'accounting' | 'installments' | 'audit'
  >('overview');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Offline payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, payRes, instRes] = await Promise.all([
        fetchApi(`/finance/invoicing/invoices/${invoiceId}`),
        fetchApi(`/finance/invoicing/invoices/${invoiceId}/payments`),
        fetchApi(`/finance/invoicing/invoices/${invoiceId}/installments`),
      ]);

      if (invRes && !invRes.error) {
        setInvoice(invRes.data || invRes);
      } else {
        setError(invRes?.error?.message || 'Invoice not found.');
      }

      if (payRes && !payRes.error) {
        setPayments(payRes.data || payRes || []);
      }
      if (instRes && !instRes.error) {
        setInstallments(instRes.data || instRes || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/finance/invoicing/invoices/${invoiceId}/issue`, { method: 'POST' });
      await loadInvoice();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/finance/invoicing/invoices/${invoiceId}/send`, { method: 'POST' });
      await loadInvoice();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    setActionLoading(true);
    try {
      const res: any = await fetchApi(`/finance/invoicing/invoices/${invoiceId}/payment-request`, {
        method: 'POST',
      });
      if (res && (res.payment_url || res.data?.payment_url)) {
        setPaymentLink(res.payment_url || res.data?.payment_url);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const amountMinor = Math.round(Number(payAmount) * 100);
      await fetchApi(`/finance/invoicing/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount_minor: amountMinor,
          payment_method: payMethod,
          external_reference: payRef,
        }),
      });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayRef('');
      await loadInvoice();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm('Are you sure you want to void this invoice?')) return;
    setActionLoading(true);
    try {
      await fetchApi(`/finance/invoicing/invoices/${invoiceId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Voided by studio admin' }),
      });
      await loadInvoice();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyPaymentUrl = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amountMinor: number = 0, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-xs">
        Loading invoice details...
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs">
          {error}
        </div>
        <Link href="/dashboard/finance/invoicing/invoices" className="text-xs text-primary hover:underline">
          Return to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/finance/invoicing/invoices"
            className="p-2 bg-card hover:bg-card-border/60 border border-card-border rounded-xl text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : invoice.status === 'OVERDUE'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Client: <span className="text-foreground font-medium">{invoice.client_id || 'Direct Client'}</span> • Created {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleIssue}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Issue Invoice
            </button>
          )}

          {(invoice.status === 'ISSUED' || invoice.status === 'SENT') && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch Email
            </button>
          )}

          {invoice.amount_due_minor > 0 && invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && (
            <>
              <button
                onClick={handleGeneratePaymentLink}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-card hover:bg-card-border/60 border border-card-border rounded-xl text-foreground transition"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Generate Payment Link
              </button>
              <button
                onClick={() => {
                  setPayAmount((invoice.amount_due_minor / 100).toString());
                  setShowPaymentModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Offline Payment
              </button>
            </>
          )}

          <a
            href={`/api/finance/invoicing/invoices/${invoiceId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-card hover:bg-card-border/60 border border-card-border rounded-xl text-foreground transition"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>

          {invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
            <button
              onClick={handleVoid}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition"
            >
              <Ban className="h-3.5 w-3.5" />
              Void
            </button>
          )}
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {/* Payment Link Banner */}
      {paymentLink && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Secure Public Payment Portal Link Generated</p>
              <p className="text-slate-400 font-mono text-[11px] truncate max-w-xl">{paymentLink}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyPaymentUrl}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-1 transition"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={paymentLink}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-card border border-card-border hover:bg-card-border/60 rounded-lg text-foreground transition"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-muted-foreground block">Invoice Total</span>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(invoice.total_minor, invoice.currency)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Subtotal: {formatCurrency(invoice.subtotal_minor, invoice.currency)}
          </span>
        </div>

        <div className="bg-card border border-card-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-muted-foreground block">Amount Paid</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {formatCurrency(invoice.amount_paid_minor, invoice.currency)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {payments.length} payment settlements
          </span>
        </div>

        <div className="bg-card border border-card-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-muted-foreground block">Balance Due</span>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {formatCurrency(invoice.amount_due_minor, invoice.currency)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Due by {new Date(invoice.due_date).toLocaleDateString()}
          </span>
        </div>

        <div className="bg-card border border-card-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-muted-foreground block">Tax Liability (Phase 35)</span>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(invoice.tax_minor, invoice.currency)}
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {invoice.tax_transaction_id ? 'Tax Transaction Posted' : 'Standard GST Applied'}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Summary', icon: FileText },
          { id: 'items', label: `Line Items (${invoice.lines?.length || 0})`, icon: Receipt },
          { id: 'payments', label: `Payments & Receipts (${payments.length})`, icon: CreditCard },
          { id: 'installments', label: `Installments (${installments.length})`, icon: CalendarDays },
          { id: 'tax', label: 'Tax & GST Detail', icon: Scale },
          { id: 'accounting', label: 'General Ledger', icon: BookOpen },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Items */}
      {activeTab === 'overview' || activeTab === 'items' ? (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Billed Line Items</h3>
          <div className="overflow-x-auto border border-card-border/60 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/60">
                {invoice.lines?.map((line: any, idx: number) => (
                  <tr key={line.id || idx} className="hover:bg-card-border/20 transition">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {line.description}
                      <span className="text-[10px] text-muted-foreground block">
                        Source: {line.source_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">{line.quantity}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatCurrency(line.unit_price_minor, invoice.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      {line.discount_minor > 0 ? `-${formatCurrency(line.discount_minor, invoice.currency)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatCurrency(line.taxable_amount_minor, invoice.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatCurrency(line.tax_minor, invoice.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(line.total_minor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Tab Content: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Settled Payments</h3>
            {invoice.amount_due_minor > 0 && (
              <button
                onClick={() => {
                  setPayAmount((invoice.amount_due_minor / 100).toString());
                  setShowPaymentModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              >
                Record Payment
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto border border-card-border/60 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-card/60 text-muted-foreground">
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-card-border/20 transition">
                      <td className="py-3 px-4 text-foreground">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">{p.payment_method}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{p.external_reference || '-'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(p.amount_minor, p.currency)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Tax & GST */}
      {activeTab === 'tax' && (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Tax Determination & Compliance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-card-border/20 rounded-xl border border-card-border/50">
              <span className="text-muted-foreground block">Taxable Value</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatCurrency(invoice.taxable_amount_minor, invoice.currency)}
              </p>
            </div>
            <div className="p-4 bg-card-border/20 rounded-xl border border-card-border/50">
              <span className="text-muted-foreground block">Output Tax (CGST+SGST/IGST)</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatCurrency(invoice.tax_minor, invoice.currency)}
              </p>
            </div>
            <div className="p-4 bg-card-border/20 rounded-xl border border-card-border/50">
              <span className="text-muted-foreground block">Phase 35 Tax Transaction</span>
              <p className="text-xs font-mono text-emerald-400 mt-1 truncate">
                {invoice.tax_transaction_id || 'Auto-computed from profile'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Accounting */}
      {activeTab === 'accounting' && (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">General Ledger Entries (Phase 34)</h3>
          <div className="p-4 bg-card-border/20 rounded-xl border border-card-border/50 text-xs space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>DR 1100 Accounts Receivable (Asset)</span>
              <span className="font-bold text-foreground">{formatCurrency(invoice.total_minor, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>CR 4000 Studio Operating Revenue</span>
              <span className="font-bold text-foreground">{formatCurrency(invoice.taxable_amount_minor, invoice.currency)}</span>
            </div>
            {invoice.tax_minor > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CR 2100 Output Tax Payable</span>
                <span className="font-bold text-foreground">{formatCurrency(invoice.tax_minor, invoice.currency)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Offline Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Record Payment Settlement</h3>
            <form onSubmit={handleRecordOfflinePayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Amount ({invoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online Gateway</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  External Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR_98240219"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
