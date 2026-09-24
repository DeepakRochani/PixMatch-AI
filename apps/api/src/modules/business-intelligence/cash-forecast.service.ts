/**
 * Cash Forecast Service — PIXMatch AI Phase 38
 *
 * Deterministic Cash Flow Forecasting:
 * - Horizons: 7 days, 30 days, 60 days, 90 days
 * - Inflows: Known, Scheduled, Estimated
 * - Outflows: Known, Scheduled, Estimated
 * - Liquidity & Cash risk detection
 * - 100% integer minor units (paise/cents)
 */

import { IBiCashForecastDTO, IBiCashHorizonProjectionDTO } from '@pixmatch/types';

export interface ICashForecastRawInputs {
  current_cash_minor: number;
  minimum_cash_reserve_minor?: number;
  currency?: string;

  // Receivables & Inflow commitments
  known_receivables_due: Array<{ amount_minor: number; due_days: number }>;
  scheduled_invoices_due: Array<{ amount_minor: number; due_days: number }>;
  confirmed_bookings_inflow: Array<{ amount_minor: number; due_days: number }>;
  historical_collection_rate_bps?: number; // default 9000 (90%)

  // Payables & Outflow commitments
  known_payables_due: Array<{ amount_minor: number; due_days: number }>;
  scheduled_expenses_due: Array<{ amount_minor: number; due_days: number }>;
  tax_liabilities_due: Array<{ amount_minor: number; due_days: number }>;
  monthly_fixed_burn_minor?: number;
}

export class CashForecastService {
  private static readonly HORIZONS: Array<{ days: 7 | 30 | 60 | 90; label: string }> = [
    { days: 7, label: '7-Day Cash Outlook' },
    { days: 30, label: '30-Day Cash Outlook' },
    { days: 60, label: '60-Day Cash Outlook' },
    { days: 90, label: '90-Day Cash Outlook' },
  ];

  /**
   * Forecast cash flow deterministically across 7, 30, 60, and 90 days horizons.
   */
  public static calculateCashForecast(inputs: ICashForecastRawInputs): IBiCashForecastDTO {
    const current_cash_minor = Math.round(inputs.current_cash_minor || 0);
    const minReserve = Math.round(inputs.minimum_cash_reserve_minor || 0);
    const collectionRate = (inputs.historical_collection_rate_bps ?? 9000) / 10000;
    const monthlyBurn = Math.max(0, Math.round(inputs.monthly_fixed_burn_minor || 0));
    const currency = inputs.currency || 'INR';

    const projections: IBiCashHorizonProjectionDTO[] = [];

    for (const h of CashForecastService.HORIZONS) {
      const days = h.days;

      // 1. INFLOWS
      // Known inflows: Confirmed receivables due within horizon
      const known_inflows_minor = inputs.known_receivables_due
        .filter((r) => r.due_days <= days)
        .reduce((sum, r) => sum + Math.max(0, Math.round(r.amount_minor)), 0);

      // Scheduled inflows: Invoices due within horizon scaled by collection rate
      const raw_scheduled_invoices = inputs.scheduled_invoices_due
        .filter((inv) => inv.due_days <= days)
        .reduce((sum, inv) => sum + Math.max(0, Math.round(inv.amount_minor)), 0);
      const scheduled_inflows_minor = Math.round(raw_scheduled_invoices * collectionRate);

      // Estimated inflows: Confirmed booking advances / pipeline conversion due
      const estimated_inflows_minor = inputs.confirmed_bookings_inflow
        .filter((b) => b.due_days <= days)
        .reduce((sum, b) => sum + Math.max(0, Math.round(b.amount_minor)), 0);

      const total_inflows_minor = known_inflows_minor + scheduled_inflows_minor + estimated_inflows_minor;

      // 2. OUTFLOWS
      // Known outflows: Approved payables due within horizon
      const known_outflows_minor = inputs.known_payables_due
        .filter((p) => p.due_days <= days)
        .reduce((sum, p) => sum + Math.max(0, Math.round(p.amount_minor)), 0);

      // Scheduled outflows: Scheduled expense payments and tax liabilities due
      const scheduled_expenses = inputs.scheduled_expenses_due
        .filter((e) => e.due_days <= days)
        .reduce((sum, e) => sum + Math.max(0, Math.round(e.amount_minor)), 0);

      const tax_liabilities = inputs.tax_liabilities_due
        .filter((t) => t.due_days <= days)
        .reduce((sum, t) => sum + Math.max(0, Math.round(t.amount_minor)), 0);

      const scheduled_outflows_minor = scheduled_expenses + tax_liabilities;

      // Estimated outflows: Prorated baseline operational burn
      const estimated_outflows_minor = Math.round((monthlyBurn * days) / 30);

      const total_outflows_minor = known_outflows_minor + scheduled_outflows_minor + estimated_outflows_minor;

      // 3. NET MOVEMENT & ENDING POSITION
      const net_cash_movement_minor = total_inflows_minor - total_outflows_minor;
      const projected_ending_cash_minor = current_cash_minor + net_cash_movement_minor;

      // 4. RISK EVALUATION
      const risk_notes: string[] = [];
      let cash_risk_detected = false;

      if (projected_ending_cash_minor < 0) {
        cash_risk_detected = true;
        risk_notes.push(
          `Critical cash deficit projected at ${days} days: ${Math.abs(projected_ending_cash_minor / 100).toFixed(2)} ${currency} shortfall.`
        );
      } else if (minReserve > 0 && projected_ending_cash_minor < minReserve) {
        cash_risk_detected = true;
        risk_notes.push(
          `Projected cash (${(projected_ending_cash_minor / 100).toFixed(2)} ${currency}) drops below minimum reserve threshold (${(minReserve / 100).toFixed(2)} ${currency}).`
        );
      }

      if (total_outflows_minor > total_inflows_minor * 2 && days >= 30) {
        risk_notes.push(
          `Outflows significantly exceed projected inflows (${(total_outflows_minor / 100).toFixed(2)} vs ${(total_inflows_minor / 100).toFixed(2)} ${currency}).`
        );
      }

      projections.push({
        horizon_days: days,
        horizon_label: h.label,
        starting_cash_minor: current_cash_minor,
        known_inflows_minor,
        scheduled_inflows_minor,
        estimated_inflows_minor,
        known_outflows_minor,
        scheduled_outflows_minor,
        estimated_outflows_minor,
        net_cash_movement_minor,
        projected_ending_cash_minor,
        cash_risk_detected,
        risk_notes,
      });
    }

    return {
      as_of_date: new Date().toISOString(),
      current_cash_minor,
      currency,
      projections,
    };
  }
}
