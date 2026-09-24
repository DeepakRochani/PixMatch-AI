import { AdminService } from './admin.service.js';

export class AdminExportService {
  /**
   * Sanitizes a single cell value to prevent CSV Formula Injection (CWE-1236).
   * Characters `=, +, -, @, \t, \r, \n` at the start of a cell are prepended with `'`.
   */
  static sanitizeCsvCell(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value);

    // Formula injection defense
    if (/^[=+\-@\t\r\n]/.test(str)) {
      str = "'" + str;
    }

    // Standard CSV escaping if string contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Generates a CSV string from an array of objects with headers.
   */
  static generateCsv(headers: string[], rows: Record<string, any>[]): string {
    const headerLine = headers.map((h) => this.sanitizeCsvCell(h)).join(',');
    const dataLines = rows.map((row) =>
      headers.map((h) => this.sanitizeCsvCell(row[h])).join(',')
    );
    return [headerLine, ...dataLines].join('\n');
  }

  /**
   * Exports studios list as CSV.
   */
  static async exportStudiosCsv(): Promise<string> {
    const data = await AdminService.listStudios({ limit: 1000 });
    const headers = ['id', 'name', 'slug', 'status', 'plan', 'created_at', 'storage_bytes', 'photos_count'];
    const rows = data.studios.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      plan: s.plan,
      created_at: s.created_at,
      storage_bytes: s.storage_bytes,
      photos_count: s.photos_count,
    }));
    return this.generateCsv(headers, rows);
  }

  /**
   * Exports users list as CSV.
   */
  static async exportUsersCsv(): Promise<string> {
    const data = await AdminService.listUsers({ limit: 1000 });
    const headers = ['id', 'name', 'email', 'role', 'status', 'created_at'];
    const rows = data.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
    }));
    return this.generateCsv(headers, rows);
  }

  /**
   * Exports audit logs as CSV.
   */
  static async exportAuditLogsCsv(): Promise<string> {
    const data = await AdminService.listAuditLogs({ limit: 1000 });
    const headers = ['id', 'timestamp', 'actor_name', 'actor_email', 'actor_role', 'action', 'entity', 'entity_id', 'studio_id'];
    const rows = data.logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      actor_name: l.actor_name,
      actor_email: l.actor_email,
      actor_role: l.actor_role,
      action: l.action,
      entity: l.entity,
      entity_id: l.entity_id,
      studio_id: l.studio_id,
    }));
    return this.generateCsv(headers, rows);
  }

  /**
   * Exports full platform telemetry bundle as JSON.
   */
  static async exportTelemetryJson(): Promise<Record<string, any>> {
    try {
      const [studios, users, analytics, health] = await Promise.all([
        AdminService.listStudios({ limit: 100 }),
        AdminService.listUsers({ limit: 100 }),
        import('./admin-analytics.service.js').then((m) => m.AdminAnalyticsService.getPlatformAnalytics()),
        import('./admin-analytics.service.js').then((m) => m.AdminAnalyticsService.getPlatformHealthScore()),
      ]);

      return {
        exported_at: new Date(),
        studios: studios.studios,
        users: users.users,
        analytics,
        health,
      };
    } catch (_err) {
      return {
        exported_at: new Date(),
        studios: [],
        users: [],
        analytics: {},
        health: {},
      };
    }
  }
}
