/**
 * Studio Financial Operations & Profitability Service — PIXMatch AI Phase 33
 * Multi-tenant financial management, expense tracking, accounts, vendors,
 * payments with idempotency, budgets, reconciliation, profitability calculations,
 * tax summaries, cash flow, audit logging, and formula-safe CSV exports.
 */

import { prisma } from '@pixmatch/database';
import {
  FinancialAccountType,
  FinancialExpenseStatus,
  FinancialPaymentStatus,
  FinancialApprovalStatus,
  FinancialVendorStatus,
  FinancialReceivableStatus,
  FinancialPayableStatus,
  FinancialBudgetPeriodType,
  FinancialBudgetStatus,
  FinancialReconciliationStatus,
  FinancialAuditEntityType,
  FinancialCostClassification,
  IStudioFinancialAccountDTO,
  IStudioExpenseCategoryDTO,
  IStudioVendorDTO,
  IStudioExpenseDTO,
  IStudioExpensePaymentDTO,
  IStudioReceivableDTO,
  IStudioPayableDTO,
  IStudioBudgetDTO,
  IStudioFinancialReconciliationDTO,
  IProjectProfitabilityDTO,
  IClientProfitabilityDTO,
  IServiceLineProfitabilityDTO,
  IStudioCashFlowSummaryDTO,
  IStudioTaxSummaryDTO,
  ICreateFinancialAccountDTO,
  ICreateExpenseCategoryDTO,
  ICreateVendorDTO,
  ICreateExpenseDTO,
  IRecordExpensePaymentDTO,
  ICreateBudgetDTO,
} from '@pixmatch/types';

export class StudioFinancialOperationsService {
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
  }

  private static defaultInstance = new StudioFinancialOperationsService();

  public static getInstance(dbClient?: any): StudioFinancialOperationsService {
    if (dbClient) {
      return new StudioFinancialOperationsService(dbClient);
    }
    return StudioFinancialOperationsService.defaultInstance;
  }

  // Model accessor helpers supporting dual naming
  private get accountModel() {
    return this.db.financialAccount || this.db.studioFinancialAccount;
  }
  private get categoryModel() {
    return this.db.financialExpenseCategory || this.db.studioExpenseCategory;
  }
  private get vendorModel() {
    return this.db.financialVendor || this.db.studioVendor;
  }
  private get expenseModel() {
    return this.db.financialExpense || this.db.studioExpense;
  }
  private get paymentModel() {
    return this.db.financialExpensePayment || this.db.studioExpensePayment;
  }
  private get receivableModel() {
    return this.db.financialReceivable || this.db.studioReceivable;
  }
  private get payableModel() {
    return this.db.financialPayable || this.db.studioPayable;
  }
  private get budgetModel() {
    return this.db.financialBudget || this.db.studioBudget;
  }
  private get reconciliationModel() {
    return this.db.financialReconciliation || this.db.studioFinancialReconciliation;
  }
  private get auditModel() {
    return this.db.financialAuditLog || this.db.studioFinancialAudit || this.db.studioFinancialAuditLog;
  }

  // -------------------------------------------------------------
  // SANITIZATION & SECURITY UTILITIES
  // -------------------------------------------------------------

  public static sanitizeContent(text?: string | null): string {
    if (!text) return '';
    let sanitized = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, 'blocked-scheme:')
      .replace(/data:/gi, 'blocked-scheme:')
      .replace(/vbscript:/gi, 'blocked-scheme:');
    return sanitized.trim();
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

  // -------------------------------------------------------------
  // AUDIT LOG HELPER
  // -------------------------------------------------------------

  private async createAuditLog(
    studioId: string,
    entityType: FinancialAuditEntityType,
    entityId: string,
    action: string,
    actorMemberId?: string | null,
    previousState?: any,
    newState?: any,
    metadata?: any
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
            previous_state: previousState ? JSON.stringify(previousState) : null,
            new_state: newState ? JSON.stringify(newState) : null,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
      }
    } catch (err) {
      console.error('[FinancialAuditLog] Failed to record audit log:', err);
    }
  }

  // -------------------------------------------------------------
  // FINANCIAL ACCOUNTS
  // -------------------------------------------------------------

  async createAccount(studioId: string, dto: ICreateFinancialAccountDTO, actorMemberId?: string): Promise<IStudioFinancialAccountDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Account name is required');
    }

    const openingBalance = Math.max(0, Math.floor(dto.opening_balance_cents || 0));

    const account = await this.accountModel.create({
      data: {
        studio_id: studioId,
        name: StudioFinancialOperationsService.sanitizeContent(dto.name),
        account_type: dto.account_type || 'BANK',
        currency: (dto.currency || 'USD').toUpperCase(),
        opening_balance_cents: openingBalance,
        current_balance_cents: openingBalance,
        is_active: true,
      },
    });

    await this.createAuditLog(
      studioId,
      'ACCOUNT',
      account.id,
      'CREATE_ACCOUNT',
      actorMemberId,
      null,
      account
    );

    return account;
  }

  async listAccounts(studioId: string, query: { is_active?: boolean } = {}): Promise<IStudioFinancialAccountDTO[]> {
    const where: any = { studio_id: studioId };
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    return this.accountModel.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });
  }

  async getAccountById(studioId: string, accountId: string): Promise<IStudioFinancialAccountDTO> {
    const account = await this.accountModel.findFirst({
      where: { id: accountId, studio_id: studioId },
    });
    if (!account) {
      throw new Error('Financial account not found');
    }
    return account;
  }

  async updateAccount(
    studioId: string,
    accountId: string,
    data: { name?: string; account_type?: FinancialAccountType; is_active?: boolean },
    actorMemberId?: string
  ): Promise<IStudioFinancialAccountDTO> {
    const existing = await this.getAccountById(studioId, accountId);
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = StudioFinancialOperationsService.sanitizeContent(data.name);
    if (data.account_type !== undefined) updateData.account_type = data.account_type;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const updated = await this.accountModel.update({
      where: { id: accountId },
      data: updateData,
    });

    await this.createAuditLog(
      studioId,
      'ACCOUNT',
      accountId,
      'UPDATE_ACCOUNT',
      actorMemberId,
      existing,
      updated
    );

    return updated;
  }

  // -------------------------------------------------------------
  // EXPENSE CATEGORIES
  // -------------------------------------------------------------

  async seedDefaultCategories(studioId: string): Promise<void> {
    const defaults = [
      { name: 'Equipment & Gear', description: 'Cameras, lenses, lighting, audio', is_system: true },
      { name: 'Labor & Contractors', description: 'Second shooters, assistants, retouchers', is_system: true },
      { name: 'Studio & Location Rental', description: 'Studio space, permits, props', is_system: true },
      { name: 'Travel & Transport', description: 'Mileage, flights, hotels, parking', is_system: true },
      { name: 'Software & Subscriptions', description: 'Cloud storage, editing software, SaaS', is_system: true },
      { name: 'Marketing & Advertising', description: 'Ads, print materials, website hosting', is_system: true },
      { name: 'Office & Admin', description: 'Supplies, utilities, phone, internet', is_system: true },
      { name: 'Taxes & Licenses', description: 'Sales tax, business licensing, permits', is_system: true },
      { name: 'Miscellaneous', description: 'Other business operational expenses', is_system: true },
    ];

    for (const cat of defaults) {
      const exists = await this.categoryModel.findFirst({
        where: { studio_id: studioId, name: cat.name },
      });
      if (!exists) {
        await this.categoryModel.create({
          data: {
            studio_id: studioId,
            name: cat.name,
            description: cat.description,
            is_system: cat.is_system,
            is_active: true,
          },
        });
      }
    }
  }

  async createCategory(studioId: string, dto: ICreateExpenseCategoryDTO): Promise<IStudioExpenseCategoryDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Category name is required');
    }

    return this.categoryModel.create({
      data: {
        studio_id: studioId,
        name: StudioFinancialOperationsService.sanitizeContent(dto.name),
        description: StudioFinancialOperationsService.sanitizeContent(dto.description),
        parent_id: dto.parent_id || null,
        is_system: false,
        is_active: true,
      },
    });
  }

  async listCategories(studioId: string): Promise<IStudioExpenseCategoryDTO[]> {
    return this.categoryModel.findMany({
      where: { studio_id: studioId, is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  // -------------------------------------------------------------
  // VENDORS
  // -------------------------------------------------------------

  async createVendor(studioId: string, dto: ICreateVendorDTO, actorMemberId?: string): Promise<IStudioVendorDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Vendor name is required');
    }

    const vendor = await this.vendorModel.create({
      data: {
        studio_id: studioId,
        name: StudioFinancialOperationsService.sanitizeContent(dto.name),
        email: StudioFinancialOperationsService.sanitizeContent(dto.email),
        phone: StudioFinancialOperationsService.sanitizeContent(dto.phone),
        category: StudioFinancialOperationsService.sanitizeContent(dto.category),
        tax_id: dto.tax_id ? StudioFinancialOperationsService.sanitizeContent(dto.tax_id) : null,
        payment_terms_days: dto.payment_terms_days ? Math.max(0, Math.floor(dto.payment_terms_days)) : 30,
        notes: StudioFinancialOperationsService.sanitizeContent(dto.notes),
        status: 'ACTIVE',
      },
    });

    await this.createAuditLog(
      studioId,
      'VENDOR',
      vendor.id,
      'CREATE_VENDOR',
      actorMemberId,
      null,
      vendor
    );

    return vendor;
  }

  async listVendors(studioId: string, query: { status?: FinancialVendorStatus; search?: string } = {}): Promise<IStudioVendorDTO[]> {
    const where: any = { studio_id: studioId, deleted_at: null };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.vendorModel.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getVendorById(studioId: string, vendorId: string): Promise<IStudioVendorDTO> {
    const vendor = await this.vendorModel.findFirst({
      where: { id: vendorId, studio_id: studioId, deleted_at: null },
    });
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return vendor;
  }

  async updateVendor(
    studioId: string,
    vendorId: string,
    data: Partial<ICreateVendorDTO> & { status?: FinancialVendorStatus },
    actorMemberId?: string
  ): Promise<IStudioVendorDTO> {
    const existing = await this.getVendorById(studioId, vendorId);
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = StudioFinancialOperationsService.sanitizeContent(data.name);
    if (data.email !== undefined) updateData.email = StudioFinancialOperationsService.sanitizeContent(data.email);
    if (data.phone !== undefined) updateData.phone = StudioFinancialOperationsService.sanitizeContent(data.phone);
    if (data.category !== undefined) updateData.category = StudioFinancialOperationsService.sanitizeContent(data.category);
    if (data.notes !== undefined) updateData.notes = StudioFinancialOperationsService.sanitizeContent(data.notes);
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await this.vendorModel.update({
      where: { id: vendorId },
      data: updateData,
    });

    await this.createAuditLog(
      studioId,
      'VENDOR',
      vendorId,
      'UPDATE_VENDOR',
      actorMemberId,
      existing,
      updated
    );

    return updated;
  }

  async deleteVendor(studioId: string, vendorId: string, actorMemberId?: string): Promise<void> {
    const existing = await this.getVendorById(studioId, vendorId);
    await this.vendorModel.update({
      where: { id: vendorId },
      data: { deleted_at: new Date() },
    });

    await this.createAuditLog(
      studioId,
      'VENDOR',
      vendorId,
      'DELETE_VENDOR',
      actorMemberId,
      existing,
      { deleted_at: new Date() }
    );
  }

  // -------------------------------------------------------------
  // EXPENSES MANAGEMENT
  // -------------------------------------------------------------

  async createExpense(
    studioId: string,
    creatorMemberId: string,
    dto: ICreateExpenseDTO
  ): Promise<IStudioExpenseDTO> {
    if (!dto.description || !dto.description.trim()) {
      throw new Error('Expense description is required');
    }
    if (dto.amount_cents === undefined || dto.amount_cents === null || dto.amount_cents <= 0) {
      throw new Error('Expense amount must be greater than zero');
    }
    if (!dto.category_id) {
      throw new Error('Expense category is required');
    }

    const amountCents = Math.floor(dto.amount_cents);
    const taxCents = Math.max(0, Math.floor(dto.tax_cents || 0));

    // Determine approval status (e.g. expenses > $500/50000 cents require approval, else NOT_REQUIRED or APPROVED)
    const requiresApproval = amountCents >= 50000;
    const approvalStatus: FinancialApprovalStatus = requiresApproval ? 'PENDING' : 'NOT_REQUIRED';

    const expense = await this.expenseModel.create({
      data: {
        studio_id: studioId,
        account_id: dto.account_id || null,
        project_id: dto.project_id || null,
        client_id: dto.client_id || null,
        vendor_id: dto.vendor_id || null,
        category_id: dto.category_id,
        description: StudioFinancialOperationsService.sanitizeContent(dto.description),
        amount_cents: amountCents,
        tax_cents: taxCents,
        currency: (dto.currency || 'USD').toUpperCase(),
        cost_type: dto.cost_type || 'DIRECT',
        expense_date: new Date(dto.expense_date || Date.now()),
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        status: 'RECORDED',
        payment_status: 'UNPAID',
        approval_status: approvalStatus,
        reference: dto.reference ? StudioFinancialOperationsService.sanitizeContent(dto.reference) : null,
        notes: dto.notes ? StudioFinancialOperationsService.sanitizeContent(dto.notes) : null,
        created_by_member_id: creatorMemberId,
      },
    });

    // If there is a vendor or due_date and unpaid, automatically track in Payables
    if (dto.vendor_id || dto.due_date) {
      await this.payableModel.create({
        data: {
          studio_id: studioId,
          vendor_id: dto.vendor_id || null,
          project_id: dto.project_id || null,
          expense_id: expense.id,
          description: `Payable for: ${expense.description}`,
          total_amount_cents: amountCents + taxCents,
          paid_amount_cents: 0,
          due_date: expense.due_date,
          currency: expense.currency,
          status: 'OPEN',
        },
      });
    }

    await this.createAuditLog(
      studioId,
      'EXPENSE',
      expense.id,
      'CREATE_EXPENSE',
      creatorMemberId,
      null,
      expense
    );

    return expense;
  }

  async getExpenseById(studioId: string, expenseId: string): Promise<IStudioExpenseDTO> {
    const expense = await this.expenseModel.findFirst({
      where: { id: expenseId, studio_id: studioId },
      include: {
        category: true,
        account: true,
        vendor: true,
        payments: true,
      },
    });
    if (!expense) {
      throw new Error('Expense not found');
    }
    return expense;
  }

  async listExpenses(
    studioId: string,
    query: {
      project_id?: string;
      client_id?: string;
      vendor_id?: string;
      category_id?: string;
      status?: FinancialExpenseStatus;
      payment_status?: FinancialPaymentStatus;
      approval_status?: FinancialApprovalStatus;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ expenses: IStudioExpenseDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { studio_id: studioId };
    if (query.project_id) where.project_id = query.project_id;
    if (query.client_id) where.client_id = query.client_id;
    if (query.vendor_id) where.vendor_id = query.vendor_id;
    if (query.category_id) where.category_id = query.category_id;
    if (query.status) where.status = query.status;
    if (query.payment_status) where.payment_status = query.payment_status;
    if (query.approval_status) where.approval_status = query.approval_status;
    if (query.start_date || query.end_date) {
      where.expense_date = {};
      if (query.start_date) where.expense_date.gte = new Date(query.start_date);
      if (query.end_date) where.expense_date.lte = new Date(query.end_date);
    }

    const [expenses, total] = await Promise.all([
      this.expenseModel.findMany({
        where,
        include: {
          category: true,
          account: true,
          vendor: true,
        },
        orderBy: { expense_date: 'desc' },
        skip,
        take: limit,
      }),
      this.expenseModel.count({ where }),
    ]);

    return { expenses, total, page, limit };
  }

  async getExpenseSummary(
    studioId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_expenses_cents: number;
    total_tax_cents: number;
    paid_expenses_cents: number;
    unpaid_expenses_cents: number;
    pending_approval_count: number;
    recorded_count: number;
    categories_breakdown: Array<{ category_id: string; category_name: string; total_cents: number }>;
  }> {
    const where: any = { studio_id: studioId, status: 'RECORDED' };
    if (startDate || endDate) {
      where.expense_date = {};
      if (startDate) where.expense_date.gte = new Date(startDate);
      if (endDate) where.expense_date.lte = new Date(endDate);
    }

    const expenses = await this.expenseModel.findMany({
      where,
      include: { category: true },
    });

    let totalCents = 0;
    let totalTaxCents = 0;
    let paidCents = 0;
    let unpaidCents = 0;
    let pendingApprovalCount = 0;
    const catMap: Record<string, { category_id: string; category_name: string; total_cents: number }> = {};

    for (const exp of expenses) {
      totalCents += exp.amount_cents || 0;
      totalTaxCents += exp.tax_cents || 0;
      if (exp.payment_status === 'PAID') {
        paidCents += exp.amount_cents || 0;
      } else {
        unpaidCents += exp.amount_cents || 0;
      }
      if (exp.approval_status === 'PENDING') {
        pendingApprovalCount++;
      }
      const catId = exp.category_id || 'uncategorized';
      const catName = exp.category?.name || 'General';
      if (!catMap[catId]) {
        catMap[catId] = { category_id: catId, category_name: catName, total_cents: 0 };
      }
      catMap[catId].total_cents += exp.amount_cents || 0;
    }

    return {
      total_expenses_cents: totalCents,
      total_tax_cents: totalTaxCents,
      paid_expenses_cents: paidCents,
      unpaid_expenses_cents: unpaidCents,
      pending_approval_count: pendingApprovalCount,
      recorded_count: expenses.length,
      categories_breakdown: Object.values(catMap),
    };
  }

  async approveExpense(
    studioId: string,
    expenseId: string,
    approverMemberId: string,
    approved: boolean,
    notes?: string
  ): Promise<IStudioExpenseDTO> {
    const expense = await this.getExpenseById(studioId, expenseId);
    
    // Strict Anti-Self-Approval rule: Creators cannot approve their own expenses
    if (expense.created_by_member_id && expense.created_by_member_id === approverMemberId) {
      throw new Error('Creators cannot approve their own expenses');
    }

    if (expense.approval_status === 'APPROVED' && approved) {
      return expense;
    }

    const newApprovalStatus: FinancialApprovalStatus = approved ? 'APPROVED' : 'REJECTED';

    const updated = await this.expenseModel.update({
      where: { id: expenseId },
      data: {
        approval_status: newApprovalStatus,
        approved_by_member_id: approverMemberId,
        approved_at: new Date(),
        notes: notes ? `${expense.notes || ''}\nApproval note: ${StudioFinancialOperationsService.sanitizeContent(notes)}`.trim() : expense.notes,
      },
    });

    await this.createAuditLog(
      studioId,
      'APPROVAL',
      expenseId,
      approved ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
      approverMemberId,
      expense,
      updated,
      { notes }
    );

    return updated;
  }

  async voidExpense(
    studioId: string,
    expenseId: string,
    actorMemberId: string,
    voidReason: string
  ): Promise<IStudioExpenseDTO> {
    const expense = await this.getExpenseById(studioId, expenseId);
    if (expense.status === 'VOIDED') {
      return expense;
    }

    if (!voidReason || !voidReason.trim()) {
      throw new Error('Void reason is required');
    }

    const updated = await this.expenseModel.update({
      where: { id: expenseId },
      data: {
        status: 'VOIDED',
        voided_at: new Date(),
        void_reason: StudioFinancialOperationsService.sanitizeContent(voidReason),
      },
    });

    // Update related payable if present
    await this.payableModel.updateMany({
      where: { expense_id: expenseId, studio_id: studioId },
      data: { status: 'CANCELLED' },
    });

    await this.createAuditLog(
      studioId,
      'EXPENSE',
      expenseId,
      'VOID_EXPENSE',
      actorMemberId,
      expense,
      updated,
      { voidReason }
    );

    return updated;
  }

  // -------------------------------------------------------------
  // EXPENSE PAYMENTS (IDEMPOTENT)
  // -------------------------------------------------------------

  async recordExpensePayment(
    studioId: string,
    actorMemberId: string,
    dto: IRecordExpensePaymentDTO
  ): Promise<IStudioExpensePaymentDTO> {
    if (!dto.expense_id || !dto.account_id || !dto.idempotency_key) {
      throw new Error('Expense ID, Account ID, and Idempotency Key are required');
    }
    if (dto.amount_cents <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Check existing payment with this idempotency key
    const existingPayment = await this.paymentModel.findUnique({
      where: { idempotency_key: dto.idempotency_key },
    });
    if (existingPayment) {
      return existingPayment;
    }

    const expense = await this.getExpenseById(studioId, dto.expense_id);
    if (expense.status === 'VOIDED') {
      throw new Error('Cannot record payment for a voided expense');
    }

    await this.getAccountById(studioId, dto.account_id);
    const paymentAmount = Math.floor(dto.amount_cents);

    // Atomic transaction for payment creation, account balance deduction, and expense status update
    const txRunner = this.db.$transaction ? this.db.$transaction.bind(this.db) : async (fn: any) => fn(this.db);
    const result = await txRunner(async (tx: any) => {
      const pModel = tx.financialExpensePayment || tx.studioExpensePayment || this.paymentModel;
      const aModel = tx.financialAccount || tx.studioFinancialAccount || this.accountModel;
      const eModel = tx.financialExpense || tx.studioExpense || this.expenseModel;
      const payModel = tx.financialPayable || tx.studioPayable || this.payableModel;

      const payment = await pModel.create({
        data: {
          studio_id: studioId,
          expense_id: dto.expense_id,
          account_id: dto.account_id,
          amount_cents: paymentAmount,
          payment_date: new Date(dto.payment_date || Date.now()),
          reference: dto.reference ? StudioFinancialOperationsService.sanitizeContent(dto.reference) : null,
          created_by_member_id: actorMemberId,
          idempotency_key: dto.idempotency_key,
        },
      });

      // Deduct account balance
      await aModel.update({
        where: { id: dto.account_id },
        data: {
          current_balance_cents: {
            decrement: paymentAmount,
          },
        },
      });

      // Calculate total paid for this expense
      const payments = await pModel.findMany({
        where: { expense_id: dto.expense_id },
      });
      const totalPaid = payments.reduce((acc: number, p: any) => acc + p.amount_cents, 0);
      const totalDue = expense.amount_cents + expense.tax_cents;

      let paymentStatus: FinancialPaymentStatus = 'PARTIALLY_PAID';
      if (totalPaid >= totalDue) {
        paymentStatus = 'PAID';
      } else if (totalPaid === 0) {
        paymentStatus = 'UNPAID';
      }

      await eModel.update({
        where: { id: dto.expense_id },
        data: {
          payment_status: paymentStatus,
          account_id: dto.account_id,
        },
      });

      // Update related payable if exists
      const payable = await payModel.findFirst({
        where: { expense_id: dto.expense_id, studio_id: studioId },
      });
      if (payable) {
        const newPaid = payable.paid_amount_cents + paymentAmount;
        let pStatus: FinancialPayableStatus = 'PARTIALLY_PAID';
        if (newPaid >= payable.total_amount_cents) {
          pStatus = 'PAID';
        }
        await payModel.update({
          where: { id: payable.id },
          data: {
            paid_amount_cents: newPaid,
            status: pStatus,
          },
        });
      }

      return payment;
    });

    await this.createAuditLog(
      studioId,
      'EXPENSE_PAYMENT',
      result.id,
      'RECORD_PAYMENT',
      actorMemberId,
      null,
      result,
      { amount_cents: paymentAmount, account_id: dto.account_id }
    );

    return result;
  }

  // -------------------------------------------------------------
  // RECEIVABLES & PAYABLES
  // -------------------------------------------------------------

  async listReceivables(
    studioId: string,
    query: { client_id?: string; project_id?: string; status?: FinancialReceivableStatus } = {}
  ): Promise<IStudioReceivableDTO[]> {
    const where: any = { studio_id: studioId };
    if (query.client_id) where.client_id = query.client_id;
    if (query.project_id) where.project_id = query.project_id;
    if (query.status) where.status = query.status;

    return this.receivableModel.findMany({
      where,
      orderBy: { due_date: 'asc' },
    });
  }

  async listPayables(
    studioId: string,
    query: { vendor_id?: string; project_id?: string; status?: FinancialPayableStatus } = {}
  ): Promise<IStudioPayableDTO[]> {
    const where: any = { studio_id: studioId };
    if (query.vendor_id) where.vendor_id = query.vendor_id;
    if (query.project_id) where.project_id = query.project_id;
    if (query.status) where.status = query.status;

    return this.payableModel.findMany({
      where,
      orderBy: { due_date: 'asc' },
    });
  }

  async getAgingReport(
    studioId: string,
    type: 'receivables' | 'payables' = 'receivables'
  ): Promise<{
    current_cents: number;
    days_1_30_cents: number;
    days_31_60_cents: number;
    days_61_90_cents: number;
    over_90_days_cents: number;
    total_outstanding_cents: number;
    items: any[];
  }> {
    const now = new Date();
    let currentCents = 0;
    let days1to30Cents = 0;
    let days31to60Cents = 0;
    let days61to90Cents = 0;
    let over90Cents = 0;

    let items: any[] = [];
    if (type === 'receivables') {
      items = await this.listReceivables(studioId, { status: 'OPEN' });
      for (const item of items) {
        const outstanding = item.total_amount_cents - (item.received_amount_cents || 0);
        const dueDate = item.due_date ? new Date(item.due_date) : now;
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) currentCents += outstanding;
        else if (diffDays <= 30) days1to30Cents += outstanding;
        else if (diffDays <= 60) days31to60Cents += outstanding;
        else if (diffDays <= 90) days61to90Cents += outstanding;
        else over90Cents += outstanding;
      }
    } else {
      items = await this.listPayables(studioId, { status: 'OPEN' });
      for (const item of items) {
        const outstanding = item.total_amount_cents - (item.paid_amount_cents || 0);
        const dueDate = item.due_date ? new Date(item.due_date) : now;
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) currentCents += outstanding;
        else if (diffDays <= 30) days1to30Cents += outstanding;
        else if (diffDays <= 60) days31to60Cents += outstanding;
        else if (diffDays <= 90) days61to90Cents += outstanding;
        else over90Cents += outstanding;
      }
    }

    const totalOutstanding = currentCents + days1to30Cents + days31to60Cents + days61to90Cents + over90Cents;

    return {
      current_cents: currentCents,
      days_1_30_cents: days1to30Cents,
      days_31_60_cents: days31to60Cents,
      days_61_90_cents: days61to90Cents,
      over_90_days_cents: over90Cents,
      total_outstanding_cents: totalOutstanding,
      items,
    };
  }

  // -------------------------------------------------------------
  // BUDGETS & VARIANCE
  // -------------------------------------------------------------

  async createBudget(studioId: string, dto: ICreateBudgetDTO, actorMemberId?: string): Promise<IStudioBudgetDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Budget name is required');
    }
    if (dto.amount_cents === undefined || dto.amount_cents <= 0) {
      throw new Error('Budget amount must be greater than zero');
    }

    const budget = await this.budgetModel.create({
      data: {
        studio_id: studioId,
        name: StudioFinancialOperationsService.sanitizeContent(dto.name),
        period_type: dto.period_type || 'MONTHLY',
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        amount_cents: Math.floor(dto.amount_cents),
        category_id: dto.category_id || null,
        project_id: dto.project_id || null,
        status: 'ACTIVE',
      },
    });

    await this.createAuditLog(
      studioId,
      'BUDGET',
      budget.id,
      'CREATE_BUDGET',
      actorMemberId,
      null,
      budget
    );

    return budget;
  }

  async listBudgets(studioId: string, query: { project_id?: string; status?: FinancialBudgetStatus } = {}): Promise<IStudioBudgetDTO[]> {
    const where: any = { studio_id: studioId };
    if (query.project_id) where.project_id = query.project_id;
    if (query.status) where.status = query.status;

    return this.budgetModel.findMany({
      where,
      orderBy: { start_date: 'desc' },
    });
  }

  async getBudgetVariance(studioId: string, budgetId: string): Promise<any> {
    const budget = await this.budgetModel.findFirst({
      where: { id: budgetId, studio_id: studioId },
    });
    if (!budget) {
      throw new Error('Budget not found');
    }

    const where: any = {
      studio_id: studioId,
      status: 'RECORDED',
      expense_date: {
        gte: budget.start_date,
        lte: budget.end_date,
      },
    };
    if (budget.category_id) where.category_id = budget.category_id;
    if (budget.project_id) where.project_id = budget.project_id;

    const expenses = await this.expenseModel.findMany({ where });
    const actualSpentCents = expenses.reduce((acc: number, e: any) => acc + e.amount_cents + e.tax_cents, 0);
    const varianceCents = budget.amount_cents - actualSpentCents;
    const utilizationPct = budget.amount_cents > 0 ? (actualSpentCents / budget.amount_cents) * 100 : 0;

    return {
      budget_id: budget.id,
      budget_name: budget.name,
      budgeted_cents: budget.amount_cents,
      actual_spent_cents: actualSpentCents,
      variance_cents: varianceCents,
      utilization_pct: Number(utilizationPct.toFixed(2)),
      is_over_budget: actualSpentCents > budget.amount_cents,
    };
  }

  // -------------------------------------------------------------
  // FINANCIAL RECONCILIATION
  // -------------------------------------------------------------

  async createReconciliation(
    studioId: string,
    actorMemberId: string,
    data: {
      transaction_id?: string;
      receivable_id?: string;
      payable_id?: string;
      expense_id?: string;
      matched_amount_cents: number;
      notes?: string;
    }
  ): Promise<IStudioFinancialReconciliationDTO> {
    const reconciliation = await this.reconciliationModel.create({
      data: {
        studio_id: studioId,
        transaction_id: data.transaction_id || null,
        receivable_id: data.receivable_id || null,
        payable_id: data.payable_id || null,
        expense_id: data.expense_id || null,
        matched_amount_cents: Math.floor(data.matched_amount_cents),
        status: 'RECONCILED',
        notes: data.notes ? StudioFinancialOperationsService.sanitizeContent(data.notes) : null,
        reconciled_by_member_id: actorMemberId,
      },
    });

    await this.createAuditLog(
      studioId,
      'RECONCILIATION',
      reconciliation.id,
      'CREATE_RECONCILIATION',
      actorMemberId,
      null,
      reconciliation
    );

    return reconciliation;
  }

  async listReconciliations(studioId: string): Promise<IStudioFinancialReconciliationDTO[]> {
    return this.reconciliationModel.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });
  }

  // -------------------------------------------------------------
  // PROFITABILITY ANALYTICS ENGINE
  // -------------------------------------------------------------

  async calculateProjectProfitability(studioId: string, projectId: string): Promise<IProjectProfitabilityDTO> {
    const project = await this.db.operationProject.findFirst({
      where: { id: projectId, studio_id: studioId },
    });
    if (!project) {
      throw new Error('Project not found');
    }

    // 1. Calculate Revenue from transactions/receivables associated with project
    let revenueCents = 0;
    if (this.db.studioBusinessTransaction?.findMany) {
      const transactions = await this.db.studioBusinessTransaction.findMany({
        where: { studio_id: studioId, project_id: projectId, status: 'RECORDED' },
      });
      revenueCents = transactions.reduce((acc: number, t: any) => acc + t.amount_cents, 0);
    }

    // 2. Direct expenses associated with project
    const expenses = await this.expenseModel.findMany({
      where: { studio_id: studioId, project_id: projectId, status: 'RECORDED' },
      include: { category: true },
    });

    let directCostsCents = 0;
    let allocatedCostsCents = 0;
    let vendorCostsCents = 0;
    let otherExpensesCents = 0;

    for (const exp of expenses) {
      const totalExp = exp.amount_cents + exp.tax_cents;
      if (exp.cost_type === 'DIRECT') {
        directCostsCents += totalExp;
      } else {
        allocatedCostsCents += totalExp;
      }

      if (exp.vendor_id) {
        vendorCostsCents += totalExp;
      } else {
        otherExpensesCents += totalExp;
      }
    }

    // 3. Labor costs from work time logs
    let laborCostsCents = 0;
    try {
      if (this.db.teamWorkTimeLog?.findMany) {
        const timeLogs = await this.db.teamWorkTimeLog.findMany({
          where: { studio_id: studioId, project_id: projectId },
        });
        for (const log of timeLogs) {
          const durationHours = (log.duration_minutes || 0) / 60;
          laborCostsCents += Math.round(durationHours * 5000);
        }
      }
    } catch {
      // optional time log calculation
    }

    // 4. Equipment depreciation / rental estimate
    const equipmentDepreciationCents = Math.round(directCostsCents * 0.05);

    const totalCostsCents = directCostsCents + allocatedCostsCents + laborCostsCents;
    const grossProfitCents = revenueCents - totalCostsCents;
    const profitMarginPct = revenueCents > 0 ? Number(((grossProfitCents / revenueCents) * 100).toFixed(2)) : 0;

    return {
      project_id: projectId,
      project_name: project.name,
      currency: 'USD',
      revenue_cents: revenueCents,
      direct_costs_cents: directCostsCents,
      allocated_costs_cents: allocatedCostsCents,
      total_costs_cents: totalCostsCents,
      gross_profit_cents: grossProfitCents,
      profit_margin_pct: profitMarginPct,
      labor_costs_cents: laborCostsCents,
      equipment_depreciation_cents: equipmentDepreciationCents,
      vendor_costs_cents: vendorCostsCents,
      other_expenses_cents: otherExpensesCents,
    };
  }

  async calculateBookingProfitability(studioId: string, bookingId: string): Promise<any> {
    let booking: any = null;
    if (this.db.booking?.findFirst) {
      booking = await this.db.booking.findFirst({ where: { id: bookingId, studio_id: studioId } });
    }
    const bookingRevenue = booking ? (booking.total_price_cents || booking.deposit_cents || 0) : 0;
    
    // Expenses related to booking or associated shoot
    const expenses = await this.expenseModel.findMany({
      where: { studio_id: studioId, reference: bookingId, status: 'RECORDED' },
    });
    const totalCosts = expenses.reduce((acc: number, e: any) => acc + e.amount_cents + e.tax_cents, 0);
    const grossProfit = bookingRevenue - totalCosts;
    const marginPct = bookingRevenue > 0 ? Number(((grossProfit / bookingRevenue) * 100).toFixed(2)) : 0;

    return {
      booking_id: bookingId,
      revenue_cents: bookingRevenue,
      costs_cents: totalCosts,
      gross_profit_cents: grossProfit,
      margin_pct: marginPct,
    };
  }

  async calculateOrderProfitability(studioId: string, orderId: string): Promise<any> {
    let order: any = null;
    if (this.db.fulfillmentOrder?.findFirst) {
      order = await this.db.fulfillmentOrder.findFirst({ where: { id: orderId, studio_id: studioId } });
    }
    const orderRevenue = order ? (order.total_amount_cents || order.subtotal_cents || 0) : 0;
    const labCosts = order ? (order.lab_cost_cents || 0) : 0;
    const shippingCosts = order ? (order.shipping_cost_cents || 0) : 0;
    const totalCosts = labCosts + shippingCosts;
    const grossProfit = orderRevenue - totalCosts;
    const marginPct = orderRevenue > 0 ? Number(((grossProfit / orderRevenue) * 100).toFixed(2)) : 0;

    return {
      order_id: orderId,
      revenue_cents: orderRevenue,
      lab_costs_cents: labCosts,
      shipping_costs_cents: shippingCosts,
      total_costs_cents: totalCosts,
      gross_profit_cents: grossProfit,
      margin_pct: marginPct,
    };
  }

  async calculateClientProfitability(studioId: string, clientId: string): Promise<IClientProfitabilityDTO> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error('Client not found');
    }

    const projects = await this.db.operationProject.findMany({
      where: { studio_id: studioId, client_id: clientId },
    });

    let totalRevenue = 0;
    let totalCosts = 0;

    for (const p of projects) {
      try {
        const pProf = await this.calculateProjectProfitability(studioId, p.id);
        totalRevenue += pProf.revenue_cents;
        totalCosts += pProf.total_costs_cents;
      } catch {
        // Skip errored project calc
      }
    }

    // Also include client-level expenses not tied to specific project
    const clientExpenses = await this.expenseModel.findMany({
      where: { studio_id: studioId, client_id: clientId, project_id: null, status: 'RECORDED' },
    });
    for (const exp of clientExpenses) {
      totalCosts += exp.amount_cents + exp.tax_cents;
    }

    const grossProfit = totalRevenue - totalCosts;
    const profitMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

    // Receivables outstanding
    const receivables = await this.receivableModel.findMany({
      where: { studio_id: studioId, client_id: clientId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
    });
    const receivablesOutstanding = receivables.reduce((acc: number, r: any) => acc + (r.total_amount_cents - r.received_amount_cents), 0);

    return {
      client_id: clientId,
      client_name: client.name,
      currency: 'USD',
      total_revenue_cents: totalRevenue,
      total_costs_cents: totalCosts,
      gross_profit_cents: grossProfit,
      profit_margin_pct: profitMarginPct,
      total_projects: projects.length,
      receivables_outstanding_cents: receivablesOutstanding,
    };
  }

  async getCashFlowSummary(
    studioId: string,
    startDate?: string,
    endDate?: string
  ): Promise<IStudioCashFlowSummaryDTO> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Total Cash in from recorded transactions
    let totalCashIn = 0;
    if (this.db.studioBusinessTransaction?.findMany) {
      const inTransactions = await this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          status: 'RECORDED',
          transaction_type: { in: ['REVENUE', 'PAYMENT', 'INVOICE_PAYMENT', 'BOOKING_PAYMENT'] },
          occurred_at: { gte: start, lte: end },
        },
      });
      totalCashIn = inTransactions.reduce((acc: number, t: any) => acc + t.amount_cents, 0);
    }

    // 2. Total Cash out from expense payments
    const expensePayments = await this.paymentModel.findMany({
      where: {
        studio_id: studioId,
        payment_date: { gte: start, lte: end },
      },
    });
    const totalCashOut = expensePayments.reduce((acc: number, p: any) => acc + p.amount_cents, 0);

    // 3. Current active account balances
    const accounts = await this.listAccounts(studioId, { is_active: true });
    const cashBalance = accounts.reduce((acc: number, a: any) => acc + a.current_balance_cents, 0);

    // 4. Receivables and Payables due
    const openReceivables = await this.receivableModel.findMany({
      where: { studio_id: studioId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
    });
    const receivablesDue = openReceivables.reduce((acc: number, r: any) => acc + (r.total_amount_cents - r.received_amount_cents), 0);

    const openPayables = await this.payableModel.findMany({
      where: { studio_id: studioId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
    });
    const payablesDue = openPayables.reduce((acc: number, p: any) => acc + (p.total_amount_cents - p.paid_amount_cents), 0);

    const netCashFlow = totalCashIn - totalCashOut;
    const projectedNet = cashBalance + receivablesDue - payablesDue;

    return {
      currency: 'USD',
      total_cash_in_cents: totalCashIn,
      total_cash_out_cents: totalCashOut,
      net_cash_flow_cents: netCashFlow,
      cash_balance_cents: cashBalance,
      period_start: start,
      period_end: end,
      receivables_due_cents: receivablesDue,
      payables_due_cents: payablesDue,
      projected_net_cents: projectedNet,
    };
  }

  async getTaxSummary(
    studioId: string,
    startDate?: string,
    endDate?: string
  ): Promise<IStudioTaxSummaryDTO> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Collected tax from recorded revenue transactions
    let collectedTaxCents = 0;
    if (this.db.studioBusinessTransaction?.findMany) {
      const inTransactions = await this.db.studioBusinessTransaction.findMany({
        where: {
          studio_id: studioId,
          status: 'RECORDED',
          occurred_at: { gte: start, lte: end },
        },
      });
      collectedTaxCents = inTransactions.reduce((acc: number, t: any) => acc + (t.tax_amount_cents || 0), 0);
    }

    // Paid tax from recorded expenses
    const expenses = await this.expenseModel.findMany({
      where: {
        studio_id: studioId,
        status: 'RECORDED',
        expense_date: { gte: start, lte: end },
      },
    });
    const paidTaxCents = expenses.reduce((acc: number, e: any) => acc + (e.tax_cents || 0), 0);

    const netLiability = collectedTaxCents - paidTaxCents;

    return {
      currency: 'USD',
      collected_tax_cents: collectedTaxCents,
      paid_tax_cents: paidTaxCents,
      net_tax_liability_cents: netLiability,
      period_start: start,
      period_end: end,
    };
  }

  async getFinancialDashboard(studioId: string): Promise<any> {
    const [cashFlow, agingReceivables, agingPayables, accounts, budgets] = await Promise.all([
      this.getCashFlowSummary(studioId),
      this.getAgingReport(studioId, 'receivables'),
      this.getAgingReport(studioId, 'payables'),
      this.listAccounts(studioId, { is_active: true }),
      this.listBudgets(studioId, { status: 'ACTIVE' }),
    ]);

    const budgetVariances = await Promise.all(
      budgets.slice(0, 5).map(b => this.getBudgetVariance(studioId, b.id))
    );

    return {
      cash_flow: cashFlow,
      total_cash_cents: accounts.reduce((acc, a) => acc + a.current_balance_cents, 0),
      accounts,
      receivables_summary: {
        total_outstanding_cents: agingReceivables.total_outstanding_cents,
        overdue_cents: agingReceivables.days_1_30_cents + agingReceivables.days_31_60_cents + agingReceivables.days_61_90_cents + agingReceivables.over_90_days_cents,
      },
      payables_summary: {
        total_outstanding_cents: agingPayables.total_outstanding_cents,
        overdue_cents: agingPayables.days_1_30_cents + agingPayables.days_31_60_cents + agingPayables.days_61_90_cents + agingPayables.over_90_days_cents,
      },
      active_budgets: budgetVariances,
    };
  }

  async generateForecast(
    studioId: string,
    params: { months?: number } = {}
  ): Promise<{
    months_ahead: number;
    projected_revenue_cents: number;
    projected_expenses_cents: number;
    projected_net_cents: number;
    confidence_level: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const months = params.months || 3;
    const cashFlow = await this.getCashFlowSummary(studioId);

    const projectedRevenue = (cashFlow.total_cash_in_cents || 500000) * (months / 1);
    const projectedExpenses = (cashFlow.total_cash_out_cents || 200000) * (months / 1);
    const projectedNet = projectedRevenue - projectedExpenses;

    return {
      months_ahead: months,
      projected_revenue_cents: projectedRevenue,
      projected_expenses_cents: projectedExpenses,
      projected_net_cents: projectedNet,
      confidence_level: months <= 3 ? 'HIGH' : months <= 6 ? 'MEDIUM' : 'LOW',
    };
  }

  async draftPaymentFollowup(
    studioId: string,
    receivableId: string
  ): Promise<{
    receivable_id: string;
    is_draft: boolean;
    requires_human_approval: boolean;
    subject: string;
    body: string;
    amount_due_formatted: string;
  }> {
    const receivable = await this.receivableModel.findFirst({
      where: { id: receivableId, studio_id: studioId },
    });
    if (!receivable) {
      throw new Error('Receivable not found');
    }

    const dueAmount = receivable.total_amount_cents - (receivable.received_amount_cents || 0);
    const formatted = `$${(dueAmount / 100).toFixed(2)}`;

    return {
      receivable_id: receivable.id,
      is_draft: true,
      requires_human_approval: true,
      subject: `Friendly Payment Reminder: ${receivable.description}`,
      body: `Dear Client,\n\nThis is a gentle reminder that an outstanding payment of ${formatted} for "${receivable.description}" is currently due. Please let us know if you need any assistance with settlement.\n\nThank you,\nStudio Accounts Team`,
      amount_due_formatted: formatted,
    };
  }

  async searchFinancialTransactions(
    studioId: string,
    query: {
      search?: string;
      project_id?: string;
      category_id?: string;
      vendor_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
    } = {}
  ): Promise<{
    transactions: Array<{
      id: string;
      type: 'EXPENSE' | 'EXPENSE_PAYMENT' | 'RECEIVABLE' | 'PAYABLE';
      description: string;
      amount_cents: number;
      date: Date | string;
      status: string;
      reference?: string | null;
    }>;
    total: number;
  }> {
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const [expenses, payables, receivables] = await Promise.all([
      this.expenseModel.findMany({
        where: { studio_id: studioId },
        take: limit,
        orderBy: { expense_date: 'desc' },
      }),
      this.payableModel.findMany({
        where: { studio_id: studioId },
        take: limit,
        orderBy: { due_date: 'desc' },
      }),
      this.receivableModel.findMany({
        where: { studio_id: studioId },
        take: limit,
        orderBy: { due_date: 'desc' },
      }),
    ]);

    const results: Array<any> = [
      ...expenses.map((e: any) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        description: e.description,
        amount_cents: e.amount_cents,
        date: e.expense_date,
        status: e.status,
        reference: e.reference,
      })),
      ...payables.map((p: any) => ({
        id: p.id,
        type: 'PAYABLE' as const,
        description: p.description,
        amount_cents: p.amount_cents,
        date: p.due_date,
        status: p.status,
        reference: p.id,
      })),
      ...receivables.map((r: any) => ({
        id: r.id,
        type: 'RECEIVABLE' as const,
        description: r.description,
        amount_cents: r.total_amount_cents,
        date: r.due_date,
        status: r.status,
        reference: r.id,
      })),
    ];

    const term = query.search?.toLowerCase();
    const filtered = term
      ? results.filter((t) => t.description.toLowerCase().includes(term) || (t.reference && t.reference.toLowerCase().includes(term)))
      : results;

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      transactions: filtered.slice(0, limit),
      total: filtered.length,
    };
  }

  // -------------------------------------------------------------
  // FORMULA-SAFE CSV EXPORTS
  // -------------------------------------------------------------

  async exportExpensesCSV(studioId: string, query: any = {}): Promise<string> {
    const { expenses } = await this.listExpenses(studioId, { ...query, limit: 1000 });

    const headers = [
      'Expense ID',
      'Date',
      'Description',
      'Amount ($)',
      'Tax ($)',
      'Total ($)',
      'Currency',
      'Category',
      'Vendor',
      'Status',
      'Payment Status',
      'Approval Status',
      'Reference',
    ];

    const rows = expenses.map(e => [
      StudioFinancialOperationsService.sanitizeCSVField(e.id),
      StudioFinancialOperationsService.sanitizeCSVField(new Date(e.expense_date).toISOString().split('T')[0]),
      StudioFinancialOperationsService.sanitizeCSVField(e.description),
      StudioFinancialOperationsService.sanitizeCSVField((e.amount_cents / 100).toFixed(2)),
      StudioFinancialOperationsService.sanitizeCSVField((e.tax_cents / 100).toFixed(2)),
      StudioFinancialOperationsService.sanitizeCSVField(((e.amount_cents + e.tax_cents) / 100).toFixed(2)),
      StudioFinancialOperationsService.sanitizeCSVField(e.currency),
      StudioFinancialOperationsService.sanitizeCSVField((e as any).category?.name || 'Uncategorized'),
      StudioFinancialOperationsService.sanitizeCSVField((e as any).vendor?.name || 'N/A'),
      StudioFinancialOperationsService.sanitizeCSVField(e.status),
      StudioFinancialOperationsService.sanitizeCSVField(e.payment_status),
      StudioFinancialOperationsService.sanitizeCSVField(e.approval_status),
      StudioFinancialOperationsService.sanitizeCSVField(e.reference || ''),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async exportAccountsCSV(studioId: string): Promise<string> {
    const accounts = await this.listAccounts(studioId);

    const headers = [
      'Account ID',
      'Account Name',
      'Type',
      'Currency',
      'Opening Balance ($)',
      'Current Balance ($)',
      'Status',
    ];

    const rows = accounts.map(a => [
      StudioFinancialOperationsService.sanitizeCSVField(a.id),
      StudioFinancialOperationsService.sanitizeCSVField(a.name),
      StudioFinancialOperationsService.sanitizeCSVField(a.account_type),
      StudioFinancialOperationsService.sanitizeCSVField(a.currency),
      StudioFinancialOperationsService.sanitizeCSVField((a.opening_balance_cents / 100).toFixed(2)),
      StudioFinancialOperationsService.sanitizeCSVField((a.current_balance_cents / 100).toFixed(2)),
      StudioFinancialOperationsService.sanitizeCSVField(a.is_active ? 'ACTIVE' : 'INACTIVE'),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
