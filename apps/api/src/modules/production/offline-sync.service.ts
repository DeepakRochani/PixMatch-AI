import { prisma } from '@pixmatch/database';
import {
  OfflineSyncResultDTO,
  ShotListItemStatus,
  ChecklistItemStatus,
} from '@pixmatch/types';

export interface OfflineActionItem {
  id: string;
  type: 'CHECKLIST_TOGGLE' | 'SHOT_STATUS_TOGGLE' | 'SHOOT_NOTE_CREATE' | 'STAGE_UPDATE' | 'UPDATE_EQUIPMENT_STATUS';
  project_id: string;
  entity_id: string;
  payload?: any;
  timestamp?: string | Date;
}

export class OfflineSyncService {
  /**
   * Process a batch of offline actions recorded on mobile during shoot day
   */
  static async processOfflineBatch(
    studioId: string,
    projectId: string,
    actions: OfflineActionItem[]
  ): Promise<OfflineSyncResultDTO> {
    const failedItems: Array<{ id: string; error: string }> = [];
    let successCount = 0;
    let conflictCount = 0;

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'CHECKLIST_TOGGLE': {
            const item = await prisma.projectChecklist.findFirst({
              where: { id: action.entity_id, studio_id: studioId },
            });
            if (item) {
              const isCompleted = action.payload?.status === 'COMPLETED' || Boolean(action.payload?.is_completed);
              await prisma.projectChecklist.update({
                where: { id: action.entity_id },
                data: {
                  status: isCompleted ? ChecklistItemStatus.COMPLETED : ChecklistItemStatus.PENDING,
                  completed_at: isCompleted ? (action.timestamp ? new Date(action.timestamp) : new Date()) : null,
                  updated_at: new Date(),
                },
              });
              successCount++;
            } else {
              conflictCount++;
              failedItems.push({ id: action.id || action.entity_id, error: `Checklist item not found: ${action.entity_id}` });
            }
            break;
          }

          case 'SHOT_STATUS_TOGGLE': {
            const shot = await prisma.projectShotListItem.findFirst({
              where: { id: action.entity_id, studio_id: studioId },
            });
            if (shot) {
              const status = (action.payload?.status as ShotListItemStatus) || ShotListItemStatus.CAPTURED;
              await prisma.projectShotListItem.update({
                where: { id: action.entity_id },
                data: {
                  status,
                  captured_at: status === ShotListItemStatus.CAPTURED ? (action.timestamp ? new Date(action.timestamp) : new Date()) : shot.captured_at,
                  notes: action.payload?.notes || shot.notes,
                  updated_at: new Date(),
                },
              });
              successCount++;
            } else {
              conflictCount++;
              failedItems.push({ id: action.id || action.entity_id, error: `Shot list item not found: ${action.entity_id}` });
            }
            break;
          }

          case 'UPDATE_EQUIPMENT_STATUS': {
            const eq = await prisma.projectEquipmentChecklist.findFirst({
              where: { id: action.entity_id, studio_id: studioId },
            });
            if (eq) {
              const status = (action.payload?.status as ChecklistItemStatus) || ChecklistItemStatus.COMPLETED;
              await prisma.projectEquipmentChecklist.update({
                where: { id: action.entity_id },
                data: {
                  status,
                  checked_at: status === ChecklistItemStatus.COMPLETED ? (action.timestamp ? new Date(action.timestamp) : new Date()) : null,
                  checked_by: action.payload?.checked_by || eq.checked_by,
                  updated_at: new Date(),
                },
              });
              successCount++;
            } else {
              conflictCount++;
              failedItems.push({ id: action.id || action.entity_id, error: `Equipment item not found: ${action.entity_id}` });
            }
            break;
          }

          case 'SHOOT_NOTE_CREATE': {
            const production = await prisma.projectProduction.findFirst({
              where: { project_id: projectId, studio_id: studioId },
            });
            if (production) {
              const noteText = action.payload?.note || '';
              const timestampStr = action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
              const appendedNotes = `${production.internal_notes ? production.internal_notes + '\n' : ''}[Offline Note ${timestampStr}]: ${noteText}`;

              await prisma.projectProduction.update({
                where: { id: production.id },
                data: {
                  internal_notes: appendedNotes,
                  updated_at: new Date(),
                },
              });
              successCount++;
            } else {
              conflictCount++;
              failedItems.push({ id: action.id || action.entity_id, error: `Production record not found for project: ${projectId}` });
            }
            break;
          }

          default:
            failedItems.push({ id: action.id || action.entity_id, error: `Unknown action type: ${action.type}` });
        }
      } catch (err: any) {
        failedItems.push({ id: action.id || action.entity_id, error: err?.message || 'Failed to apply action' });
      }
    }

    return {
      processed_count: actions.length,
      success_count: successCount,
      conflict_count: conflictCount,
      failed_items: failedItems,
      failed_count: failedItems.length,
      success: failedItems.length === 0,
    } as any;
  }
}
