import { EVENTS, PERMISSIONS, validateWithSchema } from "@cms/core";
import { z } from "zod";

// 1. Permissions & Events
export const BLOG_PERMISSIONS = {
  READ_DRAFT: PERMISSIONS.BLOG.READ_DRAFT,
  WRITE: PERMISSIONS.BLOG.WRITE,
} as const;

export const BLOG_EVENTS = {
  CREATED: EVENTS.BLOG.CREATED,
  UPDATED: EVENTS.BLOG.UPDATED,
  DELETED: EVENTS.BLOG.DELETED,
} as const;

// 2. Status & Schemas
export const BlogPostStatusSchema = z.enum(["draft", "published"]);

export const CreateBlogPostSchema = z.object({
  title: z.string().min(1, "Post title is required").max(255),
  slug: z.string().max(255).optional(),
  summary: z.string().min(1, "Summary is required").max(1000),
  content: z.string().min(1, "Content is required").max(100000),
  coverMediaId: z.string().max(128).optional(),
  status: BlogPostStatusSchema.default("draft"),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const UpdateBlogPostSchema = z.object({
  title: z.string().min(1, "Post title cannot be empty").max(255).optional(),
  slug: z.string().max(255).optional(),
  summary: z.string().min(1, "Summary cannot be empty").max(1000).optional(),
  content: z.string().min(1, "Content cannot be empty").max(100000).optional(),
  coverMediaId: z.string().max(128).optional(),
  status: BlogPostStatusSchema.optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

// Inferred TypeScript types
export type BlogPostStatus = z.infer<typeof BlogPostStatusSchema>;
export type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof UpdateBlogPostSchema>;

export interface BlogPostDoc {
  [key: string]: unknown;
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverMediaId?: string | undefined;
  status: BlogPostStatus;
  version: number;
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  createdAt: string;
  updatedAt: string;
  actorId?: string | undefined;
}

export interface BlogPostVersionDoc {
  [key: string]: unknown;
  id: string;
  postId: string;
  version: number;
  snapshot: BlogPostDoc;
  createdAt: string;
  actorId?: string | undefined;
}

// 3. Validation Helpers
export function validateCreateBlogPost(input: unknown): CreateBlogPostInput {
  return validateWithSchema(CreateBlogPostSchema, input, "Invalid blog post payload");
}

export function validateUpdateBlogPost(input: unknown): UpdateBlogPostInput {
  return validateWithSchema(UpdateBlogPostSchema, input, "Invalid blog post update payload");
}
