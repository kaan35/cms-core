import type { IdParam, SearchPaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ExportQuery, FormIdParam } from "./domain/form.rules.js";
import type { FormsService } from "./formsService.js";

export class FormsController {
  private service: FormsService;

  constructor(service: FormsService) {
    this.service = service;
  }

  async listForms(
    request: FastifyRequest<{ Querystring: SearchPaginationQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const paginated = await this.service.listForms(request.query);
    return reply.status(200).send({
      forms: paginated.data,
      data: paginated.data,
      meta: paginated.meta,
    });
  }

  async getForm(request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply): Promise<void> {
    const { id } = request.params;
    const form = await this.service.getForm(id);
    return reply.status(200).send({ form });
  }

  async createForm(request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply): Promise<void> {
    const form = await this.service.createForm(request.body);
    return reply.status(201).send({ form });
  }

  async updateForm(
    request: FastifyRequest<{ Params: IdParam; Body: unknown }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const form = await this.service.updateForm(id, request.body);
    return reply.status(200).send({ form });
  }

  async deleteForm(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    await this.service.deleteForm(id);
    return reply.status(200).send({ message: "Form deleted successfully" });
  }

  async getCaptcha(
    request: FastifyRequest<{ Params: FormIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { formId } = request.params;
    const captcha = await this.service.generateCaptcha(formId);
    return reply.status(200).send(captcha);
  }

  async submit(
    request: FastifyRequest<{ Params: FormIdParam; Body: unknown }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { formId } = request.params;
    const ip = request.ip;
    const userAgent = request.headers["user-agent"];

    const result = await this.service.submitForm(formId, request.body, { ip, userAgent });
    return reply.status(201).send(result);
  }

  async listSubmissions(
    request: FastifyRequest<{ Params: FormIdParam; Querystring: SearchPaginationQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { formId } = request.params;
    const result = await this.service.listSubmissions(formId, request.query);
    return reply.status(200).send(result);
  }

  async exportSubmissions(
    request: FastifyRequest<{ Params: FormIdParam; Querystring: ExportQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { formId } = request.params;
    const { format } = request.query;
    const result = await this.service.exportSubmissions(formId, format);

    return reply
      .header("Content-Type", result.contentType)
      .header("Content-Disposition", `attachment; filename="${result.filename}"`)
      .status(200)
      .send(result.data);
  }
}
