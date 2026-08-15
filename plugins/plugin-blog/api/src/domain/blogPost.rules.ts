import { ValidationError } from "@cms/core";
import { z } from "zod";

// 1. Permissions & Events
export const BLOG_PERMISSIONS = {
  READ_DRAFT: "blog:read:draft",
  WRITE: "blog:write",
} as const;

export const BLOG_EVENTS = {
  CREATED: "blog.created",
  UPDATED: "blog.updated",
  DELETED: "blog.deleted",
} as const;

// 2. Status & Schemas
export const BlogPostStatusSchema = z.enum(["draft", "published"]);

export const CreateBlogPostSchema = z.object({
  title: z.string().min(1, "Post title is required"),
  slug: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
  content: z.string().min(1, "Content is required"),
  coverMediaId: z.string().optional(),
  status: BlogPostStatusSchema.default("draft"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const UpdateBlogPostSchema = z.object({
  title: z.string().min(1, "Post title cannot be empty").optional(),
  slug: z.string().optional(),
  summary: z.string().min(1, "Summary cannot be empty").optional(),
  content: z.string().min(1, "Content cannot be empty").optional(),
  coverMediaId: z.string().optional(),
  status: BlogPostStatusSchema.optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

// Inferred TypeScript types (Rule 30)
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
  const result = CreateBlogPostSchema.safeParse(input);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new ValidationError(`Invalid blog post payload: ${errorDetails}`);
  }
  return result.data;
}

export function validateUpdateBlogPost(input: unknown): UpdateBlogPostInput {
  const result = UpdateBlogPostSchema.safeParse(input);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new ValidationError(`Invalid blog post update payload: ${errorDetails}`);
  }
  return result.data;
}
