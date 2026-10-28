"use client";

import {
  Button,
  DialogDeleteConfirm,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  Tooltip,
  api,
  toast,
  useApi,
} from "@cms/admin-shell";
import {
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  FolderLock,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import * as React from "react";
import { VaultImportModal } from "./components/VaultImportModal";
import { VaultItemModal, isPasswordStale, type VaultItem } from "./components/VaultItemModal";
import { VaultTableRow } from "./components/VaultTableRow";

export function VaultListPage() {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<"xlsx" | "csv" | null>(null);
  const [editingItem, setEditingItem] = React.useState<VaultItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState<VaultItem | null>(null);
  const [revealedPasswords, setRevealedPasswords] = React.useState<Record<string, string>>({});

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (selectedCategory && selectedCategory !== "all") queryParams.set("category", selectedCategory);
  const endpoint = `/vault/items?${queryParams.toString()}`;

  const { data, isLoading, mutate } = useApi<{
    items?: VaultItem[];
    data?: VaultItem[];
    meta?: PaginatedMeta;
    categories?: string[];
  }>(endpoint);

  const items = data?.data || data?.items || [];
  const meta = data?.meta;

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(data?.categories || []);
    items.forEach((it) => {
      if (it.category) set.add(it.category.trim());
    });
    return Array.from(set);
  }, [data?.categories, items]);

  const staleCount = React.useMemo(() => {
    return items.filter((it) => isPasswordStale(it.passwordChangedAt || it.createdAt)).length;
  }, [items]);

  const recentCount = React.useMemo(() => {
    return items.filter((it) => !isPasswordStale(it.passwordChangedAt || it.createdAt)).length;
  }, [items]);

  const displayItems = items;

  const handleReveal = async (id: string) => {
    if (revealedPasswords[id]) {
      setRevealedPasswords((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }
    try {
      const res = await api.post<{ password: string }>(`/vault/items/${id}/reveal`);
      if (res?.password) {
        setRevealedPasswords((prev) => ({ ...prev, [id]: res.password }));
      }
    } catch {
      toast.error("Failed to reveal password");
    }
  };

  const handleCopy = async (id: string) => {
    try {
      let pwd = revealedPasswords[id];
      if (!pwd) {
        const res = await api.post<{ password: string }>(`/vault/items/${id}/reveal`);
        pwd = res?.password;
      }
      if (pwd) {
        await navigator.clipboard.writeText(pwd);
        toast.success("Password copied to clipboard!");
      }
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate?.id) return;
    try {
      await api.delete(`/vault/items/${deleteCandidate.id}`);
      toast.success("Credential deleted");
      mutate();
    } catch {
      toast.error("Failed to delete credential");
    } finally {
      setDeleteCandidate(null);
    }
  };

  const handleExport = async (format: "xlsx" | "csv") => {
    if (items.length === 0) {
      toast.error("No vault credentials to export");
      return;
    }
    try {
      setIsExporting(format);
      const res = await fetch(`/api/vault/export?format=${format}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`);
      }

      const disposition = res.headers.get("Content-Disposition");
      let filename = "";
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = match[1];
      }
      if (!filename) {
        filename = `vault-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        format === "xlsx"
          ? "Excel spreadsheet exported successfully"
          : "CSV document exported successfully",
      );
    } catch {
      toast.error("Failed to export vault credentials");
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadTemplate = (format: "xlsx" | "csv") => {
    window.location.href = `/api/vault/template?format=${format}`;
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Unified PageHeader */}
      <PageHeader
        title="Password Vault"
        description="Secure encrypted credentials, secret keys and website accounts"
        icon={KeyRound}
      />

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Credentials"
          value={meta?.total ?? displayItems.length}
          description="Stored encrypted credentials"
          icon={KeyRound}
        />
        <StatCard
          title="Categories"
          value={availableCategories.length}
          description="Account groupings"
          icon={FolderLock}
        />
        <StatCard
          title="Recently Changed"
          value={recentCount}
          description={
            staleCount > 0 ? `${staleCount} require rotation` : "All passwords up to date"
          }
          icon={Clock}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Unified Search & Action Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
            <InputSearchField
              placeholder="Filter credentials by title, username, or URL..."
              value={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              containerClassName="w-full sm:max-w-sm"
              className="bg-card w-full"
            />

            {availableCategories.length > 0 && (
              <div className="w-36">
                <SelectFilter
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setSelectedCategory(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...availableCategories.map((cat) => ({
                      value: cat,
                      label: cat.charAt(0).toUpperCase() + cat.slice(1),
                    })),
                  ]}
                  placeholder="All Categories"
                  className="h-8 text-xs min-w-36 w-full bg-card capitalize"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tooltip content="Refresh vault">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                iconStart={<RefreshCw />}
                disabled={isLoading}
              />
            </Tooltip>

            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              iconStart={<Upload className="size-4" />}
            >
              Import
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={items.length === 0 || isExporting !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-all outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 shadow-2xs"
              >
                {isExporting !== null ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>{isExporting ? "Exporting..." : "Export"}</span>
                <ChevronDown className="size-3 opacity-60 ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 p-1.5 rounded-xl border border-border/80 shadow-xl space-y-1"
              >
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Export Vault Records
                </div>
                <DropdownMenuItem
                  onClick={() => handleExport("xlsx")}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs text-foreground">
                      Excel Spreadsheet (.xlsx)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Formatted OpenXML workbook
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    <FileText className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs text-foreground">CSV Document (.csv)</span>
                    <span className="text-[11px] text-muted-foreground">
                      UTF-8 BOM for Microsoft Excel
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-border/60" />

                <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Blank Import Templates
                </div>

                <DropdownMenuItem
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                    <Download className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs text-foreground">
                      Blank Template (.xlsx)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Formatted Excel template for import
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleDownloadTemplate("csv")}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                    <Download className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs text-foreground">
                      Blank Template (.csv)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      RFC 4180 CSV with sample headers
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              iconStart={<Plus className="size-4" />}
              className="w-full sm:w-auto"
            >
              New Credential
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-semibold">Account / Title</TableHead>
                  <TableHead className="font-semibold">Username / Email</TableHead>
                  <TableHead className="font-semibold">Password</TableHead>
                  <TableHead className="font-semibold">URL</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
                <KeyRound className="size-6 opacity-80" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {search || selectedCategory !== "all"
                  ? "No credentials found"
                  : "No credentials stored yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                {search || selectedCategory !== "all"
                  ? "No credentials match your search or filter criteria."
                  : "Securely store your first website login, database secret, or server credential."}
              </p>
              {!search && selectedCategory === "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setIsModalOpen(true);
                  }}
                  iconStart={<Plus className="size-3.5" />}
                  className="mt-4 text-xs"
                >
                  Add Credential
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="font-semibold">Account / Title</TableHead>
                    <TableHead className="font-semibold">Username / Email</TableHead>
                    <TableHead className="font-semibold">Password</TableHead>
                    <TableHead className="font-semibold">URL</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item) => (
                    <VaultTableRow
                      key={item.id}
                      item={item}
                      revealedPassword={item.id ? revealedPasswords[item.id] : undefined}
                      onReveal={handleReveal}
                      onCopy={handleCopy}
                      onEdit={(it) => {
                        setEditingItem(it);
                        setIsModalOpen(true);
                      }}
                      onDelete={setDeleteCandidate}
                    />
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                totalPages={
                  meta?.totalPages ??
                  Math.max(1, Math.ceil((meta?.total ?? displayItems.length) / limit))
                }
                totalCount={meta?.total ?? displayItems.length}
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

      <VaultItemModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        item={editingItem}
        categories={availableCategories}
        onSuccess={() => mutate()}
      />

      <VaultImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => mutate()}
      />

      <DialogDeleteConfirm
        open={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Credential"
        itemTitle={deleteCandidate?.title}
        onConfirm={handleDelete}
      />
    </div>
  );
}
