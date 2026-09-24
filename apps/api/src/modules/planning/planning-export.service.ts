/**
 * Studio Planning Export Service — PIXMatch AI Phase 39
 * Handles secure exports (CSV with Formula Injection Protection, JSON, Text Summaries).
 */

import { prisma } from '@pixmatch/database';
import { StudioBusinessPlanService } from './business-plan.service';
import { StudioPlanTargetService } from './plan-target.service';
import { StudioPlanningVarianceService } from './planning-variance.service';
import { StudioPlanHealthService } from './plan-health.service';

export class StudioPlanningExportService {
  /**
   * Escape fields against CSV Formula Injection (=, +, -, @, tab, cr, lf)
   */
  static sanitizeCsvField(val: any): string {
    if (val === null || val === undefined) return '';
    let str = String(val);

    // If starts with dangerous spreadsheet formula triggers
    if (/^[=+\-@\t\r\n]/.test(str)) {
      str = `'${str}`;
    }

    // Escape internal quotes and wrap in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Alias for sanitizeCsvField
   */
  static sanitizeCsvCell(val: any): string {
    return this.sanitizeCsvField(val);
  }

  /**
   * Generate plan CSV from plan data object
   */
  static generatePlanCsv(planData: any): string {
    const headers = ['Plan Name', 'Fiscal Year', 'Status', 'Target Type', 'Unit', 'Planned Value', 'Actual Value', 'Notes'];
    const rows = (planData.targets || []).map((t: any) => [
      this.sanitizeCsvField(planData.planName),
      this.sanitizeCsvField(planData.fiscalYear),
      this.sanitizeCsvField(planData.status),
      this.sanitizeCsvField(t.targetType),
      this.sanitizeCsvField(t.unit),
      this.sanitizeCsvField(t.plannedValue),
      this.sanitizeCsvField(t.actualValue !== null && t.actualValue !== undefined ? t.actualValue : 'N/A'),
      this.sanitizeCsvField(t.notes || ''),
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  }

  /**
   * Generate CSV export for Plan vs Actual variance
   */
  static async exportPlanVarianceCsv(studioId: string, planId: string): Promise<string> {
    const varianceData = await StudioPlanningVarianceService.getPlanVsActual(studioId, planId);

    const headers = [
      'Target Type',
      'Unit',
      'Period Quarter',
      'Period Month',
      'Planned Value',
      'Actual Value',
      'Variance',
      'Variance %',
      'Favorable',
      'Severity',
      'Diagnostic Analysis',
    ];

    const rows = varianceData.items.map((item) => [
      this.sanitizeCsvField(item.targetType),
      this.sanitizeCsvField(item.unit),
      this.sanitizeCsvField(item.periodQuarter || 'Annual'),
      this.sanitizeCsvField(item.periodMonth || '-'),
      this.sanitizeCsvField(item.plannedValue),
      this.sanitizeCsvField(item.actualValue !== null ? item.actualValue : 'N/A'),
      this.sanitizeCsvField(item.variance !== null ? item.variance : 'N/A'),
      this.sanitizeCsvField(item.variancePercent !== null ? `${item.variancePercent}%` : 'N/A'),
      this.sanitizeCsvField(item.isFavorable === true ? 'YES' : item.isFavorable === false ? 'NO' : 'N/A'),
      this.sanitizeCsvField(item.severity),
      this.sanitizeCsvField(item.analysis),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Generate complete JSON export for a business plan
   */
  static async exportPlanJson(studioId: string, planId: string): Promise<any> {
    const plan = await StudioBusinessPlanService.getPlanById(studioId, planId);
    const variance = await StudioPlanningVarianceService.getPlanVsActual(studioId, planId);
    const health = await StudioPlanHealthService.evaluatePlanHealth(studioId, planId);

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      studioId,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        fiscalYear: plan.fiscalYear,
        version: plan.version,
        status: plan.status,
        currency: plan.currency,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
      targets: plan.targets.map((t) => StudioPlanTargetService.mapToDTO(t)),
      strategicObjectives: plan.strategicObjectives,
      reviews: plan.reviews,
      varianceSummary: variance.summary,
      healthAssessment: {
        overallStatus: health.overallStatus,
        overallScore: health.overallScore,
        dimensions: health.dimensions,
        recommendations: health.recommendations,
      },
    };
  }
}
