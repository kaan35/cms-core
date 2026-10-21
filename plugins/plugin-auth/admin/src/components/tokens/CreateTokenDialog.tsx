"use client";

import {
  api,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputField,
  Kbd,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  useShortcut,
} from "@cms/admin-shell";
import {
  AlertTriangle,
  Bot,
  Check,
  Code2,
  Copy,
  Cpu,
  GitBranch,
  Globe,
  Key,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import * as React from "react";
import type { ApiTokenItem } from "./ApiTokensList";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenCreated: () => void;
}

export interface ScopePreset {
  id: string;
  label: string;
  description: string;
  scopes: string[];
}

export const SCOPE_PRESETS: ScopePreset[] = [
  {
    id: "full",
    label: "Full Access (*)",
    description: "Complete read and write access across pages, blog, forms, media, and settings.",
    scopes: ["*"],
  },
  {
    id: "readonly",
    label: "Read Only",
    description: "Can view pages, articles, submissions, and metrics without making modifications.",
    scopes: [
      "pages:read:draft",
      "blog:read:draft",
      "forms:read",
      "media:read",
      "system:settings:read",
    ],
  },
  {
    id: "blog",
    label: "Blog & SEO Writer",
    description: "Draft and publish blog articles, upload media, and generate SEO suggestions.",
    scopes: ["blog:write", "blog:read:draft", "media:read", "media:write"],
  },
  {
    id: "pages",
    label: "Pages & Layout Editor",
    description: "Create and update page drafts, navigation structures, and visual blocks.",
    scopes: ["pages:write", "pages:read:draft", "media:read"],
  },
  {
    id: "forms",
    label: "Forms & Submissions",
    description: "Manage form definitions and export survey submissions.",
    scopes: ["forms:read", "forms:write"],
  },
  {
    id: "custom",
    label: "Custom Scopes",
    description: "Manually select individual permissions.",
    scopes: [],
  },
];

export interface CustomScopeOption {
  id: string;
  label: string;
  category: string;
}

export const CUSTOM_SCOPE_OPTIONS: CustomScopeOption[] = [
  { id: "pages:read:draft", label: "Read Drafts", category: "Pages" },
  { id: "pages:write", label: "Edit Pages", category: "Pages" },
  { id: "blog:read:draft", label: "Read Drafts", category: "Blog" },
  { id: "blog:write", label: "Edit Posts", category: "Blog" },
  { id: "forms:read", label: "View Submissions", category: "Forms" },
  { id: "forms:write", label: "Edit Forms", category: "Forms" },
  { id: "media:read", label: "View Media", category: "Media" },
  { id: "media:write", label: "Upload Files", category: "Media" },
  { id: "system:settings:read", label: "View Settings", category: "System" },
  { id: "system:settings:write", label: "Update Settings", category: "System" },
];

interface AgentPreset {
  id: string;
  label: string;
  defaultName: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "antigravity",
    label: "Antigravity",
    defaultName: "Antigravity IDE",
    icon: Sparkles,
    color: "text-primary border-primary/30 bg-primary/5",
  },
  {
    id: "cursor",
    label: "Cursor",
    defaultName: "Cursor IDE Agent",
    icon: Code2,
    color: "text-blue-500 border-blue-500/30 bg-blue-500/5",
  },
  {
    id: "copilot",
    label: "Copilot",
    defaultName: "GitHub Copilot Agent",
    icon: GitBranch,
    color: "text-purple-500 border-purple-500/30 bg-purple-500/5",
  },
  {
    id: "codex",
    label: "Codex",
    defaultName: "OpenAI Codex Agent",
    icon: Cpu,
    color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
  },
  {
    id: "claude",
    label: "Claude",
    defaultName: "Claude Desktop",
    icon: Terminal,
    color: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    defaultName: "Windsurf Agent",
    icon: Workflow,
    color: "text-cyan-500 border-cyan-500/30 bg-cyan-500/5",
  },
  {
    id: "rest",
    label: "REST API",
    defaultName: "Custom Pipeline API",
    icon: Globe,
    color: "text-muted-foreground border-border bg-muted/40",
  },
];

export function CreateTokenDialog({ open, onOpenChange, onTokenCreated }: CreateTokenDialogProps) {
  // Step 1: Form state
  const [name, setName] = React.useState("");
  const [expiry, setExpiry] = React.useState("never");
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>("antigravity");
  const [selectedScopePreset, setSelectedScopePreset] = React.useState("full");
  const [customScopes, setCustomScopes] = React.useState<string[]>(["*"]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);

  // Step 2: Created token result state
  const [createdToken, setCreatedToken] = React.useState<string | null>(null);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [copiedConfig, setCopiedConfig] = React.useState(false);
  const [activeIntegrationTab, setActiveIntegrationTab] = React.useState("antigravity");

  const resetForm = React.useCallback(() => {
    setName("");
    setExpiry("never");
    setSelectedPresetId("antigravity");
    setSelectedScopePreset("full");
    setCustomScopes(["*"]);
    setNameError(null);
    setCreatedToken(null);
    setCopiedToken(false);
    setCopiedConfig(false);
    setActiveIntegrationTab("antigravity");
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (createdToken) {
        onTokenCreated();
      }
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSelectPreset = (preset: AgentPreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.defaultName);
    setActiveIntegrationTab(preset.id);
    if (nameError) setNameError(null);
  };

  const handleSelectScopePreset = (presetId: string) => {
    setSelectedScopePreset(presetId);
    const preset = SCOPE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (preset.id === "custom") {
        setCustomScopes((prev) =>
          prev.includes("*") ? ["pages:read:draft", "blog:read:draft"] : prev,
        );
      } else {
        setCustomScopes(preset.scopes);
      }
    }
  };

  const toggleScope = (scopeId: string) => {
    setCustomScopes((prev) => {
      const filtered = prev.filter((s) => s !== "*");
      if (filtered.includes(scopeId)) {
        return filtered.filter((s) => s !== scopeId);
      } else {
        return [...filtered, scopeId];
      }
    });
  };

  const submitForm = React.useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Please enter a token name");
      return;
    }
    setNameError(null);
    setIsSubmitting(true);

    try {
      const expiresInDays =
        expiry === "30d"
          ? 30
          : expiry === "60d"
            ? 60
            : expiry === "90d"
              ? 90
              : expiry === "365d"
                ? 365
                : undefined;

      const res = await api.post<{
        token?: string;
        rawToken?: string;
        apiKey?: string;
        apiToken?: ApiTokenItem;
        data?: { token?: string };
      }>("/auth/tokens", {
        name: trimmed,
        scopes: customScopes,
        expiresIn: expiry !== "never" ? expiry : undefined,
        expiresInDays,
      });

      const rawToken = res.token || res.rawToken || res.apiKey || res.data?.token;

      if (!rawToken) {
        throw new Error("Server did not return a generated token string");
      }

      setCreatedToken(rawToken);
      toast.success("API token generated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create token";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, expiry, customScopes]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  // Keyboard shortcut: Ctrl+S (Cmd+S) triggers submitForm when dialog is open and form not yet submitted
  useShortcut(
    "save",
    () => {
      if (open && !createdToken && !isSubmitting) {
        submitForm();
      }
    },
    { enabled: open && !createdToken && !isSubmitting },
  );

  const copyToClipboard = async (
    text: string,
    onSuccessState: (val: boolean) => void,
    successToast: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccessState(true);
      toast.success(successToast);
      setTimeout(() => onSuccessState(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const apiOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace(":3002", ":3001")
      : "http://localhost:3001";

  // Configuration templates for popular AI agents
  const configs: Record<string, { filename: string; text: string; copyLabel: string }> =
    React.useMemo(() => {
      const tok = createdToken || "cms_token_your_token_here";
      return {
        antigravity: {
          filename: "~/.gemini/config/mcp_config.json",
          copyLabel: "Copy Antigravity JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        cursor: {
          filename: ".cursor/mcp.json",
          copyLabel: "Copy Cursor JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        copilot: {
          filename: "~/.copilot/mcp-config.json",
          copyLabel: "Copy Copilot JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  type: "http",
                  url: `${apiOrigin}/api/mcp`,
                  tools: ["*"],
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        codex: {
          filename: "OpenAI Custom GPT Action / HTTP Header",
          copyLabel: "Copy Codex Headers",
          text: [
            "# Authentication Method: Bearer Token",
            `Authorization: Bearer ${tok}`,
            "",
            "# Streamable MCP Endpoint:",
            `${apiOrigin}/api/mcp`,
            "",
            "# Base Endpoint:",
            `${apiOrigin}/api`,
            "",
            "# cURL Example:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/mcp`,
          ].join("\n"),
        },
        claude: {
          filename: "claude_desktop_config.json",
          copyLabel: "Copy Claude JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        windsurf: {
          filename: "~/.codeium/windsurf/mcp_config.json",
          copyLabel: "Copy Windsurf JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        rest: {
          filename: "cURL / HTTP Request",
          copyLabel: "Copy cURL Snippet",
          text: [
            "# Streamable MCP Endpoint:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/mcp`,
            "",
            "# Health Check:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/health`,
            "",
            "# List Published Blog Posts:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/blog/posts`,
            "",
            "# Query Pages:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/pages`,
          ].join("\n"),
        },
      };
    }, [createdToken, apiOrigin]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {!createdToken ? (
          <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
            {/* Fixed Header */}
            <DialogHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Key className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-semibold">
                    Generate New Agent / API Token
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Scoped access keys for Antigravity, Cursor, Copilot, Codex, Claude, or
                    automation.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Form Body */}
            <DialogBody>
              {/* Preset Quick Selectors */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Select AI Agent / Tool Preset:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {AGENT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs"
                            : "border-border/60 hover:border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${preset.color}`}
                        >
                          <Icon className="size-3" />
                        </div>
                        <span className="text-xs font-medium truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <InputField
                label="Token Name / Description"
                placeholder="e.g. Antigravity IDE, Cursor Agent, GitHub Copilot"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                error={nameError || undefined}
                hint="Used to identify and revoke this access token in the admin panel."
                required
                autoFocus
              />

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Expiration Policy
                </label>
                <Select value={expiry} onValueChange={(val) => setExpiry(val || "never")}>
                  <SelectTrigger className="w-full text-xs h-9">
                    <SelectValue placeholder="Select expiry duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires (Recommended for IDEs)</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="60d">60 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="365d">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Tokens can be revoked immediately anytime from this dashboard.
                </p>
              </div>

              {/* Granular Permissions / Scope Picker */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground block">
                    Access Scopes & Permissions:
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {customScopes.includes("*")
                      ? "All permissions (*)"
                      : `${customScopes.length} selected`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SCOPE_PRESETS.map((preset) => {
                    const isSelected = selectedScopePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectScopePreset(preset.id)}
                        className={`flex flex-col text-left p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs"
                            : "border-border/60 hover:border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold">{preset.label}</span>
                          {isSelected && <Check className="size-3 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Granular Scope Checkboxes */}
                {selectedScopePreset === "custom" && (
                  <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-3 mt-2 animate-in fade-in duration-200">
                    <span className="text-xs font-medium text-foreground block">
                      Custom Granular Scopes
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {CUSTOM_SCOPE_OPTIONS.map((scopeItem) => {
                        const checked = customScopes.includes(scopeItem.id);
                        return (
                          <label
                            key={scopeItem.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleScope(scopeItem.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground text-xs leading-none">
                                  {scopeItem.label}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {scopeItem.category}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                                {scopeItem.id}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-xl space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Bot className="size-3.5 text-primary" />
                  <span>Model Context Protocol & Security Guardrails</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Generated keys grant access to system status, pages, blog articles, and forms.
                  Encrypted secrets inside the <strong>Password Vault</strong> are strictly isolated
                  and never accessible to AI agents.
                </p>
              </div>
            </DialogBody>

            {/* Pinned Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting}
                iconStart={<Key />}
              >
                <span>{isSubmitting ? "Generating..." : "Generate Token"}</span>
                <Kbd className="ml-1 opacity-80 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-[10px]">
                  Ctrl+S
                </Kbd>
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Step 2: Generated Token & Agent Config Screen */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Fixed Header */}
            <DialogHeader className="pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Check className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-semibold text-foreground">
                    Agent Token Generated Successfully
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Save your key now. Copy 1-click configuration for your preferred AI editor
                    below.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Body */}
            <DialogBody className="space-y-3.5">
              {/* Warning Banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-semibold block">Store this token in a safe location</span>
                  <span className="text-amber-500/90 leading-relaxed block text-[11px]">
                    Hashed with SHA-256 at rest (OWASP A07). This raw string will{" "}
                    <strong>never be displayed again</strong> after closing this window.
                  </span>
                </div>
              </div>

              {/* Raw Token Row */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  Raw Token (Bearer Secret):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdToken}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-muted/70 rounded-lg border border-border/80 text-foreground select-all outline-none truncate"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        createdToken,
                        setCopiedToken,
                        "Raw token copied to clipboard!",
                      )
                    }
                    iconStart={
                      copiedToken ? <Check className="text-white" /> : <Copy className="size-3.5" />
                    }
                  >
                    {copiedToken ? "Copied" : "Copy Token"}
                  </Button>
                </div>
              </div>

              {/* AI Agent Configuration Tabs */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Bot className="size-3.5 text-primary" />
                    <span>1-Click AI Agent & IDE Setup</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Choose editor
                  </span>
                </div>

                <Tabs
                  value={activeIntegrationTab}
                  onValueChange={setActiveIntegrationTab}
                  className="w-full space-y-2.5"
                >
                  <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 p-1 h-auto gap-0.5">
                    <TabsTrigger
                      value="antigravity"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Sparkles className="size-2.5 text-primary shrink-0" />
                      <span className="truncate">Antigravity</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="cursor"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Code2 className="size-2.5 text-blue-500 shrink-0" />
                      <span className="truncate">Cursor</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="copilot"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <GitBranch className="size-2.5 text-purple-500 shrink-0" />
                      <span className="truncate">Copilot</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="codex"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Cpu className="size-2.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Codex</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="claude"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Terminal className="size-2.5 text-amber-500 shrink-0" />
                      <span className="truncate">Claude</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="windsurf"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Workflow className="size-2.5 text-cyan-500 shrink-0" />
                      <span className="truncate">Windsurf</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="rest"
                      className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                    >
                      <Globe className="size-2.5 text-muted-foreground shrink-0" />
                      <span className="truncate">cURL</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Configuration Snippet for Active Agent */}
                  {Object.entries(configs).map(([key, config]) => (
                    <TabsContent key={key} value={key} className="space-y-1.5 mt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-85">
                          Target: <code className="text-foreground">{config.filename}</code>
                        </span>
                        <Button
                          type="button"
                          variant={key === "antigravity" ? "default" : "outline"}
                          size="xs"
                          onClick={() =>
                            copyToClipboard(
                              config.text,
                              setCopiedConfig,
                              `${config.copyLabel} successfully copied!`,
                            )
                          }
                          iconStart={
                            copiedConfig ? (
                              <Check
                                className={
                                  key === "antigravity" ? "text-white" : "text-emerald-500"
                                }
                              />
                            ) : (
                              <Copy className="size-3" />
                            )
                          }
                        >
                          {copiedConfig ? "Copied!" : config.copyLabel}
                        </Button>
                      </div>
                      <pre className="p-2.5 bg-muted/80 rounded-lg font-mono text-[11px] leading-relaxed text-foreground/90 overflow-x-auto border border-border/80 shadow-2xs max-h-36 whitespace-pre">
                        {config.text}
                      </pre>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </DialogBody>

            {/* Pinned Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full sm:w-28"
                iconStart={<Check className="size-3.5" />}
                onClick={() => {
                  onTokenCreated();
                  handleOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
