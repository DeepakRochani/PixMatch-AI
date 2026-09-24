'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Clock,
  RefreshCw,
  Ban,
  Check,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { BusinessNavTabs } from '@/components/dashboard/BusinessNavTabs';
import {
  StudioBusinessInsightDTO,
  BusinessInsightStatus,
  BusinessInsightSeverity,
} from '@pixmatch/types';

export default function BusinessInsightsPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<StudioBusinessInsightDTO[]>([]);
  const [scanning, setScanning] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/business/insights', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) setInsights(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanNow = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/v1/business/insights/scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      if (res.ok) setInsights(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (insightId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      await fetch(`/api/v1/business/insights/${insightId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });
      fetchInsights();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchInsights();
  }, [token]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Financial Anomaly Detection & Insights
          </h1>
          <p className="text-sm text-muted mt-1">
            Automated comparative monitoring against 3-month rolling baselines to detect revenue drops, expense surges, and margin trends.
          </p>
        </div>

        <button
          onClick={handleScanNow}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-md"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Analyzing Baselines...' : 'Scan Anomalies Now'}
        </button>
      </div>

      <BusinessNavTabs />

      {loading ? (
        <div className="py-20 text-center text-xs text-muted">Running comparative anomaly analysis...</div>
      ) : insights.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-card-border text-center space-y-3 max-w-lg mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No anomalies detected</h3>
          <p className="text-xs text-muted">
            Your studio revenue, expenses, and operational turnaround are performing within normal baseline parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`p-5 rounded-2xl border space-y-3 transition ${
                ins.severity === 'HIGH' || ins.severity === 'CRITICAL'
                  ? 'bg-red-500/5 border-red-500/30'
                  : ins.severity === 'MEDIUM'
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-card border-card-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ins.severity === 'HIGH' || ins.severity === 'CRITICAL'
                        ? 'bg-red-500/15 text-red-400'
                        : ins.severity === 'MEDIUM'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {ins.type === 'REVENUE_DROP' ? (
                      <TrendingDown className="h-5 w-5" />
                    ) : ins.type === 'REVENUE_SPIKE' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{ins.title}</h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-card-border/40 text-muted">
                        {ins.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{ins.description}</p>
                  </div>
                </div>

                {ins.status === 'ACTIVE' && (
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleUpdateStatus(ins.id, 'acknowledge')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card-border/30 hover:bg-card-border/60 text-muted hover:text-white transition flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Acknowledge
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ins.id, 'resolve')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ins.id, 'dismiss')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-red-400 transition"
                      title="Dismiss"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {ins.action_recommendation && (
                <div className="p-3 rounded-xl bg-card-border/20 border border-card-border/40 text-xs text-primary space-y-0.5">
                  <span className="font-bold text-white">Recommended Action:</span>
                  <p className="text-muted leading-relaxed">{ins.action_recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
