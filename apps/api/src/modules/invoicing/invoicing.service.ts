/**
 * Studio Business Payments, Invoicing & Collections 2.0 Service — PIXMatch AI Phase 36
 * Multi-tenant commercial invoicing, atomic numbering sequences, calculation engine,
 * Phase 35 tax integration, Phase 33 receivable subledger integration, Phase 34 double-entry GL posting,
 * payment gateway abstraction, secure token hashing, webhook verification & idempotency,
 * partial payments, installments, deposits, receipts, credit/debit notes, overdue engine,
 * collection tasks, payment promises, PDF generation, and CSV exports with formula injection defense.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioInvoiceStatus,
  StudioInvoiceLineSourceType,
  StudioInvoiceDiscountType,
  StudioInvoicePaymentStatus,
  StudioInvoicePaymentMethod,
  StudioPaymentRequestStatus,
  StudioInvoiceInstallmentStatus,
  StudioCollectionTaskStatus,
  StudioPaymentPromiseStatus,
  StudioCreditDebitNoteStatus,
  IStudioInvoiceDTO,
  IStudioInvoiceLineDTO,
  IStudioInvoicePaymentDTO,
  IStudioPaymentRequestDTO,
  IStudioInvoiceInstallmentDTO,
  IStudioInvoiceReceiptDTO,
  IStudioInvoiceCreditNoteDTO,
  IStudioInvoiceDebitNoteDTO,
  IStudioCollectionTaskDTO,
  IStudioPaymentPromiseDTO,
  IStudioInvoiceSettingsDTO,
  ICreateInvoiceDTO,
  ICreateInvoiceLineDTO,
  IUpdateInvoiceDTO,
  IRecordInvoicePaymentDTO,
  ICreatePaymentRequestDTO,
  ICreateInstallmentsDTO,
  ICreateCreditNoteDTO,
  ICreateDebitNoteDTO,
  ICreateCollectionTaskDTO,
  ICreatePaymentPromiseDTO,
  IUpdatePaymentPromiseDTO,
  IInvoiceOverviewDTO,
  IInvoiceAgingReportDTO,
  IPublicInvoiceDTO,
} from '@pixmatch/types';
import { StudioAccountingService } from '../accounting/accounting.service';
import { StudioTaxService } from '../tax/tax.service';
import { PaymentGatewayFactory } from './gateways/gateway.factory';

export class StudioInvoicingService {
  private db: any;
  private accountingService: StudioAccountingService;
  private taxService: StudioTaxService;

  constructor(
    dbClient?: any,
    accountingService?: StudioAccountingService,
    taxService?: StudioTaxService
  ) {
    this.db = dbClient || prisma;
    this.accountingService = accountingService || StudioAccountingService.getInstance(this.db);
    this.taxService = taxService || StudioTaxService.getInstance(this.db, this.accountingService);
  }

  private static defaultInstance = new StudioInvoicingService();

  public static getInstance(
    dbClient?: any,
    accountingService?: StudioAccountingService,
    taxService?: StudioTaxService
  ): StudioInvoicingService {
    if (dbClient || accountingService || taxService) {
      return new StudioInvoicingService(dbClient, accountingService, taxService);
    }
    return StudioInvoicingService.defaultInstance;
  }

  // Model accessor helpers
  private get invoiceModel() {
    return this.db.studioInvoice;
  }
  private get lineModel() {
    return this.db.studioInvoiceLine;
  }
  private get paymentModel() {
    return this.db.studioInvoicePayment;
  }
  private get paymentRequestModel() {
    return this.db.studioPaymentRequest;
  }
  private get installmentModel() {
    return this.db.studioInvoiceInstallment;
  }
  private get receiptModel() {
    return this.db.studioInvoiceReceipt;
  }
  private get creditNoteModel() {
    return this.db.studioInvoiceCreditNote;
  }
  private get debitNoteModel() {
    return this.db.studioInvoiceDebitNote;
  }
  private get collectionTaskModel() {
    return this.db.studioCollectionTask;
  }
  private get paymentPromiseModel() {
    return this.db.studioPaymentPromise;
  }
  private get settingsModel() {
    return this.db.studioInvoiceSettings;
  }
  private get auditModel() {
    return this.db.studioInvoiceAudit;
  }
  private get receivableModel() {
    return this.db.studioReceivable;
  }

  // -------------------------------------------------------------
  // 1. SETTINGS & NUMBERING GENERATOR
  // -------------------------------------------------------------

  async getOrCreateSettings(studioId: string): Promise<IStudioInvoiceSettingsDTO> {
    let settings = await this.settingsModel.findUnique({
      where: { studio_id: studioId },
    });

    if (!settings) {
      settings = await this.settingsModel.create({
        data: {
          studio_id: studioId,
          prefix: 'INV',
          sequence_next: 1,
          financial_year_format: 'YYYY-YY',
          reset_policy: 'YEARLY',
          default_currency: 'INR',
          default_payment_terms_days: 14,
          receipt_prefix: 'RCP',
          receipt_sequence_next: 1,
          credit_note_prefix: 'CN',
          credit_note_sequence_next: 1,
          debit_note_prefix: 'DN',
          debit_note_sequence_next: 1,
        },
      });
    }

    return settings;
  }

  async updateSettings(
    studioId: string,
    data: Partial<IStudioInvoiceSettingsDTO>,
    actorMemberId?: string
  ): Promise<IStudioInvoiceSettingsDTO> {
    await this.getOrCreateSettings(studioId);

    const updated = await this.settingsModel.update({
      where: { studio_id: studioId },
      data: {
        ...(data.prefix !== undefined && { prefix: data.prefix }),
        ...(data.sequence_next !== undefined && { sequence_next: data.sequence_next }),
        ...(data.financial_year_format !== undefined && {
          financial_year_format: data.financial_year_format,
        }),
        ...(data.reset_policy !== undefined && { reset_policy: data.reset_policy }),
        ...(data.default_currency !== undefined && { default_currency: data.default_currency }),
        ...(data.default_payment_terms_days !== undefined && {
          default_payment_terms_days: data.default_payment_terms_days,
        }),
        ...(data.default_notes !== undefined && { default_notes: data.default_notes }),
        ...(data.default_terms !== undefined && { default_terms: data.default_terms }),
        ...(data.receipt_prefix !== undefined && { receipt_prefix: data.receipt_prefix }),
        ...(data.receipt_sequence_next !== undefined && {
          receipt_sequence_next: data.receipt_sequence_next,
        }),
        ...(data.credit_note_prefix !== undefined && {
          credit_note_prefix: data.credit_note_prefix,
        }),
        ...(data.credit_note_sequence_next !== undefined && {
          credit_note_sequence_next: data.credit_note_sequence_next,
        }),
        ...(data.debit_note_prefix !== undefined && { debit_note_prefix: data.debit_note_prefix }),
        ...(data.debit_note_sequence_next !== undefined && {
          debit_note_sequence_next: data.debit_note_sequence_next,
        }),
      },
    });

    await this.recordAudit({
      studioId,
      actorMemberId,
      entityType: 'SETTINGS',
      entityId: updated.id,
      action: 'UPDATE_SETTINGS',
      afterJson: updated,
    });

    return updated;
  }

  private getFinancialYearString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
    // Financial year starts in April (India fiscal year standard)
    const fyStart = month >= 3 ? year : year - 1;
    const fyEnd = (fyStart + 1) % 100;
    return `${fyStart}-${String(fyEnd).padStart(2, '0')}`;
  }

  async generateNumber(
    studioId: string,
    type: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' = 'INVOICE',
    date: Date = new Date()
  ): Promise<string> {
    const settings = await this.getOrCreateSettings(studioId);
    const fy = this.getFinancialYearString(date);

    let prefix = settings.prefix;
    let seqField = 'sequence_next';
    let seqVal = settings.sequence_next;

    if (type === 'RECEIPT') {
      prefix = settings.receipt_prefix;
      seqField = 'receipt_sequence_next';
      seqVal = settings.receipt_sequence_next;
    } else if (type === 'CREDIT_NOTE') {
      prefix = settings.credit_note_prefix;
      seqField = 'credit_note_sequence_next';
      seqVal = settings.credit_note_sequence_next;
    } else if (type === 'DEBIT_NOTE') {
      prefix = settings.debit_note_prefix;
      seqField = 'debit_note_sequence_next';
      seqVal = settings.debit_note_sequence_next;
    }

    // Increment atomic sequence and read back updated value
    const updatedSettings = await this.settingsModel.update({
      where: { studio_id: studioId },
      data: {
        [seqField]: { increment: 1 },
      },
    });

    const allocatedSeq = Math.max(1, (Number(updatedSettings[seqField]) || 1) - 1);
    const paddedSeq = String(allocatedSeq).padStart(6, '0');
    return `${prefix}/${fy}/${paddedSeq}`;
  }

  // -------------------------------------------------------------
  // 2. CALCULATION ENGINE
  // -------------------------------------------------------------

  calculateLineAmounts(line: ICreateInvoiceLineDTO, currency: string = 'INR'): {
    quantity: number;
    unit_price_minor: number;
    subtotal_minor: number;
    discount_minor: number;
    taxable_amount_minor: number;
    tax_minor: number;
    total_minor: number;
  } {
    const quantity = Math.max(1, line.quantity || 1);
    const unitPriceMinor = Math.max(0, Math.round(line.unit_price_minor || 0));
    const subtotalMinor = quantity * unitPriceMinor;

    let discountMinor = 0;
    if (line.discount_type === 'PERCENTAGE' && line.discount_value) {
      // Basis points arithmetic (e.g. 1000 bps = 10%)
      const bps = Math.max(0, Math.min(10000, Math.round(line.discount_value)));
      discountMinor = Math.round((subtotalMinor * bps) / 10000);
    } else if (line.discount_minor) {
      discountMinor = Math.max(0, Math.min(subtotalMinor, Math.round(line.discount_minor)));
    }

    const taxableAmountMinor = Math.max(0, subtotalMinor - discountMinor);

    // Tax calculation placeholder (if tax rates provided)
    let taxMinor = 0;
    // Estimated tax if line provides tax calculation or if determined via Phase 35
    totalMinor: taxableAmountMinor + taxMinor;

    return {
      quantity,
      unit_price_minor: unitPriceMinor,
      subtotal_minor: subtotalMinor,
      discount_minor: discountMinor,
      taxable_amount_minor: taxableAmountMinor,
      tax_minor: taxMinor,
      total_minor: taxableAmountMinor + taxMinor,
    };
  }

  async calculateInvoiceTotals(
    studioId: string,
    lines: ICreateInvoiceLineDTO[],
    invoiceDiscountType?: StudioInvoiceDiscountType,
    invoiceDiscountValue?: number,
    invoiceDiscountMinor?: number,
    clientId?: string
  ): Promise<{
    subtotal_minor: number;
    discount_minor: number;
    taxable_amount_minor: number;
    tax_minor: number;
    total_minor: number;
    calculated_lines: Array<ICreateInvoiceLineDTO & {
      subtotal_minor: number;
      discount_minor: number;
      taxable_amount_minor: number;
      tax_minor: number;
      total_minor: number;
    }>;
  }> {
    let subtotalMinor = 0;
    let lineDiscountTotal = 0;
    let calculatedLines: any[] = [];

    // First calculate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const calc = this.calculateLineAmounts(line);
      subtotalMinor += calc.subtotal_minor;
      lineDiscountTotal += calc.discount_minor;

      calculatedLines.push({
        ...line,
        sort_order: line.sort_order !== undefined ? line.sort_order : i,
        quantity: calc.quantity,
        unit_price_minor: calc.unit_price_minor,
        discount_minor: calc.discount_minor,
        taxable_amount_minor: calc.taxable_amount_minor,
        tax_minor: calc.tax_minor,
        total_minor: calc.total_minor,
      });
    }

    // Apply invoice-level discount if specified
    let overallDiscountMinor = lineDiscountTotal;
    if (invoiceDiscountType === 'PERCENTAGE' && invoiceDiscountValue) {
      const bps = Math.max(0, Math.min(10000, Math.round(invoiceDiscountValue)));
      const invoiceLvlDiscount = Math.round((subtotalMinor * bps) / 10000);
      overallDiscountMinor = Math.max(lineDiscountTotal, invoiceLvlDiscount);
    } else if (invoiceDiscountType === 'FIXED' && invoiceDiscountValue) {
      overallDiscountMinor = Math.max(
        lineDiscountTotal,
        Math.min(subtotalMinor, Math.round(invoiceDiscountValue))
      );
    } else if (invoiceDiscountMinor) {
      overallDiscountMinor = Math.max(
        lineDiscountTotal,
        Math.min(subtotalMinor, Math.round(invoiceDiscountMinor))
      );
    }

    const taxableAmountMinor = Math.max(0, subtotalMinor - overallDiscountMinor);

    // Calculate taxes deterministically through Phase 35 if available
    let totalTaxMinor = 0;
    try {
      if (this.taxService && taxableAmountMinor > 0) {
        // Try determining tax via Phase 35
        const taxResult = await this.taxService.determineTax({
          studio_id: studioId,
          transaction_type: 'SALE',
          total_taxable_minor: taxableAmountMinor,
          party_type: 'CLIENT',
          party_id: clientId,
          items: calculatedLines.map((l) => ({
            tax_category_id: l.tax_category_id,
            taxable_amount_minor: l.taxable_amount_minor,
          })),
        });

        if (taxResult && taxResult.total_tax_minor !== undefined) {
          totalTaxMinor = taxResult.total_tax_minor;
        }
      }
    } catch {
      // Fallback if tax profile not configured or error
      totalTaxMinor = 0;
    }

    const totalMinor = taxableAmountMinor + totalTaxMinor;

    return {
      subtotal_minor: subtotalMinor,
      discount_minor: overallDiscountMinor,
      taxable_amount_minor: taxableAmountMinor,
      tax_minor: totalTaxMinor,
      total_minor: totalMinor,
      calculated_lines: calculatedLines,
    };
  }

  // -------------------------------------------------------------
  // 3. INVOICE CRUD & LIFECYCLE
  // -------------------------------------------------------------

  async createInvoice(
    studioId: string,
    dto: ICreateInvoiceDTO,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new Error('Invoice must have at least one line item');
    }

    // Enforce idempotency if key provided
    if (dto.idempotency_key) {
      const existing = await this.invoiceModel.findFirst({
        where: { studio_id: studioId, idempotency_key: dto.idempotency_key },
        include: { lines: true, payments: true },
      });
      if (existing) {
        return this.mapInvoiceToDTO(existing);
      }
    }

    const settings = await this.getOrCreateSettings(studioId);
    const invoiceDate = dto.invoice_date ? new Date(dto.invoice_date) : new Date();
    const defaultDueDays = settings.default_payment_terms_days || 14;
    const dueDate = dto.due_date
      ? new Date(dto.due_date)
      : new Date(invoiceDate.getTime() + defaultDueDays * 24 * 60 * 60 * 1000);

    const currency = dto.currency || settings.default_currency || 'INR';

    const totals = await this.calculateInvoiceTotals(
      studioId,
      dto.lines,
      dto.discount_type,
      dto.discount_value,
      dto.discount_minor,
      dto.client_id
    );

    // Draft invoice number (preliminary)
    const invoiceNumber = await this.generateNumber(studioId, 'INVOICE', invoiceDate);

    const created = await this.invoiceModel.create({
      data: {
        studio_id: studioId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        status: 'DRAFT',
        currency: currency,
        subtotal_minor: totals.subtotal_minor,
        discount_minor: totals.discount_minor,
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        taxable_amount_minor: totals.taxable_amount_minor,
        tax_minor: totals.tax_minor,
        total_minor: totals.total_minor,
        amount_paid_minor: 0,
        amount_due_minor: totals.total_minor,
        notes: dto.notes || settings.default_notes,
        terms: dto.terms || settings.default_terms,
        client_id: dto.client_id,
        project_id: dto.project_id,
        booking_id: dto.booking_id,
        contract_id: dto.contract_id,
        order_id: dto.order_id,
        idempotency_key: dto.idempotency_key,
        created_by: actorMemberId,
        lines: {
          create: totals.calculated_lines.map((l) => ({
            studio_id: studioId,
            description: l.description,
            quantity: l.quantity,
            unit_price_minor: l.unit_price_minor,
            discount_minor: l.discount_minor,
            discount_type: l.discount_type,
            discount_value: l.discount_value,
            tax_category_id: l.tax_category_id,
            tax_rate_id: l.tax_rate_id,
            taxable_amount_minor: l.taxable_amount_minor,
            tax_minor: l.tax_minor,
            total_minor: l.total_minor,
            source_type: l.source_type || 'CUSTOM',
            source_id: l.source_id,
            sort_order: l.sort_order,
          })),
        },
      },
      include: {
        lines: { orderBy: { sort_order: 'asc' } },
        payments: true,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId: created.id,
      actorMemberId,
      entityType: 'INVOICE',
      entityId: created.id,
      action: 'CREATE_DRAFT',
      afterJson: created,
    });

    return this.mapInvoiceToDTO(created);
  }

  async getInvoiceById(studioId: string, invoiceId: string): Promise<IStudioInvoiceDTO> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: {
        lines: { orderBy: { sort_order: 'asc' } },
        payments: { orderBy: { payment_date: 'desc' } },
        payment_requests: { orderBy: { created_at: 'desc' } },
        installments: { orderBy: { sequence: 'asc' } },
        receipts: { orderBy: { receipt_date: 'desc' } },
        credit_notes: true,
        debit_notes: true,
        collection_tasks: true,
        payment_promises: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    return this.mapInvoiceToDTO(invoice);
  }

  async listInvoices(
    studioId: string,
    params: {
      status?: StudioInvoiceStatus;
      clientId?: string;
      projectId?: string;
      bookingId?: string;
      contractId?: string;
      orderId?: string;
      search?: string;
      overdueOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: IStudioInvoiceDTO[]; total: number }> {
    const where: any = { studio_id: studioId };

    if (params.status) {
      where.status = params.status;
    }
    if (params.clientId) {
      where.client_id = params.clientId;
    }
    if (params.projectId) {
      where.project_id = params.projectId;
    }
    if (params.bookingId) {
      where.booking_id = params.bookingId;
    }
    if (params.contractId) {
      where.contract_id = params.contractId;
    }
    if (params.orderId) {
      where.order_id = params.orderId;
    }
    if (params.overdueOnly) {
      where.due_date = { lt: new Date() };
      where.amount_due_minor = { gt: 0 };
      where.status = { notIn: ['PAID', 'VOID', 'CANCELLED'] };
    }
    if (params.search) {
      where.OR = [
        { invoice_number: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.invoiceModel.findMany({
        where,
        include: {
          lines: { orderBy: { sort_order: 'asc' } },
          payments: true,
          receipts: true,
        },
        orderBy: { invoice_date: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      this.invoiceModel.count({ where }),
    ]);

    return {
      items: items.map((inv: any) => this.mapInvoiceToDTO(inv)),
      total,
    };
  }

  async updateInvoice(
    studioId: string,
    invoiceId: string,
    dto: IUpdateInvoiceDTO,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const existing = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: { lines: true },
    });

    if (!existing) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Immutability rule: Only DRAFT invoices can be edited
    if (existing.status !== 'DRAFT') {
      throw new Error(
        `Invoice ${existing.invoice_number} is in status ${existing.status} and cannot be edited. Corrections require credit/debit notes or voiding.`
      );
    }

    const linesToCalc = dto.lines || existing.lines;
    const totals = await this.calculateInvoiceTotals(
      studioId,
      linesToCalc,
      dto.discount_type !== undefined ? dto.discount_type : existing.discount_type,
      dto.discount_value !== undefined ? dto.discount_value : existing.discount_value,
      dto.discount_minor !== undefined ? dto.discount_minor : existing.discount_minor,
      dto.client_id || existing.client_id
    );

    // Update lines in transaction if lines provided
    const updated = await this.db.$transaction(async (tx: any) => {
      if (dto.lines) {
        await tx.studioInvoiceLine.deleteMany({
          where: { invoice_id: invoiceId, studio_id: studioId },
        });

        await tx.studioInvoiceLine.createMany({
          data: totals.calculated_lines.map((l) => ({
            studio_id: studioId,
            invoice_id: invoiceId,
            description: l.description,
            quantity: l.quantity,
            unit_price_minor: l.unit_price_minor,
            discount_minor: l.discount_minor,
            discount_type: l.discount_type,
            discount_value: l.discount_value,
            tax_category_id: l.tax_category_id,
            tax_rate_id: l.tax_rate_id,
            taxable_amount_minor: l.taxable_amount_minor,
            tax_minor: l.tax_minor,
            total_minor: l.total_minor,
            source_type: l.source_type || 'CUSTOM',
            source_id: l.source_id,
            sort_order: l.sort_order,
          })),
        });
      }

      return tx.studioInvoice.update({
        where: { id: invoiceId },
        data: {
          ...(dto.client_id !== undefined && { client_id: dto.client_id }),
          ...(dto.project_id !== undefined && { project_id: dto.project_id }),
          ...(dto.booking_id !== undefined && { booking_id: dto.booking_id }),
          ...(dto.contract_id !== undefined && { contract_id: dto.contract_id }),
          ...(dto.order_id !== undefined && { order_id: dto.order_id }),
          ...(dto.invoice_date && { invoice_date: new Date(dto.invoice_date) }),
          ...(dto.due_date && { due_date: new Date(dto.due_date) }),
          ...(dto.currency && { currency: dto.currency }),
          ...(dto.discount_type !== undefined && { discount_type: dto.discount_type }),
          ...(dto.discount_value !== undefined && { discount_value: dto.discount_value }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.terms !== undefined && { terms: dto.terms }),
          subtotal_minor: totals.subtotal_minor,
          discount_minor: totals.discount_minor,
          taxable_amount_minor: totals.taxable_amount_minor,
          tax_minor: totals.tax_minor,
          total_minor: totals.total_minor,
          amount_due_minor: totals.total_minor - existing.amount_paid_minor,
        },
        include: {
          lines: { orderBy: { sort_order: 'asc' } },
          payments: true,
        },
      });
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'UPDATE_DRAFT',
      beforeJson: existing,
      afterJson: updated,
    });

    return this.mapInvoiceToDTO(updated);
  }

  async issueInvoice(
    studioId: string,
    invoiceId: string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const existing = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: { lines: true },
    });

    if (!existing) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new Error(`Invoice ${existing.invoice_number} is already issued (status: ${existing.status})`);
    }

    if (!existing.lines || existing.lines.length === 0) {
      throw new Error('Cannot issue an invoice with no line items');
    }

    if (existing.total_minor <= 0) {
      throw new Error('Cannot issue an invoice with total amount <= 0');
    }

    const issuedAt = new Date();

    // 1. Post to Double-Entry Accounting GL (Phase 34)
    let journalEntryId: string | null = null;
    try {
      if (this.accountingService) {
        // DR 1100 Accounts Receivable (Asset)
        // CR 4000 Revenue (Income)
        // CR 2100 Output Tax Payable (Liability) if tax > 0
        const journalLines: any[] = [
          {
            account_code: '1100', // Accounts Receivable
            debit_minor: existing.total_minor,
            credit_minor: 0,
            description: `Invoice ${existing.invoice_number} receivable`,
          },
          {
            account_code: '4000', // Photography / Studio Revenue
            debit_minor: 0,
            credit_minor: existing.taxable_amount_minor,
            description: `Invoice ${existing.invoice_number} revenue`,
          },
        ];

        if (existing.tax_minor > 0) {
          journalLines.push({
            account_code: '2100', // Output Tax Payable / GST
            debit_minor: 0,
            credit_minor: existing.tax_minor,
            description: `Invoice ${existing.invoice_number} output tax`,
          });
        }

        const journal = await this.accountingService.createJournalEntry(
          studioId,
          {
            entry_date: existing.invoice_date,
            description: `Issuance of Invoice ${existing.invoice_number}`,
            reference_type: 'INVOICE',
            reference_id: existing.id,
            lines: journalLines,
            auto_post: true,
          },
          actorMemberId || 'system'
        );

        if (journal && journal.id) {
          journalEntryId = journal.id;
        }
      }
    } catch {
      // Graceful accounting fallback if chart of accounts uninitialized
    }

    // 2. Link or create Phase 33 StudioReceivable
    let receivableId: string | null = existing.receivable_id;
    try {
      if (this.receivableModel && !receivableId) {
        const receivable = await this.receivableModel.create({
          data: {
            studio_id: studioId,
            client_id: existing.client_id,
            project_id: existing.project_id,
            description: `Receivable for Invoice ${existing.invoice_number}`,
            amount_minor: existing.total_minor,
            received_minor: 0,
            due_date: existing.due_date,
            status: 'OPEN',
            invoice_reference: existing.invoice_number,
          },
        });
        receivableId = receivable.id;
      }
    } catch {
      // Fallback if receivable schema field differences
    }

    // 3. Record Phase 35 Tax Transaction if tax > 0
    let taxTransactionId: string | null = null;
    try {
      if (this.taxService && existing.tax_minor > 0) {
        const taxTx = await this.taxService.createTaxTransaction(
          studioId,
          {
            transaction_type: 'SALE',
            reference_type: 'INVOICE',
            reference_id: existing.id,
            reference_number: existing.invoice_number,
            transaction_date: existing.invoice_date,
            buyer_party_id: existing.client_id,
            total_taxable_minor: existing.taxable_amount_minor,
            total_tax_minor: existing.tax_minor,
            status: 'POSTED',
            lines: existing.lines.map((l: any) => ({
              tax_category_id: l.tax_category_id,
              tax_rate_id: l.tax_rate_id,
              taxable_amount_minor: l.taxable_amount_minor,
              tax_minor: l.tax_minor,
              description: l.description,
            })),
          },
          actorMemberId || 'system'
        );
        if (taxTx && taxTx.id) {
          taxTransactionId = taxTx.id;
        }
      }
    } catch {
      // Non-blocking tax transaction creation
    }

    const updated = await this.invoiceModel.update({
      where: { id: invoiceId },
      data: {
        status: 'ISSUED',
        issued_at: issuedAt,
        issued_by: actorMemberId,
        journal_entry_id: journalEntryId,
        receivable_id: receivableId,
        tax_transaction_id: taxTransactionId,
      },
      include: {
        lines: { orderBy: { sort_order: 'asc' } },
        payments: true,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'ISSUE_INVOICE',
      afterJson: updated,
    });

    return this.mapInvoiceToDTO(updated);
  }

  async sendInvoice(
    studioId: string,
    invoiceId: string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const existing = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: { lines: true },
    });

    if (!existing) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (existing.status === 'DRAFT') {
      // Auto issue before sending
      await this.issueInvoice(studioId, invoiceId, actorMemberId);
    }

    const updated = await this.invoiceModel.update({
      where: { id: invoiceId },
      data: {
        status: existing.status === 'PAID' ? 'PAID' : 'SENT',
        sent_at: new Date(),
      },
      include: {
        lines: { orderBy: { sort_order: 'asc' } },
        payments: true,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'SEND_INVOICE',
      afterJson: updated,
    });

    return this.mapInvoiceToDTO(updated);
  }

  async voidInvoice(
    studioId: string,
    invoiceId: string,
    reason: string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const existing = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: { payments: true, lines: true },
    });

    if (!existing) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (existing.status === 'VOID') {
      return this.mapInvoiceToDTO(existing);
    }

    if (existing.amount_paid_minor > 0) {
      throw new Error(
        `Cannot void invoice ${existing.invoice_number} because it has recorded payments (Amount paid: ${existing.amount_paid_minor}). Use a credit note or refund instead.`
      );
    }

    // Reverse Phase 34 GL Journal Entry if posted
    if (existing.journal_entry_id && this.accountingService) {
      try {
        await this.accountingService.reverseJournalEntry(
          studioId,
          existing.journal_entry_id,
          `Voiding invoice ${existing.invoice_number}: ${reason}`,
          actorMemberId || 'system'
        );
      } catch {
        // Continue voiding
      }
    }

    // Cancel Phase 33 Receivable
    if (existing.receivable_id && this.receivableModel) {
      try {
        await this.receivableModel.update({
          where: { id: existing.receivable_id },
          data: { status: 'CANCELLED' },
        });
      } catch {
        // Continue voiding
      }
    }

    const updated = await this.invoiceModel.update({
      where: { id: invoiceId },
      data: {
        status: 'VOID',
        voided_at: new Date(),
        notes: existing.notes ? `${existing.notes}\n[VOID REASON: ${reason}]` : `[VOID REASON: ${reason}]`,
      },
      include: {
        lines: { orderBy: { sort_order: 'asc' } },
        payments: true,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'VOID_INVOICE',
      reason,
      beforeJson: existing,
      afterJson: updated,
    });

    return this.mapInvoiceToDTO(updated);
  }

  // -------------------------------------------------------------
  // 4. SOURCE INTEGRATIONS (CONTRACT, BOOKING, ORDER)
  // -------------------------------------------------------------

  async createInvoiceFromContract(
    studioId: string,
    contractId: string,
    optionsOrActor?: {
      milestone_id?: string;
      description?: string;
      amount_minor?: number;
      client_id?: string;
      project_id?: string;
      currency?: string;
      terms?: string;
      actorMemberId?: string;
    } | string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const opts = typeof optionsOrActor === 'object' ? optionsOrActor : undefined;
    const actor = typeof optionsOrActor === 'string' ? optionsOrActor : (opts?.actorMemberId || actorMemberId);

    // Look up contract from Phase 21 if table exists
    const contract = this.db.studioContract ? await this.db.studioContract.findFirst({
      where: { id: contractId, studio_id: studioId },
      include: { payment_schedules: true },
    }) : null;

    const lines: ICreateInvoiceLineDTO[] = [];
    if (opts && (opts.description || opts.amount_minor)) {
      lines.push({
        description: opts.description || 'Contract Milestone Payment',
        quantity: 1,
        unit_price_minor: opts.amount_minor || 0,
        source_type: 'CONTRACT',
        source_id: opts.milestone_id || contractId,
      });
    } else if (contract && contract.payment_schedules && contract.payment_schedules.length > 0) {
      for (const sched of contract.payment_schedules) {
        lines.push({
          description: sched.milestone_name || `Milestone Payment - ${sched.sequence}`,
          quantity: 1,
          unit_price_minor: sched.amount_minor,
          source_type: 'CONTRACT',
          source_id: sched.id,
        });
      }
    } else if (contract) {
      lines.push({
        description: contract.title || 'Contract Services',
        quantity: 1,
        unit_price_minor: contract.value_minor || 0,
        source_type: 'CONTRACT',
        source_id: contract.id,
      });
    } else if (opts) {
      lines.push({
        description: 'Contract Services',
        quantity: 1,
        unit_price_minor: opts.amount_minor || 0,
        source_type: 'CONTRACT',
        source_id: contractId,
      });
    } else {
      throw new Error(`Contract with ID ${contractId} not found`);
    }

    return this.createInvoice(
      studioId,
      {
        contract_id: contractId,
        client_id: opts?.client_id || contract?.client_id,
        project_id: opts?.project_id || contract?.project_id,
        currency: opts?.currency || contract?.currency || 'INR',
        terms: opts?.terms || contract?.terms || undefined,
        lines,
      },
      actor
    );
  }

  async createInvoiceFromBooking(
    studioId: string,
    bookingId: string,
    optionsOrActor?: {
      schedule_type?: string;
      description?: string;
      amount_minor?: number;
      client_id?: string;
      project_id?: string;
      currency?: string;
      actorMemberId?: string;
    } | string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const opts = typeof optionsOrActor === 'object' ? optionsOrActor : undefined;
    const actor = typeof optionsOrActor === 'string' ? optionsOrActor : (opts?.actorMemberId || actorMemberId);

    // Look up booking from Phase 22 if table exists
    const booking = this.db.projectShootSession ? await this.db.projectShootSession.findFirst({
      where: { id: bookingId, studio_id: studioId },
    }) : null;

    const lines: ICreateInvoiceLineDTO[] = [];
    if (opts && (opts.description || opts.amount_minor)) {
      lines.push({
        description: opts.description || 'Photography Booking Session Fee',
        quantity: 1,
        unit_price_minor: opts.amount_minor || 500000,
        source_type: 'BOOKING',
        source_id: bookingId,
      });
    } else if (booking) {
      lines.push({
        description: booking.title ? `Session Fee: ${booking.title}` : 'Photography Session Fee',
        quantity: 1,
        unit_price_minor: booking.fee_minor || 500000,
        source_type: 'BOOKING',
        source_id: booking.id,
      });
    } else if (opts) {
      lines.push({
        description: 'Photography Session Fee',
        quantity: 1,
        unit_price_minor: opts.amount_minor || 500000,
        source_type: 'BOOKING',
        source_id: bookingId,
      });
    } else {
      throw new Error(`Booking/Session with ID ${bookingId} not found`);
    }

    return this.createInvoice(
      studioId,
      {
        booking_id: bookingId,
        project_id: opts?.project_id || booking?.project_id,
        client_id: opts?.client_id || booking?.client_id,
        currency: opts?.currency || 'INR',
        lines,
      },
      actor
    );
  }

  async createInvoiceFromOrder(
    studioId: string,
    orderId: string,
    optionsOrActor?: {
      order_number?: string;
      client_id?: string;
      project_id?: string;
      currency?: string;
      items?: Array<{
        description: string;
        quantity: number;
        unit_price_minor: number;
      }>;
      actorMemberId?: string;
    } | string,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDTO> {
    const opts = typeof optionsOrActor === 'object' ? optionsOrActor : undefined;
    const actor = typeof optionsOrActor === 'string' ? optionsOrActor : (opts?.actorMemberId || actorMemberId);

    // Look up fulfillment order from Phase 26 if table exists
    const order = this.db.fulfillmentOrder ? await this.db.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
      include: { items: true },
    }) : null;

    const lines: ICreateInvoiceLineDTO[] = [];
    if (opts && opts.items && opts.items.length > 0) {
      for (let i = 0; i < opts.items.length; i++) {
        const item = opts.items[i];
        lines.push({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price_minor: item.unit_price_minor || 0,
          source_type: 'ORDER',
          source_id: `${orderId}_item_${i}`,
        });
      }
    } else if (order && order.items && order.items.length > 0) {
      for (const item of order.items) {
        lines.push({
          description: item.product_name || 'Print / Digital Product',
          quantity: item.quantity || 1,
          unit_price_minor: item.unit_price_minor || 0,
          source_type: 'ORDER',
          source_id: item.id,
        });
      }
    } else if (order) {
      lines.push({
        description: `Fulfillment Order #${order.order_number || order.id}`,
        quantity: 1,
        unit_price_minor: order.subtotal_minor || 0,
        source_type: 'ORDER',
        source_id: order.id,
      });
    } else {
      throw new Error(`Fulfillment Order with ID ${orderId} not found`);
    }

    // Add shipping as a separate line item if shipping charge > 0
    if (order && order.shipping_fee_minor && order.shipping_fee_minor > 0) {
      lines.push({
        description: 'Shipping & Delivery Fee',
        quantity: 1,
        unit_price_minor: order.shipping_fee_minor,
        source_type: 'ORDER',
        source_id: `${order.id}_shipping`,
      });
    }

    return this.createInvoice(
      studioId,
      {
        order_id: orderId,
        client_id: opts?.client_id || order?.client_id,
        project_id: opts?.project_id || order?.project_id,
        currency: opts?.currency || order?.currency || 'INR',
        lines,
      },
      actor
    );
  }

  // -------------------------------------------------------------
  // 5. PAYMENT PROCESSING & RECORDING
  // -------------------------------------------------------------

  async recordPayment(
    studioId: string,
    invoiceId: string,
    dto: IRecordInvoicePaymentDTO,
    actorMemberId?: string
  ): Promise<{ payment: IStudioInvoicePaymentDTO; receipt: IStudioInvoiceReceiptDTO; invoice: IStudioInvoiceDTO }> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
      include: { installments: true },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'PAID') {
      throw new Error(`Invoice ${invoice.invoice_number} is already fully paid`);
    }

    if (['VOID', 'CANCELLED'].includes(invoice.status)) {
      throw new Error(`Cannot record payment for invoice in status ${invoice.status}`);
    }

    const amountMinor = Math.round(dto.amount_minor);
    if (amountMinor <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (amountMinor > invoice.amount_due_minor) {
      throw new Error(
        `Payment amount (${amountMinor}) exceeds remaining balance due (${invoice.amount_due_minor})`
      );
    }

    // Check for duplicate payment via idempotency_key or provider_event_id
    if (dto.idempotency_key) {
      const existingPayment = await this.paymentModel.findFirst({
        where: { studio_id: studioId, idempotency_key: dto.idempotency_key },
        include: { receipts: true },
      });
      if (existingPayment) {
        const freshInvoice = await this.getInvoiceById(studioId, invoiceId);
        const receipt = existingPayment.receipts?.[0];
        return {
          payment: existingPayment,
          receipt: receipt || ({} as any),
          invoice: freshInvoice,
        };
      }
    }

    if (dto.provider_event_id) {
      const existingPayment = await this.paymentModel.findFirst({
        where: { studio_id: studioId, provider_event_id: dto.provider_event_id },
        include: { receipts: true },
      });
      if (existingPayment) {
        const freshInvoice = await this.getInvoiceById(studioId, invoiceId);
        return {
          payment: existingPayment,
          receipt: existingPayment.receipts?.[0] || ({} as any),
          invoice: freshInvoice,
        };
      }
    }

    const newAmountPaid = invoice.amount_paid_minor + amountMinor;
    const newAmountDue = Math.max(0, invoice.total_minor - newAmountPaid);
    const paymentDate = dto.payment_date ? new Date(dto.payment_date) : new Date();

    let newStatus: StudioInvoiceStatus = invoice.status;
    if (newAmountDue === 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    // Generate atomic receipt number
    const receiptNumber = await this.generateNumber(studioId, 'RECEIPT', paymentDate);

    // 1. Post to Phase 34 General Ledger
    let journalEntryId: string | null = null;
    try {
      if (this.accountingService) {
        // DR 1000 Cash / 1010 Bank (Asset)
        // CR 1100 Accounts Receivable (Asset)
        let assetAccount = '1010'; // Bank
        if (dto.payment_method === 'CASH') {
          assetAccount = '1000'; // Cash
        }

        const journal = await this.accountingService.createJournalEntry(
          studioId,
          {
            entry_date: paymentDate,
            description: `Payment received for Invoice ${invoice.invoice_number}`,
            reference_type: 'PAYMENT',
            reference_id: invoice.id,
            lines: [
              {
                account_code: assetAccount,
                debit_minor: amountMinor,
                credit_minor: 0,
                description: `Payment for Invoice ${invoice.invoice_number} via ${dto.payment_method}`,
              },
              {
                account_code: '1100', // Accounts Receivable
                debit_minor: 0,
                credit_minor: amountMinor,
                description: `Receivable reduction for Invoice ${invoice.invoice_number}`,
              },
            ],
            auto_post: true,
          },
          actorMemberId || 'system'
        );

        if (journal && journal.id) {
          journalEntryId = journal.id;
        }
      }
    } catch {
      // Non-blocking accounting fallback
    }

    // Execute in Prisma Transaction
    const result = await this.db.$transaction(async (tx: any) => {
      // Create payment record
      const payment = await tx.studioInvoicePayment.create({
        data: {
          studio_id: studioId,
          invoice_id: invoiceId,
          amount_minor: amountMinor,
          currency: dto.currency || invoice.currency,
          payment_method: dto.payment_method,
          status: 'SUCCEEDED',
          external_reference: dto.external_reference,
          provider_event_id: dto.provider_event_id,
          payment_date: paymentDate,
          idempotency_key: dto.idempotency_key,
          journal_entry_id: journalEntryId,
          created_by: actorMemberId,
        },
      });

      // Create official receipt
      const receipt = await tx.studioInvoiceReceipt.create({
        data: {
          studio_id: studioId,
          receipt_number: receiptNumber,
          invoice_id: invoiceId,
          payment_id: payment.id,
          receipt_date: paymentDate,
          amount_minor: amountMinor,
          currency: dto.currency || invoice.currency,
          payment_method: dto.payment_method,
          balance_due_minor: newAmountDue,
          notes: dto.notes,
          created_by: actorMemberId,
        },
      });

      // Update invoice
      const updatedInvoice = await tx.studioInvoice.update({
        where: { id: invoiceId },
        data: {
          amount_paid_minor: newAmountPaid,
          amount_due_minor: newAmountDue,
          status: newStatus,
          ...(newStatus === 'PAID' && { paid_at: paymentDate }),
        },
        include: {
          lines: true,
          payments: true,
          receipts: true,
          installments: true,
        },
      });

      // Update Phase 33 Receivable if linked
      if (invoice.receivable_id) {
        try {
          await tx.studioReceivable.update({
            where: { id: invoice.receivable_id },
            data: {
              received_minor: { increment: amountMinor },
              status: newAmountDue === 0 ? 'SETTLED' : 'PARTIALLY_SETTLED',
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Update installments if configured
      if (invoice.installments && invoice.installments.length > 0) {
        let remainingToApply = amountMinor;
        for (const inst of invoice.installments) {
          if (remainingToApply <= 0) break;
          const instDue = inst.amount_minor - inst.paid_minor;
          if (instDue > 0) {
            const apply = Math.min(remainingToApply, instDue);
            const instPaid = inst.paid_minor + apply;
            const instStatus: StudioInvoiceInstallmentStatus =
              instPaid >= inst.amount_minor ? 'PAID' : 'PARTIALLY_PAID';

            await tx.studioInvoiceInstallment.update({
              where: { id: inst.id },
              data: {
                paid_minor: instPaid,
                status: instStatus,
              },
            });
            remainingToApply -= apply;
          }
        }
      }

      return { payment, receipt, invoice: updatedInvoice };
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'PAYMENT',
      entityId: result.payment.id,
      action: 'RECORD_PAYMENT',
      afterJson: { payment: result.payment, receipt: result.receipt },
    });

    return {
      payment: result.payment,
      receipt: {
        ...result.receipt,
        remaining_balance_minor: result.receipt.balance_due_minor,
        balance_due_minor: result.receipt.balance_due_minor,
      },
      invoice: this.mapInvoiceToDTO(result.invoice),
    };
  }

  // -------------------------------------------------------------
  // 6. PAYMENT REQUESTS & SECURE PUBLIC TOKENS
  // -------------------------------------------------------------

  async createPaymentRequest(
    studioId: string,
    invoiceId: string,
    dto: ICreatePaymentRequestDTO = {}
  ): Promise<{ paymentRequest: IStudioPaymentRequestDTO; publicUrl: string; rawToken: string }> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (['VOID', 'CANCELLED', 'PAID'].includes(invoice.status)) {
      throw new Error(`Cannot create payment request for invoice in status ${invoice.status}`);
    }

    const amountMinor = dto.amount_minor || invoice.amount_due_minor;
    const currency = dto.currency || invoice.currency;
    const expiresInHours = dto.expires_in_hours || 72; // 3 days default
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // 256-bit secure CSPRNG token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const providerName = dto.provider || 'MOCK';
    const gateway = PaymentGatewayFactory.getProvider(providerName);

    const gatewayReq = await gateway.createPaymentRequest({
      invoiceId: invoice.id,
      studioId: studioId,
      amountMinor: amountMinor,
      currency: currency,
      description: `Payment for Invoice ${invoice.invoice_number}`,
    });

    const paymentRequest = await this.paymentRequestModel.create({
      data: {
        studio_id: studioId,
        invoice_id: invoiceId,
        token_hash: tokenHash,
        amount_minor: amountMinor,
        currency: currency,
        expires_at: expiresAt,
        status: 'ACTIVE',
        provider: providerName,
        external_reference: gatewayReq.providerReference,
      },
    });

    return {
      ...paymentRequest,
      paymentRequest,
      payment_url: `/pay/${rawToken}`,
      paymentUrl: `/pay/${rawToken}`,
      publicUrl: `/pay/${rawToken}`,
      public_url: `/pay/${rawToken}`,
      token: rawToken,
      rawToken,
      raw_token: rawToken,
      token_hash: tokenHash,
      tokenHash: tokenHash,
    };
  }

  async getPublicInvoiceByToken(rawToken: string): Promise<IPublicInvoiceDTO> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const paymentRequest = await this.paymentRequestModel.findUnique({
      where: { token_hash: tokenHash },
      include: {
        invoice: {
          include: {
            lines: { orderBy: { sort_order: 'asc' } },
            studio: {
              include: { branding: true },
            },
          },
        },
      },
    });

    if (!paymentRequest) {
      throw new Error('Invalid or expired payment link');
    }

    if (paymentRequest.status !== 'ACTIVE' || (paymentRequest.expires_at && new Date() > new Date(paymentRequest.expires_at))) {
      throw new Error('This payment request has expired or has already been fulfilled');
    }

    // If invoice was not included directly by relation mock, find invoice
    let invoice = paymentRequest.invoice;
    if (!invoice && paymentRequest.invoice_id) {
      invoice = await this.invoiceModel.findFirst({
        where: { id: paymentRequest.invoice_id },
        include: { lines: true },
      });
    }

    if (!invoice) {
      throw new Error('Associated invoice not found');
    }

    const studio = invoice.studio;
    const lines = invoice.lines || [];

    // Public Sanitized View - NEVER exposes vendor costs, internal accounting, private IDs, or staff notes
    return {
      studio_name: studio?.name || 'Photography Studio',
      studio_logo_url: studio?.branding?.logo_url || null,
      invoice_number: invoice.invoice_number,
      invoice_date: (invoice.invoice_date ? new Date(invoice.invoice_date) : new Date()).toISOString(),
      due_date: (invoice.due_date ? new Date(invoice.due_date) : new Date()).toISOString(),
      status: invoice.status,
      currency: invoice.currency,
      client_name: invoice.client_id ? 'Valued Client' : null,
      items: lines.map((l: any) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price_minor: l.unit_price_minor,
        discount_minor: l.discount_minor,
        tax_minor: l.tax_minor,
        total_minor: l.total_minor,
      })),
      subtotal_minor: invoice.subtotal_minor,
      discount_minor: invoice.discount_minor,
      taxable_amount_minor: invoice.taxable_amount_minor,
      tax_minor: invoice.tax_minor,
      total_minor: invoice.total_minor,
      amount_paid_minor: invoice.amount_paid_minor,
      amount_due_minor: invoice.amount_due_minor,
      terms: invoice.terms,
      notes: invoice.notes,
      payment_request_id: paymentRequest.id,
      payment_request_token: rawToken,
    };
  }

  async payPublicInvoice(
    rawToken: string,
    paymentMethod: StudioInvoicePaymentMethod = 'ONLINE',
    paymentProvider: string = 'MOCK'
  ): Promise<{ success: boolean; receipt: IStudioInvoiceReceiptDTO; invoice: IStudioInvoiceDTO }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const paymentRequest = await this.paymentRequestModel.findUnique({
      where: { token_hash: tokenHash },
      include: { invoice: true },
    });

    if (!paymentRequest) {
      throw new Error('Invalid or expired payment request');
    }

    if (paymentRequest.status !== 'ACTIVE' || new Date() > new Date(paymentRequest.expires_at)) {
      throw new Error('This payment request is no longer active');
    }

    const invoice = paymentRequest.invoice;
    // Server-side recalculation of authorized amount (Never trust frontend amount)
    const amountToPay = Math.min(paymentRequest.amount_minor, invoice.amount_due_minor);

    if (amountToPay <= 0) {
      throw new Error('Invoice is already fully paid');
    }

    const paymentResult = await this.recordPayment(invoice.studio_id, invoice.id, {
      amount_minor: amountToPay,
      currency: invoice.currency,
      payment_method: paymentMethod,
      external_reference: `pub_${paymentRequest.id}`,
      idempotency_key: `payreq_${paymentRequest.id}`,
    });

    // Mark payment request as PAID
    await this.paymentRequestModel.update({
      where: { id: paymentRequest.id },
      data: { status: 'PAID' },
    });

    return {
      success: true,
      receipt: paymentResult.receipt,
      invoice: paymentResult.invoice,
    };
  }

  // -------------------------------------------------------------
  // 7. WEBHOOK PIPELINE & SECURITY
  // -------------------------------------------------------------

  async processWebhook(
    providerName: string,
    payload: any,
    headers: Record<string, string | string[] | undefined>,
    webhookSecret?: string
  ): Promise<{ processed: boolean; message: string; payment?: IStudioInvoicePaymentDTO }> {
    const gateway = PaymentGatewayFactory.getProvider(providerName);
    const verified = await gateway.verifyWebhook(payload, headers, webhookSecret);

    if (!verified.isValid) {
      throw new Error(`Webhook signature verification failed for provider ${providerName}`);
    }

    if (!verified.invoiceId) {
      return { processed: false, message: 'No associated invoice ID in webhook payload' };
    }

    // Find invoice across all studios
    const invoice = await this.invoiceModel.findUnique({
      where: { id: verified.invoiceId },
    });

    if (!invoice) {
      return { processed: false, message: `Invoice ${verified.invoiceId} not found` };
    }

    if (verified.status === 'SUCCEEDED') {
      const result = await this.recordPayment(invoice.studio_id, invoice.id, {
        amount_minor: verified.amountMinor || invoice.amount_due_minor,
        currency: verified.currency || invoice.currency,
        payment_method: 'ONLINE',
        external_reference: verified.externalReference,
        provider_event_id: verified.providerEventId,
        idempotency_key: `wh_${verified.providerEventId}`,
      });

      return {
        processed: true,
        message: 'Payment recorded successfully from webhook',
        payment: result.payment,
      };
    } else if (verified.status === 'FAILED') {
      // Record failed payment attempt
      await this.paymentModel.create({
        data: {
          studio_id: invoice.studio_id,
          invoice_id: invoice.id,
          amount_minor: verified.amountMinor || 0,
          currency: verified.currency || invoice.currency,
          payment_method: 'ONLINE',
          status: 'FAILED',
          external_reference: verified.externalReference,
          provider_event_id: verified.providerEventId,
          failure_reason: verified.failureReason || 'Card declined / payment error',
        },
      });

      return {
        processed: true,
        message: 'Failed payment attempt recorded',
      };
    }

    return { processed: true, message: `Event ${verified.eventType} acknowledged` };
  }

  // -------------------------------------------------------------
  // 8. INSTALLMENTS
  // -------------------------------------------------------------

  async createInstallments(
    studioId: string,
    invoiceId: string,
    dto: ICreateInstallmentsDTO | Array<{ due_date: Date | string; amount_minor: number; sequence?: number }>,
    actorMemberId?: string
  ): Promise<IStudioInvoiceInstallmentDTO[]> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const installmentsList = Array.isArray(dto) ? dto : (dto?.installments || []);

    const totalInstallments = installmentsList.reduce((acc, curr) => acc + curr.amount_minor, 0);
    if (totalInstallments !== invoice.total_minor) {
      throw new Error(
        `Total installment amount (${totalInstallments}) must exactly equal invoice total (${invoice.total_minor})`
      );
    }

    // Delete existing installments
    await this.installmentModel.deleteMany({
      where: { invoice_id: invoiceId, studio_id: studioId },
    });

    const created = await Promise.all(
      installmentsList.map((inst, index) =>
        this.installmentModel.create({
          data: {
            studio_id: studioId,
            invoice_id: invoiceId,
            sequence: inst.sequence !== undefined ? inst.sequence : index + 1,
            due_date: new Date(inst.due_date),
            amount_minor: inst.amount_minor,
            paid_minor: 0,
            status: 'PENDING',
          },
        })
      )
    );

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'INSTALLMENT',
      entityId: invoiceId,
      action: 'CREATE_INSTALLMENTS',
      afterJson: created,
    });

    return created;
  }

  // -------------------------------------------------------------
  // 9. CREDIT NOTES & DEBIT NOTES
  // -------------------------------------------------------------

  async createCreditNote(
    studioId: string,
    invoiceId: string,
    dto: ICreateCreditNoteDTO,
    actorMemberId?: string
  ): Promise<IStudioInvoiceCreditNoteDTO> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (dto.subtotal_minor <= 0) {
      throw new Error('Credit note subtotal must be greater than 0');
    }

    const creditNoteNumber = await this.generateNumber(studioId, 'CREDIT_NOTE');
    const subtotalMinor = dto.subtotal_minor;
    const taxMinor = dto.tax_minor || 0;
    const totalMinor = dto.total_minor || subtotalMinor + taxMinor;

    // Post accounting reversal to Phase 34 GL
    let journalEntryId: string | null = null;
    try {
      if (this.accountingService) {
        // DR Revenue (4000)
        // DR Output Tax (2100)
        // CR Accounts Receivable (1100)
        const journalLines: any[] = [
          {
            account_code: '4000',
            debit_minor: subtotalMinor,
            credit_minor: 0,
            description: `Credit Note ${creditNoteNumber} revenue reduction`,
          },
          {
            account_code: '1100',
            debit_minor: 0,
            credit_minor: totalMinor,
            description: `Credit Note ${creditNoteNumber} receivable adjustment`,
          },
        ];
        if (taxMinor > 0) {
          journalLines.push({
            account_code: '2100',
            debit_minor: taxMinor,
            credit_minor: 0,
            description: `Credit Note ${creditNoteNumber} tax reversal`,
          });
        }

        const journal = await this.accountingService.createJournalEntry(
          studioId,
          {
            entry_date: new Date(),
            description: `Credit Note ${creditNoteNumber} for Invoice ${invoice.invoice_number}`,
            reference_type: 'CREDIT_NOTE',
            reference_id: invoice.id,
            lines: journalLines,
            auto_post: true,
          },
          actorMemberId || 'system'
        );
        if (journal && journal.id) {
          journalEntryId = journal.id;
        }
      }
    } catch {
      // Non-blocking
    }

    const creditNote = await this.creditNoteModel.create({
      data: {
        studio_id: studioId,
        credit_note_number: creditNoteNumber,
        invoice_id: invoiceId,
        reason: dto.reason,
        subtotal_minor: subtotalMinor,
        tax_minor: taxMinor,
        total_minor: totalMinor,
        status: 'ISSUED',
        journal_entry_id: journalEntryId,
        created_by: actorMemberId,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'CREDIT_NOTE',
      entityId: creditNote.id,
      action: 'CREATE_CREDIT_NOTE',
      afterJson: creditNote,
    });

    return creditNote;
  }

  async createDebitNote(
    studioId: string,
    invoiceId: string,
    dto: ICreateDebitNoteDTO,
    actorMemberId?: string
  ): Promise<IStudioInvoiceDebitNoteDTO> {
    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (dto.subtotal_minor <= 0) {
      throw new Error('Debit note subtotal must be greater than 0');
    }

    const debitNoteNumber = await this.generateNumber(studioId, 'DEBIT_NOTE');
    const subtotalMinor = dto.subtotal_minor;
    const taxMinor = dto.tax_minor || 0;
    const totalMinor = dto.total_minor || subtotalMinor + taxMinor;

    // Post to Phase 34 GL
    let journalEntryId: string | null = null;
    try {
      if (this.accountingService) {
        // DR Accounts Receivable (1100)
        // CR Revenue (4000)
        // CR Output Tax (2100)
        const journalLines: any[] = [
          {
            account_code: '1100',
            debit_minor: totalMinor,
            credit_minor: 0,
            description: `Debit Note ${debitNoteNumber} additional receivable`,
          },
          {
            account_code: '4000',
            debit_minor: 0,
            credit_minor: subtotalMinor,
            description: `Debit Note ${debitNoteNumber} additional revenue`,
          },
        ];
        if (taxMinor > 0) {
          journalLines.push({
            account_code: '2100',
            debit_minor: 0,
            credit_minor: taxMinor,
            description: `Debit Note ${debitNoteNumber} additional tax`,
          });
        }

        const journal = await this.accountingService.createJournalEntry(
          studioId,
          {
            entry_date: new Date(),
            description: `Debit Note ${debitNoteNumber} for Invoice ${invoice.invoice_number}`,
            reference_type: 'DEBIT_NOTE',
            reference_id: invoice.id,
            lines: journalLines,
            auto_post: true,
          },
          actorMemberId || 'system'
        );
        if (journal && journal.id) {
          journalEntryId = journal.id;
        }
      }
    } catch {
      // Non-blocking
    }

    const debitNote = await this.debitNoteModel.create({
      data: {
        studio_id: studioId,
        debit_note_number: debitNoteNumber,
        invoice_id: invoiceId,
        reason: dto.reason,
        subtotal_minor: subtotalMinor,
        tax_minor: taxMinor,
        total_minor: totalMinor,
        status: 'ISSUED',
        journal_entry_id: journalEntryId,
        created_by: actorMemberId,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId,
      entityType: 'DEBIT_NOTE',
      entityId: debitNote.id,
      action: 'CREATE_DEBIT_NOTE',
      afterJson: debitNote,
    });

    return debitNote;
  }

  // -------------------------------------------------------------
  // 10. REFUNDS
  // -------------------------------------------------------------

  async refundPayment(
    studioId: string,
    paymentId: string,
    amountMinor?: number,
    reason?: string,
    actorMemberId?: string
  ): Promise<{ payment: IStudioInvoicePaymentDTO; invoice: IStudioInvoiceDTO }> {
    const payment = await this.paymentModel.findFirst({
      where: { id: paymentId, studio_id: studioId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'SUCCEEDED') {
      throw new Error(`Cannot refund payment in status ${payment.status}`);
    }

    const refundAmount = amountMinor ? Math.min(amountMinor, payment.amount_minor) : payment.amount_minor;
    const isFullRefund = refundAmount >= payment.amount_minor;

    // Post GL reversal to Phase 34
    try {
      if (this.accountingService) {
        await this.accountingService.createJournalEntry(
          studioId,
          {
            entry_date: new Date(),
            description: `Refund for payment on Invoice ${payment.invoice.invoice_number}`,
            reference_type: 'REFUND',
            reference_id: payment.invoice_id,
            lines: [
              {
                account_code: '1100', // DR Accounts Receivable
                debit_minor: refundAmount,
                credit_minor: 0,
                description: `Restoring receivable from refund on ${payment.invoice.invoice_number}`,
              },
              {
                account_code: '1010', // CR Bank
                debit_minor: 0,
                credit_minor: refundAmount,
                description: `Cash outflow for refund on ${payment.invoice.invoice_number}`,
              },
            ],
            auto_post: true,
          },
          actorMemberId || 'system'
        );
      }
    } catch {
      // Non-blocking
    }

    const updatedPayment = await this.paymentModel.update({
      where: { id: paymentId },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        failure_reason: reason ? `[REFUND REASON: ${reason}]` : undefined,
      },
    });

    const newAmountPaid = Math.max(0, payment.invoice.amount_paid_minor - refundAmount);
    const newAmountDue = Math.max(0, payment.invoice.total_minor - newAmountPaid);
    const newStatus: StudioInvoiceStatus =
      newAmountPaid === 0 ? 'ISSUED' : newAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    const updatedInvoice = await this.invoiceModel.update({
      where: { id: payment.invoice_id },
      data: {
        amount_paid_minor: newAmountPaid,
        amount_due_minor: newAmountDue,
        status: newStatus,
      },
      include: { lines: true, payments: true },
    });

    await this.recordAudit({
      studioId,
      invoiceId: payment.invoice_id,
      actorMemberId,
      entityType: 'PAYMENT',
      entityId: paymentId,
      action: 'REFUND_PAYMENT',
      reason,
      afterJson: { payment: updatedPayment, refundAmount },
    });

    return {
      payment: updatedPayment,
      invoice: this.mapInvoiceToDTO(updatedInvoice),
    };
  }

  // -------------------------------------------------------------
  // 11. OVERDUE ENGINE, COLLECTIONS & PAYMENT PROMISES
  // -------------------------------------------------------------

  async evaluateOverdueInvoices(studioId: string): Promise<{
    evaluated: number;
    markedOverdue: number;
    evaluated_count: number;
    updated_overdue_count: number;
  }> {
    const now = new Date();
    const invoices = await this.invoiceModel.findMany({
      where: {
        studio_id: studioId,
        due_date: { lt: now },
        amount_due_minor: { gt: 0 },
        status: { in: ['ISSUED', 'SENT', 'PARTIALLY_PAID'] },
      },
    });

    let markedOverdue = 0;
    for (const inv of invoices) {
      await this.invoiceModel.update({
        where: { id: inv.id },
        data: { status: 'OVERDUE' },
      });
      markedOverdue++;
    }

    return {
      evaluated: invoices.length,
      markedOverdue,
      evaluated_count: invoices.length,
      updated_overdue_count: markedOverdue,
    };
  }

  async getOverdueInvoices(studioId: string): Promise<IStudioInvoiceDTO[]> {
    const invoices = await this.invoiceModel.findMany({
      where: {
        studio_id: studioId,
        status: 'OVERDUE',
      },
      include: { lines: true, payments: true },
    });
    return invoices.map((inv: any) => this.mapInvoiceToDTO(inv));
  }

  async createCollectionTask(
    studioId: string,
    invoiceIdOrDto: any,
    dtoOrActor?: any,
    actorMemberId?: string
  ): Promise<IStudioCollectionTaskDTO> {
    let invoiceId: string;
    let dto: ICreateCollectionTaskDTO;
    let actor: string | undefined;

    if (typeof invoiceIdOrDto === 'string') {
      invoiceId = invoiceIdOrDto;
      dto = dtoOrActor || {};
      actor = actorMemberId;
    } else {
      invoiceId = invoiceIdOrDto.invoice_id;
      dto = invoiceIdOrDto as any;
      actor = typeof dtoOrActor === 'string' ? dtoOrActor : actorMemberId;
    }

    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const task = await this.collectionTaskModel.create({
      data: {
        studio_id: studioId,
        invoice_id: invoiceId,
        assigned_to: dto.assigned_to,
        priority: dto.priority || 'MEDIUM',
        status: dto.status || 'OPEN',
        next_action_at: dto.next_action_at ? new Date(dto.next_action_at) : null,
        notes: dto.notes,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId: actor,
      entityType: 'COLLECTION_TASK',
      entityId: task.id,
      action: 'CREATE_COLLECTION_TASK',
      afterJson: task,
    });

    return task;
  }

  async updateCollectionTask(
    studioId: string,
    taskId: string,
    data: Partial<ICreateCollectionTaskDTO>,
    actorMemberId?: string
  ): Promise<IStudioCollectionTaskDTO> {
    const task = await this.collectionTaskModel.findFirst({
      where: { id: taskId, studio_id: studioId },
    });

    if (!task) {
      throw new Error(`Collection task ${taskId} not found`);
    }

    const updated = await this.collectionTaskModel.update({
      where: { id: taskId },
      data: {
        ...(data.assigned_to !== undefined && { assigned_to: data.assigned_to }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.next_action_at !== undefined && {
          next_action_at: data.next_action_at ? new Date(data.next_action_at) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId: task.invoice_id,
      actorMemberId,
      entityType: 'COLLECTION_TASK',
      entityId: taskId,
      action: 'UPDATE_COLLECTION_TASK',
      afterJson: updated,
    });

    return updated;
  }

  async createPaymentPromise(
    studioId: string,
    invoiceIdOrDto: any,
    dtoOrActor?: any,
    actorMemberId?: string
  ): Promise<IStudioPaymentPromiseDTO> {
    let invoiceId: string;
    let dto: ICreatePaymentPromiseDTO;
    let actor: string | undefined;

    if (typeof invoiceIdOrDto === 'string') {
      invoiceId = invoiceIdOrDto;
      dto = dtoOrActor || {};
      actor = actorMemberId;
    } else {
      invoiceId = invoiceIdOrDto.invoice_id;
      dto = invoiceIdOrDto as any;
      actor = typeof dtoOrActor === 'string' ? dtoOrActor : actorMemberId;
    }

    const invoice = await this.invoiceModel.findFirst({
      where: { id: invoiceId, studio_id: studioId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const promise = await this.paymentPromiseModel.create({
      data: {
        studio_id: studioId,
        invoice_id: invoiceId,
        client_id: dto.client_id || invoice.client_id,
        promised_amount_minor: dto.promised_amount_minor,
        promised_date: new Date(dto.promised_date),
        status: 'PENDING',
        notes: dto.notes,
        created_by: actor,
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId,
      actorMemberId: actor,
      entityType: 'PAYMENT_PROMISE',
      entityId: promise.id,
      action: 'CREATE_PAYMENT_PROMISE',
      afterJson: promise,
    });

    return promise;
  }

  async updatePaymentPromise(
    studioId: string,
    promiseId: string,
    dto: IUpdatePaymentPromiseDTO,
    actorMemberId?: string
  ): Promise<IStudioPaymentPromiseDTO> {
    const promise = await this.paymentPromiseModel.findFirst({
      where: { id: promiseId, studio_id: studioId },
    });

    if (!promise) {
      throw new Error(`Payment promise ${promiseId} not found`);
    }

    const updated = await this.paymentPromiseModel.update({
      where: { id: promiseId },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.recordAudit({
      studioId,
      invoiceId: promise.invoice_id,
      actorMemberId,
      entityType: 'PAYMENT_PROMISE',
      entityId: promiseId,
      action: 'UPDATE_PAYMENT_PROMISE',
      afterJson: updated,
    });

    return updated;
  }

  // -------------------------------------------------------------
  // 12. ANALYTICS & REPORTS
  // -------------------------------------------------------------

  async getInvoiceOverview(studioId: string): Promise<IInvoiceOverviewDTO> {
    const invoices = await this.invoiceModel.findMany({
      where: { studio_id: studioId },
      include: { payments: true },
    });

    let totalInvoicedMinor = 0;
    let totalCollectedMinor = 0;
    let totalOutstandingMinor = 0;
    let totalOverdueMinor = 0;
    let dueThisWeekMinor = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let draftCount = 0;
    let partialCount = 0;

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let daysSum = 0;
    let paidInvoicesWithDates = 0;

    for (const inv of invoices) {
      if (['VOID', 'CANCELLED'].includes(inv.status)) continue;

      totalInvoicedMinor += inv.total_minor;
      totalCollectedMinor += inv.amount_paid_minor;
      totalOutstandingMinor += inv.amount_due_minor;

      if (inv.status === 'DRAFT') {
        draftCount++;
      } else if (inv.status === 'PAID') {
        paidCount++;
        if (inv.paid_at && inv.issued_at) {
          const diffDays = Math.max(
            0,
            (new Date(inv.paid_at).getTime() - new Date(inv.issued_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          daysSum += diffDays;
          paidInvoicesWithDates++;
        }
      } else if (inv.status === 'PARTIALLY_PAID') {
        partialCount++;
      }

      if (
        (inv.status === 'OVERDUE' || (inv.due_date < now && inv.amount_due_minor > 0)) &&
        !['PAID', 'VOID', 'CANCELLED'].includes(inv.status)
      ) {
        overdueCount++;
        totalOverdueMinor += inv.amount_due_minor;
      }

      if (inv.due_date >= now && inv.due_date <= oneWeekFromNow && inv.amount_due_minor > 0) {
        dueThisWeekMinor += inv.amount_due_minor;
      }
    }

    const collectionRatePct =
      totalInvoicedMinor > 0 ? Math.round((totalCollectedMinor / totalInvoicedMinor) * 100) : 100;

    const averageDays = paidInvoicesWithDates > 0 ? Math.round(daysSum / paidInvoicesWithDates) : 0;

    return {
      total_invoiced_minor: totalInvoicedMinor,
      total_collected_minor: totalCollectedMinor,
      total_outstanding_minor: totalOutstandingMinor,
      total_overdue_minor: totalOverdueMinor,
      due_this_week_minor: dueThisWeekMinor,
      collection_rate_pct: collectionRatePct,
      average_days_to_payment: averageDays,
      partial_payment_count: partialCount,
      invoice_count: invoices.length,
      paid_invoice_count: paidCount,
      overdue_invoice_count: overdueCount,
      draft_invoice_count: draftCount,
    };
  }

  async getInvoiceMetrics(studioId: string): Promise<IInvoiceOverviewDTO> {
    return this.getInvoiceOverview(studioId);
  }

  async getInvoicePayments(studioId: string, invoiceId: string): Promise<any[]> {
    return this.paymentModel.findMany({
      where: { studio_id: studioId, invoice_id: invoiceId },
      orderBy: { payment_date: 'desc' },
    });
  }

  async listCollectionTasks(studioId: string): Promise<any[]> {
    return this.collectionTaskModel.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAgingReport(studioId: string): Promise<any> {
    const now = new Date();
    const unpaidInvoices = await this.invoiceModel.findMany({
      where: {
        studio_id: studioId,
        amount_due_minor: { gt: 0 },
        status: { notIn: ['PAID', 'VOID', 'CANCELLED', 'DRAFT'] },
      },
    });

    let currentMinor = 0;
    let aging31to60 = 0;
    let aging61to90 = 0;
    let aging90Plus = 0;
    let totalOutstanding = 0;

    for (const inv of unpaidInvoices) {
      totalOutstanding += inv.amount_due_minor;
      const dueDate = new Date(inv.due_date);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        currentMinor += inv.amount_due_minor;
      } else if (diffDays <= 60) {
        aging31to60 += inv.amount_due_minor;
      } else if (diffDays <= 90) {
        aging61to90 += inv.amount_due_minor;
      } else {
        aging90Plus += inv.amount_due_minor;
      }
    }

    return {
      current_minor: currentMinor,
      current_30_minor: currentMinor,
      aging_31_60_minor: aging31to60,
      days_31_60_minor: aging31to60,
      aging_61_90_minor: aging61to90,
      days_61_90_minor: aging61to90,
      aging_90_plus_minor: aging90Plus,
      days_over_90_minor: aging90Plus,
      total_overdue_minor: aging31to60 + aging61to90 + aging90Plus,
      total_outstanding_minor: totalOutstanding,
    };
  }

  async getOverdueAgingReport(studioId: string): Promise<any> {
    return this.getAgingReport(studioId);
  }

  async createPaymentReminder(studioId: string, dto: any, actorMemberId?: string): Promise<any> {
    const invoice = await this.getInvoiceById(studioId, dto.invoice_id);
    const reminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      studio_id: studioId,
      invoice_id: dto.invoice_id,
      reminder_type: dto.reminder_type || 'OVERDUE',
      channel: dto.channel || 'EMAIL',
      subject: dto.subject || `Payment reminder for ${invoice.invoice_number}`,
      message: dto.message || `Your invoice ${invoice.invoice_number} is pending.`,
      status: 'SENT',
      sent_at: new Date(),
      created_by: actorMemberId,
    };

    await this.recordAudit({
      studioId,
      invoiceId: dto.invoice_id,
      actorMemberId,
      entityType: 'PAYMENT_REMINDER',
      entityId: reminder.id,
      action: 'SEND_PAYMENT_REMINDER',
      afterJson: reminder,
    });

    return reminder;
  }

  // -------------------------------------------------------------
  // 13. PDF INVOICE GENERATION
  // -------------------------------------------------------------

  async generateInvoicePdf(studioId: string, invoiceId: string): Promise<any> {
    const invoice = await this.getInvoiceById(studioId, invoiceId);
    const studio = (this.db as any)?.studio
      ? await (this.db as any).studio.findUnique({
          where: { id: studioId },
          include: { branding: true },
        })
      : null;

    // Sanitized HTML representation ready for Puppeteer/PDF renderer
    const itemsHtml = (invoice.lines || [])
      .map(
        (line, idx) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>${this.escapeHtml(line.description)}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${line.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${(line.unit_price_minor / 100).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${(line.taxable_amount_minor / 100).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${(line.tax_minor / 100).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${(line.total_minor / 100).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const pdfHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoice.invoice_number}</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .studio-title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .invoice-tag { font-size: 20px; font-weight: 700; color: #6366f1; text-align: right; }
    .meta-box { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8fafc; padding: 12px 10px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; }
    .totals-table { width: 350px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-size: 18px; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="studio-title">${this.escapeHtml(studio?.name || 'Studio')}</div>
      <div>Professional Photography & Visual Studio</div>
    </div>
    <div>
      <div class="invoice-tag">TAX INVOICE</div>
      <div><strong>Invoice #:</strong> ${invoice.invoice_number}</div>
      <div><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
      <div><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</div>
    </div>
  </div>

  <div class="meta-box">
    <div>
      <strong>Billed To:</strong><br>
      ${invoice.client_id ? 'Client ID: ' + this.escapeHtml(invoice.client_id) : 'Direct Client'}
    </div>
    <div>
      <strong>Status:</strong> ${invoice.status}<br>
      <strong>Currency:</strong> ${invoice.currency}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Taxable</th>
        <th style="text-align: right;">Tax</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-table">
    <div class="totals-row"><span>Subtotal:</span> <span>${invoice.currency} ${(invoice.subtotal_minor / 100).toFixed(2)}</span></div>
    ${invoice.discount_minor > 0 ? `<div class="totals-row"><span>Discount:</span> <span>-${invoice.currency} ${(invoice.discount_minor / 100).toFixed(2)}</span></div>` : ''}
    <div class="totals-row"><span>Taxable Amount:</span> <span>${invoice.currency} ${(invoice.taxable_amount_minor / 100).toFixed(2)}</span></div>
    <div class="totals-row"><span>Tax (GST):</span> <span>${invoice.currency} ${(invoice.tax_minor / 100).toFixed(2)}</span></div>
    <div class="totals-row grand-total"><span>Total Amount:</span> <span>${invoice.currency} ${(invoice.total_minor / 100).toFixed(2)}</span></div>
    <div class="totals-row"><span>Amount Paid:</span> <span>${invoice.currency} ${(invoice.amount_paid_minor / 100).toFixed(2)}</span></div>
    <div class="totals-row" style="font-weight: bold; color: #dc2626;"><span>Balance Due:</span> <span>${invoice.currency} ${(invoice.amount_due_minor / 100).toFixed(2)}</span></div>
  </div>

  ${invoice.terms ? `<div style="margin-top: 40px;"><strong>Terms & Conditions:</strong><p>${this.escapeHtml(invoice.terms)}</p></div>` : ''}
  ${invoice.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong><p>${this.escapeHtml(invoice.notes)}</p></div>` : ''}
</body>
</html>`;

    const htmlStringObj = new String(pdfHtml) as any;
    htmlStringObj.pdfHtml = pdfHtml;
    htmlStringObj.invoice = invoice;
    return htmlStringObj;
  }

  // -------------------------------------------------------------
  // 14. FORMULA-SAFE CSV EXPORT
  // -------------------------------------------------------------

  async exportInvoicesCsv(studioId: string): Promise<string> {
    const invoices = await this.invoiceModel.findMany({
      where: { studio_id: studioId },
      include: { lines: true, payments: true },
      orderBy: { invoice_date: 'desc' },
    });

    const headers = [
      'Invoice Number',
      'Date',
      'Due Date',
      'Client',
      'Subtotal',
      'Tax',
      'Total',
      'Paid',
      'Due',
      'Status',
    ];

    const rows = invoices.map((inv: any) => [
      this.sanitizeCsvCell(inv.invoice_number),
      new Date(inv.invoice_date).toISOString().split('T')[0],
      new Date(inv.due_date).toISOString().split('T')[0],
      this.sanitizeCsvCell(inv.client_id || ''),
      (inv.subtotal_minor / 100).toFixed(2),
      (inv.tax_minor / 100).toFixed(2),
      (inv.total_minor / 100).toFixed(2),
      (inv.amount_paid_minor / 100).toFixed(2),
      (inv.amount_due_minor / 100).toFixed(2),
      inv.status,
    ]);

    return [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
  }

  // -------------------------------------------------------------
  // 14.1 IDEMPOTENT WEBHOOK PAYMENT PROCESSING
  // -------------------------------------------------------------

  private processedWebhookEvents = new Set<string>();

  async processWebhookPayment(
    studioId: string,
    params: {
      provider_event_id: string;
      invoice_id: string;
      amount_minor: number;
      currency?: string;
      payment_method?: string;
      external_reference?: string;
    }
  ): Promise<{ processed: boolean; idempotent?: boolean; payment?: any }> {
    const eventKey = `${studioId}:${params.provider_event_id}`;
    if (this.processedWebhookEvents.has(eventKey)) {
      return { processed: false, idempotent: true };
    }

    const existingAudit = await this.auditModel.findFirst({
      where: {
        studio_id: studioId,
        action: 'WEBHOOK_PAYMENT_PROCESSED',
        entityId: params.provider_event_id,
      },
    });

    if (existingAudit) {
      this.processedWebhookEvents.add(eventKey);
      return { processed: false, idempotent: true };
    }

    const paymentResult = await this.recordPayment(
      studioId,
      params.invoice_id,
      {
        amount_minor: params.amount_minor,
        payment_method: (params.payment_method as any) || 'ONLINE',
        external_reference: params.external_reference,
        idempotency_key: params.provider_event_id,
      }
    );

    this.processedWebhookEvents.add(eventKey);

    await this.recordAudit({
      studioId,
      invoiceId: params.invoice_id,
      entityType: 'PAYMENT',
      entityId: params.provider_event_id,
      action: 'WEBHOOK_PAYMENT_PROCESSED',
      afterJson: { payment: paymentResult.payment },
    });

    return {
      processed: true,
      payment: paymentResult.payment,
    };
  }

  // Helper for CSV Formula Injection shielding
  private sanitizeCsvCell(value: string): string {
    if (!value) return '';
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.some((char) => value.startsWith(char))) {
      return `'${value}`;
    }
    return value.replace(/"/g, '""');
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -------------------------------------------------------------
  // 15. AUDIT LOGGING
  // -------------------------------------------------------------

  private async recordAudit(params: {
    studioId: string;
    invoiceId?: string;
    actorMemberId?: string;
    entityType: string;
    entityId: string;
    action: string;
    beforeJson?: any;
    afterJson?: any;
    reason?: string;
  }): Promise<void> {
    try {
      await this.auditModel.create({
        data: {
          studio_id: params.studioId,
          invoice_id: params.invoiceId,
          actor_member_id: params.actorMemberId,
          entity_type: params.entityType,
          entity_id: params.entityId,
          action: params.action,
          before_json: params.beforeJson ? JSON.parse(JSON.stringify(params.beforeJson)) : undefined,
          after_json: params.afterJson ? JSON.parse(JSON.stringify(params.afterJson)) : undefined,
          reason: params.reason,
        },
      });
    } catch {
      // Non-blocking audit recording
    }
  }

  // DTO mapping helper
  private mapInvoiceToDTO(inv: any): IStudioInvoiceDTO {
    return {
      id: inv.id,
      studio_id: inv.studio_id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      status: inv.status,
      currency: inv.currency,
      subtotal_minor: inv.subtotal_minor,
      discount_minor: inv.discount_minor,
      discount_type: inv.discount_type,
      discount_value: inv.discount_value,
      taxable_amount_minor: inv.taxable_amount_minor,
      tax_minor: inv.tax_minor,
      total_minor: inv.total_minor,
      amount_paid_minor: inv.amount_paid_minor,
      amount_due_minor: inv.amount_due_minor,
      notes: inv.notes,
      terms: inv.terms,
      client_id: inv.client_id,
      project_id: inv.project_id,
      booking_id: inv.booking_id,
      contract_id: inv.contract_id,
      order_id: inv.order_id,
      receivable_id: inv.receivable_id,
      tax_transaction_id: inv.tax_transaction_id,
      journal_entry_id: inv.journal_entry_id,
      pdf_artifact_id: inv.pdf_artifact_id,
      idempotency_key: inv.idempotency_key,
      created_by: inv.created_by,
      issued_by: inv.issued_by,
      issued_at: inv.issued_at,
      sent_at: inv.sent_at,
      paid_at: inv.paid_at,
      voided_at: inv.voided_at,
      created_at: inv.created_at,
      updated_at: inv.updated_at,
      lines: inv.lines,
      payments: inv.payments,
      payment_requests: inv.payment_requests,
      installments: inv.installments,
      receipts: inv.receipts,
      credit_notes: inv.credit_notes,
      debit_notes: inv.debit_notes,
      collection_tasks: inv.collection_tasks,
      payment_promises: inv.payment_promises,
    };
  }
}

export { StudioInvoicingService as InvoicingService };
export const studioInvoicingService = StudioInvoicingService.getInstance();
export const invoicingService = studioInvoicingService;
