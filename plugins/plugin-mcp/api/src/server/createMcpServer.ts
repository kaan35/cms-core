import { McpServer } from "@modelcontextprotocol/server";
import { CmsApiClient, cmsApiClient } from "../client/cmsApiClient.js";
import { registerBlogTools } from "../tools/blogTools.js";
import { registerFormsTools } from "../tools/formsTools.js";
import { registerPagesTools } from "../tools/pagesTools.js";
import { registerSystemTools } from "../tools/systemTools.js";

export interface ToolOutcome {
  toolName: string;
  status: "success" | "access_denied" | "error";
  requiredScope?: string | undefined;
  error?: string | undefined;
}
export type ToolOutcomeCallback = (outcome: ToolOutcome) => void;

export function parseRequiredScope(message: string): string | undefined {
  const match =
    message.match(/missing required permission ['"`]([^'"`]+)['"`]/i) ||
    message.match(/missing permission ['"`]([^'"`]+)['"`]/i) ||
    message.match(/permission ['"`]([^'"`]+)['"`] required/i) ||
    message.match(/required scope ['"`]([^'"`]+)['"`]/i) ||
    message.match(/requires scope ['"`]([^'"`]+)['"`]/i) ||
    message.match(/insufficient scope ['"`]([^'"`]+)['"`]/i);
  return match?.[1];
}

export interface CreateCmsMcpServerOptions {
  apiClient?: CmsApiClient;
  apiUrl?: string;
  apiKey?: string;
  onOutcome?: ToolOutcomeCallback;
}

type ToolHandler = (...args: unknown[]) => Promise<unknown>;
type ToolCallable = (name: string, ...rest: unknown[]) => unknown;

/**
 * Factory function to instantiate an McpServer preconfigured with CMS tools
 * and connected to either an injected or auto-configured CmsApiClient.
 */
export function createCmsMcpServer(options: CreateCmsMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: "cms-mcp",
    version: "0.1.0",
  });

  const wrapToolHandler = (name: string, rest: unknown[]) => {
    const handler = rest[rest.length - 1];
    if (typeof handler === "function") {
      const wrappedHandler = async (...args: unknown[]) => {
        try {
          const result = await (handler as ToolHandler)(...args);
          if (
            result &&
            typeof result === "object" &&
            "isError" in result &&
            Boolean((result as { isError?: boolean }).isError)
          ) {
            const content = (result as { content?: Array<{ type?: string; text?: string }> })
              .content;
            const textContent = content?.find((c) => c.type === "text")?.text || "";
            const isAccessDenied =
              textContent.includes("401") ||
              textContent.includes("403") ||
              textContent.includes("Forbidden") ||
              textContent.includes("Unauthorized") ||
              textContent.includes("missing required permission");
            const parsedScope = parseRequiredScope(textContent);
            options.onOutcome?.({
              toolName: name,
              status: isAccessDenied ? "access_denied" : "error",
              requiredScope: parsedScope || (isAccessDenied ? "insufficient_scope" : undefined),
              error: textContent,
            });
          } else {
            options.onOutcome?.({
              toolName: name,
              status: "success",
            });
          }
          return result;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isAccessDenied =
            errMsg.includes("401") ||
            errMsg.includes("403") ||
            errMsg.includes("Forbidden") ||
            errMsg.includes("Unauthorized") ||
            errMsg.includes("missing required permission");
          const parsedScope = parseRequiredScope(errMsg);
          options.onOutcome?.({
            toolName: name,
            status: isAccessDenied ? "access_denied" : "error",
            requiredScope: parsedScope || (isAccessDenied ? "insufficient_scope" : undefined),
            error: errMsg,
          });
          throw err;
        }
      };
      rest[rest.length - 1] = wrappedHandler;
    }
  };

  const serverRecord = server as unknown as Record<string, ToolCallable>;
  const originalTool =
    typeof serverRecord["tool"] === "function" ? serverRecord["tool"].bind(server) : undefined;
  if (originalTool) {
    serverRecord["tool"] = (name: string, ...rest: unknown[]) => {
      wrapToolHandler(name, rest);
      return originalTool(name, ...rest);
    };
  }

  const originalRegisterTool =
    typeof serverRecord["registerTool"] === "function"
      ? serverRecord["registerTool"].bind(server)
      : undefined;
  if (originalRegisterTool) {
    serverRecord["registerTool"] = (name: string, ...rest: unknown[]) => {
      wrapToolHandler(name, rest);
      return originalRegisterTool(name, ...rest);
    };
  }

  const client =
    options.apiClient ??
    (options.apiUrl || options.apiKey
      ? new CmsApiClient({
          baseUrl: options.apiUrl,
          apiKey: options.apiKey,
        })
      : cmsApiClient);

  registerSystemTools(server, client);
  registerPagesTools(server, client);
  registerBlogTools(server, client);
  registerFormsTools(server, client);

  return server;
}
