import type { FastifyReply, FastifyRequest } from "fastify";
import type { FormsService } from "./formsService.js";

export class FormsController {
  private service: FormsService;

  constructor(service: FormsService) {
    this.service = service;
  }

  async listForms(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const forms = await this.service.listForms();
    return reply.status(200).send({ forms });
  }

  async getForm(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const form = await this.service.getForm(id);
    return reply.status(200).send({ form });
  }

  async createForm(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const form = await this.service.createForm(request.body);
    return reply.status(201).send({ form });
  }

  async updateForm(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const form = await this.service.updateForm(id, request.body);
    return reply.status(200).send({ form });
  }

  async deleteForm(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await this.service.deleteForm(id);
    return reply.status(200).send({ message: "Form deleted successfully" });
  }

  async getCaptcha(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { formId } = request.params as { formId: string };
    const captcha = await this.service.generateCaptcha(formId);
    return reply.status(200).send(captcha);
  }

  async submit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { formId } = request.params as { formId: string };
    const ip = request.ip;
    const userAgent = request.headers["user-agent"];

    const result = await this.service.submitForm(formId, request.body, { ip, userAgent });
    return reply.status(201).send(result);
  }

  async listSubmissions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { formId } = request.params as { formId: string };
    const result = await this.service.listSubmissions(formId, request.query);
    return reply.status(200).send(result);
  }

  async exportSubmissions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { formId } = request.params as { formId: string };
    const { format } = (request.query as { format?: "csv" | "xlsx" }) ?? {};
    const result = await this.service.exportSubmissions(formId, format);

    return reply
      .header("Content-Type", result.contentType)
      .header("Content-Disposition", `attachment; filename="${result.filename}"`)
      .status(200)
      .send(result.data);
  }
}
