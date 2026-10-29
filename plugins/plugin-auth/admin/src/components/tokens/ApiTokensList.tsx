"use client";

import {
  api,
  Badge,
  Button,
  DialogConfirm,
  formatDate,
  formatRelativeTime,
  InputSearchField,
  PageHeader,
  type PaginatedMeta,
  SelectFilter,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  toast,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import {
  Bot,
  Clock,
  Code2,
  Cpu,
  GitBranch,
  Key,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Workflow,
} from "lucide-react";
import * as React from "react";
import { CreateTokenDialog } from "./CreateTokenDialog";
import { TokenDetailDialog } from "./TokenDetailDialog";

export interface ApiTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null | undefined;
  revokeReason?: string | undefined;
}

function getAgentMeta(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("antigravity")) {
    return { label: "Antigravity", icon: Sparkles, color: "text-primary border-primary/30" };
  }
  if (lower.includes("cursor")) {
    return { label: "Cursor", icon: Code2, color: "text-blue-500 border-blue-500/30" };
  }
  if (lower.includes("copilot")) {
    return { label: "Copilot", icon: GitBranch, color: "text-purple-500 border-purple-500/30" };
  }
  if (lower.includes("codex") || lower.includes("openai") || lower.includes("gpt")) {
    return { label: "OpenAI Codex", icon: Cpu, color: "text-emerald-500 border-emerald-500/30" };
  }
  if (lower.includes("claude")) {
    return { label: "Claude", icon: Terminal, color: "text-amber-500 border-amber-500/30" };
  }
  if (lower.includes("windsurf")) {
    return { label: "Windsurf", icon: Workflow, color: "text-cyan-500 border-cyan-500/30" };
  }
  if (lower.includes("agent") || lower.includes("bot") || lower.includes("ai")) {
    return { label: "AI Agent", icon: Bot, color: "text-primary border-primary/30" };
  }
  return null;
}

export function ApiTokensList() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedTokenForDetail, setSelectedTokenForDetail] = React.useState<ApiTokenItem | null>(
    null,
  );
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [tokenToRevoke, setTokenToRevoke] = React.useState<ApiTokenItem | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<"all" | "full" | "scoped">("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (scopeFilter !== "all") queryParams.set("scope", scopeFilter);
  const endpoint = `/auth/tokens?${queryParams.toString()}`;

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{
    tokens?: ApiTokenItem[];
    data?: ApiTokenItem[];
    meta?: PaginatedMeta;
  }>(endpoint);

  const tokens: ApiTokenItem[] = rawData?.data || rawData?.tokens || [];
  const meta = rawData?.meta;

  const activeCount = React.useMemo(() => {
    return tokens.filter((t) => t.lastUsedAt).length;
  }, [tokens]);

  const fullAccessCount = React.useMemo(() => {
    return tokens.filter((t) => t.scopes.includes("*")).length;
  }, [tokens]);

  const handleConfirmRevoke = async () => {
    if (!tokenToRevoke) return;
    setIsRevoking(true);
    try {
      await api.delete(`/auth/tokens/${tokenToRevoke.id}`);
      toast.success(`Token "${tokenToRevoke.name}" revoked successfully!`);
      setTokenToRevoke(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke token";
      toast.error(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Unified PageHeader */}
      <PageHeader
        title="API & Agent Tokens"
        description="Generate scoped API keys for Antigravity IDE, Claude Desktop, Cursor, or automated pipelines."
        icon={Key}
      />

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Tokens"
          value={meta?.total ?? tokens.length}
          description="Configured API & agent keys"
          icon={Key}
        />
        <StatCard
          title="Active Agents"
          value={activeCount}
          description="Tokens with recorded activity"
          icon={Bot}
        />
        <StatCard
          title="Full Access Keys"
          value={fullAccessCount}
          description="Tokens with wildcard (*) scope"
          icon={ShieldCheck}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Unified Search & Action Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
            <InputSearchField
              placeholder="Search tokens by name, prefix, or scope..."
              value={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              containerClassName="w-full sm:max-w-sm"
              className="bg-card w-full"
            />

            <div className="w-36">
              <SelectFilter
                value={scopeFilter}
                onValueChange={(val) => {
                  setScopeFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Scopes" },
                  { value: "full", label: "Full Access" },
                  { value: "scoped", label: "Scoped" },
                ]}
                placeholder="All Scopes"
                className="h-8 text-xs min-w-36 w-full bg-card"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tooltip content="Refresh tokens">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                iconStart={<RefreshCw />}
                disabled={isLoading}
              />
            </Tooltip>
            <Button
              variant="default"
              onClick={() => setCreateDialogOpen(true)}
              iconStart={<Plus />}
              className="w-full sm:w-auto"
            >
              Generate New Token
            </Button>
          </div>
        </div>

        {/* Main Container / Table Card */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 py-14 text-center">
              <div className="relative mb-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-2xs">
                  <Bot className="size-7" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-xs text-amber-500">
                  <Sparkles className="size-3" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-foreground">No API & Agent Tokens</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
                Supercharge your development workflow by connecting the CMS to{" "}
                <strong className="text-foreground">Google Antigravity IDE</strong>, Claude Desktop,
                or Cursor via MCP. Generate a scoped token to query schemas, inspect endpoints, and
                create drafts directly from your editor.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <Button
                  variant="default"
                  onClick={() => setCreateDialogOpen(true)}
                  iconStart={<Sparkles />}
                >
                  Generate Antigravity Token
                </Button>
              </div>

              <div className="mt-6 pt-5 border-t border-border/60 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Model Context Protocol (MCP) Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Granular Permissions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  Fail-Closed Token Revocation
                </span>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="w-[35%]">Token & Key</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created & Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => {
                    const isRevoked = Boolean(token.revokedAt);
                    const isExpired = token.expiresAt
                      ? new Date(token.expiresAt).getTime() < Date.now()
                      : false;

                    const agentMeta = getAgentMeta(token.name);
                    const Icon = agentMeta ? agentMeta.icon : Key;

                    return (
                      <TableRow
                        key={token.id}
                        className="text-xs hover:bg-muted/20 transition-colors group/row"
                      >
                        {/* Token Name, Icon & Key Identifier */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                                agentMeta
                                  ? "bg-muted/80 " + agentMeta.color
                                  : "bg-muted/60 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTokenForDetail(token);
                                    setDetailModalOpen(true);
                                  }}
                                  className="font-semibold text-foreground hover:text-primary transition-colors truncate max-w-55 text-left cursor-pointer focus:outline-none"
                                >
                                  {token.name}
                                </button>
                                {agentMeta && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${agentMeta.color}`}
                                  >
                                    {agentMeta.label}
                                  </Badge>
                                )}
                                {isRevoked ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30"
                                  >
                                    Revoked
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Expired
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                                  >
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                                <span>{token.tokenPrefix || "cms_token_••••"}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Permissions / Scopes */}
                        <TableCell className="py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {!token.scopes ||
                            token.scopes.length === 0 ||
                            token.scopes.includes("*") ? (
                              <Badge
                                variant="secondary"
                                className="text-[11px] px-2 py-0.5 font-medium bg-primary/10 text-primary border border-primary/20"
                              >
                                Full Access (*)
                              </Badge>
                            ) : (
                              token.scopes.map((scope) => (
                                <Badge
                                  key={scope}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0.5 font-mono text-muted-foreground"
                                >
                                  {scope}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* Last Used */}
                        <TableCell className="py-3.5 text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="size-3.5 opacity-60 shrink-0" />
                            <span>
                              {token.lastUsedAt
                                ? formatRelativeTime(token.lastUsedAt)
                                : "Never used"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Created & Expires */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <div className="flex flex-col text-xs space-y-0.5">
                            <span className="text-foreground font-medium">
                              {formatDate(token.createdAt)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {token.revokedAt ? (
                                <span className="text-destructive font-medium">
                                  Revoked {formatDate(token.revokedAt)}
                                </span>
                              ) : token.expiresAt ? (
                                isExpired ? (
                                  <span className="text-destructive font-medium">
                                    Expired {formatDate(token.expiresAt)}
                                  </span>
                                ) : (
                                  <span>Expires {formatDate(token.expiresAt)}</span>
                                )
                              ) : (
                                <span>Never expires</span>
                              )}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions Cell */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setSelectedTokenForDetail(token);
                                setDetailModalOpen(true);
                              }}
                              iconStart={<Code2 className="size-3.5 text-primary" />}
                              tooltip="View IDE Setup & Decrypted Raw Key"
                              className="font-medium"
                            >
                              Setup & Copy
                            </Button>
                            {token.revokedAt ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled
                                className="opacity-40 cursor-not-allowed text-muted-foreground"
                                tooltip="Token already revoked"
                              >
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Revoked</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setTokenToRevoke(token)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                tooltip="Revoke API Token"
                              >
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Revoke</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                totalPages={
                  meta?.totalPages ?? Math.max(1, Math.ceil((meta?.total ?? tokens.length) / limit))
                }
                totalCount={meta?.total ?? tokens.length}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Revocation Confirmation Dialog */}
      <DialogConfirm
        open={Boolean(tokenToRevoke)}
        onClose={() => setTokenToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke API Token"
        description={`Are you sure you want to revoke the token "${tokenToRevoke?.name}"? Any IDE, AI assistant, or automated integration using this token will immediately lose access.`}
        confirmLabel={isRevoking ? "Revoking..." : "Revoke Token"}
        confirmIcon={<Trash2 />}
        confirmVariant="destructive"
        isLoading={isRevoking}
      />

      {/* Create Token Dialog */}
      <CreateTokenDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTokenCreated={() => mutate()}
      />

      {/* Token Reveal & AI Agent Setup Dialog */}
      <TokenDetailDialog
        token={selectedTokenForDetail}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
}
