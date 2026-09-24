'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertTriangle, TrendingUp, ArrowDownLeft, ArrowUpRight, Calendar, Sparkles } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceCashFlowPage() {
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfRes, fcRes] = await Promise.all([
        fetchApi('/finance/cash-flow/summary'),
        fetchApi('/finance/reports/forecast?months=3'),
      ]);

      if (cfRes && !cfRes.error) {
        setCashFlow(cfRes.data || cfRes);
      }
      if (fcRes && !fcRes.error) {
        setForecast(fcRes.data || fcRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cash flow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCents = (cents?: number) => {
    const val = (cents || 0) / 100;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-primary" />
            Cash Flow & Liquidity Intelligence
          </h1>
          <p className="text-sm text-muted mt-1">
            Realized cash inflows, expense outflows, net runway, and forward 90-day predictive liquidity forecast.
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
        </div>
      </div>

      <FinanceNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cash Flow Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Cash Inflow</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCents(cashFlow?.total_cash_in_cents || 0)}
          </div>
          <p className="text-[10px] text-muted mt-1">Collected client balances</p>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Cash Outflow</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">
            {formatCents(cashFlow?.total_cash_out_cents || 0)}
          </div>
          <p className="text-[10px] text-muted mt-1">Settled expenses & bills</p>
        </div>

        <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Net Operating Cash</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${(cashFlow?.net_cash_flow_cents || 0) >= 0 ? 'text-white' : 'text-rose-500'}`}>
            {formatCents(cashFlow?.net_cash_flow_cents || 0)}
          </div>
          <p className="text-[10px] text-muted mt-1">Free cash generated</p>
        </div>
      </div>

      {/* 90-Day Predictive Forecast */}
      {forecast && (
        <div className="p-6 rounded-2xl bg-card-bg border border-card-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Forward {forecast.months_ahead}-Month Liquidity Forecast
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              Confidence: {forecast.confidence_level}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Projected Revenue</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {formatCents(forecast.projected_revenue_cents)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Projected Expenses</span>
              <div className="text-xl font-bold text-rose-400 mt-1">
                {formatCents(forecast.projected_expenses_cents)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card-border/30">
              <span className="text-xs text-muted">Estimated Net Surplus</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCents(forecast.projected_net_cents)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
