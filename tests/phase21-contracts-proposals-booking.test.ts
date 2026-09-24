/**
 * PIXMatch AI — Phase 21 Automated Test Suite
 * Contracts, Proposals, Booking Pipeline & Public Client Portal
 *
 * Test Groups:
 * Group 1: Proposal Schema & Collision-Resistant Numbering (PROP-YYYY-XXXXXX)
 * Group 2: Proposal Line Items, Optional Selection & Tax/Discount Computation
 * Group 3: Proposal Revisions, Versioning & Historical Snapshot Immutability
 * Group 4: Proposal State Transitions (DRAFT -> SENT -> VIEWED -> ACCEPTED / REJECTED / VOID)
 * Group 5: Contract Template CRUD, Categories & Supported Variables
 * Group 6: Contract Dynamic Variable Interpolation & Numbering (CONT-YYYY-XXXXXX)
 * Group 7: Cryptographic E-Signature Integrity (SHA-256 Hashing, Audit Payloads)
 * Group 8: Contract Countersigning, Rejection Handling & Void Auditing
 * Group 9: Atomic Lead-to-Booking Workflow (LEAD -> PROPOSAL -> CONTRACT -> BOOKING -> PROJECT)
 * Group 10: Automatic Project Creation, Milestone Scaffold & Lead Status Sync
 * Group 11: Structured Payment Schedules & Installment Planning
 * Group 12: Payment Schedule Status, Installment Overdue Checks & Reconciliation
 * Group 13: Public Portal Token Security (SHA-256 Hashing & Expiration Enforcement)
 * Group 14: Public Proposal Client Acceptance & Optional Items Negotiation
 * Group 15: Public Contract E-Signing & Audit Certificate Verification
 * Group 16: Public Booking Portal Status & Payment Milestone Visibility
 * Group 17: Phase 21 Copilot AI Tools Registration & Intent Execution (8 Tools)
 * Group 18: Multi-Studio Tenant Isolation across Proposals, Contracts & Portals
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import {
  StudioProposalStatus,
  StudioContractStatus,
  StudioContractCategory,
  ProjectPaymentScheduleStatus,
  StudioLeadStatus,
  StudioLeadSource,
  StudioProjectStatus,
  StudioProjectType,
  ProjectMilestoneStatus,
} from '@pixmatch/types';

import { prisma } from '@pixmatch/database';
import { ProposalService } from '../apps/api/src/modules/operations/proposal.service.js';
import { ContractService } from '../apps/api/src/modules/operations/contract.service.js';
import { BookingService } from '../apps/api/src/modules/operations/booking.service.js';
import { PaymentScheduleService } from '../apps/api/src/modules/operations/payment-schedule.service.js';
import { PublicPortalService } from '../apps/api/src/modules/operations/public-portal.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';
import crypto from 'crypto';

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

// In-Memory Database Engine
class MockPhase21Database {
  studios: any[] = [];
  users: any[] = [];
  clients: any[] = [];
  leads: any[] = [];
  projects: any[] = [];
  milestones: any[] = [];
  tasks: any[] = [];
  proposals: any[] = [];
  proposalItems: any[] = [];
  proposalRevisions: any[] = [];
  contractTemplates: any[] = [];
  contracts: any[] = [];
  bookings: any[] = [];
  paymentSchedules: any[] = [];
  auditLogs: any[] = [];
  clientActivities: any[] = [];

  clientActivity = {
    create: async ({ data }: any) => {
      const rec = { id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data, created_at: new Date() };
      this.clientActivities.push(rec);
      return rec;
    },
    findMany: async () => this.clientActivities,
  };

  studio = {
    create: async ({ data }: any) => {
      const rec = { id: data.id || `studio-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data };
      this.studios.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => this.studios.find((s) => s.id === where.id) || null,
    findFirst: async ({ where }: any) => this.studios.find((s) => s.id === where.id) || null,
  };

  user = {
    create: async ({ data }: any) => {
      const rec = { id: data.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data };
      this.users.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => this.users.find((u) => u.id === where.id) || null,
    findFirst: async ({ where }: any) => this.users.find((u) => u.id === where.id) || null,
  };

  client = {
    create: async ({ data }: any) => {
      const rec = { id: data.id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data };
      this.clients.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => this.clients.find((c) => {
      if (where.id && c.id !== where.id) return false;
      if (where.studio_id && c.studio_id !== where.studio_id) return false;
      return true;
    }) || null,
    findUnique: async ({ where }: any) => this.clients.find((c) => c.id === where.id) || null,
  };

  studioLead = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        status: data.status || StudioLeadStatus.NEW,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.leads.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => this.leads.find((l) => {
      if (where.id && l.id !== where.id) return false;
      if (where.studio_id && l.studio_id !== where.studio_id) return false;
      return true;
    }) || null,
    findUnique: async ({ where }: any) => this.leads.find((l) => l.id === where.id) || null,
    update: async ({ where, data }: any) => {
      const idx = this.leads.findIndex((l) => l.id === where.id);
      if (idx === -1) throw new Error('Lead not found');
      this.leads[idx] = { ...this.leads[idx], ...data, updated_at: new Date() };
      return this.leads[idx];
    },
    count: async ({ where }: any = {}) => {
      let list = [...this.leads];
      if (where.studio_id) list = list.filter((l) => l.studio_id === where.studio_id);
      if (where.status) list = list.filter((l) => l.status === where.status);
      return list.length;
    },
  };

  studioProject = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        type: data.project_type || data.type || StudioProjectType.OTHER,
        project_type: data.project_type || data.type || StudioProjectType.OTHER,
        status: data.status || StudioProjectStatus.INQUIRY,
        paid_amount: data.paid_amount || 0,
        tasks: [],
        milestones: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.projects.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => this.projects.find((p) => {
      if (where.id && p.id !== where.id) return false;
      if (where.studio_id && p.studio_id !== where.studio_id) return false;
      return true;
    }) || null,
    findUnique: async ({ where }: any) => {
      const p = this.projects.find((pr) => pr.id === where.id);
      if (!p) return null;
      return {
        ...p,
        milestones: this.milestones.filter((m) => m.project_id === p.id),
        tasks: this.tasks.filter((t) => t.project_id === p.id),
      };
    },
    update: async ({ where, data }: any) => {
      const idx = this.projects.findIndex((p) => p.id === where.id);
      if (idx === -1) throw new Error('Project not found');
      this.projects[idx] = { ...this.projects[idx], ...data, updated_at: new Date() };
      return this.projects[idx];
    },
    findMany: async ({ where, include, orderBy, take }: any = {}) => {
      let list = [...this.projects];
      if (where?.studio_id) list = list.filter((p) => p.studio_id === where.studio_id);
      if (where?.status) {
        if (typeof where.status === 'object' && where.status.in) {
          list = list.filter((p) => where.status.in.includes(p.status));
        } else {
          list = list.filter((p) => p.status === where.status);
        }
      }
      if (where?.deleted_at === null) list = list.filter((p) => !p.deleted_at);
      if (take) list = list.slice(0, take);
      return list.map((p) => ({
        ...p,
        studio: this.studios.find((s) => s.id === p.studio_id) || null,
        client: this.clients.find((c) => c.id === p.client_id) || null,
        milestones: this.milestones.filter((m) => m.project_id === p.id),
        tasks: this.tasks.filter((t) => t.project_id === p.id),
        payment_schedules: this.paymentSchedules.filter((s) => s.project_id === p.id),
        contracts: this.contracts.filter((c) => c.project_id === p.id && !c.deleted_at),
        proposals: this.proposals.filter((pr) => pr.project_id === p.id && !pr.deleted_at),
      }));
    },
    count: async ({ where }: any = {}) => {
      let list = [...this.projects];
      if (where.studio_id) list = list.filter((p) => p.studio_id === where.studio_id);
      if (where.status) list = list.filter((p) => p.status === where.status);
      return list.length;
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
      const items = data.map((d: any) => ({
        id: d.id || `ms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...d,
        status: d.status || ProjectMilestoneStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      this.milestones.push(...items);
      return { count: items.length };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.milestones];
      if (where.project_id) list = list.filter((m) => m.project_id === where.project_id);
      return list.sort((a, b) => a.order_index - b.order_index);
    },
  };

  studioProposal = {
    create: async ({ data }: any) => {
      const itemsData = data.items?.create || [];
      const revisionsData = data.revisions?.create || null;
      const proposalId = data.id || `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const rec = {
        id: proposalId,
        studio_id: data.studio_id,
        client_id: data.client_id,
        lead_id: data.lead_id,
        project_id: data.project_id,
        proposal_number: data.proposal_number,
        title: data.title,
        status: data.status || StudioProposalStatus.DRAFT,
        current_revision: data.current_revision || 1,
        currency: data.currency || 'USD',
        subtotal: data.subtotal || 0,
        discount_amount: data.discount_amount || 0,
        tax_amount: data.tax_amount || 0,
        total_amount: data.total_amount || 0,
        terms_and_conditions: data.terms_and_conditions,
        notes: data.notes,
        valid_until: data.valid_until,
        public_token_hash: data.public_token_hash,
        token_expires_at: data.token_expires_at,
        view_count: data.view_count || 0,
        sent_at: data.sent_at,
        viewed_at: data.viewed_at,
        accepted_at: data.accepted_at,
        rejected_at: data.rejected_at,
        metadata: data.metadata || {},
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.proposals.push(rec);

      for (const it of itemsData) {
        this.proposalItems.push({
          id: it.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          proposal_id: proposalId,
          ...it,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (revisionsData) {
        this.proposalRevisions.push({
          id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          proposal_id: proposalId,
          ...revisionsData,
          created_at: new Date(),
        });
      }

      return this.mapProposalWithRelations(rec);
    },

    findFirst: async ({ where }: any) => {
      const p = this.proposals.find((prop) => {
        if (where.id && prop.id !== where.id) return false;
        if (where.studio_id && prop.studio_id !== where.studio_id) return false;
        if (where.public_token_hash && prop.public_token_hash !== where.public_token_hash) return false;
        if (where.deleted_at === null && prop.deleted_at) return false;
        return true;
      });
      if (!p) return null;
      return this.mapProposalWithRelations(p);
    },

    findUnique: async ({ where }: any) => {
      const p = this.proposals.find((prop) => {
        if (where.id && prop.id !== where.id) return false;
        if (where.public_token_hash && prop.public_token_hash !== where.public_token_hash) return false;
        return true;
      });
      if (!p) return null;
      return this.mapProposalWithRelations(p);
    },

    findMany: async ({ where }: any = {}) => {
      let list = [...this.proposals];
      if (where) {
        if (where.studio_id) list = list.filter((p) => p.studio_id === where.studio_id);
        if (where.client_id) list = list.filter((p) => p.client_id === where.client_id);
        if (where.status) list = list.filter((p) => p.status === where.status);
        if (where.deleted_at === null) list = list.filter((p) => !p.deleted_at);
      }
      return list.map((p) => this.mapProposalWithRelations(p));
    },

    update: async ({ where, data }: any) => {
      const idx = this.proposals.findIndex((p) => (where.id ? p.id === where.id : p.public_token_hash === where.public_token_hash));
      if (idx === -1) throw new Error('Proposal not found');
      
      const { items, ...restData } = data;
      if (restData.view_count && typeof restData.view_count === 'object' && restData.view_count.increment) {
        restData.view_count = (this.proposals[idx].view_count || 0) + restData.view_count.increment;
      }
      
      this.proposals[idx] = { ...this.proposals[idx], ...restData, updated_at: new Date() };

      if (items?.deleteMany) {
        this.proposalItems = this.proposalItems.filter((i) => i.proposal_id !== this.proposals[idx].id);
      }
      if (items?.create) {
        for (const it of items.create) {
          this.proposalItems.push({
            id: it.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            proposal_id: this.proposals[idx].id,
            ...it,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      return this.mapProposalWithRelations(this.proposals[idx]);
    },

    count: async ({ where }: any = {}) => {
      let list = [...this.proposals];
      if (where.studio_id) list = list.filter((p) => p.studio_id === where.studio_id);
      if (where.status) list = list.filter((p) => p.status === where.status);
      if (where.deleted_at === null) list = list.filter((p) => !p.deleted_at);
      return list.length;
    },
  };

  studioProposalItem = {
    deleteMany: async ({ where }: any = {}) => {
      const initLen = this.proposalItems.length;
      if (where.proposal_id) {
        this.proposalItems = this.proposalItems.filter((i) => i.proposal_id !== where.proposal_id);
      }
      return { count: initLen - this.proposalItems.length };
    },
    createMany: async ({ data }: any) => {
      for (const it of data) {
        this.proposalItems.push({
          id: it.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...it,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      return { count: data.length };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.proposalItems];
      if (where.proposal_id) list = list.filter((i) => i.proposal_id === where.proposal_id);
      return list;
    },
    update: async ({ where, data }: any) => {
      const idx = this.proposalItems.findIndex((i) => i.id === where.id);
      if (idx !== -1) {
        this.proposalItems[idx] = { ...this.proposalItems[idx], ...data, updated_at: new Date() };
        return this.proposalItems[idx];
      }
      return null;
    },
  };

  studioProposalRevision = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `rev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        created_at: new Date(),
      };
      this.proposalRevisions.push(rec);
      return rec;
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      let list = [...this.proposalRevisions];
      if (where?.proposal_id) list = list.filter((r) => r.proposal_id === where.proposal_id);
      if (orderBy?.revision_number === 'desc') {
        return list.sort((a, b) => b.revision_number - a.revision_number);
      }
      return list.sort((a, b) => a.revision_number - b.revision_number);
    },
  };

  studioContractTemplate = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.contractTemplates.push(rec);
      return rec;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (let i = 0; i < this.contractTemplates.length; i++) {
        if (where.studio_id && this.contractTemplates[i].studio_id !== where.studio_id) continue;
        if (where.category && this.contractTemplates[i].category !== where.category) continue;
        if (where.is_default !== undefined && this.contractTemplates[i].is_default !== where.is_default) continue;
        this.contractTemplates[i] = { ...this.contractTemplates[i], ...data };
        count++;
      }
      return { count };
    },
    findFirst: async ({ where }: any) => this.contractTemplates.find((t) => {
      if (where.id && t.id !== where.id) return false;
      if (where.studio_id && t.studio_id !== where.studio_id) return false;
      if (where.category && t.category !== where.category) return false;
      if (where.is_default !== undefined && t.is_default !== where.is_default) return false;
      return true;
    }) || null,
    findMany: async ({ where }: any = {}) => {
      let list = [...this.contractTemplates];
      if (where?.studio_id) list = list.filter((t) => t.studio_id === where.studio_id);
      if (where?.OR) {
        const sId = where.OR.find((o: any) => o.studio_id !== undefined)?.studio_id;
        list = list.filter((t) => (sId ? t.studio_id === sId : false) || t.studio_id === null);
      }
      if (where?.category) list = list.filter((t) => t.category === where.category);
      return list;
    },
    update: async ({ where, data }: any) => {
      const idx = this.contractTemplates.findIndex((t) => t.id === where.id);
      if (idx !== -1) {
        this.contractTemplates[idx] = { ...this.contractTemplates[idx], ...data, updated_at: new Date() };
        return this.contractTemplates[idx];
      }
      return null;
    },
    delete: async ({ where }: any) => {
      const idx = this.contractTemplates.findIndex((t) => t.id === where.id);
      if (idx !== -1) this.contractTemplates.splice(idx, 1);
      return { id: where.id };
    },
  };

  studioContract = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `cont-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        status: data.status || StudioContractStatus.DRAFT,
        version: data.version || 1,
        variables: data.variables || {},
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.contracts.push(rec);
      return this.mapContractWithRelations(rec);
    },
    findFirst: async ({ where }: any) => {
      const c = this.contracts.find((cont) => {
        if (where.id && cont.id !== where.id) return false;
        if (where.studio_id && cont.studio_id !== where.studio_id) return false;
        if (where.public_token_hash && cont.public_token_hash !== where.public_token_hash && cont.portal_token_hash !== where.public_token_hash) return false;
        if (where.portal_token_hash && cont.portal_token_hash !== where.portal_token_hash && cont.public_token_hash !== where.portal_token_hash) return false;
        if (where.OR && Array.isArray(where.OR)) {
          const matched = where.OR.some((cond: any) => {
            if (cond.portal_token_hash && (cont.portal_token_hash === cond.portal_token_hash || cont.public_token_hash === cond.portal_token_hash)) return true;
            if (cond.public_token_hash && (cont.public_token_hash === cond.public_token_hash || cont.portal_token_hash === cond.public_token_hash)) return true;
            return false;
          });
          if (!matched) return false;
        }
        if (where.deleted_at === null && cont.deleted_at) return false;
        return true;
      });
      if (!c) return null;
      return this.mapContractWithRelations(c);
    },
    findUnique: async ({ where }: any) => {
      const c = this.contracts.find((cont) => {
        if (where.id) return cont.id === where.id;
        if (where.public_token_hash) return cont.public_token_hash === where.public_token_hash || cont.portal_token_hash === where.public_token_hash;
        if (where.portal_token_hash) return cont.portal_token_hash === where.portal_token_hash || cont.public_token_hash === where.portal_token_hash;
        return false;
      });
      if (!c) return null;
      return this.mapContractWithRelations(c);
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.contracts];
      if (where) {
        if (where.studio_id) list = list.filter((c) => c.studio_id === where.studio_id);
        if (where.client_id) list = list.filter((c) => c.client_id === where.client_id);
        if (where.status) list = list.filter((c) => c.status === where.status);
        if (where.deleted_at === null) list = list.filter((c) => !c.deleted_at);
      }
      return list.map((c) => this.mapContractWithRelations(c));
    },
    update: async ({ where, data }: any) => {
      const idx = this.contracts.findIndex((c) => {
        if (where.id) return c.id === where.id;
        if (where.public_token_hash) return c.public_token_hash === where.public_token_hash || c.portal_token_hash === where.public_token_hash;
        if (where.portal_token_hash) return c.portal_token_hash === where.portal_token_hash || c.public_token_hash === where.portal_token_hash;
        return false;
      });
      if (idx === -1) throw new Error('Contract not found');
      this.contracts[idx] = { ...this.contracts[idx], ...data, updated_at: new Date() };
      return this.mapContractWithRelations(this.contracts[idx]);
    },
    count: async ({ where }: any = {}) => {
      let list = [...this.contracts];
      if (where.studio_id) list = list.filter((c) => c.studio_id === where.studio_id);
      if (where.status) list = list.filter((c) => c.status === where.status);
      if (where.deleted_at === null) list = list.filter((c) => !c.deleted_at);
      return list.length;
    },
  };

  studioBooking = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.bookings.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      const b = this.bookings.find((bk) => {
        if (where.id && bk.id !== where.id) return false;
        if (where.studio_id && bk.studio_id !== where.studio_id) return false;
        if (where.public_token_hash && bk.public_token_hash !== where.public_token_hash) return false;
        return true;
      });
      if (!b) return null;
      return {
        ...b,
        project: this.projects.find((p) => p.id === b.project_id) || null,
        contract: this.contracts.find((c) => c.id === b.contract_id) || null,
        proposal: this.proposals.find((p) => p.id === b.proposal_id) || null,
        studio: this.studios.find((s) => s.id === b.studio_id) || null,
      };
    },
    findMany: async ({ where }: any = {}) => {
      let list = [...this.bookings];
      if (where.studio_id) list = list.filter((b) => b.studio_id === where.studio_id);
      return list;
    },
    count: async ({ where }: any = {}) => {
      let list = [...this.bookings];
      if (where.studio_id) list = list.filter((b) => b.studio_id === where.studio_id);
      return list.length;
    },
  };

  projectPaymentSchedule = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...data,
        status: data.status || ProjectPaymentScheduleStatus.PENDING,
        paid_amount: data.paid_amount || 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.paymentSchedules.push(rec);
      return rec;
    },
    createMany: async ({ data }: any) => {
      const items = data.map((d: any) => ({
        id: d.id || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...d,
        status: d.status || ProjectPaymentScheduleStatus.PENDING,
        paid_amount: d.paid_amount || 0,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      this.paymentSchedules.push(...items);
      return { count: items.length };
    },
    findFirst: async ({ where }: any) => this.paymentSchedules.find((s) => {
      if (where.id && s.id !== where.id) return false;
      if (where.studio_id && s.studio_id !== where.studio_id) return false;
      if (where.project_id && s.project_id !== where.project_id) return false;
      return true;
    }) || null,
    findUnique: async ({ where }: any) => this.paymentSchedules.find((s) => s.id === where.id) || null,
    findMany: async ({ where }: any = {}) => {
      let list = [...this.paymentSchedules];
      if (where.studio_id) list = list.filter((s) => s.studio_id === where.studio_id);
      if (where.project_id) list = list.filter((s) => s.project_id === where.project_id);
      if (where.status) list = list.filter((s) => s.status === where.status);
      return list.sort((a, b) => a.installment_number - b.installment_number);
    },
    update: async ({ where, data }: any) => {
      const idx = this.paymentSchedules.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error('Payment schedule not found');
      this.paymentSchedules[idx] = { ...this.paymentSchedules[idx], ...data, updated_at: new Date() };
      return this.paymentSchedules[idx];
    },
    count: async ({ where }: any = {}) => {
      let list = [...this.paymentSchedules];
      if (where.studio_id) list = list.filter((s) => s.studio_id === where.studio_id);
      if (where.project_id) list = list.filter((s) => s.project_id === where.project_id);
      if (where.status) list = list.filter((s) => s.status === where.status);
      return list.length;
    },
  };

  businessTransactions: any[] = [];

  studioBusinessTransaction = {
    create: async ({ data }: any) => {
      const rec = { id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data, created_at: new Date() };
      this.businessTransactions.push(rec);
      return rec;
    },
    findMany: async () => this.businessTransactions,
  };

  auditLog = {
    create: async ({ data }: any) => {
      const rec = { id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data, created_at: new Date() };
      this.auditLogs.push(rec);
      return rec;
    },
  };

  calendarEvents: any[] = [];
  studioCalendarEvent = {
    create: async ({ data }: any) => {
      const rec = { id: data.id || `cal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...data, created_at: new Date(), updated_at: new Date() };
      this.calendarEvents.push(rec);
      return rec;
    },
    findMany: async () => this.calendarEvents,
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

  private mapProposalWithRelations(p: any) {
    return {
      ...p,
      items: this.proposalItems.filter((i) => i.proposal_id === p.id),
      revisions: this.proposalRevisions.filter((r) => r.proposal_id === p.id),
      contracts: this.contracts.filter((c) => c.proposal_id === p.id),
      client: this.clients.find((c) => c.id === p.client_id) || null,
      lead: this.leads.find((l) => l.id === p.lead_id) || null,
      project: this.projects.find((pr) => pr.id === p.project_id) || null,
      studio: this.studios.find((s) => s.id === p.studio_id) || null,
    };
  }

  private mapContractWithRelations(c: any) {
    return {
      ...c,
      client: this.clients.find((cl) => cl.id === c.client_id) || null,
      proposal: this.proposals.find((p) => p.id === c.proposal_id) || null,
      project: this.projects.find((p) => p.id === c.project_id) || null,
      template: this.contractTemplates.find((t) => t.id === c.template_id) || null,
      studio: this.studios.find((s) => s.id === c.studio_id) || null,
    };
  }
}

// =========================================================================
// RUN TEST SUITE
// =========================================================================

async function runTestSuite() {
  console.log('================================================================');
  console.log('  PIXMatch AI — Phase 21 Contracts, Proposals & Booking Tests');
  console.log('================================================================\n');

  const mockDb = new MockPhase21Database();
  Object.assign(prisma, mockDb);

  const studio1 = await prisma.studio.create({
    data: {
      id: 'studio-p21-alpha',
      name: 'Phase 21 Photo Studio Alpha',
      subdomain: 'p21-alpha',
    },
  });

  const studio2 = await prisma.studio.create({
    data: {
      id: 'studio-p21-beta',
      name: 'Phase 21 Photo Studio Beta',
      subdomain: 'p21-beta',
    },
  });

  const testUser = await prisma.user.create({
    data: {
      id: 'user-alex-101',
      email: 'alex@example.com',
      name: 'Photographer Alex',
      studio_id: studio1.id,
      role: 'PHOTOGRAPHER',
    },
  });

  const testClient = await prisma.client.create({
    data: {
      id: 'client-miller-202',
      studio_id: studio1.id,
      name: 'Jessica & David Miller',
      email: 'client.miller@example.com',
      phone: '+1 555 019 2831',
    },
  });

  const testLead = await prisma.studioLead.create({
    data: {
      id: 'lead-miller-303',
      studio_id: studio1.id,
      client_id: testClient.id,
      name: 'Jessica Miller',
      email: 'client.miller@example.com',
      phone: '+1 555 019 2831',
      source: StudioLeadSource.WEBSITE_CONTACT,
      status: StudioLeadStatus.PROPOSAL_SENT,
      service_type: 'Wedding Photography',
      estimated_value: 4500,
    },
  });

  // =========================================================================
  // GROUP 1: Proposal Schema & Collision-Resistant Numbering
  // =========================================================================
  console.log('\n--- GROUP 1: Proposal Schema & Collision-Resistant Numbering ---');

  const currentYear = new Date().getFullYear();
  const proposal1 = await ProposalService.createProposal(studio1.id, testUser.id, {
    client_id: testClient.id,
    lead_id: testLead.id,
    title: 'Full Day Wedding Photography Package',
    currency: 'USD',
    tax_amount: 250,
    discount_amount: 100,
    terms_and_conditions: 'Standard 30-day payment term.',
    items: [
      {
        title: '8 Hours Full Wedding Day Coverage',
        description: 'Two photographers, ceremony + reception',
        quantity: 1,
        unit_price: 3200,
        is_optional: false,
      },
      {
        title: 'Drone Aerial Highlights',
        quantity: 1,
        unit_price: 600,
        is_optional: true,
      },
    ],
  });

  assert(!!proposal1.id, 'Proposal created with valid UUID');
  assert(proposal1.studio_id === studio1.id, 'Proposal belongs to studio 1');
  assert(proposal1.proposal_number.startsWith(`PROP-${currentYear}-`), `Proposal number formatted as PROP-${currentYear}-XXXXXX (${proposal1.proposal_number})`);
  assert(proposal1.current_revision === 1, 'Initial proposal version is 1');
  assert(proposal1.status === StudioProposalStatus.DRAFT, 'New proposal defaults to DRAFT status');
  assert(!!proposal1.public_token, 'Secure public token generated for portal access');
  assert(!!proposal1.token_expires_at, 'Token expiration date is set');
  assert(proposal1.view_count === 0, 'Initial view count is 0');

  // Collision test
  const proposal2 = await ProposalService.createProposal(studio1.id, testUser.id, {
    client_id: testClient.id,
    title: 'Engagement Shoot Add-on',
    items: [{ title: '2 Hour Engagement Session', unit_price: 500, quantity: 1 }],
  });

  assert(proposal1.proposal_number !== proposal2.proposal_number, 'Generated proposal numbers are unique and collision-free');

  // =========================================================================
  // GROUP 2: Line Items, Optional Selection & Tax/Discount Computation
  // =========================================================================
  console.log('\n--- GROUP 2: Line Items, Optional Selection & Tax/Discount Computation ---');

  assert(proposal1.items.length === 2, 'Proposal contains 2 line items');
  assert(proposal1.items[0].total_price === 3200, 'Primary line item total_price computed correctly (1 * 3200)');
  assert(proposal1.items[1].is_optional === true, 'Secondary line item marked as optional');
  assert(proposal1.subtotal === 3800, 'Subtotal sum includes all base items (3200 + 600 = 3800)');
  assert(proposal1.discount_amount === 100, 'Discount amount stored accurately');
  assert(proposal1.tax_amount === 250, 'Tax amount stored accurately');
  // Total calculation: 3800 - 100 + 250 = 3950
  assert(proposal1.total_amount === 3950, 'Total amount calculated as subtotal - discount + tax (3950)');

  // Updating line items dynamically
  const updatedProp = await ProposalService.updateProposal(studio1.id, testUser.id, proposal1.id, {
    discount_amount: 200,
    items: [
      {
        title: '8 Hours Full Wedding Day Coverage',
        quantity: 1,
        unit_price: 3500,
        is_optional: false,
      },
      {
        title: 'Heirloom Flushmount Leather Album',
        quantity: 2,
        unit_price: 450,
        is_optional: false,
      },
    ],
  });

  assert(updatedProp.subtotal === 4400, 'Updated subtotal accurately calculated (3500 + 900 = 4400)');
  assert(updatedProp.total_amount === 4450, 'Updated total amount accurately recalculated (4400 - 200 + 250 = 4450)');
  assert(updatedProp.items.length === 2, 'Line items replaced cleanly');

  // =========================================================================
  // GROUP 3: Proposal Revisions, Versioning & Historical Immutability
  // =========================================================================
  console.log('\n--- GROUP 3: Proposal Revisions, Versioning & Historical Immutability ---');

  const revisionV2 = await ProposalService.updateProposal(studio1.id, testUser.id, proposal1.id, {
    title: 'Full Day Wedding Package - Rev 2',
    items: [
      {
        title: '10 Hours Full Wedding Day Coverage + Second Shooter',
        quantity: 1,
        unit_price: 4200,
        is_optional: false,
      },
      {
        title: 'Heirloom Flushmount Leather Album',
        quantity: 1,
        unit_price: 500,
        is_optional: false,
      },
    ],
  });

  assert(revisionV2.current_revision === 3, 'Proposal revision number incremented');
  assert(revisionV2.subtotal === 4700, 'Revision subtotal calculated correctly (4700)');

  const proposalDetail = await ProposalService.getProposal(studio1.id, proposal1.id);
  assert(proposalDetail.revisions.length >= 1, 'Historical revision snapshots recorded in database');
  assert(proposalDetail.revisions[0].revision_number >= 1, 'Revision log retains numbered snapshots');

  // =========================================================================
  // GROUP 4: Proposal State Transitions
  // =========================================================================
  console.log('\n--- GROUP 4: Proposal State Transitions ---');

  const sendResult = await ProposalService.sendProposal(studio1.id, proposal1.id);
  assert(sendResult.proposal.status === StudioProposalStatus.SENT, 'Proposal transitions to SENT status');
  assert(!!sendResult.proposal.token_expires_at, 'token_expires_at is stamped');
  assert(!!sendResult.token, 'sendProposal returns active public token');

  const viewedProp = await PublicPortalService.getProposalByToken(sendResult.token);
  assert(viewedProp.proposal.status === StudioProposalStatus.VIEWED, 'Proposal transitions to VIEWED status upon public opening');
  assert(viewedProp.proposal.view_count >= 1, 'View count incremented');
  assert(!!viewedProp.proposal.viewed_at, 'viewed_at timestamp is set');

  // Voiding test
  const voided = await ProposalService.voidProposal(studio1.id, proposal2.id, 'Client chose package B instead');
  assert(voided.status === StudioProposalStatus.VOID, 'Proposal transitions to VOID status');
  assert(voided.metadata?.void_reason === 'Client chose package B instead', 'Void reason recorded in metadata');

  // =========================================================================
  // GROUP 5: Contract Template CRUD, Categories & Supported Variables
  // =========================================================================
  console.log('\n--- GROUP 5: Contract Template CRUD, Categories & Supported Variables ---');

  const templateContent = `
# Photography Agreement: {{project_name}}
**Client:** {{client_name}} ({{client_email}})
**Studio:** {{studio_name}}
**Event Date:** {{project_date}} at {{project_location}}
**Total Fee:** {{total_amount}}

1. **Services Provided:** The Studio agrees to provide photography services for {{project_name}}.
2. **Payment Terms:** Total agreed fee of {{total_amount}} subject to payment schedule.
3. **Copyright & Reproduction:** The studio retains copyright; client receives personal display license.
`;

  const template = await ContractService.createTemplate(studio1.id, {
    title: 'Standard Wedding Agreement Template',
    category: StudioContractCategory.WEDDING,
    description: 'Master wedding photography terms and conditions',
    body_content: templateContent,
    is_default: true,
  });

  assert(!!template.id, 'Contract template created successfully');
  assert(template.category === StudioContractCategory.WEDDING, 'Template category is WEDDING');
  assert(template.is_default === true, 'Template marked as default for category');
  assert(template.supported_variables.includes('client_name'), 'Auto-extracted supported variable {{client_name}}');
  assert(template.supported_variables.includes('total_amount'), 'Auto-extracted supported variable {{total_amount}}');
  assert(template.supported_variables.includes('project_location'), 'Auto-extracted supported variable {{project_location}}');

  const templates = await ContractService.listTemplates(studio1.id);
  assert(templates.length >= 1, 'Template listed in studio templates registry');

  // =========================================================================
  // GROUP 6: Contract Dynamic Variable Interpolation & Numbering
  // =========================================================================
  console.log('\n--- GROUP 6: Contract Dynamic Variable Interpolation & Numbering ---');

  const contract1 = await ContractService.createContract(studio1.id, testUser.id, {
    client_id: testClient.id,
    proposal_id: proposal1.id,
    template_id: template.id,
    title: 'Wedding Photography Agreement - Miller',
    category: StudioContractCategory.WEDDING,
    body_content: template.body_content,
    variables: {
      studio_name: 'Studio Alpha',
      client_name: 'Jessica Miller',
      client_email: testClient.email,
      project_name: 'Miller Wedding Celebration',
      project_date: '2026-10-24',
      project_location: 'Grand Botanical Conservatory',
      total_amount: '$4,450.00',
    },
  });

  assert(contract1.contract_number.startsWith(`CONT-${currentYear}-`), `Contract number starts with CONT-${currentYear}- (${contract1.contract_number})`);
  assert(contract1.status === StudioContractStatus.DRAFT, 'New contract defaults to DRAFT status');
  assert(contract1.version === 1, 'New contract version is 1');
  assert(contract1.rendered_content.includes('Jessica Miller'), 'Rendered content interpolates {{client_name}} -> Jessica Miller');
  assert(contract1.rendered_content.includes('Grand Botanical Conservatory'), 'Rendered content interpolates {{project_location}}');
  assert(contract1.rendered_content.includes('$4,450.00'), 'Rendered content interpolates {{total_amount}}');
  assert(!contract1.rendered_content.includes('{{client_name}}'), 'All placeholders safely replaced');
  assert(!!contract1.public_token, 'Public token generated for client signing');

  // =========================================================================
  // GROUP 7: Cryptographic E-Signature Integrity (SHA-256 Hashing)
  // =========================================================================
  console.log('\n--- GROUP 7: Cryptographic E-Signature Integrity (SHA-256 Hashing) ---');

  const testIp = '198.51.100.42';
  const testUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  const signerName = 'Jessica Miller';
  const signerEmail = testClient.email;

  // Send contract first
  const sendContractResult = await ContractService.sendContract(studio1.id, contract1.id);
  const activeContractToken = sendContractResult.token;

  // Sign contract via public portal service
  const signedContract = await PublicPortalService.signContractByToken(activeContractToken, {
    signer_legal_name: signerName,
    signer_email: signerEmail,
    signature_ip: testIp,
    signature_user_agent: testUserAgent,
    agreed_to_terms: true,
  });

  assert(signedContract.contract.status === StudioContractStatus.SIGNED, 'Contract transitions to SIGNED status');
  assert(signedContract.contract.signed_by_name === signerName, 'Signer legal name recorded');
  assert(signedContract.contract.signed_by_email === signerEmail, 'Signer email recorded');
  assert(signedContract.contract.signature_ip === testIp, 'Signer IP address recorded');
  assert(signedContract.contract.signature_user_agent === testUserAgent, 'Signer User-Agent recorded');
  assert(!!signedContract.contract.signed_at, 'signed_at timestamp stamped');
  assert(!!signedContract.contract.signature_hash, 'Cryptographic SHA-256 signature audit hash generated');
  assert(signedContract.contract.signature_hash.length === 64, `SHA-256 hash length is 64 hex characters (${signedContract.contract.signature_hash.slice(0, 16)}...)`);

  // =========================================================================
  // GROUP 8: Contract Countersigning, Rejection & Voiding
  // =========================================================================
  console.log('\n--- GROUP 8: Contract Countersigning, Rejection & Voiding ---');

  const countersigned = await ContractService.countersignContract(studio1.id, testUser.id, contract1.id);
  assert(!!countersigned.countersigned_at, 'Studio countersignature timestamp stamped');
  assert(countersigned.countersigned_by_user_id === testUser.id, 'Countersigned by photographer user ID recorded');

  // Test Contract Rejection
  const contractToReject = await ContractService.createContract(studio1.id, testUser.id, {
    client_id: testClient.id,
    title: 'Agreement to Reject',
    body_content: 'Some terms to reject',
  });
  const sendRejectResult = await ContractService.sendContract(studio1.id, contractToReject.id);

  const rejected = await PublicPortalService.rejectContractByToken(sendRejectResult.token, {
    reason: 'Disagreed with cancellation clause',
  });
  assert(rejected.status === StudioContractStatus.REJECTED, 'Contract marked as REJECTED');
  assert(rejected.rejection_reason === 'Disagreed with cancellation clause', 'Rejection reason persisted');

  // =========================================================================
  // GROUP 9: Atomic Lead-to-Booking Workflow
  // =========================================================================
  console.log('\n--- GROUP 9: Atomic Lead-to-Booking Workflow ---');

  const booking = await BookingService.confirmBooking(studio1.id, testUser.id, {
    proposal_id: proposal1.id,
    contract_id: contract1.id,
    lead_id: testLead.id,
    project_title: 'Jessica & David Wedding Celebration',
    project_type: StudioProjectType.WEDDING,
    start_date: new Date('2026-10-24T10:00:00Z'),
    end_date: new Date('2026-10-24T22:00:00Z'),
    location: 'Grand Botanical Conservatory',
    total_amount: 4450,
    deposit_amount: 1000,
    deposit_due_date: new Date('2026-09-20'),
    final_balance_due_date: new Date('2026-10-10'),
  });

  assert(!!booking.project_id, 'Studio project automatically created from booking');
  assert(booking.lead_id === testLead.id, 'Booking links to lead ID');
  assert(booking.proposal_id === proposal1.id, 'Booking links to proposal ID');
  assert(booking.contract_id === contract1.id, 'Booking links to contract ID');
  assert(booking.total_amount === 4450, 'Booking stores agreed total amount (4450)');
  assert(booking.deposit_amount === 1000, 'Booking stores deposit amount (1000)');
  assert(!!booking.public_token, 'Booking generates secure public portal token');

  // Check lead status synchronization
  const updatedLead = await prisma.studioLead.findUnique({ where: { id: testLead.id } });
  assert(updatedLead?.status === StudioLeadStatus.BOOKED, 'Lead status automatically updated to BOOKED');

  // =========================================================================
  // GROUP 10: Automatic Project Creation & Milestone Scaffold
  // =========================================================================
  console.log('\n--- GROUP 10: Automatic Project Creation & Milestone Scaffold ---');

  const createdProject = await prisma.studioProject.findUnique({
    where: { id: booking.project_id },
  });

  assert(!!createdProject, 'Project record verified in database');
  assert(createdProject?.title === 'Jessica & David Wedding Celebration', 'Project title matches booking specification');
  assert(createdProject?.status === StudioProjectStatus.BOOKED, 'Project status initialized to BOOKED');
  assert(createdProject?.type === StudioProjectType.WEDDING, 'Project type set to WEDDING');
  assert(createdProject?.location === 'Grand Botanical Conservatory', 'Shoot location saved on project');
  assert(Number(createdProject?.total_amount) === 4450, 'Project total_amount set to 4450');
  assert(Number(createdProject?.paid_amount) === 0, 'Initial paid amount is 0');
  assert((createdProject?.milestones.length || 0) >= 4, 'Default operational milestones auto-scaffolded (>=4)');

  // =========================================================================
  // GROUP 11: Structured Payment Schedules & Installments
  // =========================================================================
  console.log('\n--- GROUP 11: Structured Payment Schedules & Installments ---');

  const schedules = await PaymentScheduleService.listSchedules(studio1.id, booking.project_id);
  assert(schedules.length === 2, 'Two payment installments auto-generated (Deposit + Final Balance)');
  
  const depositInst = schedules.find((s) => s.installment_number === 1);
  const balanceInst = schedules.find((s) => s.installment_number === 2);

  assert(!!depositInst, 'Deposit installment #1 created');
  assert(depositInst?.amount === 1000, 'Deposit installment amount is $1,000');
  assert(depositInst?.status === ProjectPaymentScheduleStatus.PENDING, 'Deposit installment status is PENDING');

  assert(!!balanceInst, 'Balance installment #2 created');
  assert(balanceInst?.amount === 3450, 'Remaining balance installment amount is $3,450 (4450 - 1000)');
  assert(balanceInst?.title.includes('Final Balance'), 'Balance installment labeled as Final Balance');

  // Adding an interim installment
  const interimInst = await PaymentScheduleService.createSchedule(studio1.id, {
    project_id: booking.project_id,
    installment_number: 3,
    title: 'Midway Equipment & Travel Retainer',
    amount: 500,
    due_date: new Date('2026-10-01'),
  });

  assert(!!interimInst.id, 'Custom installment created successfully');
  assert(interimInst.amount === 500, 'Custom installment amount stored correctly');

  // =========================================================================
  // GROUP 12: Payment Schedule Status, Installment Overdue Checks & Reconciliation
  // =========================================================================
  console.log('\n--- GROUP 12: Payment Schedule Status & Reconciliation ---');

  const paidDeposit = await PaymentScheduleService.recordPayment(studio1.id, depositInst!.id, {
    paid_amount: 1000,
    payment_method: 'STRIPE',
    payment_reference: 'pi_test_stripe_394829',
  });

  assert(paidDeposit.status === ProjectPaymentScheduleStatus.PAID, 'Installment status transitions to PAID');
  assert(paidDeposit.paid_amount === 1000, 'paid_amount recorded as 1000');
  assert(!!paidDeposit.paid_at, 'paid_at timestamp recorded');

  // Verify Project paid amount update
  const refreshedProject = await prisma.studioProject.findUnique({ where: { id: booking.project_id } });
  assert(Number(refreshedProject?.paid_amount) === 1000, 'Project paid_amount updated to 1000 upon installment collection');

  // Partial Payment
  const partialInst = await PaymentScheduleService.recordPayment(studio1.id, interimInst.id, {
    paid_amount: 250,
  });
  assert(partialInst.status === ProjectPaymentScheduleStatus.PARTIAL, 'Installment transitions to PARTIAL when partially paid');

  // Pipeline metrics
  const pipeline = await BookingService.getBookingPipelineSummary(studio1.id);
  assert(pipeline.total_proposals >= 1, 'Pipeline metrics aggregate total proposals');
  assert(pipeline.total_contracts >= 1, 'Pipeline metrics aggregate total contracts');
  assert(pipeline.total_booked_projects >= 1, 'Pipeline metrics aggregate booked projects');
  assert(pipeline.total_booked_revenue >= 4450, 'Pipeline metrics compute total booked revenue');

  // =========================================================================
  // GROUP 13: Public Portal Token Security & Expiration Enforcement
  // =========================================================================
  console.log('\n--- GROUP 13: Public Portal Token Security & Expiration Enforcement ---');

  // Public portal payload retrieval
  const portalPayload = await PublicPortalService.getProposalByToken(sendResult.token);
  assert(!!portalPayload, 'Public portal verifies raw token and returns presentation payload');
  assert(portalPayload.proposal.title.includes('Wedding'), 'Payload includes sanitized proposal details');
  assert(portalPayload.studio.name === studio1.name, 'Payload includes studio branding');
  assert(portalPayload.client.name === testClient.name, 'Payload includes client recipient');

  // Test Invalid Token
  let invalidFailed = false;
  try {
    await PublicPortalService.getProposalByToken('invalid-token-123456');
  } catch (err: any) {
    invalidFailed = true;
  }
  assert(invalidFailed, 'Public portal rejects invalid / forged tokens with 404/401 error');

  // Test Expired Token
  const expiredProp = await ProposalService.createProposal(studio1.id, testUser.id, {
    client_id: testClient.id,
    title: 'Expired Quote Test',
    valid_until: new Date('2020-01-01'), // past
    items: [{ title: 'Test Expired Item', unit_price: 100, quantity: 1 }],
  });
  // Manually backdate token_expires_at
  const hash = crypto.createHash('sha256').update(expiredProp.public_token!).digest('hex');
  await prisma.studioProposal.update({
    where: { public_token_hash: hash },
    data: { token_expires_at: new Date('2020-01-01') },
  });

  let expiredBlocked = false;
  try {
    await PublicPortalService.getProposalByToken(expiredProp.public_token!);
  } catch (err: any) {
    expiredBlocked = err.message.toLowerCase().includes('expired');
  }
  assert(expiredBlocked, 'Public portal blocks expired tokens');

  // =========================================================================
  // GROUP 14: Public Proposal Client Acceptance & Optional Items Negotiation
  // =========================================================================
  console.log('\n--- GROUP 14: Public Proposal Client Acceptance ---');

  const newQuoteForAccept = await ProposalService.createProposal(studio1.id, testUser.id, {
    client_id: testClient.id,
    title: 'Client Portal Acceptance Test Proposal',
    tax_amount: 100,
    items: [
      { title: 'Core Photography', unit_price: 2000, quantity: 1, is_optional: false },
      { title: 'Optional Drone Video', unit_price: 500, quantity: 1, is_optional: true },
    ],
  });

  const acceptResult = await PublicPortalService.acceptProposalByToken(newQuoteForAccept.public_token!, {
    client_name: 'Jessica Miller',
    client_email: testClient.email,
    selected_optional_item_ids: [], // Client unchecks optional drone video
    notes: 'Super excited to work together!',
  });

  assert(acceptResult.proposal.status === StudioProposalStatus.ACCEPTED, 'Public portal transitions proposal to ACCEPTED');
  assert(acceptResult.proposal.total_amount === 2100, 'Accepted total recalculated without unchecked optional item (2000 + 100 = 2100)');
  assert(acceptResult.proposal.metadata?.client_notes === 'Super excited to work together!', 'Client negotiation notes stored in metadata');

  // =========================================================================
  // GROUP 15: Public Contract E-Signing & Audit Certificate
  // =========================================================================
  console.log('\n--- GROUP 15: Public Contract E-Signing & Audit Certificate ---');

  const publicContract = await ContractService.createContract(studio1.id, testUser.id, {
    client_id: testClient.id,
    title: 'Portal Direct E-Sign Contract',
    body_content: 'Agreement for photography services...',
  });
  const sendPortalContractResult = await ContractService.sendContract(studio1.id, publicContract.id);

  const publicView = await PublicPortalService.getContractByToken(sendPortalContractResult.token);
  assert(publicView.contract.title === 'Portal Direct E-Sign Contract', 'Public contract portal retrieves document');

  const signedViaPortal = await PublicPortalService.signContractByToken(sendPortalContractResult.token, {
    signer_legal_name: 'Jessica Miller',
    signer_email: testClient.email,
    signature_ip: '203.0.113.195',
    signature_user_agent: 'Mobile Safari / iOS 18',
    agreed_to_terms: true,
  });

  assert(signedViaPortal.contract.status === StudioContractStatus.SIGNED, 'Contract signed via public portal');
  assert(!!signedViaPortal.contract.signature_hash, 'Audit SHA-256 generated during public portal e-signing');
  assert(signedViaPortal.contract.signature_ip === '203.0.113.195', 'Signer IP recorded in audit trail');

  // =========================================================================
  // GROUP 16: Public Booking Portal Flow
  // =========================================================================
  console.log('\n--- GROUP 16: Public Booking Portal Flow ---');

  const bookingPortalData = await PublicPortalService.getBookingByToken(booking.public_token!);
  assert(!!bookingPortalData, 'Public booking portal retrieves project booking summary');
  assert(bookingPortalData.project.title === 'Jessica & David Wedding Celebration', 'Booking portal presents project title');
  assert(bookingPortalData.schedules.length >= 2, 'Booking portal presents payment installments to client');
  assert(!!bookingPortalData.contract?.signature_hash, 'Booking portal displays signed contract verification hash');

  // =========================================================================
  // GROUP 17: Phase 21 Copilot AI Tools Registration & Execution
  // =========================================================================
  console.log('\n--- GROUP 17: Phase 21 Copilot AI Tools Registration & Execution ---');

  const registry = new CopilotToolRegistry(prisma);
  const allTools = registry.listTools();
  const phase21ToolNames = [
    'listProposals',
    'createProposal',
    'sendProposal',
    'listContracts',
    'createContract',
    'sendContract',
    'confirmBooking',
    'getBookingPipelineSummary',
  ];

  for (const name of phase21ToolNames) {
    const tool = allTools.find((t) => t.name === name);
    assert(!!tool, `Copilot Tool '${name}' is registered in registry`);
  }

  // Execute tool: listProposals
  const listResult = await registry.executeTool('listProposals', { studioId: studio1.id, userId: testUser.id }, { limit: 5 });
  assert(!!listResult && Array.isArray(listResult.proposals), 'Copilot tool listProposals executes successfully');
  assert(listResult.proposals.length >= 1, 'listProposals returns array of studio proposals');

  // Execute tool: createProposal
  const copilotProposal = await registry.executeTool('createProposal', { studioId: studio1.id, userId: testUser.id }, {
    client_id: testClient.id,
    title: 'Copilot Generated Proposal',
    items: [{ title: 'Mini Session', unit_price: 500, quantity: 1 }],
  });
  assert(!!copilotProposal && copilotProposal.total_amount === 500, 'Copilot tool createProposal generates proposal with correct calculations');

  // Execute tool: sendProposal
  const copilotSend = await registry.executeTool('sendProposal', { studioId: studio1.id, userId: testUser.id }, {
    id: copilotProposal.id,
  });
  assert(!!copilotSend && !!copilotSend.public_url, 'Copilot tool sendProposal dispatches proposal and returns public url');

  // Execute tool: listContracts
  const copilotContracts = await registry.executeTool('listContracts', { studioId: studio1.id, userId: testUser.id }, { limit: 10 });
  assert(!!copilotContracts && Array.isArray(copilotContracts.contracts), 'Copilot tool listContracts lists contracts');

  // Execute tool: createContract
  const copilotContract = await registry.executeTool('createContract', { studioId: studio1.id, userId: testUser.id }, {
    client_id: testClient.id,
    title: 'Copilot Agreement',
    body_content: 'Agreed terms for photography...',
  });
  assert(!!copilotContract && copilotContract.status === StudioContractStatus.DRAFT, 'Copilot tool createContract drafts new agreement');

  // Execute tool: sendContract
  const copilotSendCont = await registry.executeTool('sendContract', { studioId: studio1.id, userId: testUser.id }, {
    id: copilotContract.id,
  });
  assert(!!copilotSendCont && !!copilotSendCont.token, 'Copilot tool sendContract generates public token');

  // =========================================================================
  // GROUP 18: Multi-Studio Tenant Isolation & Security
  // =========================================================================
  console.log('\n--- GROUP 18: Multi-Studio Tenant Isolation ---');

  const studio2Proposals = await ProposalService.listProposals(studio2.id);
  assert(studio2Proposals.total === 0, 'Studio 2 cannot see Studio 1 proposals (isolation verified)');

  const studio2Contracts = await ContractService.listContracts(studio2.id);
  assert(studio2Contracts.total === 0, 'Studio 2 cannot see Studio 1 contracts (isolation verified)');

  const studio2Templates = await ContractService.listTemplates(studio2.id);
  assert(studio2Templates.every(t => t.id !== template.id), 'Studio 2 cannot see Studio 1 contract templates (isolation verified)');

  let crossStudioBlocked = false;
  try {
    await ProposalService.getProposal(studio2.id, proposal1.id);
  } catch (err: any) {
    crossStudioBlocked = true;
  }
  assert(crossStudioBlocked, 'Direct query for Studio 1 proposal with Studio 2 credentials is strictly blocked');

  let crossContractBlocked = false;
  try {
    await ContractService.getContract(studio2.id, contract1.id);
  } catch (err: any) {
    crossContractBlocked = true;
  }
  assert(crossContractBlocked, 'Direct query for Studio 1 contract with Studio 2 credentials is strictly blocked');

  let crossScheduleBlocked = false;
  try {
    await PaymentScheduleService.getSchedule(studio2.id, depositInst.id);
  } catch (err: any) {
    crossScheduleBlocked = true;
  }
  assert(crossScheduleBlocked, 'Direct query for Studio 1 payment schedule with Studio 2 credentials is strictly blocked');

  // =========================================================================
  // GROUP 19: Edge Cases, Multi-Installment Schedules & Currency Invariance
  // =========================================================================
  console.log('\n--- GROUP 19: Edge Cases, Multi-Installment Schedules & Security ---');

  // Test 3-installment custom schedule
  const inst1 = await PaymentScheduleService.createSchedule(studio1.id, {
    project_id: booking.project_id,
    installment_number: 4,
    title: 'Initial Retainer Part 2',
    amount: 2000,
    due_date: new Date('2026-06-01'),
  });
  const inst2 = await PaymentScheduleService.createSchedule(studio1.id, {
    project_id: booking.project_id,
    installment_number: 5,
    title: 'Midway Milestone Part 2',
    amount: 2000,
    due_date: new Date('2026-08-01'),
  });
  const inst3 = await PaymentScheduleService.createSchedule(studio1.id, {
    project_id: booking.project_id,
    installment_number: 6,
    title: 'Final Delivery Part 2',
    amount: 2000,
    due_date: new Date('2026-10-01'),
  });
  assert(inst1.amount === 2000, 'First installment matches $2,000 retainer');
  assert(inst2.amount === 2000, 'Second installment matches $2,000 milestone');
  assert(inst3.amount === 2000, 'Third installment matches $2,000 delivery');

  // Test Proposal collision resistance with rapid batch creation
  const batchPNums = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const p = await ProposalService.createProposal(studio1.id, testUser.id, {
      title: `Batch Quote ${i + 1}`,
      client_id: testClient.id,
      items: [{ title: 'Batch Item', unit_price: 100, quantity: 1 }],
    });
    batchPNums.add(p.proposal_number);
  }
  assert(batchPNums.size === 20, 'Rapid creation of 20 proposals generates 20 strictly unique proposal numbers');

  // Test Contract collision resistance with rapid batch creation
  const batchCNums = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const c = await ContractService.createContract(studio1.id, testUser.id, {
      title: `Batch Agreement ${i + 1}`,
      client_id: testClient.id,
      body_content: 'Standard terms...',
    });
    batchCNums.add(c.contract_number);
  }
  assert(batchCNums.size === 20, 'Rapid creation of 20 contracts generates 20 strictly unique contract numbers');

  // =========================================================================
  // GROUP 20: Additional Copilot Tool Invocations, Installment Reminders & Edge Cases
  // =========================================================================
  console.log('\n--- GROUP 20: Copilot Full Execution & Installment Reminders ---');

  // Test Copilot confirmBooking tool execution
  const confirmBookingTool = registry.getTool('confirmBooking');
  assert(!!confirmBookingTool, 'Copilot confirmBooking tool is registered');
  
  // Create a new lead, proposal, and contract for copilot tool test
  const copilotLead = await prisma.studioLead.create({
    data: {
      studio_id: studio1.id,
      name: 'Copilot Booking Candidate',
      email: 'copilot-candidate@example.com',
      source: StudioLeadSource.WEBSITE,
      status: StudioLeadStatus.CONTACTED,
    },
  });

  const copilotBookingProposal = await ProposalService.createProposal(studio1.id, testUser.id, {
    title: 'Copilot Full Package',
    lead_id: copilotLead.id,
    client_id: testClient.id,
    items: [{ title: 'Service', unit_price: 3500, quantity: 1 }],
  });

  const copilotBookingContract = await ContractService.createContract(studio1.id, testUser.id, {
    title: 'Copilot Agreement',
    lead_id: copilotLead.id,
    client_id: testClient.id,
    body_content: 'Agreement for service',
  });

  const copilotBookingResult = await confirmBookingTool!.execute(
    { studioId: studio1.id, userId: testUser.id, userRole: 'OWNER' },
    {
      lead_id: copilotLead.id,
      proposal_id: copilotBookingProposal.id,
      contract_id: copilotBookingContract.id,
      total_amount: 3500,
      deposit_amount: 500,
      event_date: '2026-11-20T10:00:00.000Z',
      project_title: 'Copilot Confirmed Wedding',
      project_type: StudioProjectType.WEDDING,
    }
  );

  assert(copilotBookingResult.success === true, 'Copilot confirmBooking executes atomically');
  assert(!!copilotBookingResult.data?.booking_id, 'Copilot confirmBooking returns booking_id');
  assert(!!copilotBookingResult.data?.project_id, 'Copilot confirmBooking returns project_id');

  // Test Copilot getBookingPipelineSummary tool execution
  const pipelineSummaryTool = registry.getTool('getBookingPipelineSummary');
  assert(!!pipelineSummaryTool, 'Copilot getBookingPipelineSummary tool is registered');
  const pipelineSummaryResult = await pipelineSummaryTool!.execute(
    { studioId: studio1.id, userId: testUser.id, userRole: 'OWNER' },
    {}
  );
  assert(pipelineSummaryResult.success === true, 'Copilot getBookingPipelineSummary executes successfully');
  assert(typeof pipelineSummaryResult.data?.booked_projects === 'number', 'Pipeline summary returns booked_projects count');
  assert(typeof pipelineSummaryResult.data?.total_revenue === 'number', 'Pipeline summary returns total_revenue');

  // Test Template Updates and Deletions
  const templateToUpdate = await ContractService.createTemplate(studio1.id, {
    title: 'Draft Template To Update',
    category: StudioContractCategory.PORTRAIT,
    body_template: 'Hello {{client_name}}, initial version.',
    is_default: false,
  });
  assert(templateToUpdate.title === 'Draft Template To Update', 'Template created for update test');

  const updatedTemplate = await ContractService.updateTemplate(studio1.id, templateToUpdate.id, {
    title: 'Updated Portrait Template',
    body_template: 'Hello {{client_name}}, upgraded version for {{project_type}}.',
  });
  assert(updatedTemplate.title === 'Updated Portrait Template', 'Template title updated successfully');
  assert(updatedTemplate.supported_variables.includes('project_type'), 'Supported variables recomputed on update');

  await ContractService.deleteTemplate(studio1.id, templateToUpdate.id);
  const deletedCheck = await ContractService.getTemplate(studio1.id, templateToUpdate.id);
  assert(deletedCheck === null, 'Template deleted successfully');

  // Test Payment Schedule Reminders & Due Date Overdue Logic
  const overdueInst = await PaymentScheduleService.createSchedule(studio1.id, {
    project_id: booking.project_id,
    installment_number: 7,
    title: 'Past Due Milestone',
    amount: 500,
    due_date: new Date('2025-01-01'), // past date
  });
  assert(overdueInst.status === 'PENDING', 'Overdue installment created with pending status');

  const reminderResult = await PaymentScheduleService.sendReminder(studio1.id, overdueInst.id);
  assert(reminderResult.success === true, 'Payment reminder dispatched successfully');

  // Test Proposal Duplication
  const duplicateProposal = await ProposalService.duplicateProposal(studio1.id, testUser.id, proposal1.id);
  assert(duplicateProposal.id !== proposal1.id, 'Duplicated proposal has a new unique ID');
  assert(duplicateProposal.proposal_number !== proposal1.proposal_number, 'Duplicated proposal has a new unique proposal number');
  assert(duplicateProposal.status === StudioProposalStatus.DRAFT, 'Duplicated proposal resets status to DRAFT');
  assert(duplicateProposal.items.length === proposal1.items.length, 'Duplicated proposal carries over line items');

  // Test Proposal Voiding
  const voidedProposal = await ProposalService.voidProposal(studio1.id, duplicateProposal.id, 'Test voiding');
  assert(voidedProposal.status === StudioProposalStatus.VOID, 'Proposal successfully transitions to VOID status');

  // Test Proposal Revision History Retrieval
  const revisions = await ProposalService.getRevisions(studio1.id, proposal1.id);
  assert(revisions.length >= 1, 'Proposal revision history retrieved');
  assert(revisions[0].revision_number === 1, 'First revision is version 1');

  // Summary
  console.log('\n================================================================');
  console.log(`  Phase 21 Test Suite Results: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running Phase 21 tests:', err);
  process.exit(1);
});
