import {
  BookOpen,
  ClipboardList,
  Code2,
  FileText,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import type * as React from "react";

export type PageBlockType =
  | "hero"
  | "gallery"
  | "text"
  | "form"
  | "blog_posts"
  | "bento_grid"
  | "code_showcase"
  | "interactive_demo";

export interface PageBlock {
  type: PageBlockType;
  [key: string]: unknown;
}

export interface BlockDefinition {
  type: PageBlockType;
  title: string;
  category: "Marketing" | "Media" | "Content" | "Forms" | "Feed";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultData: () => PageBlock;
}

export const BLOCK_CATALOG: BlockDefinition[] = [
  {
    type: "hero",
    title: "Hero Section",
    category: "Marketing",
    description: "High-impact opening banner with headline, subtitle, media background, and CTAs.",
    icon: LayoutTemplate,
    defaultData: () => ({
      type: "hero",
      title: "Elevate Your Digital Experience",
      subtitle: "Powerful solutions built for modern businesses.",
      primaryCta: { label: "Get Started", url: "/contact" },
      secondaryCta: { label: "Learn More", url: "/about" },
    }),
  },
  {
    type: "gallery",
    title: "Image Gallery",
    category: "Media",
    description: "Responsive image grid or masonry flow linked to your media library assets.",
    icon: Images,
    defaultData: () => ({
      type: "gallery",
      title: "Our Portfolio",
      layout: "grid",
      images: [],
    }),
  },
  {
    type: "text",
    title: "Rich Text & Articles",
    category: "Content",
    description: "Structured markdown, headers, lists, links, and formatted paragraph blocks.",
    icon: FileText,
    defaultData: () => ({
      type: "text",
      content:
        "## Section Title\n\nEnter your narrative text here with **bold** or *italic* styling.",
    }),
  },
  {
    type: "form",
    title: "Interactive Form",
    category: "Forms",
    description: "Embed dynamic forms with validation, challenge captcha, and submission tracking.",
    icon: ClipboardList,
    defaultData: () => ({
      type: "form",
      formId: "",
    }),
  },
  {
    type: "blog_posts",
    title: "Blog Posts Feed",
    category: "Feed",
    description: "Dynamic feed displaying recent published articles and insights.",
    icon: BookOpen,
    defaultData: () => ({
      type: "blog_posts",
      limit: 6,
      layout: "grid",
    }),
  },
  {
    type: "bento_grid",
    title: "Bento Feature Grid",
    category: "Marketing",
    description: "Modern asymmetric cards highlighting core product features and badges.",
    icon: LayoutGrid,
    defaultData: () => ({
      type: "bento_grid",
      cards: [
        {
          title: "Blazing Fast",
          description: "Built on modern edge infrastructure.",
          badge: "Speed",
        },
        {
          title: "Secure & Resilient",
          description: "Enterprise-grade RBAC and auth.",
          badge: "Security",
        },
      ],
    }),
  },
  {
    type: "code_showcase",
    title: "Code Showcase",
    category: "Content",
    description: "Syntax-highlighted code viewer with multiple language tabs.",
    icon: Code2,
    defaultData: () => ({
      type: "code_showcase",
      tabs: [
        { label: "Bash", language: "bash", code: "curl -X GET https://api.example.com/pages" },
      ],
    }),
  },
  {
    type: "interactive_demo",
    title: "Interactive Demo",
    category: "Content",
    description: "Live embedded interactive preview widget or verification demo.",
    icon: Sparkles,
    defaultData: () => ({
      type: "interactive_demo",
      widgetType: "turnstile",
      title: "Security Verification",
      description: "Interactive challenge demo widget.",
    }),
  },
];
