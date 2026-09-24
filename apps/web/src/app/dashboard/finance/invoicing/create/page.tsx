'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  DollarSign,
  Calendar,
  Percent,
  Calculator,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';
import { fetchApi } from '@/lib/api-client';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number; // in standard units e.g. 500.00
  discount: number;
  source_type: 'CUSTOM' | 'CONTRACT' | 'BOOKING' | 'ORDER' | 'PROJECT';
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [contractId, setContractId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('Thank you for choosing our photography services.');
  const [terms, setTerms] = useState('Payment is due within 14 days of invoice date.');

  const [lines, setLines] = useState<LineItem[]>([
    {
      description: 'Photography Production Session & Direction',
      quantity: 1,
      unit_price: 25000,
      discount: 0,
      source_type: 'CUSTOM',
    },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        source_type: 'CUSTOM',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, val: any) => {
    const next = [...lines];
    next[index] = { ...next[index], [field]: val };
    setLines(next);
  };

  // Calculations
  const linesSubtotal = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) - (Number(l.discount) || 0),
    0
  );

  let invoiceDiscount = 0;
  if (discountType === 'PERCENTAGE') {
    invoiceDiscount = (linesSubtotal * (Number(discountValue) || 0)) / 100;
  } else if (discountType === 'FIXED') {
    invoiceDiscount = Number(discountValue) || 0;
  }
  const taxableAmount = Math.max(0, linesSubtotal - invoiceDiscount);
  const estimatedTax = taxableAmount * 0.18; // Default 18% GST estimate
  const estimatedTotal = taxableAmount + estimatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        client_id: clientId || undefined,
        project_id: projectId || undefined,
        contract_id: contractId || undefined,
        booking_id: bookingId || undefined,
        currency,
        invoice_date: new Date(invoiceDate),
        due_date: new Date(dueDate),
        discount_type: discountType !== 'NONE' ? discountType : undefined,
        discount_value:
          discountType === 'PERCENTAGE'
            ? Math.round((Number(discountValue) || 0) * 100) // basis points
            : discountType === 'FIXED'
            ? Math.round((Number(discountValue) || 0) * 100) // minor units
            : undefined,
        notes,
        terms,
        lines: lines.map((l, idx) => ({
          description: l.description || 'Custom service item',
          quantity: Number(l.quantity) || 1,
          unit_price_minor: Math.round((Number(l.unit_price) || 0) * 100),
          discount_minor: Math.round((Number(l.discount) || 0) * 100),
          source_type: l.source_type,
          sort_order: idx + 1,
        })),
      };

      const res = await fetchApi('/finance/invoicing/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && !res.error) {
        const createdId = (res as any).data?.id || (res as any).id;
        router.push(`/dashboard/finance/invoicing/invoices/${createdId}`);
      } else {
        setError(res?.error?.message || 'Failed to create invoice.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/finance/invoicing/invoices"
            className="p-2 bg-card hover:bg-card-border/60 border border-card-border rounded-xl text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Commercial Invoice</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Draft professional studio invoice with GST tax calculation & payment terms.
            </p>
          </div>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Meta Section */}
        <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Client & Invoice Particulars
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Client ID / Name
              </label>
              <input
                type="text"
                placeholder="e.g. CLI_89402"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Project ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. PROJ_102"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Invoice Line Items</h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="p-4 bg-card-border/20 border border-card-border/50 rounded-xl grid grid-cols-12 gap-3 items-center"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Product or service description"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Unit Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-right"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 text-right">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Total
                  </label>
                  <span className="text-xs font-bold text-foreground">
                    {currency}{' '}
                    {(
                      (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) -
                      (Number(line.discount) || 0)
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    className="p-2 text-muted-foreground hover:text-red-400 transition disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation & Discount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Invoice Level Discount</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="NONE">No Discount</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount ({currency})</option>
                </select>
              </div>

              {discountType !== 'NONE' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Discount Value {discountType === 'PERCENTAGE' ? '(%)' : `(${currency})`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Payment Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card-border/30 border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Estimated Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{currency} {linesSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {invoiceDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-{currency} {invoiceDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable Base:</span>
                  <span>{currency} {taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (18% est.):</span>
                  <span>{currency} {estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-foreground font-bold text-base pt-2 border-t border-card-border">
                  <span>Total Amount:</span>
                  <span>{currency} {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                href="/dashboard/finance/invoicing/invoices"
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'Saving Draft...' : 'Create Draft Invoice'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
