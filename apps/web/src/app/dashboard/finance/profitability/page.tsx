'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, AlertTriangle, Layers, Users, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { fetchApi } from '@/lib/api-client';

export default function FinanceProfitabilityPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectProfitability, setProjectProfitability] = useState<any | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, cliRes] = await Promise.all([
        fetchApi('/projects'),
        fetchApi('/clients'),
      ]);

      const projList = Array.isArray(projRes.data) ? projRes.data : Array.isArray(projRes) ? projRes : [];
      setProjects(projList);
      setClients(Array.isArray(cliRes.data) ? cliRes.data : Array.isArray(cliRes) ? cliRes : []);

      if (projList.length > 0) {
        setSelectedProjectId(projList[0].id);
        fetchProjectProfit(projList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectProfit = async (projId: string) => {
    if (!projId) return;
    setLoadingProject(true);
    try {
      const res = await fetchApi(`/finance/profitability/projects/${projId}`);
      if (res && !res.error) {
        setProjectProfitability(res.data || res);
      }
    } catch (err: any) {
      console.error('Failed to load project profitability', err);
    } finally {
      setLoadingProject(false);
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
            <TrendingUp className="h-7 w-7 text-purple-400" />
            Studio Job & Client Profitability Engine 2.0
          </h1>
          <p className="text-sm text-muted mt-1">
            Realized revenue vs direct lab costs, gear rentals, second-shooter labor, and true net margin breakdown.
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

      {/* Project Selector */}
      <div className="p-4 bg-card-bg border border-card-border rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-white">Select Shoot / Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              fetchProjectProfit(e.target.value);
            }}
            className="px-3 py-2 bg-card-border/40 border border-card-border rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.name || 'Untitled Project'}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-muted">Direct Job Costing & Labor Margin Analysis</span>
      </div>

      {/* Profitability Breakdown */}
      {projectProfitability ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
              <span className="text-xs text-muted font-medium">Realized Revenue</span>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {formatCents(projectProfitability.revenue_cents)}
              </div>
              <p className="text-[10px] text-muted mt-1">Invoiced contract / packages</p>
            </div>

            <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
              <span className="text-xs text-muted font-medium">Direct Job Expenses</span>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {formatCents(projectProfitability.direct_expenses_cents)}
              </div>
              <p className="text-[10px] text-muted mt-1">Prints, permits, travel, rentals</p>
            </div>

            <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
              <span className="text-xs text-muted font-medium">Labor & 2nd Shooters</span>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {formatCents(projectProfitability.labor_cost_cents || 0)}
              </div>
              <p className="text-[10px] text-muted mt-1">Allocated contractor pay</p>
            </div>

            <div className="p-5 rounded-2xl bg-card-bg border border-card-border">
              <span className="text-xs text-muted font-medium">Net Profit Margin</span>
              <div className={`text-2xl font-bold mt-2 ${projectProfitability.net_profit_cents >= 0 ? 'text-purple-400' : 'text-rose-500'}`}>
                {formatCents(projectProfitability.net_profit_cents)}
                <span className="text-xs text-muted ml-2 font-normal">
                  ({projectProfitability.profit_margin_percent?.toFixed(1) || '0.0'}%)
                </span>
              </div>
              <p className="text-[10px] text-muted mt-1">Job net contribution</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-card-bg border border-card-border text-muted">
          <TrendingUp className="h-12 w-12 mx-auto text-muted mb-3" />
          <h3 className="text-sm font-semibold text-white">Select a project to inspect profitability</h3>
          <p className="text-xs text-muted mt-1">Real-time revenue, direct costs, and profit margin analysis.</p>
        </div>
      )}
    </div>
  );
}
