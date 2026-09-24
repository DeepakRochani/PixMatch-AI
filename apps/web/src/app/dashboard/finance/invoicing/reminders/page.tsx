'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { FinanceNavTabs } from '@/components/dashboard/FinanceNavTabs';
import { InvoicingNavTabs } from '@/components/dashboard/InvoicingNavTabs';

export default function RemindersPage() {
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    whatsapp: true,
  });

  const [reminderRules, setReminderRules] = useState([
    { id: 1, type: 'BEFORE_DUE', days: 3, label: '3 days before due date', active: true },
    { id: 2, type: 'DUE_TODAY', days: 0, label: 'On due date', active: true },
    { id: 3, type: 'OVERDUE', days: 7, label: '7 days overdue', active: true },
    { id: 4, type: 'FINAL_NOTICE', days: 14, label: '14 days overdue (Final notice)', active: true },
  ]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <BellRing className="h-7 w-7 text-primary" />
            Automated Payment Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated pre-due and overdue reminder schedules with human approval safeguards.
          </p>
        </div>
      </div>

      <FinanceNavTabs />
      <InvoicingNavTabs />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reminder Schedules */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-foreground">Reminder Triggers</h3>
          <p className="text-xs text-muted-foreground">
            Triggers calculate against the invoice due date and balance due.
          </p>

          <div className="space-y-3 pt-2">
            {reminderRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{rule.label}</p>
                  <span className="text-[10px] text-muted-foreground uppercase">{rule.type}</span>
                </div>
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => {
                    const next = reminderRules.map((r) =>
                      r.id === rule.id ? { ...r, active: e.target.checked } : r
                    );
                    setReminderRules(next);
                  }}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Communication Channels & Safeguards */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-foreground">Dispatch Channels & Safeguards</h3>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Email Notifications</p>
                  <span className="text-[10px] text-muted-foreground">Phase 11 Email Provider</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.email}
                onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-card-border/20 border border-card-border/50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-foreground">WhatsApp Direct Dispatch</p>
                  <span className="text-[10px] text-muted-foreground">Client 360 Verified Mobile</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
            </div>
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary flex items-start gap-2 mt-4">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Human Approval Safeguard</span>
              In accordance with studio policy, all automated reminders can be queued as drafts for staff approval prior to dispatch.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
