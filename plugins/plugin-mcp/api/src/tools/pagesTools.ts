import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CmsApiClient, cmsApiClient } from "../client/cmsApiClient.js";

export function registerPagesTools(server: McpServer, client: CmsApiClient = cmsApiClient): void {
  // 1. list_pages
  server.registerTool(
    "list_pages",
    {
      description: "List CMS pages with optional pagination and search filtering",
      inputSchema: {
        limit: z.number().int().positive().optional().describe("Maximum number of pages to return"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset (number of records to skip)"),
        search: z.string().optional().describe("Search query to filter pages by title or content"),
      },
    },
    async ({ limit, offset, search }) => {
      try {
        const pages = await client.listPages({ limit, offset, search });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pages, null, 2),
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
              text: `Failed to list pages: ${message}`,
            },
          ],
        };
      }
    },
  );

  // 2. get_page
  server.registerTool(
    "get_page",
    {
      description: "Get a single CMS page by its slug or ID",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("The URL slug (e.g. 'home', 'about-us') or unique ID of the page"),
      },
    },
    async ({ slug }) => {
      try {
        const page = await client.getPage(slug);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
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
              text: `Failed to get page '${slug}': ${message}`,
            },
          ],
        };
      }
    },
  );

  // 3. create_page_draft
  server.registerTool(
    "create_page_draft",
    {
      description: "Create a new CMS page in draft status with block-based content",
      inputSchema: {
        title: z.string().min(1).describe("The human-readable title of the page"),
        slug: z.string().min(1).describe("URL slug for the page (e.g. 'pricing', 'features')"),
        blocks: z
          .array(z.record(z.string(), z.unknown()))
          .min(1)
          .describe(
            "Array of content block objects (e.g., hero, text, gallery, bento_grid, form, interactive_demo)",
          ),
      },
    },
    async ({ title, slug, blocks }) => {
      try {
        const createdPage = await client.createPageDraft({ title, slug, blocks });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(createdPage, null, 2),
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
              text: `Failed to create page draft: ${message}`,
            },
          ],
        };
      }
    },
  );
}
