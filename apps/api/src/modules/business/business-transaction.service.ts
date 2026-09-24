/**
 * Business Transaction Service — PIXMatch AI Phase 18
 * Multi-tenant transaction management, voiding, soft-deletion, audit logging, and formula-safe CSV exports.
 */

import { prisma } from '@pixmatch/database';
import {
  BusinessTransactionType,
  BusinessTransactionStatus,
  StudioBusinessTransactionDTO,
  CreateBusinessTransactionDTO,
  UpdateBusinessTransactionDTO,
  VoidBusinessTransactionDTO,
} from '@pixmatch/types';

export class BusinessTransactionService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new BusinessTransactionService();

  static async createTransaction(
    studioId: string,
    dto: CreateBusinessTransactionDTO,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.defaultInstance.createTransaction(studioId, dto, userId);
  }

  static async getTransactionById(
    studioId: string,
    transactionId: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.defaultInstance.getTransactionById(studioId, transactionId);
  }

  static async getTransaction(
    studioId: string,
    transactionId: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.defaultInstance.getTransactionById(studioId, transactionId);
  }

  static async listTransactions(
    studioId: string,
    query: any = {}
  ): Promise<{ transactions: StudioBusinessTransactionDTO[]; total: number }> {
    return this.defaultInstance.listTransactions(studioId, query);
  }

  static async updateTransaction(
    studioId: string,
    transactionId: string,
    dto: UpdateBusinessTransactionDTO,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.defaultInstance.updateTransaction(studioId, transactionId, dto, userId);
  }

  static async voidTransaction(
    studioId: string,
    transactionId: string,
    dtoOrReason: VoidBusinessTransactionDTO | string,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.defaultInstance.voidTransaction(studioId, transactionId, dtoOrReason, userId);
  }

  static async exportTransactionsCsv(
    studioId: string,
    query: any = {}
  ): Promise<string> {
    return this.defaultInstance.exportTransactionsCsv(studioId, query);
  }

  static async getAuditLogs(studioId: string, transactionId?: string): Promise<any[]> {
    return this.defaultInstance.getAuditLogs(studioId, transactionId);
  }

  /**
   * Create a business transaction with validation & audit logging.
   */
  async createTransaction(
    studioId: string,
    dto: CreateBusinessTransactionDTO | any,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    if (!dto.category || !dto.category.trim()) {
      throw new Error('Transaction category is required');
    }
    if (typeof dto.amount !== 'number' || isNaN(dto.amount) || dto.amount <= 0) {
      throw new Error('Transaction amount must be a positive number');
    }
    const txDate = dto.transaction_date || dto.date;
    if (!txDate) {
      throw new Error('Transaction date is required');
    }

    // Verify gallery belongs to studio if provided
    let galleryTitle: string | null = null;
    if (dto.gallery_id) {
      const gallery = await this.db.gallery.findFirst({
        where: { id: dto.gallery_id, studio_id: studioId },
      });
      if (!gallery) {
        throw new Error('Gallery not found or does not belong to your studio');
      }
      galleryTitle = gallery.title;
    }

    // Verify client belongs to studio if provided
    let clientName: string | null = null;
    let clientEmail: string | null = null;
    if (dto.client_id) {
      const client = await this.db.client.findFirst({
        where: { id: dto.client_id, studio_id: studioId },
      });
      if (!client) {
        throw new Error('Client not found or does not belong to your studio');
      }
      clientName = client.name;
      clientEmail = client.email;
    }

    // Determine default currency from studio if not provided
    let currency = dto.currency || 'USD';
    const studio = await this.db.studio.findUnique({
      where: { id: studioId },
      select: { currency: true },
    });
    if (studio?.currency && !dto.currency) {
      currency = studio.currency;
    }

    const txType = dto.type || dto.transaction_type || BusinessTransactionType.INCOME;
    const txStatus = dto.status || BusinessTransactionStatus.COMPLETED;

    const transaction = await this.db.studioBusinessTransaction.create({
      data: {
        studio_id: studioId,
        gallery_id: dto.gallery_id || null,
        client_id: dto.client_id || null,
        type: txType as any,
        transaction_type: txType as any,
        category: dto.category.trim(),
        amount: dto.amount,
        currency: currency.toUpperCase(),
        status: txStatus as any,
        payment_method: dto.payment_method || null,
        reference_number: dto.reference_number || dto.reference || null,
        transaction_date: new Date(txDate),
        date: new Date(txDate),
        description: dto.description || `${dto.category} - ${currency.toUpperCase()} ${dto.amount}`,
        service_type: dto.service_type || null,
        notes: dto.notes || null,
        tags: dto.tags || [],
        created_by: userId || null,
      },
      include: {
        gallery: { select: { title: true } },
        client: { select: { name: true, email: true } },
      },
    });

    // Record audit log
    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          transaction_id: transaction.id,
          user_id: userId || null,
          action: 'CREATE',
          entity_type: 'TRANSACTION',
          entity_id: transaction.id,
          new_values: transaction as any,
        },
      });
    }

    return this.mapToDTO(transaction, galleryTitle, clientName, clientEmail);
  }

  /**
   * Get transaction by ID with IDOR protection.
   */
  async getTransactionById(
    studioId: string,
    transactionId: string
  ): Promise<StudioBusinessTransactionDTO> {
    const transaction = await this.db.studioBusinessTransaction.findFirst({
      where: { id: transactionId, studio_id: studioId },
      include: {
        gallery: { select: { title: true } },
        client: { select: { name: true, email: true } },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return this.mapToDTO(
      transaction,
      transaction.gallery?.title,
      transaction.client?.name,
      transaction.client?.email
    );
  }

  async getTransaction(
    studioId: string,
    transactionId: string
  ): Promise<StudioBusinessTransactionDTO> {
    return this.getTransactionById(studioId, transactionId);
  }

  /**
   * List transactions with comprehensive filtering, pagination, and sorting.
   */
  async listTransactions(
    studioId: string,
    query: {
      type?: BusinessTransactionType;
      category?: string;
      status?: BusinessTransactionStatus;
      client_id?: string;
      gallery_id?: string;
      is_void?: boolean;
      start_date?: string;
      end_date?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sort_by?: 'transaction_date' | 'amount' | 'created_at' | 'date';
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ transactions: StudioBusinessTransactionDTO[]; total: number }> {
    const where: any = { studio_id: studioId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.client_id) {
      where.client_id = query.client_id;
    }
    if (query.gallery_id) {
      where.gallery_id = query.gallery_id;
    }
    if (typeof query.is_void === 'boolean') {
      where.is_void = query.is_void;
    }

    if (query.start_date || query.end_date) {
      where.date = {};
      where.transaction_date = {};
      if (query.start_date) {
        where.date.gte = new Date(query.start_date);
        where.transaction_date.gte = new Date(query.start_date);
      }
      if (query.end_date) {
        where.date.lte = new Date(query.end_date);
        where.transaction_date.lte = new Date(query.end_date);
      }
    }

    const limit = Math.min(Math.max(query.limit || 50, 1), 500);
    const offset = Math.max(query.offset || 0, 0);
    const sortBy = query.sort_by === 'date' ? 'transaction_date' : query.sort_by || 'transaction_date';
    const sortOrder = query.sort_order || 'desc';

    const [transactions, total] = await Promise.all([
      this.db.studioBusinessTransaction.findMany({
        where,
        include: {
          gallery: { select: { title: true } },
          client: { select: { name: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.db.studioBusinessTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t: any) =>
        this.mapToDTO(t, t.gallery?.title, t.client?.name, t.client?.email)
      ),
      total,
    };
  }

  /**
   * Update a non-void transaction.
   */
  async updateTransaction(
    studioId: string,
    transactionId: string,
    dto: UpdateBusinessTransactionDTO,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    const existing = await this.db.studioBusinessTransaction.findFirst({
      where: { id: transactionId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Transaction not found');
    }

    if (existing.is_void) {
      throw new Error('Cannot modify a voided transaction');
    }

    // Verify gallery if updated
    if (dto.gallery_id) {
      const gallery = await this.db.gallery.findFirst({
        where: { id: dto.gallery_id, studio_id: studioId },
      });
      if (!gallery) {
        throw new Error('Gallery not found or does not belong to your studio');
      }
    }

    // Verify client if updated
    if (dto.client_id) {
      const client = await this.db.client.findFirst({
        where: { id: dto.client_id, studio_id: studioId },
      });
      if (!client) {
        throw new Error('Client not found or does not belong to your studio');
      }
    }

    const data: any = {};
    if (dto.gallery_id !== undefined) data.gallery_id = dto.gallery_id || null;
    if (dto.client_id !== undefined) data.client_id = dto.client_id || null;
    if (dto.type) {
      data.type = dto.type as any;
      data.transaction_type = dto.type as any;
    }
    if (dto.category) data.category = dto.category.trim();
    if (typeof dto.amount === 'number') {
      if (isNaN(dto.amount) || dto.amount <= 0) {
        throw new Error('Transaction amount must be a positive number');
      }
      data.amount = dto.amount;
    }
    if (dto.currency) data.currency = dto.currency.toUpperCase();
    if (dto.status) data.status = dto.status as any;
    if (dto.payment_method !== undefined) data.payment_method = dto.payment_method || null;
    if (dto.reference_number !== undefined) data.reference_number = dto.reference_number || null;
    if (dto.transaction_date || (dto as any).date) {
      const d = new Date(dto.transaction_date || (dto as any).date);
      data.transaction_date = d;
      data.date = d;
    }
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.notes !== undefined) data.notes = dto.notes || null;
    if (dto.tags !== undefined) data.tags = dto.tags || [];

    const updated = await this.db.studioBusinessTransaction.update({
      where: { id: transactionId },
      data,
      include: {
        gallery: { select: { title: true } },
        client: { select: { name: true, email: true } },
      },
    });

    // Record audit log
    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          transaction_id: transactionId,
          user_id: userId || null,
          action: 'UPDATE',
          entity_type: 'TRANSACTION',
          entity_id: transactionId,
          old_values: existing as any,
          new_values: updated as any,
        },
      });
    }

    return this.mapToDTO(
      updated,
      updated.gallery?.title,
      updated.client?.name,
      updated.client?.email
    );
  }

  /**
   * Void a transaction with a required reason.
   */
  async voidTransaction(
    studioId: string,
    transactionId: string,
    dtoOrReason: VoidBusinessTransactionDTO | string,
    userId?: string
  ): Promise<StudioBusinessTransactionDTO> {
    const voidReason = typeof dtoOrReason === 'string' ? dtoOrReason : dtoOrReason.void_reason;
    if (!voidReason || !voidReason.trim()) {
      throw new Error('Void reason is strictly required to void a transaction');
    }

    const existing = await this.db.studioBusinessTransaction.findFirst({
      where: { id: transactionId, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Transaction not found');
    }

    if (existing.is_void) {
      throw new Error('Transaction is already voided');
    }

    const voided = await this.db.studioBusinessTransaction.update({
      where: { id: transactionId },
      data: {
        is_void: true,
        void_reason: voidReason.trim(),
        voided_at: new Date(),
        voided_by: userId || null,
      },
      include: {
        gallery: { select: { title: true } },
        client: { select: { name: true, email: true } },
      },
    });

    // Record audit log
    if (this.db.studioBusinessAuditLog) {
      await this.db.studioBusinessAuditLog.create({
        data: {
          studio_id: studioId,
          transaction_id: transactionId,
          user_id: userId || null,
          action: 'VOID',
          entity_type: 'TRANSACTION',
          entity_id: transactionId,
          old_values: existing as any,
          new_values: voided as any,
        },
      });
    }

    return this.mapToDTO(
      voided,
      voided.gallery?.title,
      voided.client?.name,
      voided.client?.email
    );
  }

  /**
   * Get audit logs for a transaction.
   */
  async getAuditLogs(studioId: string, transactionId?: string): Promise<any[]> {
    if (!this.db.studioBusinessAuditLog) return [];
    const where: any = { studio_id: studioId };
    if (transactionId) where.transaction_id = transactionId;
    return this.db.studioBusinessAuditLog.findMany({ where });
  }

  /**
   * Sanitize string for CSV injection prevention (=, +, -, @, \t, \r).
   */
  private sanitizeForCsv(value: string | null | undefined): string {
    if (!value) return '';
    const str = String(value);
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.some((char) => str.startsWith(char))) {
      return `'${str.replace(/"/g, '""')}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Export transactions to CSV format with formula injection protection.
   */
  async exportTransactionsCsv(
    studioId: string,
    query: {
      type?: BusinessTransactionType;
      category?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<string> {
    const { transactions } = await this.listTransactions(studioId, {
      ...query,
      limit: 5000,
    });

    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Amount',
      'Currency',
      'Status',
      'Client Name',
      'Client Email',
      'Gallery Title',
      'Payment Method',
      'Reference Number',
      'Description',
      'Is Void',
      'Void Reason',
    ];

    const rows = transactions.map((t) => [
      this.sanitizeForCsv(t.id),
      this.sanitizeForCsv(new Date(t.transaction_date).toISOString().split('T')[0]),
      this.sanitizeForCsv(t.type),
      this.sanitizeForCsv(t.category),
      t.amount.toFixed(2),
      this.sanitizeForCsv(t.currency),
      this.sanitizeForCsv(t.status),
      this.sanitizeForCsv(t.client_name),
      this.sanitizeForCsv(t.client_email),
      this.sanitizeForCsv(t.gallery_title),
      this.sanitizeForCsv(t.payment_method),
      this.sanitizeForCsv(t.reference_number),
      this.sanitizeForCsv(t.description),
      t.is_void ? 'YES' : 'NO',
      this.sanitizeForCsv(t.void_reason),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Helper to map database model to DTO with aliases.
   */
  private mapToDTO(
    t: any,
    galleryTitle?: string | null,
    clientName?: string | null,
    clientEmail?: string | null
  ): StudioBusinessTransactionDTO {
    const rawTags = t.tags;
    let parsedTags: string[] | null = null;
    if (Array.isArray(rawTags)) {
      parsedTags = rawTags;
    } else if (typeof rawTags === 'string') {
      try {
        parsedTags = JSON.parse(rawTags);
      } catch {
        parsedTags = [rawTags];
      }
    }

    const txDate = t.transaction_date || t.date || new Date();
    const txType = t.type || t.transaction_type || 'INCOME';

    return {
      id: t.id,
      studio_id: t.studio_id,
      gallery_id: t.gallery_id,
      gallery_title: galleryTitle || t.gallery?.title || null,
      client_id: t.client_id,
      client_name: clientName || t.client?.name || null,
      client_email: clientEmail || t.client?.email || null,
      type: txType,
      category: t.category,
      amount: Number(t.amount),
      currency: t.currency || 'USD',
      status: t.status || 'COMPLETED',
      payment_method: t.payment_method,
      reference_number: t.reference_number || t.reference,
      transaction_date: txDate,
      description: t.description,
      notes: t.notes,
      tags: parsedTags,
      is_void: Boolean(t.is_void),
      void_reason: t.void_reason,
      voided_at: t.voided_at,
      voided_by: t.voided_by,
      created_by: t.created_by,
      created_at: t.created_at,
      updated_at: t.updated_at,

      // UI CamelCase aliases
      studioId: t.studio_id,
      galleryId: t.gallery_id,
      galleryTitle: galleryTitle || t.gallery?.title || null,
      clientId: t.client_id,
      clientName: clientName || t.client?.name || null,
      clientEmail: clientEmail || t.client?.email || null,
      paymentMethod: t.payment_method,
      referenceNumber: t.reference_number || t.reference,
      transactionDate: txDate,
      isVoid: Boolean(t.is_void),
      voidReason: t.void_reason,
      voidedAt: t.voided_at,
      voidedBy: t.voided_by,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }
}
