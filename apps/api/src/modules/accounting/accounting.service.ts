/**
 * Studio Financial Accounting & General Ledger Service — PIXMatch AI Phase 34
 * Multi-tenant double-entry general ledger, chart of accounts, journal posting,
 * balanced debits/credits enforcement, period locking, reversals, trial balance,
 * general ledger, P&L, balance sheet, operational subledger integrations,
 * multi-currency base calculations, audit trail, and formula-safe CSV exports.
 */

import { prisma } from '@pixmatch/database';
import {
  ChartOfAccountType,
  AccountNormalBalance,
  JournalEntryStatus,
  AccountingPeriodStatus,
  AccountingReferenceType,
  IStudioChartOfAccountDTO,
  ICreateChartOfAccountDTO,
  IUpdateChartOfAccountDTO,
  IStudioAccountingMappingDTO,
  ICreateAccountingMappingDTO,
  IStudioJournalEntryDTO,
  ICreateJournalEntryDTO,
  IStudioJournalEntryLineDTO,
  ICreateJournalEntryLineDTO,
  IStudioAccountingPeriodDTO,
  ICreateAccountingPeriodDTO,
  ITrialBalanceReportDTO,
  ITrialBalanceEntryDTO,
  IGeneralLedgerReportDTO,
  IGeneralLedgerAccountDTO,
  IGeneralLedgerEntryDTO,
  IProfitAndLossReportDTO,
  IBalanceSheetReportDTO,
  IOpeningBalanceDTO,
} from '@pixmatch/types';

export class StudioAccountingService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new StudioAccountingService();

  public static getInstance(dbClient?: any): StudioAccountingService {
    if (dbClient) {
      return new StudioAccountingService(dbClient);
    }
    return StudioAccountingService.defaultInstance;
  }

  // Model accessor helpers
  private get accountModel() {
    return this.db.studioChartOfAccount || this.db.chartOfAccount || this.db.chartOfAccounts || this.db.studioChartOfAccounts;
  }
  private get mappingModel() {
    return this.db.studioAccountingMapping || this.db.accountingMapping || this.db.accountingMappings || this.db.studioAccountingMappings;
  }
  private get journalModel() {
    return this.db.studioJournalEntry || this.db.journalEntry || this.db.journalEntries || this.db.studioJournalEntries;
  }
  private get lineModel() {
    return this.db.studioJournalEntryLine || this.db.journalEntryLine || this.db.journalLine || this.db.journalLines || this.db.studioJournalLines;
  }
  private get periodModel() {
    return this.db.studioAccountingPeriod || this.db.accountingPeriod || this.db.accountingPeriods || this.db.studioAccountingPeriods;
  }
  private get auditModel() {
    return this.db.studioAccountingAudit || this.db.accountingAudit || this.db.accountingAudits || this.db.studioAccountingAudits;
  }

  // -------------------------------------------------------------
  // SANITIZATION & SECURITY UTILITIES
  // -------------------------------------------------------------

  public static sanitizeContent(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, 'blocked-scheme:')
      .replace(/data:/gi, 'blocked-scheme:')
      .replace(/vbscript:/gi, 'blocked-scheme:')
      .trim();
  }

  public static sanitizeCSVField(val: any): string {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    let safeStr = str;
    if (dangerousPrefixes.some(p => safeStr.startsWith(p))) {
      safeStr = `'${safeStr}`;
    }
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  public static sanitizeCsvField(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousPrefixes.some(p => str.startsWith(p))) {
      return `'${str}`;
    }
    return str;
  }

  public sanitizeCsvField(val: any): string {
    return StudioAccountingService.sanitizeCsvField(val);
  }

  public sanitizeCSVField(val: any): string {
    return StudioAccountingService.sanitizeCSVField(val);
  }

  // -------------------------------------------------------------
  // AUDIT LOG HELPER
  // -------------------------------------------------------------

  private async createAuditLog(
    studioId: string,
    entityType: string,
    entityId: string,
    action: string,
    actorMemberId?: string | null,
    beforeJson?: any,
    afterJson?: any,
    reason?: string | null
  ): Promise<void> {
    try {
      if (this.auditModel?.create) {
        await this.auditModel.create({
          data: {
            studio_id: studioId,
            entity_type: entityType,
            entity_id: entityId,
            action,
            actor_member_id: actorMemberId || null,
            before_json: beforeJson ? JSON.parse(JSON.stringify(beforeJson)) : null,
            after_json: afterJson ? JSON.parse(JSON.stringify(afterJson)) : null,
            reason: reason || null,
          },
        });
      }
    } catch (err) {
      console.error('[AccountingAuditLog] Failed to record audit log:', err);
    }
  }

  // -------------------------------------------------------------
  // 1. CHART OF ACCOUNTS
  // -------------------------------------------------------------

  public static readonly DEFAULT_ACCOUNTS: Array<{
    code: string;
    name: string;
    description: string;
    account_type: ChartOfAccountType;
    normal_balance: AccountNormalBalance;
    is_system: boolean;
  }> = [
    { code: '1000', name: 'Cash', description: 'Physical cash on hand', account_type: 'ASSET', normal_balance: 'DEBIT', is_system: true },
    { code: '1010', name: 'Bank Account', description: 'Primary operating checking account', account_type: 'ASSET', normal_balance: 'DEBIT', is_system: true },
    { code: '1020', name: 'Payment Processor', description: 'Stripe / Online processor holding balance', account_type: 'ASSET', normal_balance: 'DEBIT', is_system: true },
    { code: '1100', name: 'Accounts Receivable', description: 'Amounts due from clients for invoices/contracts', account_type: 'ASSET', normal_balance: 'DEBIT', is_system: true },
    { code: '1200', name: 'Inventory', description: 'Physical print media, frames, albums and materials', account_type: 'ASSET', normal_balance: 'DEBIT', is_system: false },
    { code: '2000', name: 'Accounts Payable', description: 'Unpaid bills due to vendors, labs and suppliers', account_type: 'LIABILITY', normal_balance: 'CREDIT', is_system: true },
    { code: '2100', name: 'Taxes Payable', description: 'Sales tax, GST, VAT collected and payable to authorities', account_type: 'LIABILITY', normal_balance: 'CREDIT', is_system: true },
    { code: '3000', name: 'Owner Equity', description: 'Owner initial investment and contributed capital', account_type: 'EQUITY', normal_balance: 'CREDIT', is_system: true },
    { code: '3100', name: 'Retained Earnings', description: 'Cumulative earnings retained in studio business', account_type: 'EQUITY', normal_balance: 'CREDIT', is_system: true },
    { code: '4000', name: 'Photography Revenue', description: 'Session fees, shoot packages and service revenue', account_type: 'REVENUE', normal_balance: 'CREDIT', is_system: true },
    { code: '4100', name: 'Print Revenue', description: 'Print products, wall art and album sales', account_type: 'REVENUE', normal_balance: 'CREDIT', is_system: true },
    { code: '5000', name: 'Cost of Goods Sold', description: 'Direct lab printing, framing, packaging and media production costs', account_type: 'COGS', normal_balance: 'DEBIT', is_system: true },
    { code: '6000', name: 'Marketing Expense', description: 'Advertising, paid ads, SEO and promotional costs', account_type: 'EXPENSE', normal_balance: 'DEBIT', is_system: false },
    { code: '6100', name: 'Software Expense', description: 'Cloud storage, editing software, and SaaS tools', account_type: 'EXPENSE', normal_balance: 'DEBIT', is_system: false },
    { code: '6200', name: 'Contractor Expense', description: 'Second shooters, assistant editors and makeup artists', account_type: 'EXPENSE', normal_balance: 'DEBIT', is_system: false },
    { code: '6300', name: 'Rent Expense', description: 'Studio space and venue rental expenses', account_type: 'EXPENSE', normal_balance: 'DEBIT', is_system: false },
    { code: '7000', name: 'Other Income', description: 'Interest, referral commissions and non-operating revenue', account_type: 'OTHER_INCOME', normal_balance: 'CREDIT', is_system: false },
    { code: '8000', name: 'Other Expense', description: 'Bank fees, currency exchange adjustments and non-operating losses', account_type: 'OTHER_EXPENSE', normal_balance: 'DEBIT', is_system: false },
  ];

  async initializeDefaultChartOfAccounts(studioId: string, actorMemberId?: string): Promise<IStudioChartOfAccountDTO[]> {
    const existing = await this.accountModel.findMany({ where: { studio_id: studioId } });
    if (existing.length > 0) {
      return existing;
    }

    const created: any[] = [];
    for (const acc of StudioAccountingService.DEFAULT_ACCOUNTS) {
      const row = await this.accountModel.create({
        data: {
          studio_id: studioId,
          code: acc.code,
          name: acc.name,
          description: acc.description,
          account_type: acc.account_type,
          normal_balance: acc.normal_balance,
          is_system: acc.is_system,
          is_active: true,
          currency: 'USD',
        },
      });
      created.push(row);
    }

    await this.createAuditLog(
      studioId,
      'CHART_OF_ACCOUNTS',
      studioId,
      'INITIALIZE_DEFAULT_CHART_OF_ACCOUNTS',
      actorMemberId,
      null,
      { count: created.length }
    );

    // Also initialize default accounting mappings
    await this.initializeDefaultMappings(studioId, actorMemberId);

    return created;
  }

  async createAccount(studioId: string, dto: ICreateChartOfAccountDTO, actorMemberId?: string): Promise<IStudioChartOfAccountDTO> {
    if (!dto.code || !dto.code.trim()) {
      throw new Error('Account code is required');
    }
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Account name is required');
    }

    const cleanCode = dto.code.trim();
    const existing = await this.accountModel.findFirst({
      where: { studio_id: studioId, code: cleanCode },
    });
    if (existing) {
      throw new Error(`Account code ${cleanCode} already exists in this studio`);
    }

    const account = await this.accountModel.create({
      data: {
        studio_id: studioId,
        code: cleanCode,
        name: StudioAccountingService.sanitizeContent(dto.name),
        description: dto.description ? StudioAccountingService.sanitizeContent(dto.description) : null,
        account_type: dto.account_type || 'EXPENSE',
        normal_balance: dto.normal_balance || (['ASSET', 'EXPENSE', 'COGS', 'OTHER_EXPENSE'].includes(dto.account_type) ? 'DEBIT' : 'CREDIT'),
        parent_account_id: dto.parent_account_id || null,
        is_system: dto.is_system ?? false,
        is_active: dto.is_active ?? true,
        currency: (dto.currency || 'USD').toUpperCase(),
      },
    });

    await this.createAuditLog(
      studioId,
      'CHART_OF_ACCOUNT',
      account.id,
      'CREATE_ACCOUNT',
      actorMemberId,
      null,
      account
    );

    return account;
  }

  async updateAccount(studioId: string, accountId: string, dto: IUpdateChartOfAccountDTO, actorMemberId?: string): Promise<IStudioChartOfAccountDTO> {
    const existing = await this.getAccountById(studioId, accountId);
    if (existing.is_system && (dto as any).code && (dto as any).code !== existing.code) {
      throw new Error('Cannot modify code on system accounts');
    }

    const updated = await this.accountModel.update({
      where: { id: accountId },
      data: {
        name: dto.name ? StudioAccountingService.sanitizeContent(dto.name) : undefined,
        description: dto.description !== undefined ? StudioAccountingService.sanitizeContent(dto.description) : undefined,
        normal_balance: dto.normal_balance,
        parent_account_id: dto.parent_account_id !== undefined ? dto.parent_account_id : undefined,
        is_active: dto.is_active !== undefined ? dto.is_active : undefined,
      },
    });

    await this.createAuditLog(
      studioId,
      'CHART_OF_ACCOUNT',
      accountId,
      'UPDATE_ACCOUNT',
      actorMemberId,
      existing,
      updated
    );

    return updated;
  }

  async archiveAccount(studioId: string, accountId: string, actorMemberId?: string): Promise<IStudioChartOfAccountDTO> {
    const existing = await this.getAccountById(studioId, accountId);
    if (existing.is_system) {
      throw new Error('System accounts cannot be archived');
    }

    // Check if account has posted journal lines
    const lineCount = await this.lineModel.count({
      where: {
        studio_id: studioId,
        account_id: accountId,
        journal_entry: { status: { in: ['POSTED', 'REVERSED'] } },
      },
    });
    if (lineCount > 0) {
      // Archive (soft disable) rather than delete
      const updated = await this.accountModel.update({
        where: { id: accountId },
        data: { is_active: false },
      });
      await this.createAuditLog(studioId, 'CHART_OF_ACCOUNT', accountId, 'ARCHIVE_ACCOUNT', actorMemberId, existing, updated);
      return updated;
    }

    const updated = await this.accountModel.update({
      where: { id: accountId },
      data: { is_active: false },
    });
    await this.createAuditLog(studioId, 'CHART_OF_ACCOUNT', accountId, 'DEACTIVATE_ACCOUNT', actorMemberId, existing, updated);
    return updated;
  }

  async listAccounts(studioId: string, query: { account_type?: ChartOfAccountType; is_active?: boolean } = {}): Promise<IStudioChartOfAccountDTO[]> {
    const where: any = { studio_id: studioId };
    if (query.account_type) {
      where.account_type = query.account_type;
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    return this.accountModel.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async getAccountById(studioId: string, accountId: string): Promise<IStudioChartOfAccountDTO> {
    const account = await this.accountModel.findFirst({
      where: { id: accountId, studio_id: studioId },
      include: { parent_account: true, child_accounts: true },
    });
    if (!account) {
      throw new Error(`Chart of Account not found: ${accountId}`);
    }
    return account;
  }

  async getAccountByCode(studioId: string, code: string): Promise<IStudioChartOfAccountDTO | null> {
    return this.accountModel.findFirst({
      where: { studio_id: studioId, code: code.trim() },
    });
  }

  // -------------------------------------------------------------
  // 2. SYSTEM ACCOUNT MAPPINGS
  // -------------------------------------------------------------

  async initializeDefaultMappings(studioId: string, actorMemberId?: string): Promise<IStudioAccountingMappingDTO[]> {
    const accounts = await this.listAccounts(studioId);
    const accByCode = new Map(accounts.map(a => [a.code, a.id]));

    const defaultMappings = [
      { event: 'CLIENT_PAYMENT', dr: '1000', cr: '1100', desc: 'Debit Cash, Credit Accounts Receivable' },
      { event: 'INVOICE_ISSUED', dr: '1100', cr: '4000', desc: 'Debit Accounts Receivable, Credit Photography Revenue' },
      { event: 'EXPENSE_APPROVED', dr: '6000', cr: '2000', desc: 'Debit Expense, Credit Accounts Payable' },
      { event: 'EXPENSE_PAID', dr: '2000', cr: '1000', desc: 'Debit Accounts Payable, Credit Cash' },
      { event: 'PRINT_ORDER_REVENUE', dr: '1020', cr: '4100', desc: 'Debit Payment Processor, Credit Print Revenue' },
      { event: 'PRINT_FULFILLMENT_COST', dr: '5000', cr: '2000', desc: 'Debit COGS, Credit Accounts Payable' },
      { event: 'REFUND_ISSUED', dr: '4000', cr: '1000', desc: 'Debit Revenue, Credit Cash' },
    ];

    for (const m of defaultMappings) {
      const drId = accByCode.get(m.dr);
      const crId = accByCode.get(m.cr);
      if (drId && crId) {
        const existing = await this.mappingModel.findFirst({
          where: { studio_id: studioId, event_type: m.event },
        });
        if (!existing) {
          await this.mappingModel.create({
            data: {
              studio_id: studioId,
              event_type: m.event,
              debit_account_id: drId,
              credit_account_id: crId,
              description: m.desc,
              is_active: true,
            },
          });
        }
      }
    }

    return this.listMappings(studioId);
  }

  async listMappings(studioId: string): Promise<IStudioAccountingMappingDTO[]> {
    return this.mappingModel.findMany({
      where: { studio_id: studioId },
      include: { debit_account: true, credit_account: true },
      orderBy: { event_type: 'asc' },
    });
  }

  async setMapping(studioId: string, dto: ICreateAccountingMappingDTO, actorMemberId?: string): Promise<IStudioAccountingMappingDTO> {
    // Validate accounts belong to this studio
    await this.getAccountById(studioId, dto.debit_account_id);
    await this.getAccountById(studioId, dto.credit_account_id);

    const existing = await this.mappingModel.findFirst({
      where: { studio_id: studioId, event_type: dto.event_type },
    });

    let mapping: any;
    if (existing) {
      mapping = await this.mappingModel.update({
        where: { id: existing.id },
        data: {
          debit_account_id: dto.debit_account_id,
          credit_account_id: dto.credit_account_id,
          description: dto.description ? StudioAccountingService.sanitizeContent(dto.description) : undefined,
          is_active: dto.is_active ?? true,
        },
      });
      await this.createAuditLog(studioId, 'ACCOUNTING_MAPPING', mapping.id, 'UPDATE_MAPPING', actorMemberId, existing, mapping);
    } else {
      mapping = await this.mappingModel.create({
        data: {
          studio_id: studioId,
          event_type: dto.event_type,
          debit_account_id: dto.debit_account_id,
          credit_account_id: dto.credit_account_id,
          description: dto.description ? StudioAccountingService.sanitizeContent(dto.description) : null,
          is_active: dto.is_active ?? true,
        },
      });
      await this.createAuditLog(studioId, 'ACCOUNTING_MAPPING', mapping.id, 'CREATE_MAPPING', actorMemberId, null, mapping);
    }

    return mapping;
  }

  async updateMapping(
    studioId: string,
    mappingId: string,
    dto: { debit_account_id?: string; credit_account_id?: string; is_active?: boolean },
    actorMemberId?: string
  ): Promise<IStudioAccountingMappingDTO> {
    const existing = await this.mappingModel.findFirst({
      where: { id: mappingId, studio_id: studioId },
    });
    if (!existing) {
      throw new Error(`Accounting mapping not found: ${mappingId}`);
    }

    if (dto.debit_account_id) {
      await this.getAccountById(studioId, dto.debit_account_id);
    }
    if (dto.credit_account_id) {
      await this.getAccountById(studioId, dto.credit_account_id);
    }

    const updated = await this.mappingModel.update({
      where: { id: mappingId },
      data: {
        debit_account_id: dto.debit_account_id,
        credit_account_id: dto.credit_account_id,
        is_active: dto.is_active,
      },
    });

    await this.createAuditLog(studioId, 'ACCOUNTING_MAPPING', mappingId, 'UPDATE_MAPPING', actorMemberId, existing, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // 3. JOURNAL ENTRIES & DOUBLE-ENTRY BALANCING
  // -------------------------------------------------------------

  private generateEntryNumber(date: Date, seq: number): string {
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    return `JE-${yr}${mo}-${String(seq).padStart(5, '0')}`;
  }

  async createJournalEntry(studioId: string, dto: ICreateJournalEntryDTO, actorMemberId: string): Promise<IStudioJournalEntryDTO> {
    if (!dto.description || !dto.description.trim()) {
      throw new Error('Journal entry description is required');
    }
    if (!dto.lines || dto.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines for double-entry balancing');
    }

    // Check idempotency
    if (dto.idempotency_key) {
      const existing = await this.journalModel.findFirst({
        where: { studio_id: studioId, idempotency_key: dto.idempotency_key },
        include: { lines: { include: { account: true } } },
      });
      if (existing) {
        return this.formatJournalDTO(existing);
      }
    }

    const entryDate = new Date(dto.entry_date || new Date());
    if (isNaN(entryDate.getTime())) {
      throw new Error('Invalid entry_date provided');
    }

    // Validate period status
    await this.validatePeriodOpenForDate(studioId, entryDate);

    // Validate line constraints & calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    for (const [idx, line] of dto.lines.entries()) {
      if ((line.debit_minor !== undefined && line.debit_minor < 0) || (line.credit_minor !== undefined && line.credit_minor < 0)) {
        throw new Error(`Line ${idx + 1}: Line debit and credit amounts cannot be negative`);
      }
      const dr = Math.floor(line.debit_minor || 0);
      const cr = Math.floor(line.credit_minor || 0);

      if (dr > 0 && cr > 0) {
        throw new Error(`Line ${idx + 1}: Line cannot have both debit and credit amounts`);
      }
      if (dr === 0 && cr === 0) {
        throw new Error(`Line ${idx + 1}: Line must have either debit or credit amount > 0`);
      }

      // Verify account ownership
      await this.getAccountById(studioId, line.account_id);

      totalDebit += dr;
      totalCredit += cr;
    }

    // Generate sequence number
    const count = await this.journalModel.count({ where: { studio_id: studioId } });
    const entryNumber = this.generateEntryNumber(entryDate, count + 1);

    // Create entry and lines
    const entry = await this.journalModel.create({
      data: {
        studio_id: studioId,
        entry_number: entryNumber,
        entry_date: entryDate,
        description: StudioAccountingService.sanitizeContent(dto.description),
        reference_type: dto.reference_type || null,
        reference_id: dto.reference_id || null,
        source_event_type: dto.source_event_type || null,
        source_event_id: dto.source_event_id || null,
        status: 'DRAFT',
        currency: (dto.currency || 'USD').toUpperCase(),
        total_debit_minor: BigInt(totalDebit),
        total_credit_minor: BigInt(totalCredit),
        idempotency_key: dto.idempotency_key || null,
        period_id: dto.period_id || null,
        created_by: actorMemberId,
        lines: {
          create: dto.lines.map((l, order) => {
            const dr = Math.max(0, Math.floor(l.debit_minor || 0));
            const cr = Math.max(0, Math.floor(l.credit_minor || 0));
            const rate = l.exchange_rate && l.exchange_rate > 0 ? l.exchange_rate : 1.0;
            return {
              studio_id: studioId,
              account_id: l.account_id,
              description: l.description ? StudioAccountingService.sanitizeContent(l.description) : null,
              debit_minor: BigInt(dr),
              credit_minor: BigInt(cr),
              currency: (l.currency || dto.currency || 'USD').toUpperCase(),
              exchange_rate: rate,
              base_debit_minor: BigInt(l.base_debit_minor !== undefined ? l.base_debit_minor : Math.round(dr * rate)),
              base_credit_minor: BigInt(l.base_credit_minor !== undefined ? l.base_credit_minor : Math.round(cr * rate)),
              reference_type: l.reference_type || null,
              reference_id: l.reference_id || null,
              line_order: l.line_order ?? order,
            };
          }),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    await this.createAuditLog(
      studioId,
      'JOURNAL_ENTRY',
      entry.id,
      'CREATE_JOURNAL_ENTRY',
      actorMemberId,
      null,
      { entry_number: entry.entry_number, total_debit: totalDebit, total_credit: totalCredit }
    );

    if (dto.auto_post) {
      return this.postJournalEntry(studioId, entry.id, actorMemberId);
    }

    return this.formatJournalDTO(entry);
  }

  async getJournalEntry(studioId: string, entryId: string): Promise<IStudioJournalEntryDTO> {
    const entry = await this.journalModel.findFirst({
      where: { id: entryId, studio_id: studioId },
      include: {
        lines: { include: { account: true } },
        period: true,
      },
    });
    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }
    return this.formatJournalDTO(entry);
  }

  async listJournalEntries(studioId: string, filter: any = {}): Promise<IStudioJournalEntryDTO[]> {
    const where: any = { studio_id: studioId };
    if (filter.status) where.status = filter.status;
    if (filter.period_id) where.period_id = filter.period_id;
    if (filter.reference_type) where.reference_type = filter.reference_type;
    if (filter.reference_id) where.reference_id = filter.reference_id;
    if (filter.start_date && filter.end_date) {
      where.entry_date = {
        gte: new Date(filter.start_date),
        lte: new Date(filter.end_date),
      };
    }

    const entries = await this.journalModel.findMany({
      where,
      include: {
        lines: { include: { account: true } },
        period: true,
      },
      orderBy: { entry_date: 'desc' },
    });

    return entries.map((e: any) => this.formatJournalDTO(e));
  }

  // -------------------------------------------------------------
  // 4. POSTING ENGINE
  // -------------------------------------------------------------

  async postJournalEntry(studioId: string, entryId: string, actorMemberId: string): Promise<IStudioJournalEntryDTO> {
    const entry = await this.journalModel.findFirst({
      where: { id: entryId, studio_id: studioId },
      include: { lines: { include: { account: true } } },
    });
    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }

    if (entry.status === 'POSTED') {
      throw new Error(`Cannot post entry with status POSTED (entry is already posted)`);
    }
    if (entry.status !== 'DRAFT') {
      throw new Error(`Cannot post journal entry in status ${entry.status}`);
    }

    if (!entry.lines || entry.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines to post');
    }

    // Verify double-entry balance: SUM(Debits) == SUM(Credits)
    let sumDebit = 0;
    let sumCredit = 0;
    for (const line of entry.lines) {
      sumDebit += Number(line.debit_minor);
      sumCredit += Number(line.credit_minor);
    }

    if (sumDebit !== sumCredit) {
      throw new Error(
        `Journal entry does not balance! Total Debits (${sumDebit}) must equal Total Credits (${sumCredit}). Difference: ${Math.abs(sumDebit - sumCredit)}`
      );
    }

    if (sumDebit === 0) {
      throw new Error('Cannot post a journal entry with zero total debits/credits');
    }

    // Validate period is open
    const postingDate = new Date();
    await this.validatePeriodOpenForDate(studioId, entry.entry_date);

    // Atomically transition status to POSTED
    const posted = await this.journalModel.update({
      where: { id: entryId },
      data: {
        status: 'POSTED',
        posting_date: postingDate,
        posted_by: actorMemberId,
        posted_at: postingDate,
        total_debit_minor: BigInt(sumDebit),
        total_credit_minor: BigInt(sumCredit),
      },
      include: { lines: { include: { account: true } } },
    });

    await this.createAuditLog(
      studioId,
      'JOURNAL_ENTRY',
      entryId,
      'POST_JOURNAL_ENTRY',
      actorMemberId,
      { status: 'DRAFT' },
      { status: 'POSTED', posted_at: postingDate, total_minor: sumDebit }
    );

    return this.formatJournalDTO(posted);
  }

  async setJournalLines(
    studioId: string,
    entryId: string,
    lines: ICreateJournalEntryLineDTO[],
    actorMemberId?: string
  ): Promise<IStudioJournalEntryDTO> {
    const entry = await this.journalModel.findFirst({
      where: { id: entryId, studio_id: studioId },
      include: { lines: true },
    });
    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }
    if (entry.status !== 'DRAFT') {
      throw new Error(`Cannot modify lines on entry with status ${entry.status}`);
    }
    if (!lines || lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const [idx, line] of lines.entries()) {
      if ((line.debit_minor !== undefined && line.debit_minor < 0) || (line.credit_minor !== undefined && line.credit_minor < 0)) {
        throw new Error(`Line ${idx + 1}: Line debit and credit amounts cannot be negative`);
      }
      const dr = Math.floor(line.debit_minor || 0);
      const cr = Math.floor(line.credit_minor || 0);
      if (dr > 0 && cr > 0) {
        throw new Error(`Line ${idx + 1}: Line cannot have both debit and credit amounts`);
      }
      if (dr === 0 && cr === 0) {
        throw new Error(`Line ${idx + 1}: Line must have either debit or credit amount > 0`);
      }
      totalDebit += dr;
      totalCredit += cr;
    }

    await this.lineModel.deleteMany({
      where: { journal_entry_id: entryId },
    });

    await this.lineModel.createMany({
      data: lines.map((l, order) => {
        const dr = Math.floor(l.debit_minor || 0);
        const cr = Math.floor(l.credit_minor || 0);
        const rate = l.exchange_rate && l.exchange_rate > 0 ? l.exchange_rate : 1.0;
        return {
          studio_id: studioId,
          journal_entry_id: entryId,
          account_id: l.account_id,
          description: l.description ? StudioAccountingService.sanitizeContent(l.description) : null,
          debit_minor: BigInt(dr),
          credit_minor: BigInt(cr),
          currency: (l.currency || entry.currency || 'USD').toUpperCase(),
          exchange_rate: rate,
          base_debit_minor: BigInt(l.base_debit_minor !== undefined ? l.base_debit_minor : Math.round(dr * rate)),
          base_credit_minor: BigInt(l.base_credit_minor !== undefined ? l.base_credit_minor : Math.round(cr * rate)),
          reference_type: l.reference_type || null,
          reference_id: l.reference_id || null,
          line_order: l.line_order ?? order,
        };
      }),
    });

    const updated = await this.journalModel.update({
      where: { id: entryId },
      data: {
        total_debit_minor: BigInt(totalDebit),
        total_credit_minor: BigInt(totalCredit),
      },
      include: { lines: { include: { account: true } } },
    });

    if (actorMemberId) {
      await this.createAuditLog(studioId, 'JOURNAL_ENTRY', entryId, 'UPDATE_JOURNAL_LINES', actorMemberId, entry, updated);
    }

    return this.formatJournalDTO(updated);
  }

  // -------------------------------------------------------------
  // 5. REVERSAL ENGINE
  // -------------------------------------------------------------

  async reverseJournalEntry(
    studioId: string,
    entryId: string,
    reason: string,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    if (!reason || !reason.trim()) {
      throw new Error('Reversal reason is required');
    }

    const original = await this.journalModel.findFirst({
      where: { id: entryId, studio_id: studioId },
      include: { lines: { include: { account: true } } },
    });
    if (!original) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }

    if (original.status === 'REVERSED') {
      throw new Error('Cannot reverse entry with status REVERSED');
    }
    if (original.status !== 'POSTED') {
      throw new Error(`Cannot reverse entry with status ${original.status}. Only POSTED entries can be reversed.`);
    }

    // Check if already reversed
    const existingReversal = await this.journalModel.findFirst({
      where: { studio_id: studioId, reversal_of_entry_id: entryId },
    });
    if (existingReversal) {
      throw new Error(`Cannot reverse entry with status REVERSED (already reversed by ${existingReversal.entry_number})`);
    }

    const reversalDate = new Date();
    await this.validatePeriodOpenForDate(studioId, reversalDate);

    // Create opposite lines: DR becomes CR, CR becomes DR
    const reversalLines = original.lines.map((l: any, idx: number) => ({
      account_id: l.account_id,
      description: `Reversal of line ${idx + 1}: ${l.description || original.description}`,
      debit_minor: Number(l.credit_minor), // Swap credit to debit
      credit_minor: Number(l.debit_minor), // Swap debit to credit
      currency: l.currency,
      exchange_rate: l.exchange_rate,
      base_debit_minor: Number(l.base_credit_minor),
      base_credit_minor: Number(l.base_debit_minor),
      reference_type: l.reference_type,
      reference_id: l.reference_id,
      line_order: idx,
    }));

    const count = await this.journalModel.count({ where: { studio_id: studioId } });
    const reversalEntryNumber = this.generateEntryNumber(reversalDate, count + 1);

    // Create reversal entry
    const reversal = await this.journalModel.create({
      data: {
        studio_id: studioId,
        entry_number: reversalEntryNumber,
        entry_date: reversalDate,
        posting_date: reversalDate,
        description: `REVERSAL of ${original.entry_number}: ${StudioAccountingService.sanitizeContent(reason)}`,
        reference_type: original.reference_type,
        reference_id: original.reference_id,
        source_event_type: 'REVERSAL',
        source_event_id: original.id,
        status: 'POSTED',
        currency: original.currency,
        total_debit_minor: original.total_credit_minor,
        total_credit_minor: original.total_debit_minor,
        reversal_of_entry_id: original.id,
        created_by: actorMemberId,
        posted_by: actorMemberId,
        posted_at: reversalDate,
        lines: {
          create: reversalLines.map((l: any) => ({
            studio_id: studioId,
            account_id: l.account_id,
            description: l.description,
            debit_minor: BigInt(l.debit_minor),
            credit_minor: BigInt(l.credit_minor),
            currency: l.currency || 'USD',
            exchange_rate: l.exchange_rate || 1.0,
            base_debit_minor: BigInt(l.base_debit_minor !== undefined ? l.base_debit_minor : Math.round(l.debit_minor * (l.exchange_rate || 1.0))),
            base_credit_minor: BigInt(l.base_credit_minor !== undefined ? l.base_credit_minor : Math.round(l.credit_minor * (l.exchange_rate || 1.0))),
            reference_type: l.reference_type || null,
            reference_id: l.reference_id || null,
            line_order: l.line_order || 0,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    // Mark original as REVERSED
    await this.journalModel.update({
      where: { id: original.id },
      data: {
        status: 'REVERSED',
        reversed_at: reversalDate,
      },
    });

    await this.createAuditLog(
      studioId,
      'JOURNAL_ENTRY',
      original.id,
      'REVERSE_JOURNAL_ENTRY',
      actorMemberId,
      { status: 'POSTED' },
      { status: 'REVERSED', reversal_entry_id: reversal.id, reason }
    );

    return this.formatJournalDTO(reversal);
  }

  async voidDraftJournalEntry(studioId: string, entryId: string, actorMemberId: string): Promise<IStudioJournalEntryDTO> {
    const entry = await this.journalModel.findFirst({
      where: { id: entryId, studio_id: studioId },
      include: { lines: true },
    });
    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }
    if (entry.status !== 'DRAFT') {
      throw new Error(`Only DRAFT entries can be voided. Current status: ${entry.status}`);
    }

    const updated = await this.journalModel.update({
      where: { id: entryId },
      data: { status: 'VOID' },
      include: { lines: { include: { account: true } } },
    });

    await this.createAuditLog(studioId, 'JOURNAL_ENTRY', entryId, 'VOID_JOURNAL_ENTRY', actorMemberId, { status: 'DRAFT' }, { status: 'VOID' });

    return this.formatJournalDTO(updated);
  }

  // -------------------------------------------------------------
  // 6. ACCOUNTING PERIODS & LOCKING
  // -------------------------------------------------------------

  async createPeriod(studioId: string, dto: ICreateAccountingPeriodDTO, actorMemberId: string): Promise<IStudioAccountingPeriodDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Period name is required');
    }
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new Error('Invalid start_date and end_date');
    }

    // Check overlapping periods
    const overlap = await this.periodModel.findFirst({
      where: {
        studio_id: studioId,
        OR: [
          { start_date: { lte: end }, end_date: { gte: start } },
        ],
      },
    });
    if (overlap) {
      throw new Error(`Period dates overlap with existing period "${overlap.name}" (${overlap.start_date.toISOString()} to ${overlap.end_date.toISOString()})`);
    }

    const period = await this.periodModel.create({
      data: {
        studio_id: studioId,
        name: StudioAccountingService.sanitizeContent(dto.name),
        start_date: start,
        end_date: end,
        status: 'OPEN',
      },
    });

    await this.createAuditLog(studioId, 'ACCOUNTING_PERIOD', period.id, 'CREATE_PERIOD', actorMemberId, null, period);
    return period;
  }

  async closePeriod(studioId: string, periodId: string, actorMemberId: string): Promise<IStudioAccountingPeriodDTO> {
    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) {
      throw new Error(`Accounting period not found: ${periodId}`);
    }
    if (period.status === 'LOCKED') {
      throw new Error('Cannot close a LOCKED accounting period');
    }

    const updated = await this.periodModel.update({
      where: { id: periodId },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        closed_by: actorMemberId,
      },
    });

    await this.createAuditLog(studioId, 'ACCOUNTING_PERIOD', periodId, 'CLOSE_PERIOD', actorMemberId, period, updated);
    return updated;
  }

  async reopenPeriod(studioId: string, periodId: string, reason: string, actorMemberId: string): Promise<IStudioAccountingPeriodDTO> {
    if (!reason || !reason.trim()) {
      throw new Error('Reason is required to reopen an accounting period');
    }

    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) {
      throw new Error(`Accounting period not found: ${periodId}`);
    }
    if (period.status === 'LOCKED') {
      throw new Error('Cannot reopen a LOCKED accounting period');
    }

    const updated = await this.periodModel.update({
      where: { id: periodId },
      data: {
        status: 'OPEN',
        closed_at: null,
        closed_by: null,
      },
    });

    await this.createAuditLog(studioId, 'ACCOUNTING_PERIOD', periodId, 'REOPEN_PERIOD', actorMemberId, period, updated, reason);
    return updated;
  }

  async lockPeriod(studioId: string, periodId: string, actorMemberId: string): Promise<IStudioAccountingPeriodDTO> {
    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) {
      throw new Error(`Accounting period not found: ${periodId}`);
    }

    const updated = await this.periodModel.update({
      where: { id: periodId },
      data: {
        status: 'LOCKED',
      },
    });

    await this.createAuditLog(studioId, 'ACCOUNTING_PERIOD', periodId, 'LOCK_PERIOD', actorMemberId, period, updated);
    return updated;
  }

  async listPeriods(studioId: string): Promise<IStudioAccountingPeriodDTO[]> {
    return this.periodModel.findMany({
      where: { studio_id: studioId },
      orderBy: { start_date: 'desc' },
    });
  }

  private async validatePeriodOpenForDate(studioId: string, date: Date): Promise<void> {
    const period = await this.periodModel.findFirst({
      where: {
        studio_id: studioId,
        start_date: { lte: date },
        end_date: { gte: date },
      },
    });

    if (period && period.status !== 'OPEN') {
      throw new Error(
        `Posting blocked: The accounting period "${period.name}" for date ${date.toISOString().split('T')[0]} is ${period.status}`
      );
    }
  }

  // -------------------------------------------------------------
  // 7. OPENING BALANCES
  // -------------------------------------------------------------

  async createOpeningBalance(
    studioId: string,
    dto: any,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    const lines = dto.balances || dto.lines || [];
    if (!lines || lines.length < 2) {
      throw new Error('Opening balance must contain at least 2 lines balancing to zero');
    }

    // Double-entry check
    let sumDebit = 0;
    let sumCredit = 0;
    for (const l of lines) {
      sumDebit += Math.max(0, Math.floor(l.debit_minor || 0));
      sumCredit += Math.max(0, Math.floor(l.credit_minor || 0));
    }

    if (sumDebit !== sumCredit) {
      throw new Error(`Opening balance is out of balance! Debits: ${sumDebit}, Credits: ${sumCredit}`);
    }

    const asOfDate = new Date(dto.opening_date || dto.as_of_date || new Date());

    const result = await this.createJournalEntry(
      studioId,
      {
        entry_date: asOfDate,
        description: dto.description || `Opening Balance as of ${asOfDate.toISOString().split('T')[0]}`,
        reference_type: 'OPENING_BALANCE',
        source_event_type: 'OPENING_BALANCE',
        currency: dto.currency || 'USD',
        lines: lines.map((l: any, i: number) => ({
          account_id: l.account_id,
          description: l.description || 'Opening Balance entry',
          debit_minor: l.debit_minor || 0,
          credit_minor: l.credit_minor || 0,
          line_order: i,
        })),
        auto_post: true,
      },
      actorMemberId
    );

    await this.createAuditLog(
      studioId,
      'OPENING_BALANCE',
      result.id,
      'CREATE_OPENING_BALANCE',
      actorMemberId,
      null,
      result
    );

    return result;
  }

  // -------------------------------------------------------------
  // 8. TRIAL BALANCE
  // -------------------------------------------------------------

  async getTrialBalance(studioId: string, options?: any): Promise<any> {
    let asOfDate = new Date();
    if (options instanceof Date) {
      asOfDate = options;
    } else if (options?.as_of_date) {
      asOfDate = new Date(options.as_of_date);
    }

    const accounts = await this.accountModel.findMany({
      where: { studio_id: studioId, is_active: true },
      orderBy: { code: 'asc' },
    });

    // Fetch all posted lines up to asOfDate
    const postedLines = await this.lineModel.findMany({
      where: {
        studio_id: studioId,
        journal_entry: {
          status: { in: ['POSTED', 'REVERSED'] },
          entry_date: { lte: asOfDate },
        },
      },
      select: {
        account_id: true,
        debit_minor: true,
        credit_minor: true,
      },
    });

    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();

    for (const line of postedLines) {
      const accId = line.account_id;
      debitMap.set(accId, (debitMap.get(accId) || 0) + Number(line.debit_minor));
      creditMap.set(accId, (creditMap.get(accId) || 0) + Number(line.credit_minor));
    }

    let grandDebit = 0;
    let grandCredit = 0;
    const entries: ITrialBalanceEntryDTO[] = [];

    for (const acc of accounts) {
      const totalDebit = debitMap.get(acc.id) || 0;
      const totalCredit = creditMap.get(acc.id) || 0;

      grandDebit += totalDebit;
      grandCredit += totalCredit;

      let netDebit = 0;
      let netCredit = 0;

      if (acc.normal_balance === 'DEBIT') {
        const net = totalDebit - totalCredit;
        if (net >= 0) netDebit = net;
        else netCredit = -net;
      } else {
        const net = totalCredit - totalDebit;
        if (net >= 0) netCredit = net;
        else netDebit = -net;
      }

      entries.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.account_type,
        normal_balance: acc.normal_balance,
        total_debit_minor: totalDebit,
        total_credit_minor: totalCredit,
        net_debit_minor: netDebit,
        net_credit_minor: netCredit,
      });
    }

    const difference = Math.abs(grandDebit - grandCredit);
    const isBalanced = difference === 0;

    return {
      as_of_date: asOfDate,
      currency: 'USD',
      is_balanced: isBalanced,
      total_debit_minor: grandDebit,
      total_credit_minor: grandCredit,
      difference_minor: difference,
      accounts: entries,
      rows: entries.map(e => ({
        ...e,
        debit_balance_minor: e.net_debit_minor,
        credit_balance_minor: e.net_credit_minor,
      })),
    };
  }

  // -------------------------------------------------------------
  // 9. GENERAL LEDGER & ACCOUNT ACTIVITY
  // -------------------------------------------------------------

  async getGeneralLedger(
    studioId: string,
    startDate: Date = new Date('1970-01-01'),
    endDate: Date = new Date('2099-12-31'),
    queryAccountId?: string
  ): Promise<any> {
    const accountWhere: any = { studio_id: studioId, is_active: true };
    if (queryAccountId) {
      accountWhere.id = queryAccountId;
    }

    const accounts = await this.accountModel.findMany({
      where: accountWhere,
      orderBy: { code: 'asc' },
    });

    const reportAccounts: any[] = [];
    let grandDebits = 0;
    let grandCredits = 0;

    for (const acc of accounts) {
      // 1. Calculate opening balance before startDate
      const priorLines = await this.lineModel.findMany({
        where: {
          studio_id: studioId,
          account_id: acc.id,
          journal_entry: {
            status: { in: ['POSTED', 'REVERSED'] },
            entry_date: { lt: startDate },
          },
        },
        select: { debit_minor: true, credit_minor: true },
      });

      let priorDebits = 0;
      let priorCredits = 0;
      for (const pl of priorLines) {
        priorDebits += Number(pl.debit_minor);
        priorCredits += Number(pl.credit_minor);
      }

      const openingBalance =
        acc.normal_balance === 'DEBIT'
          ? priorDebits - priorCredits
          : priorCredits - priorDebits;

      // 2. Fetch lines in current period
      const currentLines = await this.lineModel.findMany({
        where: {
          studio_id: studioId,
          account_id: acc.id,
          journal_entry: {
            status: { in: ['POSTED', 'REVERSED'] },
            entry_date: { gte: startDate, lte: endDate },
          },
        },
        include: { journal_entry: true },
        orderBy: { journal_entry: { entry_date: 'asc' } },
      });

      let runningBal = openingBalance;
      let periodDebits = 0;
      let periodCredits = 0;

      const entries: IGeneralLedgerEntryDTO[] = currentLines.map((l: any) => {
        const dr = Number(l.debit_minor);
        const cr = Number(l.credit_minor);
        periodDebits += dr;
        periodCredits += cr;

        if (acc.normal_balance === 'DEBIT') {
          runningBal += dr - cr;
        } else {
          runningBal += cr - dr;
        }

        return {
          line_id: l.id,
          entry_id: l.journal_entry?.id || l.journal_entry_id,
          entry_number: l.journal_entry?.entry_number || '',
          entry_date: l.journal_entry?.entry_date || new Date(),
          posting_date: l.journal_entry?.posting_date || l.journal_entry?.entry_date || new Date(),
          description: l.description || l.journal_entry?.description || '',
          reference_type: l.reference_type || l.journal_entry?.reference_type,
          reference_id: l.reference_id || l.journal_entry?.reference_id,
          debit_minor: dr,
          credit_minor: cr,
          running_balance_minor: runningBal,
        };
      });

      grandDebits += periodDebits;
      grandCredits += periodCredits;

      reportAccounts.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.account_type,
        normal_balance: acc.normal_balance,
        currency: acc.currency || 'USD',
        opening_balance_minor: openingBalance,
        total_debits_minor: periodDebits,
        total_credits_minor: periodCredits,
        closing_balance_minor: runningBal,
        entries,
        lines: entries,
      });
    }

    return {
      start_date: startDate,
      end_date: endDate,
      currency: 'USD',
      total_debit_minor: grandDebits,
      total_credit_minor: grandCredits,
      accounts: reportAccounts,
    };
  }

  async getAccountActivity(
    studioId: string,
    accountId: string,
    startDate: Date = new Date('1970-01-01'),
    endDate: Date = new Date('2099-12-31')
  ): Promise<any> {
    const acc = await this.getAccountById(studioId, accountId);
    const gl = await this.getGeneralLedger(studioId, startDate, endDate, accountId);
    const glAcc = gl.accounts.find((a: any) => a.account_id === accountId) || {
      account_id: acc.id,
      account_code: acc.code,
      account_name: acc.name,
      normal_balance: acc.normal_balance,
      currency: acc.currency,
      opening_balance_minor: 0,
      total_debits_minor: 0,
      total_credits_minor: 0,
      closing_balance_minor: 0,
      entries: [],
      lines: [],
    };

    return {
      account: acc,
      opening_balance_minor: glAcc.opening_balance_minor,
      closing_balance_minor: glAcc.closing_balance_minor,
      total_debits_minor: glAcc.total_debits_minor,
      total_credits_minor: glAcc.total_credits_minor,
      entries: glAcc.entries || [],
      lines: glAcc.lines || glAcc.entries || [],
    };
  }

  // -------------------------------------------------------------
  // 10. PROFIT & LOSS (FROM POSTED GENERAL LEDGER)
  // -------------------------------------------------------------

  async getProfitAndLoss(
    studioId: string,
    startDate: Date = new Date('1970-01-01'),
    endDate: Date = new Date('2099-12-31')
  ): Promise<any> {
    const gl = await this.getGeneralLedger(studioId, startDate, endDate);

    const revenueAccounts: any[] = [];
    const cogsAccounts: any[] = [];
    const expenseAccounts: any[] = [];
    const otherIncomeAccounts: any[] = [];
    const otherExpenseAccounts: any[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpense = 0;
    let totalOtherIncome = 0;
    let totalOtherExpense = 0;

    for (const acc of gl.accounts) {
      const netActivity =
        acc.normal_balance === 'CREDIT'
          ? acc.total_credits_minor - acc.total_debits_minor
          : acc.total_debits_minor - acc.total_credits_minor;

      if (netActivity === 0) continue;

      const item = {
        account_id: acc.account_id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        amount_minor: netActivity,
      };

      switch (acc.account_type) {
        case 'REVENUE':
          revenueAccounts.push(item);
          totalRevenue += netActivity;
          break;
        case 'COGS':
          cogsAccounts.push(item);
          totalCogs += netActivity;
          break;
        case 'EXPENSE':
          expenseAccounts.push(item);
          totalExpense += netActivity;
          break;
        case 'OTHER_INCOME':
          otherIncomeAccounts.push(item);
          totalOtherIncome += netActivity;
          break;
        case 'OTHER_EXPENSE':
          otherExpenseAccounts.push(item);
          totalOtherExpense += netActivity;
          break;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const operatingIncome = grossProfit - totalExpense;
    const netIncome = operatingIncome + totalOtherIncome - totalOtherExpense;
    const netMarginPct = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 10000) / 100 : 0;

    return {
      period_start: startDate,
      period_end: endDate,
      currency: 'USD',
      operating_revenue: { accounts: revenueAccounts, total_minor: totalRevenue },
      cost_of_goods_sold: { accounts: cogsAccounts, total_minor: totalCogs },
      gross_profit_minor: grossProfit,
      operating_expenses: { accounts: expenseAccounts, total_minor: totalExpense },
      operating_income_minor: operatingIncome,
      other_income: { accounts: otherIncomeAccounts, total_minor: totalOtherIncome },
      other_expenses: { accounts: otherExpenseAccounts, total_minor: totalOtherExpense },
      total_revenue_minor: totalRevenue,
      total_cogs_minor: totalCogs,
      total_expenses_minor: totalExpense,
      net_income_minor: netIncome,
      net_profit_minor: netIncome,
      net_margin_pct: netMarginPct,
    };
  }

  // -------------------------------------------------------------
  // 11. BALANCE SHEET (FROM POSTED GENERAL LEDGER)
  // -------------------------------------------------------------

  async getBalanceSheet(studioId: string, asOfDate: Date = new Date()): Promise<any> {
    const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
    const epochStart = new Date('1970-01-01');
    const gl = await this.getGeneralLedger(studioId, epochStart, asOf);
    const pnl = await this.getProfitAndLoss(studioId, epochStart, asOf);

    const currentAssets: any[] = [];
    const nonCurrentAssets: any[] = [];
    let totalAssets = 0;

    const currentLiabilities: any[] = [];
    const longTermLiabilities: any[] = [];
    let totalLiabilities = 0;

    const ownerEquityAccounts: any[] = [];
    let totalOwnerEquity = 0;

    for (const acc of gl.accounts) {
      const balance = acc.closing_balance_minor;
      if (balance === 0) continue;

      const item = {
        account_id: acc.account_id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        amount_minor: balance,
      };

      if (acc.account_type === 'ASSET') {
        currentAssets.push(item);
        totalAssets += balance;
      } else if (acc.account_type === 'LIABILITY') {
        currentLiabilities.push(item);
        totalLiabilities += balance;
      } else if (acc.account_type === 'EQUITY') {
        ownerEquityAccounts.push(item);
        totalOwnerEquity += balance;
      }
    }

    const currentNetIncome = pnl.net_profit_minor;
    const totalEquity = totalOwnerEquity + currentNetIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = diff === 0;

    return {
      as_of_date: asOf,
      currency: 'USD',
      is_balanced: isBalanced,
      assets: {
        current_assets: { accounts: currentAssets, total_minor: totalAssets },
        non_current_assets: { accounts: nonCurrentAssets, total_minor: 0 },
        total_assets_minor: totalAssets,
      },
      liabilities: {
        current_liabilities: { accounts: currentLiabilities, total_minor: totalLiabilities },
        long_term_liabilities: { accounts: longTermLiabilities, total_minor: 0 },
        total_liabilities_minor: totalLiabilities,
      },
      equity: {
        owner_equity: { accounts: ownerEquityAccounts, total_minor: totalOwnerEquity },
        retained_earnings_minor: currentNetIncome,
        current_period_net_income_minor: currentNetIncome,
        total_equity_minor: totalEquity,
      },
      total_assets_minor: totalAssets,
      total_liabilities_minor: totalLiabilities,
      total_equity_minor: totalEquity,
      retained_earnings_minor: currentNetIncome,
      total_liabilities_and_equity_minor: totalLiabilitiesAndEquity,
      difference_minor: diff,
    };
  }

  // -------------------------------------------------------------
  // 12. OPERATIONAL SUB-LEDGER INTEGRATION HANDLERS
  // -------------------------------------------------------------

  async recordOperationalEvent(studioId: string, dto: {
    event_type: string;
    amount_minor: number;
    currency?: string;
    reference_type: string;
    reference_id: string;
    description: string;
    date?: string | Date;
    created_by?: string;
  }): Promise<IStudioJournalEntryDTO> {
    const idempotencyKey = `op-${dto.event_type}-${dto.reference_id}`;
    const existing = await this.journalModel.findFirst({
      where: { studio_id: studioId, idempotency_key: idempotencyKey },
      include: { lines: { include: { account: true } } },
    });
    if (existing) {
      return this.formatJournalDTO(existing);
    }

    const accounts = await this.listAccounts(studioId);
    const mappings = await this.listMappings(studioId);
    const mapping = mappings.find(m => m.event_type === dto.event_type && m.is_active);

    let debitAccId = mapping?.debit_account_id;
    let creditAccId = mapping?.credit_account_id;

    if (!debitAccId || !creditAccId) {
      if (dto.event_type === 'INVOICE_ISSUED') {
        debitAccId = accounts.find(a => a.code === '1100')?.id;
        creditAccId = accounts.find(a => a.code === '4000')?.id;
      } else if (dto.event_type === 'CLIENT_PAYMENT') {
        debitAccId = accounts.find(a => a.code === '1000')?.id || accounts.find(a => a.code === '1010')?.id;
        creditAccId = accounts.find(a => a.code === '1100')?.id;
      } else if (dto.event_type === 'EXPENSE_APPROVED') {
        debitAccId = accounts.find(a => a.code === '6000')?.id;
        creditAccId = accounts.find(a => a.code === '2000')?.id;
      } else if (dto.event_type === 'EXPENSE_PAID') {
        debitAccId = accounts.find(a => a.code === '2000')?.id;
        creditAccId = accounts.find(a => a.code === '1000')?.id || accounts.find(a => a.code === '1010')?.id;
      } else if (dto.event_type === 'PRINT_ORDER_REVENUE') {
        debitAccId = accounts.find(a => a.code === '1000')?.id || accounts.find(a => a.code === '1010')?.id || accounts.find(a => a.code === '1020')?.id;
        creditAccId = accounts.find(a => a.code === '4100')?.id;
      } else if (dto.event_type === 'PRINT_FULFILLMENT_COST') {
        debitAccId = accounts.find(a => a.code === '5000')?.id;
        creditAccId = accounts.find(a => a.code === '2000')?.id;
      } else if (dto.event_type === 'REFUND_ISSUED') {
        debitAccId = accounts.find(a => a.code === '4000')?.id;
        creditAccId = accounts.find(a => a.code === '1000')?.id;
      }
    }

    if (!debitAccId || !creditAccId) {
      throw new Error(`Unable to determine debit and credit accounts for operational event: ${dto.event_type}`);
    }

    return this.createJournalEntry(
      studioId,
      {
        entry_date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description,
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        source_event_type: dto.event_type,
        source_event_id: dto.reference_id,
        idempotency_key: idempotencyKey,
        currency: dto.currency || 'USD',
        lines: [
          { account_id: debitAccId, debit_minor: dto.amount_minor, credit_minor: 0, description: `Debit leg: ${dto.description}` },
          { account_id: creditAccId, debit_minor: 0, credit_minor: dto.amount_minor, description: `Credit leg: ${dto.description}` },
        ],
        auto_post: true,
      },
      dto.created_by || 'system_operational'
    );
  }

  // -------------------------------------------------------------
  // 12. OPERATIONAL SUB-LEDGER INTEGRATION HANDLERS
  // -------------------------------------------------------------

  async recordReceivableInvoiceEvent(
    studioId: string,
    receivableId: string,
    amountCents: number,
    description: string,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    const accounts = await this.listAccounts(studioId);
    const arAcc = accounts.find(a => a.code === '1100') || accounts.find(a => a.account_type === 'ASSET' && a.name.includes('Receivable'));
    const revAcc = accounts.find(a => a.code === '4000') || accounts.find(a => a.account_type === 'REVENUE');

    if (!arAcc || !revAcc) {
      throw new Error('Required Chart of Accounts (1100 AR / 4000 Revenue) not configured');
    }

    return this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Invoice Created: ${description}`,
        reference_type: 'RECEIVABLE',
        reference_id: receivableId,
        source_event_type: 'INVOICE_ISSUED',
        source_event_id: receivableId,
        idempotency_key: `inv-rec-${receivableId}`,
        lines: [
          { account_id: arAcc.id, debit_minor: amountCents, credit_minor: 0, description: 'Debit Accounts Receivable' },
          { account_id: revAcc.id, debit_minor: 0, credit_minor: amountCents, description: 'Credit Photography Revenue' },
        ],
        auto_post: true,
      },
      actorMemberId
    );
  }

  async recordReceivablePaymentEvent(
    studioId: string,
    receivableId: string,
    amountCents: number,
    paymentMethod: string,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    const accounts = await this.listAccounts(studioId);
    const bankAcc = accounts.find(a => a.code === '1010') || accounts.find(a => a.code === '1000') || accounts.find(a => a.account_type === 'ASSET');
    const arAcc = accounts.find(a => a.code === '1100') || accounts.find(a => a.account_type === 'ASSET' && a.name.includes('Receivable'));

    if (!bankAcc || !arAcc) {
      throw new Error('Required Chart of Accounts (Bank / AR) not configured');
    }

    return this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Payment Received for Receivable ${receivableId} via ${paymentMethod}`,
        reference_type: 'RECEIVABLE',
        reference_id: receivableId,
        source_event_type: 'CLIENT_PAYMENT',
        source_event_id: receivableId,
        idempotency_key: `rec-pay-${receivableId}-${amountCents}-${Date.now()}`,
        lines: [
          { account_id: bankAcc.id, debit_minor: amountCents, credit_minor: 0, description: 'Debit Bank Account' },
          { account_id: arAcc.id, debit_minor: 0, credit_minor: amountCents, description: 'Credit Accounts Receivable' },
        ],
        auto_post: true,
      },
      actorMemberId
    );
  }

  async recordExpenseApprovedEvent(
    studioId: string,
    expenseId: string,
    amountCents: number,
    description: string,
    categoryName: string,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    const accounts = await this.listAccounts(studioId);
    const expAcc = accounts.find(a => a.code === '6000') || accounts.find(a => a.account_type === 'EXPENSE');
    const apAcc = accounts.find(a => a.code === '2000') || accounts.find(a => a.account_type === 'LIABILITY' && a.name.includes('Payable'));

    if (!expAcc || !apAcc) {
      throw new Error('Required Chart of Accounts (Expense / AP) not configured');
    }

    return this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Approved Expense: ${description} (${categoryName})`,
        reference_type: 'EXPENSE',
        reference_id: expenseId,
        source_event_type: 'EXPENSE_APPROVED',
        source_event_id: expenseId,
        idempotency_key: `exp-app-${expenseId}`,
        lines: [
          { account_id: expAcc.id, debit_minor: amountCents, credit_minor: 0, description: `Debit Expense (${categoryName})` },
          { account_id: apAcc.id, debit_minor: 0, credit_minor: amountCents, description: 'Credit Accounts Payable' },
        ],
        auto_post: true,
      },
      actorMemberId
    );
  }

  async recordExpenseDisbursementEvent(
    studioId: string,
    expenseId: string,
    amountCents: number,
    actorMemberId: string
  ): Promise<IStudioJournalEntryDTO> {
    const accounts = await this.listAccounts(studioId);
    const apAcc = accounts.find(a => a.code === '2000') || accounts.find(a => a.account_type === 'LIABILITY' && a.name.includes('Payable'));
    const bankAcc = accounts.find(a => a.code === '1010') || accounts.find(a => a.account_type === 'ASSET' && a.name.includes('Bank'));

    if (!apAcc || !bankAcc) {
      throw new Error('Required Chart of Accounts (AP / Bank) not configured');
    }

    return this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Expense Payment Disbursed for Expense ${expenseId}`,
        reference_type: 'EXPENSE',
        reference_id: expenseId,
        source_event_type: 'EXPENSE_PAID',
        source_event_id: expenseId,
        idempotency_key: `exp-disb-${expenseId}-${amountCents}-${Date.now()}`,
        lines: [
          { account_id: apAcc.id, debit_minor: amountCents, credit_minor: 0, description: 'Debit Accounts Payable' },
          { account_id: bankAcc.id, debit_minor: 0, credit_minor: amountCents, description: 'Credit Bank Account' },
        ],
        auto_post: true,
      },
      actorMemberId
    );
  }

  async recordFulfillmentOrderEvent(
    studioId: string,
    orderId: string,
    saleAmountCents: number,
    labCostCents: number,
    actorMemberId: string
  ): Promise<{ revenueJournal: IStudioJournalEntryDTO; cogsJournal: IStudioJournalEntryDTO }> {
    const accounts = await this.listAccounts(studioId);
    const procAcc = accounts.find(a => a.code === '1020') || accounts.find(a => a.code === '1010');
    const printRevAcc = accounts.find(a => a.code === '4100') || accounts.find(a => a.code === '4000');
    const cogsAcc = accounts.find(a => a.code === '5000') || accounts.find(a => a.account_type === 'COGS');
    const apAcc = accounts.find(a => a.code === '2000') || accounts.find(a => a.account_type === 'LIABILITY');

    if (!procAcc || !printRevAcc || !cogsAcc || !apAcc) {
      throw new Error('Required fulfillment Chart of Accounts (1020, 4100, 5000, 2000) not configured');
    }

    // 1. Revenue Entry
    const revenueJournal = await this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Print Order Revenue: Order ${orderId}`,
        reference_type: 'FULFILLMENT_ORDER',
        reference_id: orderId,
        source_event_type: 'PRINT_ORDER_REVENUE',
        source_event_id: orderId,
        idempotency_key: `print-rev-${orderId}`,
        lines: [
          { account_id: procAcc.id, debit_minor: saleAmountCents, credit_minor: 0, description: 'Debit Payment Processor' },
          { account_id: printRevAcc.id, debit_minor: 0, credit_minor: saleAmountCents, description: 'Credit Print Revenue' },
        ],
        auto_post: true,
      },
      actorMemberId
    );

    // 2. COGS Entry
    const cogsJournal = await this.createJournalEntry(
      studioId,
      {
        entry_date: new Date(),
        description: `Print Lab COGS Cost: Order ${orderId}`,
        reference_type: 'FULFILLMENT_ORDER',
        reference_id: orderId,
        source_event_type: 'PRINT_FULFILLMENT_COST',
        source_event_id: orderId,
        idempotency_key: `print-cogs-${orderId}`,
        lines: [
          { account_id: cogsAcc.id, debit_minor: labCostCents, credit_minor: 0, description: 'Debit Cost of Goods Sold' },
          { account_id: apAcc.id, debit_minor: 0, credit_minor: labCostCents, description: 'Credit Accounts Payable (Lab)' },
        ],
        auto_post: true,
      },
      actorMemberId
    );

    return { revenueJournal, cogsJournal };
  }

  // -------------------------------------------------------------
  // 13. CSV EXPORT ENGINE WITH FORMULA INJECTION DEFENSE
  // -------------------------------------------------------------

  async exportGeneralLedgerCSV(studioId: string, startDate: Date, endDate: Date): Promise<string> {
    const gl = await this.getGeneralLedger(studioId, startDate, endDate);

    const headers = [
      'Account Code',
      'Account Name',
      'Entry Number',
      'Date',
      'Description',
      'Debit (Cents)',
      'Credit (Cents)',
      'Running Balance (Cents)',
    ];

    const rows: string[] = [headers.join(',')];

    for (const acc of gl.accounts) {
      rows.push(
        [
          StudioAccountingService.sanitizeCSVField(acc.account_code),
          StudioAccountingService.sanitizeCSVField(acc.account_name),
          StudioAccountingService.sanitizeCSVField('OPENING BALANCE'),
          StudioAccountingService.sanitizeCSVField(startDate.toISOString().split('T')[0]),
          StudioAccountingService.sanitizeCSVField('Opening balance before period'),
          '0',
          '0',
          StudioAccountingService.sanitizeCSVField(acc.opening_balance_minor),
        ].join(',')
      );

      for (const entry of acc.entries) {
        rows.push(
          [
            StudioAccountingService.sanitizeCSVField(acc.account_code),
            StudioAccountingService.sanitizeCSVField(acc.account_name),
            StudioAccountingService.sanitizeCSVField(entry.entry_number),
            StudioAccountingService.sanitizeCSVField(new Date(entry.entry_date).toISOString().split('T')[0]),
            StudioAccountingService.sanitizeCSVField(entry.description),
            StudioAccountingService.sanitizeCSVField(entry.debit_minor),
            StudioAccountingService.sanitizeCSVField(entry.credit_minor),
            StudioAccountingService.sanitizeCSVField(entry.running_balance_minor),
          ].join(',')
        );
      }
    }

    return rows.join('\n');
  }

  async exportTrialBalanceCSV(studioId: string, asOfDate: Date = new Date()): Promise<string> {
    const tb = await this.getTrialBalance(studioId, asOfDate);

    const headers = [
      'Account Code',
      'Account Name',
      'Type',
      'Normal Balance',
      'Total Debit (Cents)',
      'Total Credit (Cents)',
      'Net Debit (Cents)',
      'Net Credit (Cents)',
    ];

    const rows: string[] = [headers.join(',')];

    for (const acc of tb.accounts) {
      rows.push(
        [
          StudioAccountingService.sanitizeCSVField(acc.account_code),
          StudioAccountingService.sanitizeCSVField(acc.account_name),
          StudioAccountingService.sanitizeCSVField(acc.account_type),
          StudioAccountingService.sanitizeCSVField(acc.normal_balance),
          StudioAccountingService.sanitizeCSVField(acc.total_debit_minor),
          StudioAccountingService.sanitizeCSVField(acc.total_credit_minor),
          StudioAccountingService.sanitizeCSVField(acc.net_debit_minor),
          StudioAccountingService.sanitizeCSVField(acc.net_credit_minor),
        ].join(',')
      );
    }

    rows.push(
      [
        'TOTALS',
        tb.is_balanced ? 'BALANCED' : 'OUT OF BALANCE',
        '',
        '',
        StudioAccountingService.sanitizeCSVField(tb.total_debit_minor),
        StudioAccountingService.sanitizeCSVField(tb.total_credit_minor),
        '',
        '',
      ].join(',')
    );

    return rows.join('\n');
  }

  // -------------------------------------------------------------
  // HELPER FORMATTERS
  // -------------------------------------------------------------

  private formatJournalDTO(entry: any): IStudioJournalEntryDTO {
    return {
      id: entry.id,
      studio_id: entry.studio_id,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      posting_date: entry.posting_date,
      description: entry.description,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      source_event_type: entry.source_event_type,
      source_event_id: entry.source_event_id,
      status: entry.status,
      currency: entry.currency,
      total_debit_minor: Number(entry.total_debit_minor),
      total_credit_minor: Number(entry.total_credit_minor),
      reversal_of_entry_id: entry.reversal_of_entry_id,
      idempotency_key: entry.idempotency_key,
      created_by: entry.created_by,
      posted_by: entry.posted_by,
      posted_at: entry.posted_at,
      reversed_at: entry.reversed_at,
      period_id: entry.period_id,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      lines: entry.lines
        ? entry.lines.map((l: any) => ({
            id: l.id,
            studio_id: l.studio_id,
            journal_entry_id: l.journal_entry_id,
            account_id: l.account_id,
            description: l.description,
            debit_minor: Number(l.debit_minor),
            credit_minor: Number(l.credit_minor),
            currency: l.currency,
            exchange_rate: l.exchange_rate,
            base_debit_minor: Number(l.base_debit_minor),
            base_credit_minor: Number(l.base_credit_minor),
            reference_type: l.reference_type,
            reference_id: l.reference_id,
            line_order: l.line_order,
            created_at: l.created_at,
            account: l.account
              ? {
                  id: l.account.id,
                  studio_id: l.account.studio_id,
                  code: l.account.code,
                  name: l.account.name,
                  account_type: l.account.account_type,
                  normal_balance: l.account.normal_balance,
                  is_system: l.account.is_system,
                  is_active: l.account.is_active,
                  currency: l.account.currency,
                  created_at: l.account.created_at,
                  updated_at: l.account.updated_at,
                }
              : undefined,
          }))
        : undefined,
      period: entry.period,
      reversal_of: entry.reversal_of ? this.formatJournalDTO(entry.reversal_of) : undefined,
    };
  }
}
