import type { McpServer } from "@modelcontextprotocol/server";
import { CmsApiClient, cmsApiClient } from "../client/cmsApiClient.js";

export function registerSystemTools(server: McpServer, client: CmsApiClient = cmsApiClient): void {
  server.registerTool(
    "get_system_status",
    {
      description: "Get system health and runtime statistics for CMS API",
    },
    async () => {
      try {
        const [healthResult, statsResult] = await Promise.allSettled([
          client.getHealth(),
          client.getStats(),
        ]);

        const statusReport = {
          health:
            healthResult.status === "fulfilled"
              ? healthResult.value
              : {
                  status: "error",
                  error:
                    healthResult.reason instanceof Error
                      ? healthResult.reason.message
                      : String(healthResult.reason),
                },
          stats:
            statsResult.status === "fulfilled"
              ? statsResult.value
              : {
                  status: "error",
                  error:
                    statsResult.reason instanceof Error
                      ? statsResult.reason.message
                      : String(statsResult.reason),
                },
          timestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(statusReport, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to retrieve system status: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}
