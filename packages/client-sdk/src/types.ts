// --- Settings & Common ---
export interface SettingsDoc {
  adminTitle?: string;
  siteTitle?: string;
  siteDescription?: string;
  defaultTheme?: "dark" | "light" | "system";
  brandColor?: string;
  primaryColor?: string;
  brandFont?: string;
  fontFamily?: string;
  footerText?: string;
  headerMenu?: Array<{
    id: string;
    label: string;
    url: string;
    type: "page" | "custom" | "blog";
    pageId?: string;
    customLabel?: boolean;
    external?: boolean;
    style?: "link" | "button";
    badge?: string;
    icon?: string;
  }>;
  footerMenu?: Array<{
    id: string;
    label: string;
    url: string;
    type: "page" | "custom" | "blog";
    pageId?: string;
    customLabel?: boolean;
    external?: boolean;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CaptchaChallenge {
  token: string;
  num1: number;
  num2: number;
  operation: string;
  prompt: string;
}

// --- Page & Block Types ---
export interface HeroBlock {
  type: "hero";
  title: string;
  subtitle?: string;
  mediaId?: string;
  mediaLayout?: "background" | "featured" | "banner";
  primaryCta?: { label?: string; url?: string };
  secondaryCta?: { label?: string; url?: string };
}

export interface GalleryBlock {
  type: "gallery";
  title?: string;
  images: Array<{ mediaId: string; caption?: string }>;
  layout?: "grid" | "masonry";
}

export interface BentoGridBlock {
  type: "bento_grid";
  title?: string;
  subtitle?: string;
  columns?: "2" | "3" | "4" | number;
  cards: Array<{
    icon?: string;
    title: string;
    description: string;
    badge?: string;
    size?: string;
  }>;
}

export interface CodeShowcaseBlock {
  type: "code_showcase";
  tabs: Array<{ label: string; language: string; code: string }>;
}

export interface InteractiveDemoBlock {
  type: "interactive_demo";
  widgetType: string;
  title?: string;
  description?: string;
  badge?: string;
}

export interface TextBlock {
  type: "text";
  content: string;
}

export interface FormBlock {
  type: "form";
  formId: string;
}

export interface BlogPostsBlock {
  type: "blog_posts";
  title?: string;
  subtitle?: string;
  badge?: string;
  viewAllLabel?: string;
  viewAllUrl?: string;
  readMoreLabel?: string;
  limit?: number;
  layout?: "grid" | "list";
}

export type PageBlock =
  | HeroBlock
  | GalleryBlock
  | BentoGridBlock
  | CodeShowcaseBlock
  | InteractiveDemoBlock
  | TextBlock
  | FormBlock
  | BlogPostsBlock;

export type ContentBlock = PageBlock;

export type PageStatus = "draft" | "published";
export type PageType = "standard" | "home";

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
  createdAt: string;
  updatedAt: string;
}

// --- Blog Types ---
export type BlogPostStatus = "draft" | "published";

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
}

// --- Forms Types ---
export type FormFieldType = "text" | "email" | "textarea" | "number" | "select" | "checkbox";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormDoc {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: FormField[];
  captchaProvider?: "none" | "challenge";
  challengeType?: "alphanumeric" | "math";
  submitButtonText?: string;
  successMessage?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface FormSubmissionDoc {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
}

export type FormSubmission = FormSubmissionDoc;
