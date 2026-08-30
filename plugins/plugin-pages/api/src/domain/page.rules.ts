import { validateWithSchema } from "@cms/core";
import { z } from "zod";

export const PAGES_PERMISSIONS = {
  READ_DRAFT: "pages:read:draft",
  WRITE: "pages:write",
} as const;

// 1. Block Schemas
export const HeroBlockSchema = z.object({
  type: z.literal("hero"),
  title: z.string().min(1, "Hero title is required"),
  subtitle: z.string().optional(),
  mediaId: z.string().optional(),
  mediaLayout: z.enum(["background", "featured", "banner"]).default("background").optional(),
  primaryCta: z
    .object({
      label: z.string().optional().default(""),
      url: z.string().optional().default(""),
    })
    .optional(),
  secondaryCta: z
    .object({
      label: z.string().optional().default(""),
      url: z.string().optional().default(""),
    })
    .optional(),
});

export const GalleryBlockSchema = z.object({
  type: z.literal("gallery"),
  title: z.string().optional(),
  images: z
    .array(
      z.object({
        mediaId: z.string().min(1, "Media ID is required"),
        caption: z.string().optional(),
      }),
    )
    .min(1, "Gallery must contain at least 1 image"),
  layout: z.enum(["grid", "masonry"]).default("grid"),
});

export const BentoGridBlockSchema = z.object({
  type: z.literal("bento_grid"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  columns: z.union([z.literal("2"), z.literal("3"), z.literal("4"), z.number()]).optional(),
  cards: z
    .array(
      z.object({
        icon: z.string().optional(),
        title: z.string().min(1, "Card title is required"),
        description: z.string(),
        badge: z.string().optional(),
        size: z.string().optional(),
      }),
    )
    .min(1, "Bento grid must contain at least 1 card"),
});

export const CodeShowcaseBlockSchema = z.object({
  type: z.literal("code_showcase"),
  tabs: z
    .array(
      z.object({
        label: z.string().min(1, "Tab label is required"),
        language: z.string().min(1, "Language is required"),
        code: z.string(),
      }),
    )
    .min(1, "Code showcase must contain at least 1 tab"),
});

export const InteractiveDemoBlockSchema = z.object({
  type: z.literal("interactive_demo"),
  widgetType: z.string().min(1, "Widget type is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  badge: z.string().optional(),
});

export const TextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string().min(1, "Text content cannot be empty"),
});

export const FormBlockSchema = z.object({
  type: z.literal("form"),
  formId: z.string().min(1, "Form ID is required"),
});

export const BlogPostsBlockSchema = z.object({
  type: z.literal("blog_posts"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  viewAllLabel: z.string().optional(),
  viewAllUrl: z.string().optional(),
  readMoreLabel: z.string().optional(),
  limit: z.number().int().positive().default(6),
  layout: z.enum(["grid", "list"]).default("grid"),
});

export const PageBlockSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  GalleryBlockSchema,
  BentoGridBlockSchema,
  CodeShowcaseBlockSchema,
  InteractiveDemoBlockSchema,
  TextBlockSchema,
  FormBlockSchema,
  BlogPostsBlockSchema,
]);

// 2. Page Schemas
export const PageStatusSchema = z.enum(["draft", "published"]);
export const PageTypeSchema = z.enum(["standard", "home"]).default("standard");

export const CreatePageSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  slug: z.string().optional(),
  status: PageStatusSchema.default("draft"),
  pageType: PageTypeSchema.optional(),
  blocks: z.array(PageBlockSchema).min(1, "Page must contain at least 1 block"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const UpdatePageSchema = z.object({
  title: z.string().min(1, "Page title cannot be empty").optional(),
  slug: z.string().optional(),
  status: PageStatusSchema.optional(),
  pageType: PageTypeSchema.optional(),
  blocks: z.array(PageBlockSchema).min(1, "Page must contain at least 1 block").optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

// Inferred TypeScript types (Rule 30)
export type HeroBlock = z.infer<typeof HeroBlockSchema>;
export type GalleryBlock = z.infer<typeof GalleryBlockSchema>;
export type BentoGridBlock = z.infer<typeof BentoGridBlockSchema>;
export type CodeShowcaseBlock = z.infer<typeof CodeShowcaseBlockSchema>;
export type InteractiveDemoBlock = z.infer<typeof InteractiveDemoBlockSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type FormBlock = z.infer<typeof FormBlockSchema>;
export type BlogPostsBlock = z.infer<typeof BlogPostsBlockSchema>;
export type PageBlock = z.infer<typeof PageBlockSchema>;
export type PageStatus = z.infer<typeof PageStatusSchema>;
export type PageType = z.infer<typeof PageTypeSchema>;
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;

export interface PageDoc {
  [key: string]: unknown;
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  pageType?: PageType;
  blocks: PageBlock[];
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  version: number;
  createdBy?: string | undefined;
  updatedBy?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PageVersionDoc {
  [key: string]: unknown;
  id: string;
  pageId: string;
  version: number;
  data: Omit<PageDoc, "id">;
  changedBy?: string | undefined;
  createdAt: string;
}

export function validateCreatePage(input: unknown): CreatePageInput {
  return validateWithSchema(CreatePageSchema, input, "Validation failed");
}

export function validateUpdatePage(input: unknown): UpdatePageInput {
  return validateWithSchema(UpdatePageSchema, input, "Validation failed");
}
