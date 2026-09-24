import { prisma } from '@pixmatch/database';
import {
  PlatformConfigurationDTO,
  PlatformConfigCategory,
  PlatformConfigType,
  PlatformEnvironment,
  ChangeRiskLevel,
  ConfigurationDiffDTO,
} from '@pixmatch/types';

export class ConfigurationService {
  private static memoryConfigs = new Map<string, PlatformConfigurationDTO>();
  private static memoryVersions = new Map<string, Array<{ version: number; value: any; updated_at: Date; updated_by?: string; reason?: string }>>();

  public static clearMockState(): void {
    this.memoryConfigs.clear();
    this.memoryVersions.clear();
  }

  /**
   * Deterministically calculates change risk level based on category and properties.
   */
  public static calculateRiskLevel(
    category: PlatformConfigCategory,
    key: string,
    environment: PlatformEnvironment
  ): ChangeRiskLevel {
    if (environment === PlatformEnvironment.DEVELOPMENT) {
      return ChangeRiskLevel.LOW;
    }

    // Cosmetic & UI keys and system category are strictly LOW risk
    if (
      key.startsWith('ui.') ||
      key.startsWith('theme.') ||
      category === PlatformConfigCategory.SYSTEM ||
      (category as any) === 'SYSTEM'
    ) {
      return ChangeRiskLevel.LOW;
    }

    if (
      category === PlatformConfigCategory.PAYMENTS ||
      category === PlatformConfigCategory.FINANCE ||
      key.includes('payment') ||
      key.includes('tax') ||
      key.includes('stripe') ||
      key.includes('razorpay') ||
      key.includes('mfa') ||
      key.includes('security.mfa') ||
      key.includes('kms')
    ) {
      return ChangeRiskLevel.CRITICAL;
    }

    if (
      category === PlatformConfigCategory.SECURITY ||
      category === PlatformConfigCategory.PRIVACY ||
      key.includes('auth') ||
      key.includes('encryption') ||
      key.includes('session') ||
      key.includes('biometric')
    ) {
      return ChangeRiskLevel.HIGH;
    }

    if (
      category === PlatformConfigCategory.RELIABILITY ||
      category === PlatformConfigCategory.AI ||
      category === PlatformConfigCategory.AI_PROCESSING ||
      category === PlatformConfigCategory.STORAGE ||
      key.includes('rate_limit') ||
      key.includes('timeout') ||
      key.includes('quota') ||
      key.includes('concurrency')
    ) {
      return ChangeRiskLevel.MEDIUM;
    }

    return ChangeRiskLevel.LOW;
  }

  /**
   * Validates a configuration value against type and validation schema.
   */
  public static validateConfigurationValue(
    value: any,
    type: PlatformConfigType,
    schema?: {
      min_value?: number;
      max_value?: number;
      allowed_values?: string[];
      regex_pattern?: string;
      required_fields?: string[];
    } | null
  ): { valid: boolean; errors: string[]; error?: string } {
    const errors: string[] = [];

    // 1. Type validation
    switch (type) {
      case PlatformConfigType.STRING:
        if (typeof value !== 'string') {
          errors.push(`Value must be a string, received ${typeof value}`);
        }
        break;
      case PlatformConfigType.INTEGER:
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push(`Value must be an integer, received ${value}`);
        }
        break;
      case PlatformConfigType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Value must be a valid number, received ${value}`);
        }
        break;
      case PlatformConfigType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push(`Value must be a boolean, received ${typeof value}`);
        }
        break;
      case PlatformConfigType.JSON:
        if (typeof value !== 'object' || value === null) {
          errors.push(`Value must be a JSON object, received ${typeof value}`);
        }
        break;
      case PlatformConfigType.ENUM:
        if (schema?.allowed_values && !schema.allowed_values.includes(String(value))) {
          errors.push(`Value '${value}' is not in allowed list: [${schema.allowed_values.join(', ')}]`);
        }
        break;
      case PlatformConfigType.SECRET_REFERENCE:
        if (typeof value !== 'string' || (!value.startsWith('env:') && !value.startsWith('vault:'))) {
          errors.push(`SECRET_REFERENCE must reference an environment or vault key (e.g. 'env:STRIPE_SECRET_KEY')`);
        }
        break;
    }

    // 2. Schema constraints validation
    if (schema) {
      if (typeof value === 'number') {
        if (schema.min_value !== undefined && value < schema.min_value) {
          errors.push(`Value ${value} is below minimum allowed value ${schema.min_value}`);
        }
        if (schema.max_value !== undefined && value > schema.max_value) {
          errors.push(`Value ${value} exceeds maximum allowed value of ${schema.max_value}`);
        }
      }

      if (schema.allowed_values && !schema.allowed_values.includes(String(value))) {
        if (!errors.some((e) => e.includes('not in allowed list'))) {
          errors.push(`Value '${value}' is not in allowed list: [${schema.allowed_values.join(', ')}]`);
        }
      }

      if (schema.regex_pattern && typeof value === 'string') {
        const regex = new RegExp(schema.regex_pattern);
        if (!regex.test(value)) {
          errors.push(`Value does not match required pattern: ${schema.regex_pattern}`);
        }
      }

      if (schema.required_fields && typeof value === 'object' && value !== null) {
        for (const field of schema.required_fields) {
          if (!(field in value)) {
            errors.push(`Missing required JSON field: ${field}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      error: errors[0],
    };
  }

  public static validateConfigValue(
    type: PlatformConfigType,
    value: any,
    schema?: any
  ): { valid: boolean; errors: string[]; error?: string } {
    return this.validateConfigurationValue(value, type, schema);
  }

  /**
   * Retrieves a configuration by key and environment.
   */
  public static async getConfiguration(
    key: string,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION
  ): Promise<PlatformConfigurationDTO | null> {
    const memKey = `${key}:${environment}`;
    try {
      if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && prisma && (prisma as any).platformConfiguration) {
        const config = await (prisma as any).platformConfiguration.findUnique({
          where: {
            key_environment: {
              key,
              environment,
            },
          },
        });
        if (config) return this.mapToDTO(config);
      }
    } catch (_err) {
      // In-memory fallback
    }

    return this.memoryConfigs.get(memKey) || null;
  }

  /**
   * Lists configurations with optional filtering.
   */
  public static async listConfigurations(filters?: {
    category?: PlatformConfigCategory;
    environment?: PlatformEnvironment;
    search?: string;
  }): Promise<PlatformConfigurationDTO[]> {
    let result: PlatformConfigurationDTO[] = [];

    try {
      if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && prisma && (prisma as any).platformConfiguration) {
        const configs = await (prisma as any).platformConfiguration.findMany({
          orderBy: { key: 'asc' },
        });
        if (configs && configs.length > 0) {
          result = configs.map(this.mapToDTO);
        }
      }
    } catch (_err) {
      // In-memory fallback
    }

    if (result.length === 0) {
      result = Array.from(this.memoryConfigs.values());
    }

    if (filters?.category) {
      result = result.filter((c) => c.category === filters.category);
    }
    if (filters?.environment) {
      result = result.filter((c) => c.environment === filters.environment);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((c) => c.key.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
    }

    return result;
  }

  /**
   * Creates a new configuration entry after strict validation.
   */
  public static async createConfiguration(
    input: {
      category: PlatformConfigCategory;
      key: string;
      name: string;
      type: PlatformConfigType;
      value: any;
      environment?: PlatformEnvironment;
      description?: string;
      validation_schema?: any;
      is_secret_reference?: boolean;
      secret_reference_key?: string;
    },
    actorAdminId?: string
  ): Promise<PlatformConfigurationDTO> {
    const env = input.environment || PlatformEnvironment.PRODUCTION;
    const existing = await this.getConfiguration(input.key, env);
    if (existing) {
      throw new Error(`Configuration '${input.key}' already exists in environment '${env}'`);
    }

    // Validate value against type & schema
    const validation = this.validateConfigurationValue(input.value, input.type, input.validation_schema);
    if (!validation.valid) {
      throw new Error(`Invalid configuration value for '${input.key}': ${validation.errors.join(', ')}`);
    }

    const isSecretRef = input.type === PlatformConfigType.SECRET_REFERENCE || Boolean(input.is_secret_reference);
    const riskLevel = this.calculateRiskLevel(input.category, input.key, env);

    const configDTO: PlatformConfigurationDTO = {
      id: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category: input.category,
      key: input.key,
      name: input.name,
      type: input.type,
      value: isSecretRef ? '[REDACTED]' : input.value,
      raw_value: input.value,
      environment: env,
      version: 1,
      risk_level: riskLevel,
      description: input.description || null,
      validation_schema: input.validation_schema || null,
      is_secret_reference: isSecretRef,
      isSecret: isSecretRef,
      secret_reference_key: input.secret_reference_key || (isSecretRef ? String(input.value) : null),
      created_by: actorAdminId || null,
      updated_by: actorAdminId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const memKey = `${input.key}:${env}`;
    this.memoryConfigs.set(memKey, configDTO);

    const history = this.memoryVersions.get(memKey) || [];
    history.push({
      version: 1,
      value: input.value,
      updated_at: new Date(),
      updated_by: actorAdminId,
      reason: 'Initial creation',
    });
    this.memoryVersions.set(memKey, history);

    return configDTO;
  }

  /**
   * Updates an existing configuration value after validation, incrementing version number.
   */
  public static async updateConfiguration(
    key: string,
    newValue: any,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION,
    reason?: string,
    actorAdminId?: string
  ): Promise<PlatformConfigurationDTO> {
    const config = await this.getConfiguration(key, environment);
    if (!config) {
      throw new Error(`Configuration '${key}' not found in environment '${environment}'`);
    }

    const validation = this.validateConfigurationValue(newValue, config.type, config.validation_schema);
    if (!validation.valid) {
      throw new Error(`Invalid configuration update for '${key}': ${validation.errors.join(', ')}`);
    }

    const isSecret = config.is_secret_reference;
    const nextVersion = config.version + 1;
    const updatedDTO: PlatformConfigurationDTO = {
      ...config,
      value: isSecret ? '[REDACTED]' : newValue,
      raw_value: newValue,
      version: nextVersion,
      updated_by: actorAdminId || config.updated_by,
      updated_at: new Date(),
    };

    const memKey = `${key}:${environment}`;
    this.memoryConfigs.set(memKey, updatedDTO);

    const history = this.memoryVersions.get(memKey) || [];
    history.push({
      version: nextVersion,
      value: newValue,
      updated_at: new Date(),
      updated_by: actorAdminId,
      reason: reason || 'Configuration update',
    });
    this.memoryVersions.set(memKey, history);

    return updatedDTO;
  }

  /**
   * Resolves raw secret value for authorized platform callers.
   */
  public static async resolveSecretValue(
    key: string,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION
  ): Promise<string | null> {
    const config = await this.getConfiguration(key, environment);
    if (!config) return null;
    return (config.raw_value !== undefined ? String(config.raw_value) : String(config.value)) || null;
  }

  /**
   * Calculates a deterministic diff between existing configuration and proposed value with secret redaction.
   */
  public static async calculateDiff(
    key: string,
    proposedValue: any,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION
  ): Promise<ConfigurationDiffDTO> {
    const config = await this.getConfiguration(key, environment);
    const isSecret = config ? Boolean(config.is_secret_reference || config.isSecret) : false;

    const oldVal = config ? (isSecret ? '[REDACTED]' : (config.raw_value !== undefined ? config.raw_value : config.value)) : null;
    const newVal = isSecret ? '[REDACTED]' : proposedValue;
    const oldVer = config ? config.version : 0;
    const newVer = oldVer + 1;
    const risk = config ? config.risk_level : this.calculateRiskLevel(PlatformConfigCategory.PLATFORM, key, environment);

    return {
      config_key: key,
      environment,
      old_version: oldVer,
      new_version: newVer,
      old_value: oldVal,
      new_value: newVal,
      diff_type: config ? 'MODIFIED' : 'ADDED',
      risk_level: risk,
      is_secret: isSecret,
      requires_two_person_approval: risk === ChangeRiskLevel.CRITICAL,
    };
  }

  /**
   * Flexible computeDiff alias accepting (key, environment, proposedValue) or (key, proposedValue, environment).
   */
  public static async computeDiff(
    key: string,
    arg2: any,
    arg3?: any
  ): Promise<ConfigurationDiffDTO> {
    let env = PlatformEnvironment.PRODUCTION;
    let proposedVal: any;

    if (Object.values(PlatformEnvironment).includes(arg2)) {
      env = arg2;
      proposedVal = arg3;
    } else {
      proposedVal = arg2;
      env = arg3 || PlatformEnvironment.PRODUCTION;
    }

    return await this.calculateDiff(key, proposedVal, env);
  }

  /**
   * Retrieves version history for a configuration key in an environment.
   */
  public static async getConfigurationHistory(
    key: string,
    environment: PlatformEnvironment = PlatformEnvironment.PRODUCTION
  ): Promise<Array<{ version: number; value: any; updated_at: Date; updated_by?: string; reason?: string }>> {
    const memKey = `${key}:${environment}`;
    const history = this.memoryVersions.get(memKey) || [];
    const config = await this.getConfiguration(key, environment);

    if (config?.is_secret_reference) {
      return history.map((h) => ({
        ...h,
        value: '[REDACTED]',
      }));
    }

    return history;
  }

  private static mapToDTO(raw: any): PlatformConfigurationDTO {
    let parsedValue = raw.value;
    try {
      if (raw.type === PlatformConfigType.JSON) {
        parsedValue = JSON.parse(raw.value);
      } else if (raw.type === PlatformConfigType.INTEGER || raw.type === PlatformConfigType.NUMBER) {
        parsedValue = Number(raw.value);
      } else if (raw.type === PlatformConfigType.BOOLEAN) {
        parsedValue = raw.value === 'true' || raw.value === true;
      }
    } catch (_e) {
      parsedValue = raw.value;
    }

    const isSecret = Boolean(raw.is_secret_reference);

    return {
      id: raw.id,
      category: raw.category || PlatformConfigCategory.PLATFORM,
      key: raw.key,
      name: raw.name || raw.key,
      type: raw.type || PlatformConfigType.STRING,
      value: isSecret ? '[REDACTED]' : parsedValue,
      raw_value: raw.value,
      environment: raw.environment || PlatformEnvironment.PRODUCTION,
      version: raw.version || 1,
      risk_level: raw.risk_level || ChangeRiskLevel.LOW,
      description: raw.description,
      validation_schema: raw.validation_schema,
      is_secret_reference: isSecret,
      isSecret,
      secret_reference_key: raw.secret_reference_key,
      created_by: raw.created_by,
      updated_by: raw.updated_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
