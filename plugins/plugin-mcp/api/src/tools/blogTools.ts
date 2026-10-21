import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CmsApiClient, cmsApiClient } from "../client/cmsApiClient.js";

const MAX_SEO_TITLE_LENGTH = 60;
const TRUNCATED_SEO_TITLE_LENGTH = 57;
const MAX_META_DESCRIPTION_LENGTH = 155;
const TRUNCATED_META_DESC_LENGTH = 152;
const MIN_SENTENCE_CUT_THRESHOLD = 100;
const READING_WORDS_PER_MINUTE = 200;

/**
 * Generate a clean kebab-case slug from a title string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extract frequent significant words as tags/keywords
 */
function extractKeywords(text: string, count = 5): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "were",
    "will",
    "with",
    "this",
    "these",
    "those",
    "then",
    "them",
    "they",
    "we",
    "you",
    "your",
    "our",
    "their",
    "how",
    "what",
    "why",
    "when",
    "where",
    "who",
    "which",
    "can",
    "all",
    "also",
    "into",
    "more",
    "most",
    "other",
    "some",
    "such",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const frequencies = new Map<string, number>();
  for (const w of words) {
    frequencies.set(w, (frequencies.get(w) ?? 0) + 1);
  }

  return Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

export function registerBlogTools(server: McpServer, client: CmsApiClient = cmsApiClient): void {
  // 1. list_blog_posts
  server.registerTool(
    "list_blog_posts",
    {
      description: "List blog articles with optional filtering by status and search keyword",
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of blog articles to return"),
        status: z
          .enum(["draft", "published"])
          .optional()
          .describe("Filter articles by publication status"),
        search: z.string().optional().describe("Search query to filter blog articles"),
      },
    },
    async ({ limit, status, search }) => {
      try {
        const posts = await client.listBlogPosts({ limit, status, search });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(posts, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to list blog posts: ${message}`,
            },
          ],
        };
      }
    },
  );

  // 2. get_blog_post
  server.registerTool(
    "get_blog_post",
    {
      description: "Get a single blog article by its URL slug or ID",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("The URL slug (e.g. 'getting-started-with-cms') or unique ID of the post"),
      },
    },
    async ({ slug }) => {
      try {
        const post = await client.getBlogPost(slug);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(post, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to get blog post '${slug}': ${message}`,
            },
          ],
        };
      }
    },
  );

  // 3. create_blog_draft
  server.registerTool(
    "create_blog_draft",
    {
      description: "Create a new blog article in draft status",
      inputSchema: {
        title: z.string().min(1).describe("Title of the blog post"),
        slug: z.string().min(1).describe("URL slug for the post (e.g. 'announcing-v2')"),
        body: z.string().min(1).describe("Full content text or markdown of the article"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Categorization tags (e.g. ['tech', 'updates'])"),
        seoDescription: z
          .string()
          .optional()
          .describe("SEO meta description for search engine previews"),
      },
    },
    async ({ title, slug, body, tags, seoDescription }) => {
      try {
        const createdPost = await client.createBlogDraft({
          title,
          slug,
          body,
          tags,
          seoDescription,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(createdPost, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create blog draft: ${message}`,
            },
          ],
        };
      }
    },
  );

  // 4. suggest_seo_metadata
  server.registerTool(
    "suggest_seo_metadata",
    {
      description:
        "Analyze article title and content to generate optimized SEO title, meta description, slug, tags, and keywords",
      inputSchema: {
        title: z.string().min(1).describe("Working title or topic of the blog post"),
        content: z
          .string()
          .optional()
          .describe("Article body or outline text to extract keywords and context from"),
        targetKeywords: z
          .array(z.string())
          .optional()
          .describe("Optional target search terms to prioritize in suggestions"),
      },
    },
    async ({ title, content, targetKeywords }) => {
      const fullText = `${title} ${content ?? ""}`;
      const baseSlug = slugify(title);
      const extracted = extractKeywords(fullText, 7);

      const combinedKeywords = Array.from(
        new Set([...(targetKeywords ?? []).map((k) => k.toLowerCase().trim()), ...extracted]),
      ).filter(Boolean);

      // Construct an optimized SEO Title (<= 60 characters)
      let seoTitle = title.trim();
      if (seoTitle.length > MAX_SEO_TITLE_LENGTH) {
        seoTitle = `${seoTitle.slice(0, TRUNCATED_SEO_TITLE_LENGTH)}...`;
      }

      // Construct an optimized Meta Description (140-155 characters)
      let metaDescription: string;
      if (content && content.trim().length > 0) {
        const cleanedContent = content.replace(/\s+/g, " ").trim();
        if (cleanedContent.length <= MAX_META_DESCRIPTION_LENGTH) {
          metaDescription = cleanedContent;
        } else {
          const cut = cleanedContent.slice(0, TRUNCATED_META_DESC_LENGTH);
          const lastSpace = cut.lastIndexOf(" ");
          metaDescription = `${lastSpace > MIN_SENTENCE_CUT_THRESHOLD ? cut.slice(0, lastSpace) : cut}...`;
        }
      } else {
        metaDescription = `Read everything you need to know about ${title.trim()} on our official blog. Comprehensive guide, key insights, and actionable tips.`;
        if (metaDescription.length > MAX_META_DESCRIPTION_LENGTH) {
          metaDescription = `${metaDescription.slice(0, TRUNCATED_META_DESC_LENGTH)}...`;
        }
      }

      const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
      const readTimeMinutes = Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE));

      const seoMetadata = {
        seoTitle,
        seoTitleLength: seoTitle.length,
        metaDescription,
        metaDescriptionLength: metaDescription.length,
        suggestedSlug: baseSlug,
        suggestedTags: combinedKeywords.slice(0, 5),
        primaryKeyword: combinedKeywords[0] ?? baseSlug.replace(/-/g, " "),
        secondaryKeywords: combinedKeywords.slice(1, 5),
        estimatedReadTimeMinutes: readTimeMinutes,
        wordCount,
        recommendations: [
          "Ensure primary keyword appears naturally in the first 100 words.",
          "Use H2 and H3 subheadings containing semantic secondary keywords.",
          "Add descriptive alt text to all embedded images.",
        ],
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(seoMetadata, null, 2),
          },
        ],
      };
    },
  );
}
