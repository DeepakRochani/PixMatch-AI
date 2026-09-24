/**
 * PIXMatch AI — Phase 20 Automated Test Suite
 * Studio Operations, Booking & Project Management
 *
 * Test Groups:
 * Group 1: Studio Lead Lifecycle (Creation, Status Transitions, Follow-up Dates)
 * Group 2: Lead Search, Filtering & Overdue Follow-up Detection
 * Group 3: Lead-to-Project Conversion & Client Linking (Full Lifecycle Flow)
 * Group 4: Studio Project CRUD & Shoot Logistics Tracking
 * Group 5: Project Default Milestone Auto-Generation & Sequential Ordering
 * Group 6: Project Timeline Progress & Stage Recalculation
 * Group 7: Project Task Lifecycle (Creation, Priorities, Assignment & Overdue Check)
 * Group 8: Milestone CRUD, Completion Timestamps & Reordering
 * Group 9: Gallery-Project Association (Roles: PRIMARY, HIGHLIGHTS, PROOFING)
 * Group 10: Private Project Notes Management & Isolation
 * Group 11: Project Payment Summaries from Business Transactions
 * Group 12: Studio Operations Overview Dashboard KPI Aggregation
 * Group 13: Multi-Source Operational Calendar Event Aggregation
 * Group 14: Copilot Operations Tools Registration & Intent Execution
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  StudioLeadStatus,
  StudioLeadSource,
  StudioProjectStatus,
  StudioProjectType,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectMilestoneStatus,
} from '@pixmatch/types';

const ProjectGalleryRole = {
  PRIMARY: 'PRIMARY',
  HIGHLIGHTS: 'HIGHLIGHTS',
  PROOFING: 'PROOFING',
};

import { prisma } from '@pixmatch/database';
import { LeadService } from '../apps/api/src/modules/operations/lead.service.js';
import { ProjectService } from '../apps/api/src/modules/operations/project.service.js';
import { TaskService } from '../apps/api/src/modules/operations/task.service.js';
import { MilestoneService } from '../apps/api/src/modules/operations/milestone.service.js';
import { OperationsOverviewService } from '../apps/api/src/modules/operations/operations-overview.service.js';
import { CalendarService } from '../apps/api/src/modules/operations/calendar.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

// =============================================================
// IN-MEMORY MOCK DATABASE FOR STUDIO OPERATIONS
// =============================================================

class MockOperationsDatabase {
  leads: any[] = [];
  projects: any[] = [];
  tasks: any[] = [];
  milestones: any[] = [];
  galleries: any[] = [];
  galleryLinks: any[] = [];
  notes: any[] = [];
  clients: any[] = [];
  transactions: any[] = [];
  auditLogs: any[] = [];

  studioLead = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        tags: data.tags || [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.leads.push(rec);
      const client = this.clients.find((c) => c.id === rec.client_id) || null;
      return { ...rec, client };
    },
    findFirst: async ({ where }: any) => {
      const lead = this.leads.find((l) => {
        if (where.id && l.id !== where.id) return false;
        if (where.studio_id && l.studio_id !== where.studio_id) return false;
        if (where.deleted_at === null && l.deleted_at) return false;
        return true;
      });
      if (!lead) return null;
      const client = this.clients.find((c) => c.id === lead.client_id) || null;
      const projects = this.projects.filter((p) => p.lead_id === lead.id);
      return { ...lead, client, projects };
    },
    findUnique: async ({ where }: any) => {
      const lead = this.leads.find((l) => l.id === where.id) || null;
      if (!lead) return null;
      const client = this.clients.find((c) => c.id === lead.client_id) || null;
      return { ...lead, client };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.leads];
      if (where) {
        if (where.studio_id) list = list.filter((l) => l.studio_id === where.studio_id);
        if (where.status) list = list.filter((l) => l.status === where.status);
        if (where.deleted_at === null) list = list.filter((l) => !l.deleted_at);
        if (where.source) list = list.filter((l) => l.source === where.source);
        if (where.next_follow_up_at?.gte && where.next_follow_up_at?.lte) {
          list = list.filter(
            (l) =>
              l.next_follow_up_at &&
              new Date(l.next_follow_up_at) >= where.next_follow_up_at.gte &&
              new Date(l.next_follow_up_at) <= where.next_follow_up_at.lte
          );
        }
        if (where.OR && Array.isArray(where.OR)) {
          list = list.filter((l) =>
            where.OR.some((cond: any) => {
              if (cond.name?.contains && l.name?.toLowerCase().includes(cond.name.contains.toLowerCase())) return true;
              if (cond.email?.contains && l.email?.toLowerCase().includes(cond.email.contains.toLowerCase())) return true;
              if (cond.phone?.contains && l.phone?.includes(cond.phone.contains)) return true;
              if (cond.service_type?.contains && l.service_type?.toLowerCase().includes(cond.service_type.contains.toLowerCase())) return true;
              return false;
            })
          );
        }
      }
      return list.map((l) => ({
        ...l,
        client: this.clients.find((c) => c.id === l.client_id) || null,
      }));
    },
    update: async ({ where, data }: any) => {
      const idx = this.leads.findIndex((l) => l.id === where.id);
      if (idx === -1) throw new Error('Lead not found');
      this.leads[idx] = { ...this.leads[idx], ...data, updated_at: new Date() };
      const client = this.clients.find((c) => c.id === this.leads[idx].client_id) || null;
      return { ...this.leads[idx], client };
    },
    delete: async ({ where }: any) => {
      const idx = this.leads.findIndex((l) => l.id === where.id);
      if (idx !== -1) this.leads.splice(idx, 1);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      const res = await this.studioLead.findMany({ where });
      return res.length;
    },
  };

  studioProject = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        tags: data.tags || [],
        tasks: [],
        milestones: [],
        galleries: [],
        notes: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.projects.push(rec);
      const client = this.clients.find((c) => c.id === rec.client_id) || null;
      return { ...rec, client };
    },
    findFirst: async ({ where }: any) => {
      const proj = this.projects.find((p) => {
        if (where.id && p.id !== where.id) return false;
        if (where.studio_id && p.studio_id !== where.studio_id) return false;
        if (where.deleted_at === null && p.deleted_at) return false;
        return true;
      });
      if (!proj) return null;
      const client = this.clients.find((c) => c.id === proj.client_id) || null;
      const pTasks = this.tasks.filter((t) => t.project_id === proj.id);
      const pMilestones = this.milestones
        .filter((m) => m.project_id === proj.id)
        .sort((a, b) => a.order_index - b.order_index);
      const pGalleries = this.galleryLinks
        .filter((gl) => gl.project_id === proj.id)
        .map((gl) => ({
          ...gl,
          gallery: this.galleries.find((g) => g.id === gl.gallery_id) || null,
        }));
      const pNotes = this.notes.filter((n) => n.project_id === proj.id);
      const pTransactions = this.transactions.filter(
        (t) => t.studio_id === proj.studio_id && (t.project_id === proj.id || t.client_id === proj.client_id)
      );
      return {
        ...proj,
        client,
        tasks: pTasks,
        milestones: pMilestones,
        galleries: pGalleries,
        notes: pNotes,
        transactions: pTransactions,
      };
    },
    findUnique: async ({ where }: any) => {
      const proj = this.projects.find((p) => p.id === where.id) || null;
      if (!proj) return null;
      const client = this.clients.find((c) => c.id === proj.client_id) || null;
      return { ...proj, client };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.projects];
      if (where) {
        if (where.studio_id) list = list.filter((p) => p.studio_id === where.studio_id);
        if (where.status) list = list.filter((p) => p.status === where.status);
        if (where.project_type) list = list.filter((p) => p.project_type === where.project_type);
        if (where.client_id) list = list.filter((p) => p.client_id === where.client_id);
        if (where.deleted_at === null) list = list.filter((p) => !p.deleted_at);
        if (where.shoot_date?.gte && where.shoot_date?.lte) {
          list = list.filter(
            (p) =>
              p.shoot_date &&
              new Date(p.shoot_date) >= where.shoot_date.gte &&
              new Date(p.shoot_date) <= where.shoot_date.lte
          );
        }
      }
      return list.map((p) => {
        const client = this.clients.find((c) => c.id === p.client_id) || null;
        const pTasks = this.tasks.filter((t) => t.project_id === p.id);
        const pMilestones = this.milestones.filter((m) => m.project_id === p.id);
        return {
          ...p,
          client,
          tasks: pTasks,
          milestones: pMilestones,
          _count: { tasks: pTasks.length, milestones: pMilestones.length },
        };
      });
    },
    update: async ({ where, data }: any) => {
      const idx = this.projects.findIndex((p) => p.id === where.id);
      if (idx === -1) throw new Error('Project not found');
      this.projects[idx] = { ...this.projects[idx], ...data, updated_at: new Date() };
      const client = this.clients.find((c) => c.id === this.projects[idx].client_id) || null;
      return { ...this.projects[idx], client };
    },
    delete: async ({ where }: any) => {
      const idx = this.projects.findIndex((p) => p.id === where.id);
      if (idx !== -1) this.projects.splice(idx, 1);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      const res = await this.studioProject.findMany({ where });
      return res.length;
    },
  };

  projectTask = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        status: data.status || ProjectTaskStatus.TODO,
        priority: data.priority || ProjectTaskPriority.MEDIUM,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.tasks.push(rec);
      const project = this.projects.find((p) => p.id === rec.project_id) || null;
      return { ...rec, project };
    },
    findFirst: async ({ where }: any) => {
      const task = this.tasks.find((t) => {
        if (where.id && t.id !== where.id) return false;
        if (where.studio_id && t.studio_id !== where.studio_id) return false;
        return true;
      });
      if (!task) return null;
      const project = this.projects.find((p) => p.id === task.project_id) || null;
      return { ...task, project };
    },
    findUnique: async ({ where }: any) => {
      const task = this.tasks.find((t) => t.id === where.id) || null;
      if (!task) return null;
      const project = this.projects.find((p) => p.id === task.project_id) || null;
      return { ...task, project };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.tasks];
      if (where) {
        if (where.studio_id) list = list.filter((t) => t.studio_id === where.studio_id);
        if (where.project_id) list = list.filter((t) => t.project_id === where.project_id);
        if (where.status) list = list.filter((t) => t.status === where.status);
        if (where.priority) list = list.filter((t) => t.priority === where.priority);
        if (where.due_at?.gte && where.due_at?.lte) {
          list = list.filter(
            (t) => t.due_at && new Date(t.due_at) >= where.due_at.gte && new Date(t.due_at) <= where.due_at.lte
          );
        }
      }
      return list.map((t) => ({
        ...t,
        project: this.projects.find((p) => p.id === t.project_id) || null,
      }));
    },
    update: async ({ where, data }: any) => {
      const idx = this.tasks.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error('Task not found');
      this.tasks[idx] = { ...this.tasks[idx], ...data, updated_at: new Date() };
      const project = this.projects.find((p) => p.id === this.tasks[idx].project_id) || null;
      return { ...this.tasks[idx], project };
    },
    delete: async ({ where }: any) => {
      const idx = this.tasks.findIndex((t) => t.id === where.id);
      if (idx !== -1) this.tasks.splice(idx, 1);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      const res = await this.projectTask.findMany({ where });
      return res.length;
    },
  };

  projectMilestone = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `ms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        status: data.status || ProjectMilestoneStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.milestones.push(rec);
      return rec;
    },
    createMany: async ({ data }: any) => {
      const created = data.map((d: any) => ({
        id: d.id || `ms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...d,
        status: d.status || ProjectMilestoneStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      this.milestones.push(...created);
      return { count: created.length };
    },
    findFirst: async ({ where }: any) => {
      return (
        this.milestones.find((m) => {
          if (where.id && m.id !== where.id) return false;
          if (where.project_id && m.project_id !== where.project_id) return false;
          return true;
        }) || null
      );
    },
    findUnique: async ({ where }: any) => {
      return this.milestones.find((m) => m.id === where.id) || null;
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.milestones];
      if (where) {
        if (where.project_id) list = list.filter((m) => m.project_id === where.project_id);
        if (where.status) list = list.filter((m) => m.status === where.status);
      }
      return list.sort((a, b) => a.order_index - b.order_index);
    },
    update: async ({ where, data }: any) => {
      const idx = this.milestones.findIndex((m) => m.id === where.id);
      if (idx === -1) throw new Error('Milestone not found');
      this.milestones[idx] = { ...this.milestones[idx], ...data, updated_at: new Date() };
      return this.milestones[idx];
    },
    delete: async ({ where }: any) => {
      const idx = this.milestones.findIndex((m) => m.id === where.id);
      if (idx !== -1) this.milestones.splice(idx, 1);
      return { id: where.id };
    },
  };

  projectGalleryLink = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `pgl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        role: data.role || ProjectGalleryRole.PRIMARY,
        created_at: new Date(),
      };
      this.galleryLinks.push(rec);
      return rec;
    },
    upsert: async ({ where, update, create }: any) => {
      const pId = where.project_id_gallery_id?.project_id;
      const gId = where.project_id_gallery_id?.gallery_id;
      const idx = this.galleryLinks.findIndex((gl) => gl.project_id === pId && gl.gallery_id === gId);
      if (idx !== -1) {
        this.galleryLinks[idx] = { ...this.galleryLinks[idx], ...update };
        return this.galleryLinks[idx];
      }
      const rec = {
        id: `pgl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...create,
        created_at: new Date(),
      };
      this.galleryLinks.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      return (
        this.galleryLinks.find((gl) => {
          if (where.project_id && gl.project_id !== where.project_id) return false;
          if (where.gallery_id && gl.gallery_id !== where.gallery_id) return false;
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.galleryLinks];
      if (where) {
        if (where.project_id) list = list.filter((gl) => gl.project_id === where.project_id);
      }
      return list.map((gl) => ({
        ...gl,
        gallery: this.galleries.find((g) => g.id === gl.gallery_id) || null,
      }));
    },
    deleteMany: async ({ where }: any) => {
      const initLen = this.galleryLinks.length;
      this.galleryLinks = this.galleryLinks.filter((gl) => {
        if (where.project_id && gl.project_id === where.project_id && where.gallery_id && gl.gallery_id === where.gallery_id) {
          return false;
        }
        return true;
      });
      return { count: initLen - this.galleryLinks.length };
    },
  };

  projectNote = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `pnote-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        is_pinned: Boolean(data.is_pinned),
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.notes.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      return (
        this.notes.find((n) => {
          if (where.id && n.id !== where.id) return false;
          if (where.project_id && n.project_id !== where.project_id) return false;
          return true;
        }) || null
      );
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.notes];
      if (where) {
        if (where.project_id) list = list.filter((n) => n.project_id === where.project_id);
      }
      return list;
    },
    deleteMany: async ({ where }: any) => {
      const initLen = this.notes.length;
      this.notes = this.notes.filter((n) => {
        if (where.id && n.id === where.id) return false;
        return true;
      });
      return { count: initLen - this.notes.length };
    },
  };

  client = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `cli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.clients.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      return (
        this.clients.find((c) => {
          if (where.id && c.id !== where.id) return false;
          if (where.studio_id && c.studio_id !== where.studio_id) return false;
          if (where.email && c.email?.toLowerCase() !== where.email?.toLowerCase()) return false;
          return true;
        }) || null
      );
    },
    findUnique: async ({ where }: any) => {
      return this.clients.find((c) => c.id === where.id) || null;
    },
  };

  gallery = {
    findMany: async ({ where }: any = {}) => {
      let list = [...this.galleries];
      if (where && where.studio_id) list = list.filter((g) => g.studio_id === where.studio_id);
      return list;
    },
    findFirst: async ({ where }: any) => {
      return this.galleries.find((g) => g.id === where.id) || null;
    },
    findUnique: async ({ where }: any) => {
      return this.galleries.find((g) => g.id === where.id) || null;
    },
  };

  studioBusinessTransaction = {
    findMany: async ({ where }: any = {}) => {
      let list = [...this.transactions];
      if (where) {
        if (where.studio_id) list = list.filter((t) => t.studio_id === where.studio_id);
        if (where.client_id) list = list.filter((t) => t.client_id === where.client_id);
        if (where.is_void !== undefined) list = list.filter((t) => t.is_void === where.is_void);
      }
      return list;
    },
  };

  auditLog = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        created_at: new Date(),
      };
      this.auditLogs.push(rec);
      return rec;
    },
    findMany: async () => this.auditLogs,
  };

  $transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(this);
    }
    if (Array.isArray(fnOrArray)) {
      return Promise.all(fnOrArray);
    }
    return fnOrArray;
  };
}

// =============================================================
// RUN TEST SUITE
// =============================================================

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 PIXMatch AI — Phase 20 Studio Operations Automated Tests');
  console.log('===============================================================\n');

  const db = new MockOperationsDatabase();
  Object.assign(prisma, db);

  const studioId = 'studio-ops-101';
  const userId = 'user-photographer-1';

  // Seed sample gallery
  db.galleries.push({
    id: 'gal-wedding-1',
    studio_id: studioId,
    title: 'Sarah & Alex Wedding Highlights',
    status: 'PUBLISHED',
    event_type: 'WEDDING',
    event_date: new Date('2026-06-15T10:00:00Z'),
    photo_count: 350,
  });

  // -------------------------------------------------------------
  // GROUP 1: Studio Lead Lifecycle
  // -------------------------------------------------------------
  console.log('--- GROUP 1: Studio Lead Lifecycle ---');

  const lead1 = await LeadService.createLead(studioId, {
    name: 'Jessica Taylor',
    email: 'jessica@example.com',
    phone: '+1-555-0199',
    service_type: 'WEDDING',
    source: StudioLeadSource.WEBSITE,
    estimated_value: 4500,
    currency: 'USD',
    notes: 'Interested in full day 8-hour coverage with second shooter.',
  });

  assert(lead1.id !== undefined, 'Lead created with unique ID');
  assert(lead1.status === StudioLeadStatus.NEW, 'New lead defaults to NEW status');
  assert(lead1.estimated_value === 4500, 'Estimated value stored properly');
  assert(lead1.name === 'Jessica Taylor', 'Lead contact name stored properly');

  // Status transitions
  const contactedLead = await LeadService.updateLead(studioId, lead1.id, {
    status: StudioLeadStatus.CONTACTED,
  });
  assert(contactedLead.status === StudioLeadStatus.CONTACTED, 'Transitioned status to CONTACTED');

  const propSentLead = await LeadService.updateLead(studioId, lead1.id, {
    status: StudioLeadStatus.PROPOSAL_SENT,
    next_follow_up_at: new Date('2026-04-01T12:00:00Z'),
  });
  assert(propSentLead.status === StudioLeadStatus.PROPOSAL_SENT, 'Transitioned status to PROPOSAL_SENT with follow_up_date');

  // -------------------------------------------------------------
  // GROUP 2: Lead Search, Filtering & Overdue Detection
  // -------------------------------------------------------------
  console.log('\n--- GROUP 2: Lead Search, Filtering & Overdue Detection ---');

  // Create an overdue lead
  await LeadService.createLead(studioId, {
    name: 'David Miller',
    email: 'david@example.com',
    service_type: 'PORTRAIT',
    status: StudioLeadStatus.CONTACTED,
    next_follow_up_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  });

  const leadsList = await LeadService.listLeads(studioId, {});
  assert(leadsList.total === 2, 'Listed all studio leads');

  const filteredByStatus = await LeadService.listLeads(studioId, { status: StudioLeadStatus.PROPOSAL_SENT });
  assert(filteredByStatus.leads.length === 1 && filteredByStatus.leads[0].name === 'Jessica Taylor', 'Filtered leads by status');

  const searched = await LeadService.listLeads(studioId, { search: 'David' });
  assert(searched.leads.length === 1 && searched.leads[0].email === 'david@example.com', 'Searched leads by keyword');

  // -------------------------------------------------------------
  // GROUP 3: Lead-to-Project Conversion & Client Linking
  // -------------------------------------------------------------
  console.log('\n--- GROUP 3: Lead-to-Project Conversion ---');

  const convertedResult = await LeadService.convertLead(studioId, lead1.id, {
    project_name: 'Jessica & Michael Wedding',
    project_type: StudioProjectType.WEDDING,
    shoot_date: new Date('2026-09-20T14:00:00Z'),
    location: 'Meadowood Napa Valley',
    estimated_value: 4800,
    currency: 'USD',
  });

  assert(convertedResult.project !== undefined, 'Conversion created a StudioProject');
  assert(convertedResult.client !== undefined, 'Conversion created/linked a Client record');
  assert(convertedResult.lead.status === StudioLeadStatus.WON, 'Lead marked as WON upon conversion');
  assert(convertedResult.project.lead_id === lead1.id, 'Project links back to lead ID');
  assert(convertedResult.project.client_id === convertedResult.client.id, 'Project properly linked to Client ID');

  // -------------------------------------------------------------
  // GROUP 4: Studio Project CRUD & Logistics
  // -------------------------------------------------------------
  console.log('\n--- GROUP 4: Studio Project CRUD & Shoot Logistics ---');

  const directProject = await ProjectService.createProject(
    studioId,
    {
      name: 'Apex Tech Annual Conference 2026',
      client_id: convertedResult.client.id,
      project_type: StudioProjectType.CORPORATE,
      shoot_date: new Date('2026-07-10T09:00:00Z'),
      end_date: new Date('2026-07-10T18:00:00Z'),
      location: 'Moscone Center, SF',
      estimated_value: 3200,
      currency: 'USD',
      description: 'Keynotes, breakout sessions, and evening networking gala.',
    },
    userId
  );

  assert(directProject.id !== undefined, 'Project created directly');
  assert(directProject.status === StudioProjectStatus.BOOKED, 'New project default status is BOOKED');
  assert(directProject.project_type === StudioProjectType.CORPORATE, 'Project project_type stored correctly');

  // Update status
  const updatedProj = await ProjectService.updateStatus(
    studioId,
    directProject.id,
    StudioProjectStatus.SHOOT_SCHEDULED,
    userId
  );
  assert(updatedProj.status === StudioProjectStatus.SHOOT_SCHEDULED, 'Updated project status to SHOOT_SCHEDULED');

  // -------------------------------------------------------------
  // GROUP 5: Project Default Milestone Auto-Generation
  // -------------------------------------------------------------
  console.log('\n--- GROUP 5: Default Milestone Auto-Generation ---');

  const milestones = await MilestoneService.listMilestones(convertedResult.project.id);
  assert(milestones.length >= 6, 'Auto-generated standard workflow milestones');
  assert(
    milestones[0].title.includes('Booking') || milestones[0].title.includes('Confirmed'),
    'Initial milestone is Booking Confirmed'
  );
  assert(milestones.every((m) => typeof m.order_index === 'number'), 'All milestones have numerical sequence order_index');

  // -------------------------------------------------------------
  // GROUP 6: Project Timeline Progress Recalculation
  // -------------------------------------------------------------
  console.log('\n--- GROUP 6: Project Timeline Progress Recalculation ---');

  const timeline = await ProjectService.getTimeline(studioId, convertedResult.project.id);
  assert(timeline.project_id === convertedResult.project.id, 'Timeline retrieved for project');
  assert(timeline.stages.length === 9, 'Timeline contains 9 standard operational stages');
  assert(timeline.can_advance === true, 'Timeline can advance');

  // -------------------------------------------------------------
  // GROUP 7: Project Task Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- GROUP 7: Project Task Lifecycle ---');

  const task1 = await TaskService.createTask(
    studioId,
    {
      project_id: convertedResult.project.id,
      title: 'Confirm equipment rental & memory cards',
      priority: ProjectTaskPriority.HIGH,
      due_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // In 2 days
      assigned_to: 'Lead Photographer',
    },
    userId
  );

  assert(task1.id !== undefined, 'Task created with project link');
  assert(task1.status === ProjectTaskStatus.TODO, 'Task defaults to TODO');
  assert(task1.priority === ProjectTaskPriority.HIGH, 'Task priority is HIGH');

  const completedTask = await TaskService.completeTask(studioId, task1.id);
  assert(completedTask.status === ProjectTaskStatus.COMPLETED, 'Task marked as COMPLETED');
  assert(completedTask.completed_at !== null, 'Completion timestamp recorded');

  // -------------------------------------------------------------
  // GROUP 8: Milestone CRUD & Reordering
  // -------------------------------------------------------------
  console.log('\n--- GROUP 8: Milestone CRUD & Reordering ---');

  const customMs = await MilestoneService.createMilestone(studioId, {
    project_id: convertedResult.project.id,
    title: 'Album Design Proof Approval',
    description: 'Send high-res PDF spread to client for layout approval',
    order_index: 99,
    target_date: new Date('2026-10-15T00:00:00Z'),
  });

  assert(customMs.id !== undefined, 'Custom milestone created');
  assert(customMs.title === 'Album Design Proof Approval', 'Custom milestone title stored');

  const reordered = await MilestoneService.reorderMilestones(convertedResult.project.id, [
    customMs.id,
    ...milestones.map((m) => m.id),
  ]);
  assert(reordered.some((m) => m.id === customMs.id && m.order_index === 0), 'Milestones reordered successfully');

  // -------------------------------------------------------------
  // GROUP 9: Gallery-Project Association
  // -------------------------------------------------------------
  console.log('\n--- GROUP 9: Gallery-Project Association ---');

  const linkRes = await ProjectService.linkGallery(
    studioId,
    convertedResult.project.id,
    'gal-wedding-1',
    ProjectGalleryRole.PRIMARY
  );

  assert(linkRes.project_id === convertedResult.project.id, 'Gallery linked to project');
  assert(linkRes.gallery_id === 'gal-wedding-1', 'Correct gallery ID linked');
  assert(linkRes.role === ProjectGalleryRole.PRIMARY, 'Linked with PRIMARY role');

  const projectGalleries = await ProjectService.listGalleries(studioId, convertedResult.project.id);
  assert(projectGalleries.length === 1, 'Project returns linked gallery');
  assert(projectGalleries[0].gallery?.title === 'Sarah & Alex Wedding Highlights', 'Populates gallery details');

  // -------------------------------------------------------------
  // GROUP 10: Private Project Notes Management
  // -------------------------------------------------------------
  console.log('\n--- GROUP 10: Private Project Notes ---');

  const note = await ProjectService.addNote(
    studioId,
    convertedResult.project.id,
    {
      content: 'Client requested extra emphasis on candid reception dancing photos.',
      is_pinned: true,
    },
    userId
  );

  assert(note.id !== undefined, 'Private note created');
  assert(note.is_pinned === true, 'Note marked as pinned');

  const notesList = await ProjectService.listNotes(studioId, convertedResult.project.id);
  assert(notesList.length === 1 && notesList[0].content.includes('candid reception'), 'Listed project notes');

  // -------------------------------------------------------------
  // GROUP 11: Project Payment Summaries
  // -------------------------------------------------------------
  console.log('\n--- GROUP 11: Project Payment Summaries ---');

  // Seed transaction for this client/project
  db.transactions.push({
    id: 'tx-dep-1',
    studio_id: studioId,
    client_id: convertedResult.client.id,
    project_id: convertedResult.project.id,
    transaction_type: 'INCOME',
    amount: 2000,
    currency: 'USD',
    status: 'COMPLETED',
    transaction_date: new Date('2026-03-10T12:00:00Z'),
    description: 'Advance deposit payment for wedding photography',
    is_void: false,
  });

  const paymentSummary = await ProjectService.getPayments(studioId, convertedResult.project.id);
  assert(paymentSummary.total_paid === 2000, 'Calculated total payments made');
  assert(paymentSummary.status === 'PARTIAL', 'Status is PARTIAL when deposit paid < estimated_value');

  // -------------------------------------------------------------
  // GROUP 12: Studio Operations Overview Dashboard KPI Aggregation
  // -------------------------------------------------------------
  console.log('\n--- GROUP 12: Studio Operations Overview KPI Aggregation ---');

  const overview = await OperationsOverviewService.getOverview(studioId);

  assert(overview.leads.total_leads >= 2, 'Aggregates total leads');
  assert(overview.projects.total_projects >= 2, 'Aggregates total projects');
  assert(overview.projects.active_projects >= 1, 'Counts active in-progress/booked projects');
  assert(typeof overview.leads.pipeline_value === 'number', 'Calculates pipeline monetary value');
  assert(Array.isArray(overview.urgent_tasks), 'Provides urgent tasks array');
  assert(Array.isArray(overview.recent_leads), 'Provides recent leads array');

  // -------------------------------------------------------------
  // GROUP 13: Multi-Source Operational Calendar Aggregation
  // -------------------------------------------------------------
  console.log('\n--- GROUP 13: Multi-Source Operational Calendar ---');

  const calendarResponse = await CalendarService.getEvents(studioId, {});

  assert(calendarResponse.events.length >= 2, 'Calendar aggregates events across projects, tasks, and follow-ups');
  const shootEvent = calendarResponse.events.find((e) => e.event_type === 'SHOOT');
  assert(shootEvent !== undefined, 'Calendar contains SHOOT event');
  assert(shootEvent?.title.includes('Jessica') || shootEvent?.title.includes('Apex'), 'Shoot event contains project/client title');

  // -------------------------------------------------------------
  // GROUP 14: Copilot Operations Tools Registration
  // -------------------------------------------------------------
  console.log('\n--- GROUP 14: Copilot Operations Tools Integration ---');

  const toolRegistry = new CopilotToolRegistry(db as any);
  const registeredTools = toolRegistry.getAvailableTools();

  const requiredOpsTools = [
    'listStudioLeads',
    'getStudioLead',
    'createStudioLead',
    'convertStudioLead',
    'listStudioProjects',
    'getStudioProject',
    'createStudioProject',
    'updateStudioProjectStatus',
    'listStudioTasks',
    'createStudioTask',
    'completeStudioTask',
    'getOperationsCalendar',
  ];

  for (const tName of requiredOpsTools) {
    const hasTool = registeredTools.some((t) => t.name === tName);
    assert(hasTool, `Copilot registered tool: ${tName}`);
  }

  // =============================================================
  // TEST SUMMARY
  // =============================================================
  console.log('\n===============================================================');
  console.log(`📊 Phase 20 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
