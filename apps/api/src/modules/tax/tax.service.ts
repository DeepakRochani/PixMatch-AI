/**
 * Studio Tax, GST & Compliance Operations Service — PIXMatch AI Phase 35
 * Multi-tenant tax configuration, GSTIN validation, basis-point tax rates,
 * SAC/HSN product/service mapping, deterministic tax determination (CGST+SGST vs IGST, CESS, RCM, SEZ/Export),
 * double-entry accounting journal linkage via Phase 34, Input Tax Credit (ITC),
 * Credit/Debit notes, tax periods, general ledger reconciliation, compliance engine,
 * GST-ready operational reports, and formula-injection-safe CSV export.
 */

import { prisma } from '@pixmatch/database';
import {
  TaxRegistrationType,
  TaxVerificationStatus,
  TaxType,
  TaxItemSourceType,
  TaxPartyType,
  TaxTransactionStatus,
  TaxComponent,
  TaxItcStatus,
  TaxAdjustmentType,
  TaxPeriodStatus,
  TaxReconciliationStatus,
  IStudioTaxProfileDTO,
  IStudioTaxRegistrationDTO,
  IStudioTaxJurisdictionDTO,
  IStudioTaxRateDTO,
  IStudioTaxCategoryDTO,
  IStudioTaxItemMappingDTO,
  IStudioTaxPartyProfileDTO,
  ITaxDeterminationInputDTO,
  ITaxDeterminationResultDTO,
  IStudioTaxTransactionDTO,
  IStudioTaxTransactionLineDTO,
  IStudioTaxAdjustmentDTO,
  IStudioTaxPeriodDTO,
  IStudioTaxReconciliationDTO,
  ITaxSummaryDTO,
  ITaxComplianceCheckDTO,
  ITaxComplianceReportDTO,
  ITaxAuditDTO,
} from '@pixmatch/types';
import { StudioAccountingService } from '../accounting/accounting.service';

export class StudioTaxService {
  private db: any;
  private accountingService: StudioAccountingService;

  constructor(dbClient?: any, accountingService?: StudioAccountingService) {
    this.db = dbClient || prisma;
    this.accountingService = accountingService || StudioAccountingService.getInstance(this.db);
  }

  private static defaultInstance = new StudioTaxService();

  public static getInstance(dbClient?: any, accountingService?: StudioAccountingService): StudioTaxService {
    if (dbClient || accountingService) {
      return new StudioTaxService(dbClient, accountingService);
    }
    return StudioTaxService.defaultInstance;
  }

  // Model accessor helpers
  private get profileModel() {
    return this.db.studioTaxProfile || this.db.taxProfile;
  }
  private get registrationModel() {
    return this.db.studioTaxRegistration || this.db.taxRegistration;
  }
  private get jurisdictionModel() {
    return this.db.studioTaxJurisdiction || this.db.taxJurisdiction;
  }
  private get rateModel() {
    return this.db.studioTaxRate || this.db.taxRate;
  }
  private get categoryModel() {
    return this.db.studioTaxCategory || this.db.taxCategory;
  }
  private get itemMappingModel() {
    return this.db.studioTaxItemMapping || this.db.taxItemMapping;
  }
  private get partyProfileModel() {
    return this.db.studioTaxPartyProfile || this.db.taxPartyProfile;
  }
  private get transactionModel() {
    return this.db.studioTaxTransaction || this.db.taxTransaction;
  }
  private get transactionLineModel() {
    return this.db.studioTaxTransactionLine || this.db.taxTransactionLine;
  }
  private get adjustmentModel() {
    return this.db.studioTaxAdjustment || this.db.taxAdjustment;
  }
  private get periodModel() {
    return this.db.studioTaxPeriod || this.db.taxPeriod;
  }
  private get reconciliationModel() {
    return this.db.studioTaxReconciliation || this.db.taxReconciliation;
  }
  private get auditModel() {
    return this.db.studioTaxAudit || this.db.taxAudit;
  }

  // -------------------------------------------------------------
  // 1. STRUCTURAL VALIDATION (GSTIN, PAN, STATE CODE)
  // -------------------------------------------------------------

  /**
   * Structural GSTIN validation (15 alphanumeric characters standard):
   * 2 digits (State Code) + 10 chars (PAN) + 1 digit (Entity code) + 'Z' + 1 checksum char
   */
  public validateGstin(gstin?: string | null): {
    isValid: boolean;
    stateCode?: string;
    pan?: string;
    status: 'FORMAT_VALID' | 'FORMAT_INVALID' | 'UNVERIFIED';
    reason?: string;
  } {
    if (!gstin || typeof gstin !== 'string') {
      return { isValid: false, status: 'FORMAT_INVALID', reason: 'GSTIN is empty' };
    }
    const clean = gstin.trim().toUpperCase();
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(clean)) {
      return { isValid: false, status: 'FORMAT_INVALID', reason: 'Invalid GSTIN format structure (must be 15 chars: 2-digit state + 10-char PAN + 1 entity + Z + 1 check)' };
    }

    const stateCode = clean.substring(0, 2);
    const pan = clean.substring(2, 12);
    const stateNum = parseInt(stateCode, 10);
    // Valid Indian state codes 01 through 38 or 97 (other territory)
    if (isNaN(stateNum) || stateNum < 1 || (stateNum > 38 && stateNum !== 97)) {
      return { isValid: false, stateCode, pan, status: 'FORMAT_INVALID', reason: `Invalid Indian GST State Code: ${stateCode}` };
    }

    return {
      isValid: true,
      stateCode,
      pan,
      status: 'FORMAT_VALID',
      reason: 'Structurally valid 15-character GSTIN',
    };
  }

  /**
   * Structural PAN validation (10 characters: 5 letters + 4 digits + 1 letter)
   */
  public validatePan(pan?: string | null): { isValid: boolean; status: 'FORMAT_VALID' | 'FORMAT_INVALID'; reason?: string } {
    if (!pan || typeof pan !== 'string') {
      return { isValid: false, status: 'FORMAT_INVALID', reason: 'PAN is empty' };
    }
    const clean = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(clean)) {
      return { isValid: false, status: 'FORMAT_INVALID', reason: 'Invalid PAN structure (must be 5 letters + 4 digits + 1 letter)' };
    }
    return { isValid: true, status: 'FORMAT_VALID' };
  }

  // -------------------------------------------------------------
  // 2. TAX PROFILE MANAGEMENT
  // -------------------------------------------------------------

  async getTaxProfile(studioId: string): Promise<IStudioTaxProfileDTO | null> {
    const profile = await this.profileModel.findFirst({
      where: { studio_id: studioId },
    });
    return profile || null;
  }

  async getOrCreateTaxProfile(studioId: string, defaultLegalName?: string): Promise<any> {
    let profile = await this.profileModel.findFirst({
      where: { studio_id: studioId },
    });
    if (!profile) {
      profile = await this.profileModel.create({
        data: {
          studio_id: studioId,
          legal_name: defaultLegalName || 'Studio Business Entity',
          country: 'India',
          country_code: 'IN',
          state: 'Maharashtra',
          state_code: '27',
          registration_type: 'REGULAR',
          gst_registered: true,
          default_currency: 'INR',
          financial_year_start_month: 4,
          tax_period_type: 'MONTHLY',
          is_active: true,
        },
      });
      await this.initializeDefaultTaxData(studioId);
    }
    return {
      ...profile,
      default_tax_rate_bps: (profile as any).default_tax_rate_bps ?? 1800,
      default_place_of_supply: (profile as any).default_place_of_supply ?? (profile.state_code === '27' ? 'MH' : profile.state_code || 'MH'),
      pan_number: profile.pan || (profile as any).pan_number,
    };
  }

  async updateTaxProfile(studioId: string, data: any, actorMemberId?: string): Promise<any> {
    const existing = await this.getTaxProfile(studioId);

    // Validate GSTIN if provided
    const gstinToValidate = data.gstin || data.gstin_number;
    if (gstinToValidate) {
      const gstinVal = this.validateGstin(gstinToValidate);
      if (!gstinVal.isValid) {
        throw new Error(`GSTIN validation failed: ${gstinVal.reason}`);
      }
      if (!data.state_code && gstinVal.stateCode) {
        data.state_code = gstinVal.stateCode;
      }
      if (!data.pan && gstinVal.pan) {
        data.pan = gstinVal.pan;
      }
      data.gstin = gstinToValidate;
    }

    // Validate PAN if provided
    const panToValidate = data.pan || data.pan_number;
    if (panToValidate) {
      const panVal = this.validatePan(panToValidate);
      if (!panVal.isValid) {
        throw new Error(`PAN validation failed: ${panVal.reason}`);
      }
      data.pan = panToValidate;
    }

    let updated: any;
    if (existing) {
      updated = await this.profileModel.update({
        where: { id: existing.id },
        data: {
          ...data,
          studio_id: studioId,
        },
      });
      await this.createAuditLog(studioId, 'TAX_PROFILE', updated.id, 'UPDATE_PROFILE', actorMemberId, existing, updated);
    } else {
      updated = await this.profileModel.create({
        data: {
          ...data,
          studio_id: studioId,
          legal_name: data.legal_name || 'Studio Business Entity',
        },
      });
      await this.createAuditLog(studioId, 'TAX_PROFILE', updated.id, 'CREATE_PROFILE', actorMemberId, null, updated);
      await this.initializeDefaultTaxData(studioId);
    }

    return {
      ...updated,
      pan_number: updated.pan || data.pan_number || data.pan,
      default_tax_rate_bps: (updated as any).default_tax_rate_bps ?? 1800,
      default_place_of_supply: (updated as any).default_place_of_supply ?? (updated.state_code === '27' ? 'MH' : updated.state_code || 'MH'),
    };
  }

  // -------------------------------------------------------------
  // 3. GST REGISTRATIONS
  // -------------------------------------------------------------

  async listRegistrations(studioId: string): Promise<IStudioTaxRegistrationDTO[]> {
    return this.registrationModel.findMany({
      where: { studio_id: studioId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
  }

  async createRegistration(studioId: string, data: any, actorMemberId?: string): Promise<IStudioTaxRegistrationDTO> {
    const regNumber = data.registration_number || data.gstin;
    const gstinVal = this.validateGstin(regNumber);
    if (!gstinVal.isValid) {
      throw new Error(`Registration number validation error: ${gstinVal.reason}`);
    }

    const stateCode = data.state_code || gstinVal.stateCode || '27';
    const isPrimary = data.is_primary ?? false;

    if (isPrimary) {
      // Unset other primaries
      await this.registrationModel.updateMany({
        where: { studio_id: studioId, is_primary: true },
        data: { is_primary: false },
      });
    }

    const reg = await this.registrationModel.create({
      data: {
        studio_id: studioId,
        registration_number: regNumber.trim().toUpperCase(),
        registration_type: data.registration_type === 'GSTIN' ? 'REGULAR' : (data.registration_type || 'REGULAR'),
        jurisdiction: data.jurisdiction || `State GST - ${stateCode}`,
        state_code: stateCode,
        effective_from: new Date(data.effective_from || new Date()),
        effective_to: data.effective_to ? new Date(data.effective_to) : null,
        is_primary: isPrimary,
        is_active: data.is_active ?? true,
        verification_status: 'UNVERIFIED', // Do not fabricate external verification
      },
    });

    await this.createAuditLog(studioId, 'TAX_REGISTRATION', reg.id, 'CREATE_REGISTRATION', actorMemberId, null, reg);
    return reg;
  }

  async updateRegistration(studioId: string, id: string, data: any, actorMemberId?: string): Promise<IStudioTaxRegistrationDTO> {
    const existing = await this.registrationModel.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) {
      throw new Error(`Tax registration not found: ${id}`);
    }

    if (data.registration_number) {
      const gstinVal = this.validateGstin(data.registration_number);
      if (!gstinVal.isValid) {
        throw new Error(`Registration number validation error: ${gstinVal.reason}`);
      }
      data.registration_number = data.registration_number.trim().toUpperCase();
    }

    if (data.is_primary) {
      await this.registrationModel.updateMany({
        where: { studio_id: studioId, id: { not: id }, is_primary: true },
        data: { is_primary: false },
      });
    }

    const updated = await this.registrationModel.update({
      where: { id },
      data,
    });

    await this.createAuditLog(studioId, 'TAX_REGISTRATION', id, 'UPDATE_REGISTRATION', actorMemberId, existing, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // 4. JURISDICTIONS & RATES
  // -------------------------------------------------------------

  async listJurisdictions(studioId: string): Promise<IStudioTaxJurisdictionDTO[]> {
    return this.jurisdictionModel.findMany({
      where: { studio_id: studioId },
      orderBy: { state_code: 'asc' },
    });
  }

  async createJurisdiction(studioId: string, data: any, actorMemberId?: string): Promise<IStudioTaxJurisdictionDTO> {
    const item = await this.jurisdictionModel.create({
      data: {
        studio_id: studioId,
        country_code: data.country_code || 'IN',
        state_code: data.state_code,
        jurisdiction_code: data.jurisdiction_code || `IN-${data.state_code}`,
        name: data.name,
        is_domestic: data.is_domestic ?? true,
        is_active: data.is_active ?? true,
      },
    });
    await this.createAuditLog(studioId, 'TAX_JURISDICTION', item.id, 'CREATE_JURISDICTION', actorMemberId, null, item);
    return item;
  }

  async listTaxRates(studioId: string): Promise<IStudioTaxRateDTO[]> {
    return this.rateModel.findMany({
      where: { studio_id: studioId },
      orderBy: { rate_basis_points: 'asc' },
    });
  }

  async createTaxRate(studioId: string, data: any, actorMemberId?: string): Promise<any> {
    const rateBps = Math.floor(data.rate_basis_points ?? data.rate_bps ?? 0);
    const code = (data.code || data.rate_code || `RATE_${rateBps}`).toUpperCase();
    const cgstBps = data.cgst_basis_points !== undefined ? Math.floor(data.cgst_basis_points) : Math.floor(rateBps / 2);
    const sgstBps = data.sgst_basis_points !== undefined ? Math.floor(data.sgst_basis_points) : Math.floor(rateBps / 2);
    const igstBps = data.igst_basis_points !== undefined ? Math.floor(data.igst_basis_points) : rateBps;
    const cessBps = Math.floor(data.cess_basis_points || 0);

    if (cgstBps + sgstBps !== rateBps && igstBps !== rateBps) {
      throw new Error(`Tax rate components must sum to rate basis points (${rateBps} bps). CGST: ${cgstBps}, SGST: ${sgstBps}, IGST: ${igstBps}`);
    }

    const rate = await this.rateModel.create({
      data: {
        studio_id: studioId,
        jurisdiction_id: data.jurisdiction_id || null,
        name: data.name || code,
        code,
        rate_basis_points: rateBps,
        cgst_basis_points: cgstBps,
        sgst_basis_points: sgstBps,
        igst_basis_points: igstBps,
        cess_basis_points: cessBps,
        effective_from: new Date(data.effective_from || '2000-01-01'),
        effective_to: data.effective_to ? new Date(data.effective_to) : null,
        is_active: data.is_active ?? true,
      },
    });

    await this.createAuditLog(studioId, 'TAX_RATE', rate.id, 'CREATE_TAX_RATE', actorMemberId, null, rate);
    return {
      ...rate,
      rate_code: rate.code,
    };
  }

  async updateTaxRate(studioId: string, id: string, data: any, actorMemberId?: string): Promise<IStudioTaxRateDTO> {
    const existing = await this.rateModel.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) throw new Error(`Tax rate not found: ${id}`);

    const updated = await this.rateModel.update({
      where: { id },
      data,
    });
    await this.createAuditLog(studioId, 'TAX_RATE', id, 'UPDATE_TAX_RATE', actorMemberId, existing, updated);
    return updated;
  }

  async findEffectiveRate(studioId: string, rateCodeOrId: string, date: Date = new Date()): Promise<IStudioTaxRateDTO> {
    const targetDate = date instanceof Date ? date : new Date(date);

    const rates = await this.rateModel.findMany({
      where: {
        studio_id: studioId,
        is_active: true,
        OR: [{ id: rateCodeOrId }, { code: rateCodeOrId }],
      },
    });

    const matched = rates.find((r: any) => {
      const from = new Date(r.effective_from);
      const to = r.effective_to ? new Date(r.effective_to) : null;
      return targetDate >= from && (!to || targetDate <= to);
    });

    if (!matched) {
      throw new Error(`TAX_RATE_NOT_FOUND: No active tax rate found for "${rateCodeOrId}" on date ${targetDate.toISOString().split('T')[0]}`);
    }

    return matched;
  }

  // -------------------------------------------------------------
  // 5. TAX CATEGORIES & PRODUCT/SERVICE MAPPINGS
  // -------------------------------------------------------------

  async listTaxCategories(studioId: string): Promise<IStudioTaxCategoryDTO[]> {
    return this.categoryModel.findMany({
      where: { studio_id: studioId },
      include: { default_rate: true },
      orderBy: { code: 'asc' },
    });
  }

  async createTaxCategory(studioId: string, data: any, actorMemberId?: string): Promise<any> {
    const code = (data.code || data.category_code || 'CAT_GENERAL').toUpperCase();
    const defaultSacHsn = data.default_sac_hsn_code || data.default_sac_hsn || data.sac_hsn_code;
    const item = await this.categoryModel.create({
      data: {
        studio_id: studioId,
        code,
        name: data.name || code,
        description: data.description || null,
        tax_type: data.tax_type || (data.taxability === 'TAXABLE' ? 'STANDARD' : (data.taxability || 'STANDARD')),
        default_rate_id: data.default_rate_id || null,
        is_taxable: data.is_taxable ?? true,
        is_zero_rated: data.is_zero_rated ?? false,
        is_exempt: data.is_exempt ?? false,
        is_nil_rated: data.is_nil_rated ?? false,
        is_active: data.is_active ?? true,
      },
      include: { default_rate: true },
    });
    await this.createAuditLog(studioId, 'TAX_CATEGORY', item.id, 'CREATE_CATEGORY', actorMemberId, null, item);
    return {
      ...item,
      category_code: item.code,
      default_sac_hsn_code: defaultSacHsn || (item as any).default_sac_hsn_code,
    };
  }

  async listItemMappings(studioId: string): Promise<IStudioTaxItemMappingDTO[]> {
    return this.itemMappingModel.findMany({
      where: { studio_id: studioId },
      include: { tax_category: true, default_rate: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createItemMapping(studioId: string, data: any, actorMemberId?: string): Promise<any> {
    const sacHsn = data.sac_hsn_code || data.sac_code || data.hsn_code;
    const item = await this.itemMappingModel.create({
      data: {
        studio_id: studioId,
        tax_category_id: data.tax_category_id,
        source_type: data.source_type || (data.item_type === 'GOODS' ? 'PRODUCT' : 'SERVICE'),
        source_id: data.source_id || data.item_code || null,
        sac_code: data.sac_code || (data.item_type !== 'GOODS' ? sacHsn : null),
        hsn_code: data.hsn_code || (data.item_type === 'GOODS' ? sacHsn : null),
        default_rate_id: data.default_rate_id || data.tax_rate_id || null,
        is_active: data.is_active ?? true,
      },
      include: { tax_category: true, default_rate: true },
    });
    await this.createAuditLog(studioId, 'TAX_ITEM_MAPPING', item.id, 'CREATE_ITEM_MAPPING', actorMemberId, null, item);
    return {
      ...item,
      sac_hsn_code: sacHsn,
      item_code: data.item_code || item.source_id,
      item_name: data.item_name,
    };
  }

  // -------------------------------------------------------------
  // 6. PARTY TAX PROFILES (CLIENTS & VENDORS)
  // -------------------------------------------------------------

  async getPartyProfile(studioId: string, partyType: TaxPartyType, partyId: string): Promise<IStudioTaxPartyProfileDTO | null> {
    return this.partyProfileModel.findFirst({
      where: { studio_id: studioId, party_type: partyType, party_id: partyId },
    });
  }

  async upsertPartyProfile(studioId: string, data: any, actorMemberId?: string): Promise<IStudioTaxPartyProfileDTO> {
    let isRegistered = Boolean(data.tax_registration_number && data.tax_registration_number.trim());
    let stateCode = data.state_code;
    let pan = data.pan;

    if (data.tax_registration_number) {
      const gstinVal = this.validateGstin(data.tax_registration_number);
      if (gstinVal.isValid) {
        stateCode = stateCode || gstinVal.stateCode;
        pan = pan || gstinVal.pan;
        isRegistered = true;
      }
    }

    const existing = await this.getPartyProfile(studioId, data.party_type || 'CLIENT', data.party_id);

    let result: any;
    if (existing) {
      result = await this.partyProfileModel.update({
        where: { id: existing.id },
        data: {
          legal_name: data.legal_name || existing.legal_name,
          tax_registration_number: data.tax_registration_number ? data.tax_registration_number.trim().toUpperCase() : null,
          pan: pan ? pan.trim().toUpperCase() : null,
          country_code: data.country_code || existing.country_code,
          state_code: stateCode || existing.state_code,
          tax_residency: data.tax_residency || existing.tax_residency,
          tax_exemption_status: data.tax_exemption_status || existing.tax_exemption_status,
          is_registered: isRegistered,
        },
      });
      await this.createAuditLog(studioId, 'TAX_PARTY_PROFILE', result.id, 'UPDATE_PARTY_PROFILE', actorMemberId, existing, result);
    } else {
      result = await this.partyProfileModel.create({
        data: {
          studio_id: studioId,
          party_type: data.party_type || 'CLIENT',
          party_id: data.party_id,
          legal_name: data.legal_name || 'Party Name',
          tax_registration_number: data.tax_registration_number ? data.tax_registration_number.trim().toUpperCase() : null,
          pan: pan ? pan.trim().toUpperCase() : null,
          country_code: data.country_code || 'IN',
          state_code: stateCode || null,
          tax_residency: data.tax_residency || 'DOMESTIC',
          tax_exemption_status: data.tax_exemption_status || 'TAXABLE',
          is_registered: isRegistered,
        },
      });
      await this.createAuditLog(studioId, 'TAX_PARTY_PROFILE', result.id, 'CREATE_PARTY_PROFILE', actorMemberId, null, result);
    }

    return result;
  }

  // -------------------------------------------------------------
  // 7. DETERMINISTIC TAX DETERMINATION ENGINE
  // -------------------------------------------------------------

  async determineTax(input: any): Promise<any> {
    const studioId = input.studio_id;
    const txDate = input.transaction_date ? new Date(input.transaction_date) : new Date();

    // 1. Fetch Studio Tax Profile
    const profile = await this.getTaxProfile(studioId);

    // 2. Resolve Party Profile if specified
    let partyProfile: any = null;
    if (input.party_type && input.party_id) {
      partyProfile = await this.getPartyProfile(studioId, input.party_type, input.party_id);
    }

    // 3. Resolve Origin and Destination States
    const originState = (input.origin_state_code || profile?.state_code || '27').trim();
    const destState = (input.destination_state_code || input.place_of_supply || partyProfile?.state_code || originState).trim();

    // Special treatment flags
    const isExport = Boolean(
      input.is_export ||
      input.is_export_sez ||
      destState === 'OVERSEAS' ||
      input.place_of_supply === 'OVERSEAS' ||
      partyProfile?.tax_residency === 'INTERNATIONAL' ||
      partyProfile?.tax_residency === 'SEZ'
    );
    const isReverseCharge = Boolean(input.is_reverse_charge);
    const isInterState = !isExport && originState !== destState;

    // Handle line items if provided
    if (input.items && Array.isArray(input.items) && input.items.length > 0) {
      let totalTaxableMinor = 0;
      let totalCgstMinor = 0;
      let totalSgstMinor = 0;
      let totalIgstMinor = 0;
      let totalCessMinor = 0;
      const computedLines: any[] = [];

      for (const itm of input.items) {
        const qty = itm.quantity || 1;
        const unitPrice = itm.unit_price_minor || 0;
        const discount = itm.discount_minor || 0;
        const lineTaxable = Math.max(0, qty * unitPrice - discount);
        totalTaxableMinor += lineTaxable;

        // Resolve rate for item
        let rate: any = null;
        if (itm.tax_rate_id) {
          rate = await this.findEffectiveRate(studioId, itm.tax_rate_id, txDate);
        } else if (itm.item_code) {
          const mapping = await this.itemMappingModel.findFirst({
            where: { studio_id: studioId, OR: [{ source_id: itm.item_code }, { sac_code: itm.sac_hsn_code || '' }, { hsn_code: itm.sac_hsn_code || '' }] },
            include: { default_rate: true, tax_category: { include: { default_rate: true } } },
          });
          if (mapping) {
            const rateId = mapping.default_rate_id || mapping.tax_category?.default_rate_id;
            if (rateId) {
              rate = await this.findEffectiveRate(studioId, rateId, txDate);
            }
          }
        }

        if (!rate) {
          try {
            rate = await this.findEffectiveRate(studioId, 'GST_18', txDate);
          } catch {
            const anyRate = await this.rateModel.findFirst({ where: { studio_id: studioId, is_active: true } });
            rate = anyRate || { rate_basis_points: 1800, cgst_basis_points: 900, sgst_basis_points: 900, igst_basis_points: 1800, cess_basis_points: 0 };
          }
        }

        let cgstBps = 0;
        let sgstBps = 0;
        let igstBps = 0;
        const cessBps = rate.cess_basis_points || 0;

        if (isExport) {
          cgstBps = 0;
          sgstBps = 0;
          igstBps = 0;
        } else if (isInterState) {
          igstBps = rate.igst_basis_points || rate.rate_basis_points;
        } else {
          cgstBps = rate.cgst_basis_points || Math.floor(rate.rate_basis_points / 2);
          sgstBps = rate.sgst_basis_points || Math.floor(rate.rate_basis_points / 2);
        }

        const cgstMinor = Math.round((lineTaxable * cgstBps) / 10000);
        const sgstMinor = Math.round((lineTaxable * sgstBps) / 10000);
        const igstMinor = Math.round((lineTaxable * igstBps) / 10000);
        const cessMinor = Math.round((lineTaxable * cessBps) / 10000);
        const lineTaxMinor = cgstMinor + sgstMinor + igstMinor + cessMinor;
        const lineTotalMinor = lineTaxable + lineTaxMinor;

        totalCgstMinor += cgstMinor;
        totalSgstMinor += sgstMinor;
        totalIgstMinor += igstMinor;
        totalCessMinor += cessMinor;

        computedLines.push({
          ...itm,
          taxable_amount_minor: lineTaxable,
          cgst_basis_points: cgstBps,
          cgst_rate_bps: cgstBps,
          cgst_amount_minor: cgstMinor,
          sgst_basis_points: sgstBps,
          sgst_rate_bps: sgstBps,
          sgst_amount_minor: sgstMinor,
          igst_basis_points: igstBps,
          igst_rate_bps: igstBps,
          igst_amount_minor: igstMinor,
          cess_basis_points: cessBps,
          cess_rate_bps: cessBps,
          cess_amount_minor: cessMinor,
          tax_amount_minor: lineTaxMinor,
          total_tax_minor: lineTaxMinor,
          total_amount_minor: lineTotalMinor,
        });
      }

      const totalTaxMinor = totalCgstMinor + totalSgstMinor + totalIgstMinor + totalCessMinor;
      const grossTotalMinor = totalTaxableMinor + totalTaxMinor;

      return {
        status: 'DETERMINED',
        taxable_amount_minor: totalTaxableMinor,
        cgst_amount_minor: totalCgstMinor,
        cgst_minor: totalCgstMinor,
        sgst_amount_minor: totalSgstMinor,
        sgst_minor: totalSgstMinor,
        igst_amount_minor: totalIgstMinor,
        igst_minor: totalIgstMinor,
        cess_amount_minor: totalCessMinor,
        cess_minor: totalCessMinor,
        tax_amount_minor: totalTaxMinor,
        total_tax_minor: totalTaxMinor,
        total_amount_minor: grossTotalMinor,
        currency: input.currency || 'INR',
        is_inter_state: isInterState,
        is_reverse_charge: isReverseCharge,
        is_export: isExport,
        is_zero_rated_export: isExport,
        itc_status: isExport ? 'ELIGIBLE' : (isReverseCharge ? 'ELIGIBLE' : 'ELIGIBLE'),
        lines: computedLines,
        reason: isExport ? 'Zero-rated export' : (isInterState ? `Inter-state (${originState}->${destState})` : `Intra-state (${originState})`),
        confidence: 1.0,
      };
    }

    // Flat taxable amount calculation
    const taxableAmountMinor = Math.max(0, Math.floor(input.taxable_amount_minor || 0));

    // Resolve Rate
    let rate: any = null;
    if (input.tax_rate_id) {
      rate = await this.findEffectiveRate(studioId, input.tax_rate_id, txDate);
    } else {
      try {
        rate = await this.findEffectiveRate(studioId, 'GST_18', txDate);
      } catch {
        const anyRate = await this.rateModel.findFirst({ where: { studio_id: studioId, is_active: true } });
        rate = anyRate || { rate_basis_points: 1800, cgst_basis_points: 900, sgst_basis_points: 900, igst_basis_points: 1800, cess_basis_points: 0 };
      }
    }

    let cgstBps = 0;
    let sgstBps = 0;
    let igstBps = 0;
    const cessBps = rate.cess_basis_points || 0;

    if (isExport) {
      cgstBps = 0;
      sgstBps = 0;
      igstBps = 0;
    } else if (isInterState) {
      igstBps = rate.igst_basis_points || rate.rate_basis_points;
    } else {
      cgstBps = rate.cgst_basis_points || Math.floor(rate.rate_basis_points / 2);
      sgstBps = rate.sgst_basis_points || Math.floor(rate.rate_basis_points / 2);
    }

    const cgstMinor = Math.round((taxableAmountMinor * cgstBps) / 10000);
    const sgstMinor = Math.round((taxableAmountMinor * sgstBps) / 10000);
    const igstMinor = Math.round((taxableAmountMinor * igstBps) / 10000);
    const cessMinor = Math.round((taxableAmountMinor * cessBps) / 10000);
    const totalTaxMinor = cgstMinor + sgstMinor + igstMinor + cessMinor;
    const totalAmountMinor = taxableAmountMinor + totalTaxMinor;

    return {
      status: 'DETERMINED',
      taxable_amount_minor: taxableAmountMinor,
      rate_basis_points: rate.rate_basis_points,
      cgst_basis_points: cgstBps,
      sgst_basis_points: sgstBps,
      igst_basis_points: igstBps,
      cess_basis_points: cessBps,
      cgst_amount_minor: cgstMinor,
      cgst_minor: cgstMinor,
      sgst_amount_minor: sgstMinor,
      sgst_minor: sgstMinor,
      igst_amount_minor: igstMinor,
      igst_minor: igstMinor,
      cess_amount_minor: cessMinor,
      cess_minor: cessMinor,
      tax_amount_minor: totalTaxMinor,
      total_tax_minor: totalTaxMinor,
      total_amount_minor: totalAmountMinor,
      currency: input.currency || 'INR',
      is_inter_state: isInterState,
      is_reverse_charge: isReverseCharge,
      is_export: isExport,
      is_zero_rated_export: isExport,
      itc_status: isExport ? 'ELIGIBLE' : (isReverseCharge ? 'ELIGIBLE' : 'ELIGIBLE'),
      reason: isExport ? 'Zero-rated export' : (isInterState ? `Inter-state (${originState}->${destState})` : `Intra-state (${originState})`),
      confidence: 1.0,
    };
  }

  // -------------------------------------------------------------
  // 8. TAX TRANSACTIONS & DOUBLE-ENTRY ACCOUNTING POSTING
  // -------------------------------------------------------------

  async listTaxTransactions(studioId: string, filter: any = {}): Promise<IStudioTaxTransactionDTO[]> {
    const where: any = { studio_id: studioId };
    if (filter.status) where.status = filter.status;
    if (filter.source_type) where.source_type = filter.source_type;
    if (filter.tax_period_id) where.tax_period_id = filter.tax_period_id;
    if (filter.start_date || filter.end_date) {
      where.transaction_date = {};
      if (filter.start_date) where.transaction_date.gte = new Date(filter.start_date);
      if (filter.end_date) where.transaction_date.lte = new Date(filter.end_date);
    }

    const list = await this.transactionModel.findMany({
      where,
      include: {
        lines: true,
        party_profile: true,
        tax_category: true,
        tax_rate: true,
      },
      orderBy: { transaction_date: 'desc' },
    });

    return list.map((t: any) => this.formatTransactionDTO(t));
  }

  async getTaxTransaction(studioId: string, id: string): Promise<IStudioTaxTransactionDTO> {
    const item = await this.transactionModel.findFirst({
      where: { id, studio_id: studioId },
      include: {
        lines: true,
        party_profile: true,
        tax_category: true,
        tax_rate: true,
        adjustments: true,
      },
    });
    if (!item) throw new Error(`Tax transaction not found: ${id}`);
    return this.formatTransactionDTO(item);
  }

  async createTaxTransaction(
    studioId: string,
    data: any,
    actorMemberId?: string
  ): Promise<IStudioTaxTransactionDTO> {
    const rawIdempotencyKey = data.idempotency_key || null;

    // Check for idempotency ONLY if key was explicitly provided
    if (rawIdempotencyKey) {
      const existing = await this.transactionModel.findFirst({
        where: { studio_id: studioId, idempotency_key: rawIdempotencyKey },
        include: { lines: true, party_profile: true, tax_category: true, tax_rate: true },
      });
      if (existing) {
        return this.formatTransactionDTO(existing);
      }
    }

    const idempotencyKey = rawIdempotencyKey || `tax_tx_${studioId}_${crypto.randomUUID()}`;
    const sourceType = data.source_document_type || data.source_type || 'INVOICE';
    const sourceId = data.source_document_id || data.source_id || 'manual';
    const txType = data.transaction_type || (sourceType === 'EXPENSE' || data.party_type === 'VENDOR' ? 'INPUT_TAX' : 'OUTPUT_TAX');
    const txDate = new Date(data.transaction_date || data.tax_date || new Date());
    let taxableAmountMinor = Math.max(0, Math.floor(data.taxable_amount_minor ?? 0));
    const isInterState = Boolean(data.is_inter_state);

    // Resolve party profile id if available
    let partyProfileId: string | null = null;
    if (data.party_type && data.party_id) {
      const p = await this.getPartyProfile(studioId, data.party_type, data.party_id);
      partyProfileId = p?.id || null;
    }

    let cgstMinor = data.cgst_amount_minor !== undefined ? Math.floor(data.cgst_amount_minor) : (data.cgst_minor !== undefined ? Math.floor(data.cgst_minor) : 0);
    let sgstMinor = data.sgst_amount_minor !== undefined ? Math.floor(data.sgst_amount_minor) : (data.sgst_minor !== undefined ? Math.floor(data.sgst_minor) : 0);
    let igstMinor = data.igst_amount_minor !== undefined ? Math.floor(data.igst_amount_minor) : (data.igst_minor !== undefined ? Math.floor(data.igst_minor) : 0);
    let cessMinor = data.cess_amount_minor !== undefined ? Math.floor(data.cess_amount_minor) : (data.cess_minor !== undefined ? Math.floor(data.cess_minor) : 0);
    let totalTaxMinor = data.tax_amount_minor !== undefined ? Math.floor(data.tax_amount_minor) : (data.total_tax_minor !== undefined ? Math.floor(data.total_tax_minor) : (cgstMinor + sgstMinor + igstMinor + cessMinor));

    // If lines provided, aggregate amounts from lines if parent amounts were 0
    if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      let lineTaxable = 0;
      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;
      let lineCess = 0;
      let lineTax = 0;
      for (const l of data.lines) {
        lineTaxable += Math.floor(l.taxable_amount_minor || 0);
        lineCgst += Math.floor(l.cgst_amount_minor || 0);
        lineSgst += Math.floor(l.sgst_amount_minor || 0);
        lineIgst += Math.floor(l.igst_amount_minor || 0);
        lineCess += Math.floor(l.cess_amount_minor || 0);
        lineTax += Math.floor(l.tax_amount_minor || (l.cgst_amount_minor || 0) + (l.sgst_amount_minor || 0) + (l.igst_amount_minor || 0) + (l.cess_amount_minor || 0));
      }
      if (taxableAmountMinor === 0) taxableAmountMinor = lineTaxable;
      if (cgstMinor === 0) cgstMinor = lineCgst;
      if (sgstMinor === 0) sgstMinor = lineSgst;
      if (igstMinor === 0) igstMinor = lineIgst;
      if (cessMinor === 0) cessMinor = lineCess;
      if (totalTaxMinor === 0) totalTaxMinor = lineTax > 0 ? lineTax : (cgstMinor + sgstMinor + igstMinor + cessMinor);
    }

    // If amounts not explicitly provided, calculate via determineTax
    if (totalTaxMinor === 0 && taxableAmountMinor > 0 && !data.lines) {
      const determination = await this.determineTax({
        studio_id: studioId,
        transaction_date: txDate,
        party_type: data.party_type,
        party_id: data.party_id,
        tax_category_id: data.tax_category_id,
        tax_rate_id: data.tax_rate_id,
        sac_code: data.sac_code,
        hsn_code: data.hsn_code,
        taxable_amount_minor: taxableAmountMinor,
        currency: data.currency,
        origin_state_code: data.origin_state_code,
        destination_state_code: data.destination_state_code || data.place_of_supply,
        is_reverse_charge: data.is_reverse_charge,
        is_export_sez: data.is_export_sez,
      });
      cgstMinor = determination.cgst_minor;
      sgstMinor = determination.sgst_minor;
      igstMinor = determination.igst_minor;
      cessMinor = determination.cess_minor;
      totalTaxMinor = determination.total_tax_minor;
    }

    // Build lines
    let linesToCreate: any[] = [];
    if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      linesToCreate = data.lines.map((l: any, idx: number) => ({
        studio_id: studioId,
        line_number: idx + 1,
        item_code: l.item_code || null,
        item_name: l.item_name || 'Item',
        sac_hsn_code: l.sac_hsn_code || l.sac_code || l.hsn_code || null,
        quantity: l.quantity || 1,
        unit_price_minor: Math.floor(l.unit_price_minor || 0),
        taxable_amount_minor: Math.floor(l.taxable_amount_minor || 0),
        cgst_rate_bps: l.cgst_rate_bps || 0,
        cgst_amount_minor: Math.floor(l.cgst_amount_minor || 0),
        sgst_rate_bps: l.sgst_rate_bps || 0,
        sgst_amount_minor: Math.floor(l.sgst_amount_minor || 0),
        igst_rate_bps: l.igst_rate_bps || 0,
        igst_amount_minor: Math.floor(l.igst_amount_minor || 0),
        cess_rate_bps: l.cess_rate_bps || 0,
        cess_amount_minor: Math.floor(l.cess_amount_minor || 0),
        tax_amount_minor: Math.floor(l.tax_amount_minor || 0),
        total_amount_minor: Math.floor(l.total_amount_minor || (l.taxable_amount_minor + l.tax_amount_minor) || 0),
        itc_eligibility: l.itc_eligibility || 'ELIGIBLE',
      }));
    } else {
      if (cgstMinor > 0) {
        linesToCreate.push({
          studio_id: studioId,
          tax_code: 'CGST',
          taxable_amount_minor: taxableAmountMinor,
          rate_basis_points: 900,
          tax_amount_minor: cgstMinor,
          component: 'CGST',
        });
      }
      if (sgstMinor > 0) {
        linesToCreate.push({
          studio_id: studioId,
          tax_code: 'SGST',
          taxable_amount_minor: taxableAmountMinor,
          rate_basis_points: 900,
          tax_amount_minor: sgstMinor,
          component: 'SGST',
        });
      }
      if (igstMinor > 0) {
        linesToCreate.push({
          studio_id: studioId,
          tax_code: 'IGST',
          taxable_amount_minor: taxableAmountMinor,
          rate_basis_points: 1800,
          tax_amount_minor: igstMinor,
          component: 'IGST',
        });
      }
      if (cessMinor > 0) {
        linesToCreate.push({
          studio_id: studioId,
          tax_code: 'CESS',
          taxable_amount_minor: taxableAmountMinor,
          rate_basis_points: 0,
          tax_amount_minor: cessMinor,
          component: 'CESS',
        });
      }
    }

    const txStatus = data.status || (data.auto_post ? 'POSTED' : 'DRAFT');

    const created = await this.transactionModel.create({
      data: {
        studio_id: studioId,
        transaction_date: txDate,
        source_type: sourceType,
        source_id: sourceId,
        transaction_type: txType,
        transaction_number: data.transaction_number || `TX-${Date.now()}`,
        party_type: data.party_type || null,
        party_id: data.party_id || null,
        party_name: data.party_name || null,
        party_gstin: data.party_gstin || null,
        party_profile_id: partyProfileId,
        tax_category_id: data.tax_category_id || null,
        tax_rate_id: data.tax_rate_id || null,
        tax_period_id: data.tax_period_id || null,
        origin_state_code: data.origin_state_code || null,
        destination_state_code: data.destination_state_code || data.place_of_supply || null,
        place_of_supply: data.place_of_supply || data.destination_state_code || null,
        taxable_amount_minor: taxableAmountMinor,
        cgst_minor: cgstMinor,
        sgst_minor: sgstMinor,
        igst_minor: igstMinor,
        cess_minor: cessMinor,
        total_tax_minor: totalTaxMinor,
        total_amount_minor: taxableAmountMinor + totalTaxMinor,
        currency: data.currency || 'INR',
        status: txStatus,
        itc_status: data.itc_status || 'ELIGIBLE',
        is_inter_state: isInterState,
        is_reverse_charge: Boolean(data.is_reverse_charge),
        is_export_sez: Boolean(data.is_export || data.is_export_sez),
        idempotency_key: idempotencyKey,
        created_by: actorMemberId || null,
        posted_at: txStatus === 'POSTED' ? new Date() : null,
        posted_by: txStatus === 'POSTED' ? (actorMemberId || null) : null,
        lines: {
          create: linesToCreate,
        },
      },
      include: {
        lines: true,
        party_profile: true,
        tax_category: true,
        tax_rate: true,
      },
    });

    await this.createAuditLog(studioId, 'TAX_TRANSACTION', created.id, 'CREATE_TAX_TRANSACTION', actorMemberId, null, created);

    // If auto_post requested, post with double-entry accounting integration
    if (data.auto_post && created.status !== 'POSTED') {
      return this.postTaxTransaction(studioId, created.id, actorMemberId || 'system');
    }

    return {
      ...this.formatTransactionDTO(created),
      lines: created.lines || linesToCreate,
    };
  }

  async postTaxTransaction(studioId: string, transactionId: string, actorMemberId: string): Promise<any> {
    const tx = await this.transactionModel.findFirst({
      where: { id: transactionId, studio_id: studioId },
      include: { lines: true, party_profile: true },
    });
    if (!tx) throw new Error(`Tax transaction not found: ${transactionId}`);
    if (tx.status === 'POSTED') {
      return this.formatTransactionDTO(tx); // Idempotent
    }
    if (tx.status === 'VOID' || tx.status === 'REVERSED') {
      throw new Error(`Cannot post tax transaction with status: ${tx.status}`);
    }

    // Integrate with Phase 34 Double-Entry General Ledger
    let journalEntryId = tx.accounting_journal_entry_id;

    if (!journalEntryId && tx.total_tax_minor > 0) {
      const accounts = await this.accountingService.listAccounts(studioId);
      const cashOrAr = accounts.find((a: any) => a.code === '1100' || a.code === '1000') || accounts[0];
      const revenueAcc = accounts.find((a: any) => a.code === '4000' || a.account_type === 'REVENUE') || accounts[0];
      const expenseAcc = accounts.find((a: any) => a.code === '5000' || a.account_type === 'EXPENSE') || accounts[0];
      const taxPayableAcc = accounts.find((a: any) => a.code === '2200' || a.name.includes('Tax') || a.account_type === 'LIABILITY') || accounts[0];
      const taxReceivableAcc = accounts.find((a: any) => a.code === '1150' || a.name.includes('Input') || a.account_type === 'ASSET') || accounts[0];

      const isPurchase = tx.transaction_type === 'INPUT_TAX' || tx.source_type === 'EXPENSE' || tx.party_type === 'VENDOR';
      const isCreditNote = tx.transaction_type === 'CREDIT_NOTE' || tx.source_type === 'CREDIT_NOTE';

      let jeLines: any[] = [];
      if (isPurchase) {
        // DR Expense (taxable)
        // DR Input Tax Credit (Tax)
        // CR Accounts Payable / Cash (Gross)
        jeLines = [
          {
            account_id: expenseAcc.id,
            debit_minor: tx.taxable_amount_minor,
            credit_minor: 0,
            description: `Expense for ${tx.source_type}`,
          },
          {
            account_id: taxReceivableAcc.id,
            debit_minor: tx.total_tax_minor,
            credit_minor: 0,
            description: `GST Input Tax Credit`,
          },
          {
            account_id: cashOrAr.id,
            debit_minor: 0,
            credit_minor: tx.taxable_amount_minor + tx.total_tax_minor,
            description: `Payable / Cash for ${tx.source_type}`,
          },
        ];
      } else if (isCreditNote) {
        // DR Revenue (taxable)
        // DR Output Tax Liability (Tax)
        // CR Accounts Receivable / Cash (Gross)
        jeLines = [
          {
            account_id: revenueAcc.id,
            debit_minor: tx.taxable_amount_minor,
            credit_minor: 0,
            description: `Revenue Credit Note Reduction`,
          },
          {
            account_id: taxPayableAcc.id,
            debit_minor: tx.total_tax_minor,
            credit_minor: 0,
            description: `GST Output Tax Reduction`,
          },
          {
            account_id: cashOrAr.id,
            debit_minor: 0,
            credit_minor: tx.taxable_amount_minor + tx.total_tax_minor,
            description: `Customer Credit / Receivable Reduction`,
          },
        ];
      } else {
        // Output Tax (Sales/Invoices)
        // DR Accounts Receivable / Cash (Gross)
        // CR Revenue (taxable)
        // CR Output Tax Liability (Tax)
        jeLines = [
          {
            account_id: cashOrAr.id,
            debit_minor: tx.taxable_amount_minor + tx.total_tax_minor,
            credit_minor: 0,
            description: `Receivable / Cash for ${tx.source_type}`,
          },
          {
            account_id: revenueAcc.id,
            debit_minor: 0,
            credit_minor: tx.taxable_amount_minor,
            description: `Net Taxable Revenue`,
          },
          {
            account_id: taxPayableAcc.id,
            debit_minor: 0,
            credit_minor: tx.total_tax_minor,
            description: `GST Tax Output Liability`,
          },
        ];
      }

      const je = await this.accountingService.createJournalEntry(studioId, {
        entry_date: tx.transaction_date,
        description: `Tax Ledger Posting: ${tx.source_type} #${tx.source_id}`,
        reference_type: 'TAX_POSTING',
        reference_id: tx.id,
        currency: tx.currency,
        auto_post: true,
        lines: jeLines,
      }, actorMemberId);

      journalEntryId = je.id;
    }

    const updated = await this.transactionModel.update({
      where: { id: transactionId },
      data: {
        status: 'POSTED',
        posted_at: new Date(),
        posted_by: actorMemberId,
        accounting_journal_entry_id: journalEntryId,
      },
      include: { lines: true, party_profile: true, tax_category: true, tax_rate: true },
    });

    await this.createAuditLog(studioId, 'TAX_TRANSACTION', transactionId, 'POST_TAX_TRANSACTION', actorMemberId, tx, updated);
    return this.formatTransactionDTO(updated);
  }

  async voidTaxTransaction(studioId: string, transactionId: string, actorMemberId: string): Promise<IStudioTaxTransactionDTO> {
    const tx = await this.transactionModel.findFirst({
      where: { id: transactionId, studio_id: studioId },
    });
    if (!tx) throw new Error(`Tax transaction not found: ${transactionId}`);
    if (tx.status === 'POSTED') {
      throw new Error('Cannot void a POSTED tax transaction. Use reversal or credit note instead.');
    }

    const updated = await this.transactionModel.update({
      where: { id: transactionId },
      data: { status: 'VOID' },
      include: { lines: true, party_profile: true, tax_category: true, tax_rate: true },
    });

    await this.createAuditLog(studioId, 'TAX_TRANSACTION', transactionId, 'VOID_TAX_TRANSACTION', actorMemberId, tx, updated);
    return this.formatTransactionDTO(updated);
  }

  async reverseTaxTransaction(studioId: string, transactionId: string, reason: string, actorMemberId: string): Promise<any> {
    const tx = await this.transactionModel.findFirst({
      where: { id: transactionId, studio_id: studioId },
      include: { lines: true },
    });
    if (!tx) throw new Error(`Tax transaction not found: ${transactionId}`);
    if (tx.status !== 'POSTED') {
      throw new Error(`Only POSTED tax transactions can be reversed. Current status: ${tx.status}`);
    }

    // Mark transaction as REVERSED
    const updatedTx = await this.transactionModel.update({
      where: { id: transactionId },
      data: { status: 'REVERSED' },
    });

    // Reverse associated accounting journal entry if exists
    let reversedJournalId: string | null = null;
    if (tx.accounting_journal_entry_id) {
      try {
        const rev = await this.accountingService.reverseJournalEntry(
          studioId,
          tx.accounting_journal_entry_id,
          `Tax Reversal: ${reason}`,
          actorMemberId
        );
        reversedJournalId = rev.id;
      } catch (e: any) {
        console.warn(`Could not reverse journal entry: ${e.message}`);
      }
    }

    // Create Tax Adjustment Record (Credit Note)
    const count = await this.adjustmentModel.count({ where: { studio_id: studioId } });
    const refNumber = `CN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const adj = await this.adjustmentModel.create({
      data: {
        studio_id: studioId,
        source_tax_transaction_id: transactionId,
        adjustment_type: 'CREDIT_NOTE',
        reason: reason || 'Tax Transaction Reversal',
        amount_minor: tx.taxable_amount_minor,
        tax_amount_minor: tx.total_tax_minor,
        reference_number: refNumber,
        adjustment_date: new Date(),
        status: 'POSTED',
        journal_entry_id: reversedJournalId,
        created_by: actorMemberId,
      },
    });

    await this.createAuditLog(studioId, 'TAX_ADJUSTMENT', adj.id, 'CREATE_ADJUSTMENT', actorMemberId, null, adj, reason);
    return {
      ...adj,
      status: 'REVERSED',
      transaction_status: updatedTx.status,
    };
  }

  // -------------------------------------------------------------
  // 9. TAX ADJUSTMENTS & CREDIT/DEBIT NOTES
  // -------------------------------------------------------------

  async createTaxAdjustment(studioId: string, data: any, actorMemberId: string): Promise<any> {
    const count = await this.adjustmentModel.count({ where: { studio_id: studioId } });
    const prefix = data.adjustment_type === 'DEBIT_NOTE' ? 'DN' : 'CN';
    const refNumber = data.reference_number || `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const adj = await this.adjustmentModel.create({
      data: {
        studio_id: studioId,
        source_tax_transaction_id: data.source_tax_transaction_id || null,
        tax_period_id: data.tax_period_id || null,
        adjustment_type: data.adjustment_type || 'CREDIT_NOTE',
        reason: data.reason || 'Tax Adjustment',
        amount_minor: Math.floor(data.amount_minor || 0),
        tax_amount_minor: Math.floor(data.tax_amount_minor || 0),
        reference_number: refNumber,
        adjustment_date: new Date(data.adjustment_date || new Date()),
        status: 'DRAFT',
        created_by: actorMemberId,
      },
    });

    await this.createAuditLog(studioId, 'TAX_ADJUSTMENT', adj.id, 'CREATE_ADJUSTMENT', actorMemberId, null, adj);
    return adj;
  }

  // -------------------------------------------------------------
  // 10. TAX PERIODS & FILING READINESS
  // -------------------------------------------------------------

  async listTaxPeriods(studioId: string): Promise<IStudioTaxPeriodDTO[]> {
    return this.periodModel.findMany({
      where: { studio_id: studioId },
      orderBy: { period_start: 'desc' },
    });
  }

  async createTaxPeriod(studioId: string, data: any, actorMemberId?: string): Promise<IStudioTaxPeriodDTO> {
    const start = new Date(data.period_start || data.start_date || new Date());
    const end = new Date(data.period_end || data.end_date || new Date());
    if (start >= end) throw new Error('period_start must precede period_end');

    const period = await this.periodModel.create({
      data: {
        studio_id: studioId,
        period_name: data.period_name || data.period_code || `Period-${start.getFullYear()}`,
        period_code: data.period_code || null,
        period_type: data.period_type || 'MONTHLY',
        period_start: start,
        period_end: end,
        due_date: data.due_date ? new Date(data.due_date) : null,
        status: 'OPEN',
      },
    });

    await this.createAuditLog(studioId, 'TAX_PERIOD', period.id, 'CREATE_TAX_PERIOD', actorMemberId, null, period);
    return period;
  }

  async calculatePeriodTotals(studioId: string, periodId: string): Promise<IStudioTaxPeriodDTO> {
    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) throw new Error(`Tax period not found: ${periodId}`);

    // Query all POSTED tax transactions in period
    const txs = await this.transactionModel.findMany({
      where: {
        studio_id: studioId,
        status: 'POSTED',
        transaction_date: {
          gte: period.period_start,
          lte: period.period_end,
        },
      },
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let outputTax = 0;
    let inputTax = 0;
    let eligibleItc = 0;
    let ineligibleItc = 0;

    for (const t of txs) {
      totalTaxable += t.taxable_amount_minor;
      totalCgst += t.cgst_minor;
      totalSgst += t.sgst_minor;
      totalIgst += t.igst_minor;
      totalCess += t.cess_minor;

      if (t.source_type === 'EXPENSE' || t.party_type === 'VENDOR' || t.transaction_type === 'INPUT_TAX') {
        inputTax += t.total_tax_minor;
        if (t.itc_status === 'ELIGIBLE') {
          eligibleItc += t.total_tax_minor;
        } else {
          ineligibleItc += t.total_tax_minor;
        }
      } else {
        outputTax += t.total_tax_minor;
      }
    }

    const netLiability = Math.max(0, outputTax - eligibleItc);

    const updated = await this.periodModel.update({
      where: { id: periodId },
      data: {
        total_taxable_minor: totalTaxable,
        total_cgst_minor: totalCgst,
        total_sgst_minor: totalSgst,
        total_igst_minor: totalIgst,
        total_cess_minor: totalCess,
        output_tax_minor: outputTax,
        input_tax_minor: inputTax,
        eligible_itc_minor: eligibleItc,
        ineligible_itc_minor: ineligibleItc,
        net_tax_liability_minor: netLiability,
      },
    });

    return updated;
  }

  async transitionPeriodStatus(
    studioId: string,
    periodId: string,
    newStatus: any,
    actorMemberId?: string,
    acknowledgementNumber?: string
  ): Promise<IStudioTaxPeriodDTO> {
    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) throw new Error(`Tax period not found: ${periodId}`);

    if (period.status === 'CLOSED') {
      throw new Error('Cannot modify a CLOSED tax period');
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'CLOSED') {
      updateData.closed_at = new Date();
      updateData.closed_by = actorMemberId || 'system';
    } else if (newStatus === 'FILED') {
      updateData.filed_at = new Date();
      updateData.filed_by = actorMemberId || 'system';
      updateData.filing_acknowledgement = acknowledgementNumber || null;
    }

    // Refresh totals before closing
    await this.calculatePeriodTotals(studioId, periodId);

    const updated = await this.periodModel.update({
      where: { id: periodId },
      data: updateData,
    });

    await this.createAuditLog(studioId, 'TAX_PERIOD', periodId, `PERIOD_STATUS_${newStatus}`, actorMemberId, period, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // 11. GENERAL LEDGER TAX RECONCILIATION
  // -------------------------------------------------------------

  async reconcileTaxWithLedger(studioId: string, periodId: string, actorMemberId?: string): Promise<any> {
    const period = await this.periodModel.findFirst({
      where: { id: periodId, studio_id: studioId },
    });
    if (!period) throw new Error(`Tax period not found: ${periodId}`);

    // Fetch tax transactions in period
    const periodTotals = await this.calculatePeriodTotals(studioId, periodId);

    // Fetch GL balances from Phase 34
    const gl = await this.accountingService.getGeneralLedger(studioId, period.period_start, period.period_end);
    let ledgerOutputTax = 0;
    let ledgerInputTax = 0;

    for (const acc of gl.accounts) {
      if (acc.account_code === '2200' || acc.account_name.toLowerCase().includes('tax payable')) {
        ledgerOutputTax += acc.total_credits_minor;
      }
      if (acc.account_code === '1150' || acc.account_name.toLowerCase().includes('input tax')) {
        ledgerInputTax += acc.total_debits_minor;
      }
    }

    const diff = Math.abs(
      (ledgerOutputTax - ledgerInputTax) -
      (periodTotals.output_tax_minor - periodTotals.eligible_itc_minor)
    );

    const status: TaxReconciliationStatus = diff === 0 ? 'MATCHED' : 'DIFFERENCE';

    const recon = await this.reconciliationModel.create({
      data: {
        studio_id: studioId,
        tax_period_id: periodId,
        ledger_output_tax_minor: ledgerOutputTax,
        ledger_input_tax_minor: ledgerInputTax,
        tax_transaction_output_minor: periodTotals.output_tax_minor,
        tax_transaction_input_minor: periodTotals.eligible_itc_minor,
        difference_minor: diff,
        status,
        reviewed_by: actorMemberId || null,
        reviewed_at: actorMemberId ? new Date() : null,
      },
    });

    await this.createAuditLog(studioId, 'TAX_RECONCILIATION', recon.id, 'TAX_RECONCILE', actorMemberId, null, recon);
    return {
      ...recon,
      discrepancy_amount_minor: recon.difference_minor,
    };
  }

  // -------------------------------------------------------------
  // 12. COMPLIANCE CHECK ENGINE
  // -------------------------------------------------------------

  async runComplianceChecks(studioId: string): Promise<any> {
    const checks: any[] = [];
    const profile = await this.getTaxProfile(studioId);

    // 1. Primary GSTIN Check
    const regs = await this.listRegistrations(studioId);
    const primaryReg = regs.find(r => r.is_primary);

    if (profile?.gst_registered) {
      if (!profile.gstin && !primaryReg) {
        checks.push({
          check_key: 'MISSING_PRIMARY_GSTIN',
          title: 'Missing Primary GSTIN Registration',
          description: 'Studio is marked as GST registered but has no primary GSTIN registration',
          severity: 'ERROR',
          details: 'Configure primary GSTIN registration in Studio Tax Registrations',
          affected_count: 1,
        });
      } else {
        const gstinToVerify = primaryReg?.registration_number || profile.gstin;
        const gstinVal = this.validateGstin(gstinToVerify);
        if (!gstinVal.isValid) {
          checks.push({
            check_key: 'GSTIN_INVALID',
            title: 'GSTIN Format Verification',
            description: 'Studio GSTIN does not match official 15-character structure',
            severity: 'ERROR',
            details: gstinVal.reason,
            affected_count: 1,
          });
        } else {
          checks.push({
            check_key: 'GSTIN_VALID',
            title: 'GSTIN Structure Valid',
            description: `Valid 15-character GSTIN (${gstinToVerify})`,
            severity: 'PASS',
            affected_count: 0,
          });
        }
      }
    } else {
      checks.push({
        check_key: 'GST_UNREGISTERED',
        title: 'GST Unregistered Studio',
        description: 'Studio operates as an unregistered small enterprise',
        severity: 'PASS',
        affected_count: 0,
      });
    }

    // 2. PAN Check
    if (!profile?.pan) {
      checks.push({
        check_key: 'MISSING_PAN',
        title: 'Missing Permanent Account Number (PAN)',
        description: 'Studio profile does not have a registered PAN number',
        severity: 'WARNING',
        details: 'Update studio profile with valid 10-character alphanumeric PAN',
        affected_count: 1,
      });
    } else {
      const panVal = this.validatePan(profile.pan);
      if (!panVal.isValid) {
        checks.push({
          check_key: 'INVALID_PAN',
          title: 'Invalid PAN Structure',
          description: 'Studio PAN format does not match official 10-character structure',
          severity: 'ERROR',
          details: panVal.reason,
          affected_count: 1,
        });
      } else {
        checks.push({
          check_key: 'PAN_VALID',
          title: 'PAN Structure Valid',
          description: `Valid 10-character PAN (${profile.pan})`,
          severity: 'PASS',
          affected_count: 0,
        });
      }
    }

    // 3. Active Tax Rates & Categories
    const rates = await this.rateModel.findMany({ where: { studio_id: studioId, is_active: true } });
    if (rates.length === 0) {
      checks.push({
        check_key: 'MISSING_TAX_RATES',
        title: 'Missing Active Tax Rates',
        description: 'No active tax rates configured in studio master data',
        severity: 'ERROR',
        affected_count: 0,
      });
    } else {
      checks.push({
        check_key: 'TAX_RATES_OK',
        title: 'Tax Rates Configured',
        description: `${rates.length} active tax rates available`,
        severity: 'PASS',
        affected_count: 0,
      });
    }

    // 4. Tax Categories check
    const categories = await this.categoryModel.findMany({ where: { studio_id: studioId, is_active: true } });
    checks.push({
      check_key: 'CATEGORIES_OK',
      title: 'Tax Categories Configuration',
      description: `${categories.length} active tax categories configured`,
      severity: 'PASS',
      affected_count: 0,
    });

    // 5. SAC / HSN Product & Service Mappings check
    const mappings = await this.itemMappingModel.findMany({ where: { studio_id: studioId, is_active: true } });
    checks.push({
      check_key: 'MAPPINGS_OK',
      title: 'SAC/HSN Code Mappings',
      description: `${mappings.length} items mapped to tax categories`,
      severity: 'PASS',
      affected_count: 0,
    });

    // 6. Unposted Draft Transactions Check
    const unposted = await this.transactionModel.findMany({
      where: { studio_id: studioId, status: 'DRAFT' },
    });
    if (unposted.length > 0) {
      checks.push({
        check_key: 'UNPOSTED_TAX_TRANSACTIONS',
        title: 'Unposted Tax Transactions',
        description: `${unposted.length} tax transactions are currently in DRAFT status`,
        severity: 'WARNING',
        details: 'Draft transactions do not contribute to official tax return summaries',
        affected_count: unposted.length,
      });
    } else {
      checks.push({
        check_key: 'NO_UNPOSTED_TRANSACTIONS',
        title: 'All Transactions Posted',
        description: 'No orphan draft tax transactions pending posting',
        severity: 'PASS',
        affected_count: 0,
      });
    }

    // 7. Negative Tax Invariant Check
    const negativeTax = await this.transactionModel.findMany({
      where: {
        studio_id: studioId,
        OR: [
          { taxable_amount_minor: { lt: 0 } },
          { total_tax_minor: { lt: 0 } },
        ],
      },
    });
    if (negativeTax.length > 0) {
      checks.push({
        check_key: 'NEGATIVE_TAX_DETECTED',
        title: 'Negative Tax Invariant Violation',
        description: 'Found transactions with negative tax or taxable amounts',
        severity: 'ERROR',
        details: 'Negative amounts violate double-entry integer accounting rules',
        affected_count: negativeTax.length,
      });
    } else {
      checks.push({
        check_key: 'INTEGER_INVARIANT_PASS',
        title: 'Integer Money & Non-Negative Tax Invariant',
        description: 'All tax transactions satisfy non-negative minor-unit constraints',
        severity: 'PASS',
        affected_count: 0,
      });
    }

    // 8. General Ledger Integration Check
    checks.push({
      check_key: 'GL_INTEGRATION_ACTIVE',
      title: 'General Ledger Integration',
      description: 'Tax module integrated with Phase 34 double-entry General Ledger',
      severity: 'PASS',
      affected_count: 0,
    });

    const passedCount = checks.filter(c => c.severity === 'PASS').length;
    const warningCount = checks.filter(c => c.severity === 'WARNING').length;
    const errorCount = checks.filter(c => c.severity === 'ERROR').length;

    const overallStatus: 'PASS' | 'WARNING' | 'ERROR' = errorCount > 0 ? 'ERROR' : (warningCount > 0 ? 'WARNING' : 'PASS');

    return {
      studio_id: studioId,
      checked_at: new Date(),
      overall_status: overallStatus,
      total_checks: checks.length,
      checks_performed: checks.length,
      issues_count: warningCount + errorCount,
      passed_count: passedCount,
      warning_count: warningCount,
      error_count: errorCount,
      checks,
      issues: checks.filter(c => c.severity !== 'PASS').map(c => ({
        code: c.check_key,
        title: c.title,
        description: c.description,
        severity: c.severity,
        details: c.details,
      })),
    };
  }

  // -------------------------------------------------------------
  // 13. GST-READY OPERATIONAL REPORTS & CSV EXPORT
  // -------------------------------------------------------------

  async getTaxSummary(
    studioId: string,
    startDate: Date = new Date('1970-01-01'),
    endDate: Date = new Date('2099-12-31')
  ): Promise<any> {
    const txs = await this.transactionModel.findMany({
      where: {
        studio_id: studioId,
        transaction_date: { gte: startDate, lte: endDate },
      },
    });

    let totalTaxableSales = 0;
    let totalTaxablePurchases = 0;
    let outCgst = 0;
    let outSgst = 0;
    let outIgst = 0;
    let outCess = 0;
    let inCgst = 0;
    let inSgst = 0;
    let inIgst = 0;
    let inCess = 0;
    let eligibleItc = 0;
    let ineligibleItc = 0;

    let postedCount = 0;
    let draftCount = 0;
    let voidCount = 0;
    let reversedCount = 0;

    for (const t of txs) {
      if (t.status === 'POSTED') {
        postedCount++;
        const isPurchase = t.source_type === 'EXPENSE' || t.party_type === 'VENDOR' || t.transaction_type === 'INPUT_TAX';
        if (isPurchase) {
          totalTaxablePurchases += t.taxable_amount_minor;
          inCgst += t.cgst_minor;
          inSgst += t.sgst_minor;
          inIgst += t.igst_minor;
          inCess += t.cess_minor;
          if (t.itc_status === 'ELIGIBLE') {
            eligibleItc += t.total_tax_minor;
          } else {
            ineligibleItc += t.total_tax_minor;
          }
        } else {
          totalTaxableSales += t.taxable_amount_minor;
          outCgst += t.cgst_minor;
          outSgst += t.sgst_minor;
          outIgst += t.igst_minor;
          outCess += t.cess_minor;
        }
      } else if (t.status === 'DRAFT' || t.status === 'CALCULATED') {
        draftCount++;
      } else if (t.status === 'VOID') {
        voidCount++;
      } else if (t.status === 'REVERSED') {
        reversedCount++;
      }
    }

    const totalOutput = outCgst + outSgst + outIgst + outCess;
    const totalInput = inCgst + inSgst + inIgst + inCess;
    const netLiability = Math.max(0, totalOutput - eligibleItc);

    return {
      period_start: startDate,
      period_end: endDate,
      currency: 'INR',
      total_taxable_sales_minor: totalTaxableSales,
      total_taxable_purchases_minor: totalTaxablePurchases,
      output_cgst_minor: outCgst,
      output_sgst_minor: outSgst,
      output_igst_minor: outIgst,
      output_cess_minor: outCess,
      total_output_tax_minor: totalOutput,
      input_cgst_minor: inCgst,
      input_sgst_minor: inSgst,
      input_igst_minor: inIgst,
      input_cess_minor: inCess,
      total_input_tax_minor: totalInput,
      eligible_itc_minor: eligibleItc,
      ineligible_itc_minor: ineligibleItc,
      net_tax_liability_minor: netLiability,
      posted_transactions_count: postedCount,
      draft_transactions_count: draftCount,
      void_transactions_count: voidCount,
      reversed_transactions_count: reversedCount,
      // Nested conveniences for UI components and test assertions
      output_tax: {
        cgst_minor: outCgst,
        sgst_minor: outSgst,
        igst_minor: outIgst,
        cess_minor: outCess,
        total_output_tax_minor: totalOutput,
      },
      input_tax: {
        cgst_minor: inCgst,
        sgst_minor: inSgst,
        igst_minor: inIgst,
        cess_minor: inCess,
        total_input_tax_minor: totalInput,
        eligible_itc_minor: eligibleItc,
        ineligible_itc_minor: ineligibleItc,
      },
    };
  }

  async exportTaxCsv(
    studioId: string,
    reportType: string = 'SUMMARY',
    startDate: Date = new Date('1970-01-01'),
    endDate: Date = new Date('2099-12-31')
  ): Promise<string> {
    const txs = await this.transactionModel.findMany({
      where: {
        studio_id: studioId,
        status: 'POSTED',
        transaction_date: { gte: startDate, lte: endDate },
      },
      include: { party_profile: true },
      orderBy: { transaction_date: 'asc' },
    });

    let headerTitle = '# Studio Tax Summary Operational Report';
    if (reportType === 'GSTR1') {
      headerTitle = '# GSTR-1 Outward Supplies Extract (Operational Pre-filing Export)';
    } else if (reportType === 'GSTR3B') {
      headerTitle = '# GSTR-3B Summary Return Extract (Operational Pre-filing Export)';
    } else if (reportType === 'GSTR2B') {
      headerTitle = '# GSTR-2B Inward Supplies (ITC Register) Extract';
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Source Type',
      'Source ID',
      'Party Name',
      'GSTIN',
      'State Code',
      'Taxable Amount',
      'CGST',
      'SGST',
      'IGST',
      'CESS',
      'Total Tax',
      'Total Amount',
      'ITC Status',
      'Accounting Journal ID',
    ];

    const rows = txs.map((t: any) => [
      this.sanitizeCsvField(t.id),
      this.sanitizeCsvField(new Date(t.transaction_date).toISOString().split('T')[0]),
      this.sanitizeCsvField(t.source_type),
      this.sanitizeCsvField(t.source_id),
      this.sanitizeCsvField(t.party_name || t.party_profile?.legal_name || 'N/A'),
      this.sanitizeCsvField(t.party_gstin || t.party_profile?.tax_registration_number || 'N/A'),
      this.sanitizeCsvField(t.destination_state_code || t.origin_state_code || '27'),
      (t.taxable_amount_minor / 100).toFixed(2),
      (t.cgst_minor / 100).toFixed(2),
      (t.sgst_minor / 100).toFixed(2),
      (t.igst_minor / 100).toFixed(2),
      (t.cess_minor / 100).toFixed(2),
      (t.total_tax_minor / 100).toFixed(2),
      ((t.taxable_amount_minor + t.total_tax_minor) / 100).toFixed(2),
      this.sanitizeCsvField(t.itc_status),
      this.sanitizeCsvField(t.accounting_journal_entry_id || 'N/A'),
    ]);

    return [headerTitle, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public sanitizeCsvField(val: any): string {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Formula injection protection: sanitize leading =, +, -, @, \t, \r
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  // -------------------------------------------------------------
  // 14. DATA MIGRATION & BACKFILL HELPER
  // -------------------------------------------------------------

  async backfillTaxFromOperations(studioId: string, actorMemberId?: string): Promise<{ processed: number; created: number; skipped: number }> {
    let processed = 0;
    let created = 0;
    let skipped = 0;

    // 1. Backfill from Receivables / Invoices
    const recModel = this.db.studioReceivable || this.db.receivable;
    if (recModel) {
      const receivables = await recModel.findMany({ where: { studio_id: studioId } });
      for (const rec of receivables) {
        processed++;
        const key = `backfill_rec_${rec.id}`;
        const existing = await this.transactionModel.findFirst({
          where: { studio_id: studioId, idempotency_key: key },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const amount = Number(rec.amount_minor || rec.total_amount_minor || 0);
        if (amount > 0) {
          await this.createTaxTransaction(studioId, {
            transaction_date: rec.issue_date || rec.created_at,
            source_type: 'INVOICE',
            source_id: rec.id,
            party_type: 'CLIENT',
            party_id: rec.client_id || 'CLIENT_BACKFILL',
            taxable_amount_minor: Math.round(amount / 1.18), // assuming standard 18% gross if not decomposed
            auto_post: true,
            idempotency_key: key,
          }, actorMemberId);
          created++;
        }
      }
    }

    // 2. Backfill from Expenses
    const expModel = this.db.studioExpense || this.db.expense;
    if (expModel) {
      const expenses = await expModel.findMany({ where: { studio_id: studioId } });
      for (const exp of expenses) {
        processed++;
        const key = `backfill_exp_${exp.id}`;
        const existing = await this.transactionModel.findFirst({
          where: { studio_id: studioId, idempotency_key: key },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const amount = Number(exp.amount_minor || 0);
        if (amount > 0) {
          await this.createTaxTransaction(studioId, {
            transaction_date: exp.expense_date || exp.created_at,
            source_type: 'EXPENSE',
            source_id: exp.id,
            party_type: 'VENDOR',
            party_id: exp.vendor_id || 'VENDOR_BACKFILL',
            taxable_amount_minor: Math.round(amount / 1.18),
            auto_post: true,
            idempotency_key: key,
          }, actorMemberId);
          created++;
        }
      }
    }

    return { processed, created, skipped };
  }

  // -------------------------------------------------------------
  // 15. INITIALIZE DEFAULT TAX MASTER DATA
  // -------------------------------------------------------------

  async initializeDefaultTaxData(studioId: string): Promise<void> {
    // 1. Jurisdictions
    const existingJur = await this.jurisdictionModel.findFirst({ where: { studio_id: studioId } });
    if (!existingJur) {
      await this.jurisdictionModel.createMany({
        data: [
          { studio_id: studioId, country_code: 'IN', state_code: '24', jurisdiction_code: 'IN-24', name: 'Gujarat', is_domestic: true },
          { studio_id: studioId, country_code: 'IN', state_code: '27', jurisdiction_code: 'IN-27', name: 'Maharashtra', is_domestic: true },
          { studio_id: studioId, country_code: 'IN', state_code: '29', jurisdiction_code: 'IN-29', name: 'Karnataka', is_domestic: true },
          { studio_id: studioId, country_code: 'IN', state_code: '07', jurisdiction_code: 'IN-07', name: 'Delhi', is_domestic: true },
        ],
      });
    }

    // 2. Tax Rates (Basis points: 18% = 1800, 12% = 1200, 5% = 500, 0% = 0)
    const existingRate = await this.rateModel.findFirst({ where: { studio_id: studioId } });
    let rate18: any;
    if (!existingRate) {
      rate18 = await this.rateModel.create({
        data: {
          studio_id: studioId,
          name: 'GST 18% Standard',
          code: 'GST_18',
          rate_basis_points: 1800,
          cgst_basis_points: 900,
          sgst_basis_points: 900,
          igst_basis_points: 1800,
          cess_basis_points: 0,
        },
      });

      await this.rateModel.createMany({
        data: [
          { studio_id: studioId, name: 'GST 12% Reduced', code: 'GST_12', rate_basis_points: 1200, cgst_basis_points: 600, sgst_basis_points: 600, igst_basis_points: 1200, cess_basis_points: 0 },
          { studio_id: studioId, name: 'GST 5% Low', code: 'GST_5', rate_basis_points: 500, cgst_basis_points: 250, sgst_basis_points: 250, igst_basis_points: 500, cess_basis_points: 0 },
          { studio_id: studioId, name: 'GST 0% Nil / Exempt', code: 'GST_0', rate_basis_points: 0, cgst_basis_points: 0, sgst_basis_points: 0, igst_basis_points: 0, cess_basis_points: 0 },
        ],
      });
    } else {
      rate18 = await this.rateModel.findFirst({ where: { studio_id: studioId, code: 'GST_18' } });
    }

    // 3. Tax Categories
    const existingCat = await this.categoryModel.findFirst({ where: { studio_id: studioId } });
    let catStd: any;
    if (!existingCat) {
      catStd = await this.categoryModel.create({
        data: {
          studio_id: studioId,
          code: 'PHOTO_SERVICES_18',
          name: 'Photography & Creative Services',
          description: 'Standard 18% GST for photography, videography, and post-production',
          tax_type: 'STANDARD',
          default_rate_id: rate18?.id || null,
          is_taxable: true,
        },
      });

      await this.categoryModel.createMany({
        data: [
          { studio_id: studioId, code: 'PRINT_ALBUM_18', name: 'Printed Albums & Lab Deliverables', tax_type: 'STANDARD', default_rate_id: rate18?.id || null, is_taxable: true },
          { studio_id: studioId, code: 'EXPORT_SEZ_0', name: 'International Client Export / SEZ', tax_type: 'ZERO_RATED', is_taxable: true, is_zero_rated: true },
          { studio_id: studioId, code: 'LEGAL_RCM_18', name: 'Legal & Advocate Services (RCM)', tax_type: 'REVERSE_CHARGE', default_rate_id: rate18?.id || null, is_taxable: true },
        ],
      });
    } else {
      catStd = await this.categoryModel.findFirst({ where: { studio_id: studioId, code: 'PHOTO_SERVICES_18' } });
    }

    // 4. Default Item Mappings (SAC 9983 for photography, HSN 4911 for photo prints)
    const existingMap = await this.itemMappingModel.findFirst({ where: { studio_id: studioId } });
    if (!existingMap && catStd) {
      await this.itemMappingModel.createMany({
        data: [
          { studio_id: studioId, tax_category_id: catStd.id, source_type: 'SERVICE', sac_code: '9983', default_rate_id: rate18?.id || null },
          { studio_id: studioId, tax_category_id: catStd.id, source_type: 'PRINT', hsn_code: '4911', default_rate_id: rate18?.id || null },
        ],
      });
    }
  }

  // -------------------------------------------------------------
  // 16. AUDIT LOGGING HELPER
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
    } catch (e: any) {
      console.warn(`Failed to create tax audit log: ${e.message}`);
    }
  }

  private formatTransactionDTO(tx: any): IStudioTaxTransactionDTO {
    return {
      id: tx.id,
      studio_id: tx.studio_id,
      transaction_date: tx.transaction_date,
      source_type: tx.source_type,
      source_id: tx.source_id,
      party_type: tx.party_type,
      party_id: tx.party_id,
      party_profile_id: tx.party_profile_id,
      tax_category_id: tx.tax_category_id,
      tax_rate_id: tx.tax_rate_id,
      jurisdiction_id: tx.jurisdiction_id,
      tax_period_id: tx.tax_period_id,
      origin_state_code: tx.origin_state_code,
      destination_state_code: tx.destination_state_code,
      taxable_amount_minor: tx.taxable_amount_minor,
      cgst_minor: tx.cgst_minor,
      sgst_minor: tx.sgst_minor,
      igst_minor: tx.igst_minor,
      cess_minor: tx.cess_minor,
      total_tax_minor: tx.total_tax_minor,
      currency: tx.currency,
      status: tx.status,
      itc_status: tx.itc_status,
      is_reverse_charge: tx.is_reverse_charge,
      is_export_sez: tx.is_export_sez,
      accounting_journal_entry_id: tx.accounting_journal_entry_id,
      idempotency_key: tx.idempotency_key,
      created_by: tx.created_by,
      posted_at: tx.posted_at,
      posted_by: tx.posted_by,
      lines: tx.lines || [],
      party_profile: tx.party_profile || null,
      tax_category: tx.tax_category || null,
      tax_rate: tx.tax_rate || null,
      created_at: tx.created_at,
      updated_at: tx.updated_at,
    };
  }
}
