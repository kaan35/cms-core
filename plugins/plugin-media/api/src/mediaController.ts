import type { FastifyReply, FastifyRequest } from "fastify";
import type { MediaService } from "./mediaService.js";

export class MediaController {
  private readonly mediaService: MediaService;

  constructor(mediaService: MediaService) {
    this.mediaService = mediaService;
  }

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const uploaderId = request.user!.id;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file attached" });
    }

    const buffer = await data.toBuffer();

    const mediaDoc = await this.mediaService.uploadFile({
      filename: data.filename,
      buffer,
      mimeType: data.mimetype,
      uploaderId,
    });

    return reply.status(201).send(mediaDoc);
  }

  async list(
    request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const result = await this.mediaService.listMedia(request.query);
    return reply.send(result);
  }

  async deleteById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    await this.mediaService.deleteMedia(request.params.id, request.user!.id);
    return reply.status(204).send();
  }
}
