'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  AlertCircle,
  Clock,
  Receipt,
  ExternalLink,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

export default function PublicInvoicePaymentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'ONLINE' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('ONLINE');
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    loadInvoiceByToken();
  }, [token]);

  const loadInvoiceByToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/invoicing/public/${token}`);
      if (res && !res.error) {
        setInvoice(res.data || res);
      } else {
        setError(res?.error?.message || 'Invalid or expired payment link.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice information.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!invoice || invoice.amount_due_minor <= 0) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetchApi(`/finance/invoicing/public/${token}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          payment_method: selectedMethod,
          amount_minor: invoice.amount_due_minor,
        }),
      });

      if (res && !res.error) {
        setPaymentSuccess(true);
        setPaymentResult(res.data || res);
        // Refresh invoice state
        loadInvoiceByToken();
      } else {
        setError(res?.error?.message || 'Payment transaction failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setPaying(false);
    }
  };

  const formatCurrency = (amountMinor: number, currency: string = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;
    return `${symbol}${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading secure invoice details...</p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invoice Not Available</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400 border border-slate-700/50">
            Please contact the studio directly if you believe this link is incorrect or has expired.
          </div>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID' || invoice.amount_due_minor === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header & Security Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">PIXMATCH STUDIO</h1>
              <p className="text-xs text-slate-400">Secure Client Invoicing & Checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium self-start sm:self-auto">
            <ShieldCheck className="h-3.5 w-3.5" />
            256-bit Encrypted Portal
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">INVOICE</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{invoice.invoice_number}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {isPaid ? 'PAID IN FULL' : invoice.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-8 border border-slate-800/80 rounded-2xl bg-slate-950/40">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-3 text-center font-semibold">Qty</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Rate</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {invoice.lines?.map((line: any, idx: number) => (
                  <tr key={line.id || idx} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-white">{line.description}</p>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">{line.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      {formatCurrency(line.unit_price_minor, invoice.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-white">
                      {formatCurrency(line.total_minor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            <div className="space-y-3 text-xs text-slate-400">
              {invoice.notes && (
                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/70">
                  <span className="font-semibold text-slate-300 block mb-1">Notes & Terms</span>
                  <p>{invoice.notes}</p>
                  {invoice.terms && <p className="mt-1 text-slate-500">{invoice.terms}</p>}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                Payments processed securely via PCI-DSS certified gateway.
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/70 text-sm">
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal_minor, invoice.currency)}</span>
              </div>
              {invoice.discount_minor > 0 && (
                <div className="flex justify-between text-emerald-400 text-xs">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount_minor, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Tax (GST)</span>
                <span>{formatCurrency(invoice.tax_minor, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-800">
                <span>Total Amount</span>
                <span>{formatCurrency(invoice.total_minor, invoice.currency)}</span>
              </div>
              {invoice.amount_paid_minor > 0 && (
                <div className="flex justify-between text-emerald-400 text-xs">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amount_paid_minor, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-indigo-400 font-extrabold text-lg pt-2 border-t border-slate-800/80">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.amount_due_minor, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Action Section */}
        {!isPaid ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              Select Payment Method
            </h3>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { id: 'ONLINE', label: 'Online / Card / Netbanking', desc: 'Instant gateway checkout' },
                { id: 'UPI', label: 'UPI / QR Code', desc: 'GPay, PhonePe, Paytm' },
                { id: 'BANK_TRANSFER', label: 'Direct Bank Wire (NEFT/RTGS)', desc: 'Manual transfer receipt' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedMethod === m.id
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <p className="font-semibold text-sm text-white mb-1">{m.label}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {paying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Secure Payment...
                </>
              ) : (
                <>
                  Pay {formatCurrency(invoice.amount_due_minor, invoice.currency)} Now
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Invoice Fully Paid</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-4">
              Thank you! Your payment has been received and verified. An official receipt has been issued.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-600 max-w-md mx-auto">
        PIXMatch AI Studio Business Management Platform.
        <br />
        Encrypted end-to-end commercial payments system.
      </footer>
    </div>
  );
}
