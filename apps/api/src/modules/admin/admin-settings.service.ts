import { prisma } from '@pixmatch/database';
import {
  PlatformAdminSettingDTO,
  UpdateAdminSettingInput,
  MaintenanceModeDTO,
  PlatformSettingCategory,
} from '@pixmatch/types';
import { AdminService } from './admin.service.js';

export class AdminSettingsService {
  private static memorySettings = new Map<string, PlatformAdminSettingDTO>();
  private static memoryMaintenance: MaintenanceModeDTO = {
    global_maintenance: false,
    api_maintenance: false,
    worker_maintenance: false,
    ai_maintenance: false,
    user_facing_message: 'PixMatch AI is currently undergoing scheduled maintenance. Please check back shortly.',
    scheduled_end: null,
    updated_by: null,
    updated_at: new Date(),
  };

  /**
   * Lists platform settings by category with sensitive secret masking.
   */
  static async listSettings(category?: PlatformSettingCategory): Promise<PlatformAdminSettingDTO[]> {
    try {
      const where: any = {};
      if (category) where.category = category;

      const list = await (prisma as any).platformAdminSetting.findMany({
        where,
        orderBy: { key: 'asc' },
      });

      if (list && list.length > 0) {
        return list.map((item: any) => this.maskSensitiveSetting(this.mapToDTO(item)));
      }
    } catch (_err) {
      // In-memory fallback
    }

    let memoryList = Array.from(this.memorySettings.values());
    if (category) {
      memoryList = memoryList.filter((s) => s.category === category);
    }
    return memoryList.map((item) => this.maskSensitiveSetting(item));
  }

  /**
   * Retrieves a setting by key.
   */
  static async getSetting(key: string, revealSecret = false): Promise<PlatformAdminSettingDTO | null> {
    try {
      const found = await (prisma as any).platformAdminSetting.findUnique({
        where: { key },
      });
      if (found) {
        const dto = this.mapToDTO(found);
        return revealSecret ? dto : this.maskSensitiveSetting(dto);
      }
    } catch (_err) {
      // In-memory fallback
    }

    const memoryItem = this.memorySettings.get(key);
    if (!memoryItem) return null;
    return revealSecret ? memoryItem : this.maskSensitiveSetting(memoryItem);
  }

  /**
   * Retrieves the raw unmasked value of a setting for internal service consumption.
   */
  static async getRawSettingValue(key: string): Promise<string | null> {
    const setting = await this.getSetting(key, true);
    return setting ? setting.value : null;
  }

  /**
   * Sets or updates a platform setting.
   */
  static async setSetting(
    category: PlatformSettingCategory,
    key: string,
    input: UpdateAdminSettingInput,
    actorAdminId?: string
  ): Promise<PlatformAdminSettingDTO> {
    const settingDTO: PlatformAdminSettingDTO = {
      id: 'set_' + key,
      category,
      key,
      value: input.value,
      is_encrypted: input.is_encrypted ?? false,
      is_sensitive: input.is_sensitive ?? false,
      description: input.description || null,
      updated_by: actorAdminId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const upserted = await (prisma as any).platformAdminSetting.upsert({
        where: { key },
        update: {
          category,
          value: input.value,
          is_encrypted: settingDTO.is_encrypted,
          is_sensitive: settingDTO.is_sensitive,
          description: settingDTO.description,
          updated_by: actorAdminId,
          updated_at: new Date(),
        },
        create: {
          id: settingDTO.id,
          category,
          key,
          value: input.value,
          is_encrypted: settingDTO.is_encrypted,
          is_sensitive: settingDTO.is_sensitive,
          description: settingDTO.description,
          updated_by: actorAdminId,
        },
      });

      if (upserted) {
        await AdminService.recordAuditLog({
          actorId: actorAdminId,
          action: 'PLATFORM_SETTING_UPDATED',
          entity: 'SETTING',
          entityId: upserted.id,
          metadata: { key, category, is_sensitive: settingDTO.is_sensitive },
        });
        return this.maskSensitiveSetting(this.mapToDTO(upserted));
      }
    } catch (_err) {
      // In-memory fallback
    }

    this.memorySettings.set(key, settingDTO);
    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'PLATFORM_SETTING_UPDATED',
      entity: 'SETTING',
      entityId: settingDTO.id,
      metadata: { key, category, is_sensitive: settingDTO.is_sensitive },
    });
    return this.maskSensitiveSetting(settingDTO);
  }

  /**
   * Retrieves maintenance mode state.
   */
  static async getMaintenanceMode(): Promise<MaintenanceModeDTO> {
    const setting = await this.getSetting('platform_maintenance_config', true);
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return { ...this.memoryMaintenance, ...parsed };
      } catch (_err) {
        // Fallback
      }
    }
    return this.memoryMaintenance;
  }

  /**
   * Sets maintenance mode flags.
   */
  static async setMaintenanceMode(
    input: Partial<MaintenanceModeDTO>,
    actorAdminId?: string
  ): Promise<MaintenanceModeDTO> {
    const current = await this.getMaintenanceMode();
    const updated: MaintenanceModeDTO = {
      ...current,
      ...input,
      updated_by: actorAdminId || current.updated_by,
      updated_at: new Date(),
    };

    this.memoryMaintenance = updated;
    await this.setSetting(
      PlatformSettingCategory.MAINTENANCE,
      'platform_maintenance_config',
      {
        value: JSON.stringify(updated),
        is_sensitive: false,
        description: 'Global and subsystem maintenance configuration',
      },
      actorAdminId
    );

    await AdminService.recordAuditLog({
      actorId: actorAdminId,
      action: 'MAINTENANCE_MODE_UPDATED',
      entity: 'MAINTENANCE',
      metadata: {
        global: updated.global_maintenance,
        api: updated.api_maintenance,
        worker: updated.worker_maintenance,
        ai: updated.ai_maintenance,
      },
    });

    return updated;
  }

  private static maskSensitiveSetting(dto: PlatformAdminSettingDTO): PlatformAdminSettingDTO {
    if (!dto.is_sensitive) return dto;
    return {
      ...dto,
      value: '******** [REDACTED_SECRET]',
    };
  }

  private static mapToDTO(raw: any): PlatformAdminSettingDTO {
    return {
      id: raw.id,
      category: raw.category as PlatformSettingCategory,
      key: raw.key,
      value: raw.value,
      is_encrypted: Boolean(raw.is_encrypted),
      is_sensitive: Boolean(raw.is_sensitive),
      description: raw.description,
      updated_by: raw.updated_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
