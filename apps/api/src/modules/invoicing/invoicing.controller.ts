import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioInvoicingService } from './invoicing.service';
import {
  ICreateInvoiceDTO,
  IUpdateInvoiceDTO,
  IRecordInvoicePaymentDTO,
  ICreatePaymentRequestDTO,
  ICreateInstallmentsDTO,
  ICreateCreditNoteDTO,
  ICreateDebitNoteDTO,
  ICreateCollectionTaskDTO,
  ICreatePaymentPromiseDTO,
  IUpdatePaymentPromiseDTO,
  StudioInvoiceStatus,
  StudioInvoicePaymentMethod,
} from '@pixmatch/types';

export class StudioInvoicingController {
  private service: StudioInvoicingService;

  constructor(service?: StudioInvoicingService) {
    this.service = service || StudioInvoicingService.getInstance();
  }

  private getStudioId(req: FastifyRequest): string {
    const studioId =
      (req.headers['x-studio-id'] as string) ||
      (req.query as any)?.studio_id ||
      (req.params as any)?.studio_id ||
      (req as any).user?.studio_id ||
      'default-studio';
    return studioId;
  }

  private getMemberId(req: FastifyRequest): string | undefined {
    return (req as any).user?.id || (req.headers['x-user-id'] as string) || undefined;
  }

  // -------------------------------------------------------------
  // INVOICE HANDLERS
  // -------------------------------------------------------------

  async createInvoice(req: FastifyRequest<{ Body: ICreateInvoiceDTO }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createInvoice(studioId, req.body, memberId);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async listInvoices(
    req: FastifyRequest<{
      Querystring: {
        status?: StudioInvoiceStatus;
        client_id?: string;
        project_id?: string;
        booking_id?: string;
        contract_id?: string;
        order_id?: string;
        search?: string;
        overdue_only?: boolean;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.listInvoices(studioId, {
        status: req.query.status,
        clientId: req.query.client_id,
        projectId: req.query.project_id,
        bookingId: req.query.booking_id,
        contractId: req.query.contract_id,
        orderId: req.query.order_id,
        search: req.query.search,
        overdueOnly: req.query.overdue_only,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async getInvoiceById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.getInvoiceById(studioId, req.params.id);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  }

  async updateInvoice(
    req: FastifyRequest<{ Params: { id: string }; Body: IUpdateInvoiceDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.updateInvoice(studioId, req.params.id, req.body, memberId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async issueInvoice(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.issueInvoice(studioId, req.params.id, memberId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async sendInvoice(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.sendInvoice(studioId, req.params.id, memberId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async voidInvoice(
    req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.voidInvoice(
        studioId,
        req.params.id,
        req.body?.reason || 'Voided by studio staff',
        memberId
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createInvoiceFromContract(
    req: FastifyRequest<{ Body: { contract_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createInvoiceFromContract(
        studioId,
        req.body.contract_id,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createInvoiceFromBooking(
    req: FastifyRequest<{ Body: { booking_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createInvoiceFromBooking(
        studioId,
        req.body.booking_id,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createInvoiceFromOrder(
    req: FastifyRequest<{ Body: { order_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createInvoiceFromOrder(
        studioId,
        req.body.order_id,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // PAYMENTS & REQUESTS
  // -------------------------------------------------------------

  async recordPayment(
    req: FastifyRequest<{ Params: { id: string }; Body: IRecordInvoicePaymentDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.recordPayment(studioId, req.params.id, req.body, memberId);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createPaymentRequest(
    req: FastifyRequest<{ Params: { id: string }; Body: ICreatePaymentRequestDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.createPaymentRequest(studioId, req.params.id, req.body);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async refundPayment(
    req: FastifyRequest<{ Params: { id: string }; Body: { amount_minor?: number; reason?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.refundPayment(
        studioId,
        req.params.id,
        req.body?.amount_minor,
        req.body?.reason,
        memberId
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // INSTALLMENTS, CREDIT/DEBIT NOTES, COLLECTIONS
  // -------------------------------------------------------------

  async createInstallments(
    req: FastifyRequest<{ Params: { id: string }; Body: ICreateInstallmentsDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createInstallments(
        studioId,
        req.params.id,
        req.body,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createCreditNote(
    req: FastifyRequest<{ Body: ICreateCreditNoteDTO & { invoice_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createCreditNote(
        studioId,
        req.body.invoice_id,
        req.body,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createDebitNote(
    req: FastifyRequest<{ Body: ICreateDebitNoteDTO & { invoice_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createDebitNote(
        studioId,
        req.body.invoice_id,
        req.body,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createCollectionTask(
    req: FastifyRequest<{ Body: ICreateCollectionTaskDTO & { invoice_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createCollectionTask(
        studioId,
        req.body.invoice_id,
        req.body,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async updateCollectionTask(
    req: FastifyRequest<{ Params: { id: string }; Body: Partial<ICreateCollectionTaskDTO> }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.updateCollectionTask(
        studioId,
        req.params.id,
        req.body,
        memberId
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async createPaymentPromise(
    req: FastifyRequest<{ Body: ICreatePaymentPromiseDTO & { invoice_id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.createPaymentPromise(
        studioId,
        req.body.invoice_id,
        req.body,
        memberId
      );
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async updatePaymentPromise(
    req: FastifyRequest<{ Params: { id: string }; Body: IUpdatePaymentPromiseDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.updatePaymentPromise(
        studioId,
        req.params.id,
        req.body,
        memberId
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // REPORTS, SETTINGS & PDF
  // -------------------------------------------------------------

  async getInvoiceOverview(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.getInvoiceOverview(studioId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async getAgingReport(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.getAgingReport(studioId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async exportInvoicesCsv(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const csv = await this.service.exportInvoicesCsv(studioId);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="invoices-${studioId}.csv"`);
      return reply.send(csv);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async getInvoicePdf(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.generateInvoicePdf(studioId, req.params.id);
      reply.header('Content-Type', 'text/html');
      return reply.send(result.pdfHtml);
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  }

  async getSettings(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.getOrCreateSettings(studioId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async updateSettings(req: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const memberId = this.getMemberId(req);
      const result = await this.service.updateSettings(studioId, req.body as any, memberId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async evaluateOverdue(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = this.getStudioId(req);
      const result = await this.service.evaluateOverdueInvoices(studioId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // PUBLIC PORTAL & WEBHOOKS
  // -------------------------------------------------------------

  async getPublicInvoice(req: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    try {
      const result = await this.service.getPublicInvoiceByToken(req.params.token);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  }

  async payPublicInvoice(
    req: FastifyRequest<{ Params: { token: string }; Body: { payment_method?: StudioInvoicePaymentMethod } }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.service.payPublicInvoice(
        req.params.token,
        req.body?.payment_method || 'ONLINE'
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async handleWebhook(
    req: FastifyRequest<{ Params: { provider: string } }>,
    reply: FastifyReply
  ) {
    try {
      const provider = req.params.provider;
      const result = await this.service.processWebhook(
        provider,
        req.body,
        req.headers as any
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  }
}
