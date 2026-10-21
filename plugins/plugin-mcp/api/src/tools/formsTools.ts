import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CmsApiClient, cmsApiClient } from "../client/cmsApiClient.js";

export function registerFormsTools(server: McpServer, client: CmsApiClient = cmsApiClient): void {
  // 1. list_forms
  server.registerTool(
    "list_forms",
    {
      description: "List all custom, contact, and lead-generation forms configured in the CMS",
    },
    async () => {
      try {
        const forms = await client.listForms();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(forms, null, 2),
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
              text: `Failed to list forms: ${message}`,
            },
          ],
        };
      }
    },
  );

  // 2. get_form_submissions
  server.registerTool(
    "get_form_submissions",
    {
      description: "Get user submissions for a specific form by form ID",
      inputSchema: {
        formId: z.string().min(1).describe("The unique ID or slug of the form (e.g. 'contact-us')"),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of submissions to retrieve (defaults to 50)"),
      },
    },
    async ({ formId, limit }) => {
      try {
        const submissions = await client.getFormSubmissions(formId, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(submissions, null, 2),
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
              text: `Failed to get submissions for form '${formId}': ${message}`,
            },
          ],
        };
      }
    },
  );
}
