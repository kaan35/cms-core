"use client";

import {
  Button,
  DialogDeleteConfirm,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  api,
  toast,
  useApi,
} from "@cms/admin-shell";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import * as React from "react";
import { VaultImportModal } from "./components/VaultImportModal";
import { VaultItemModal, type VaultItem } from "./components/VaultItemModal";
import { VaultTableRow } from "./components/VaultTableRow";

interface VaultApiResponse {
  items: VaultItem[];
}

export function VaultListPage() {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<"xlsx" | "csv" | null>(null);
  const [editingItem, setEditingItem] = React.useState<VaultItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState<VaultItem | null>(null);
  const [revealedPasswords, setRevealedPasswords] = React.useState<Record<string, string>>({});

  const { data, isLoading, mutate } = useApi<VaultApiResponse>("/vault/items");
  const items = data?.items || [];

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category.trim());
    });
    return ["all", ...Array.from(set)];
  }, [items]);

  const availableCategories = React.useMemo(
    () => categories.filter((c) => c !== "all"),
    [categories],
  );

  const filteredItems = React.useMemo(() => {
    return items.filter((it) => {
      const matchesCategory = selectedCategory === "all" || it.category === selectedCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        it.title.toLowerCase().includes(q) ||
        it.username.toLowerCase().includes(q) ||
        it.url?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, search]);

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
    <div className="space-y-6">
      <PageHeader
        title="Password Vault"
        description="Secure encrypted credentials, secret keys and website accounts"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              iconStart={<RefreshCw className="size-4" />}
              title="Refresh vault"
            />

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
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-all outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 shadow-2xs"
              >
                <Download className="size-3.5" />
                <span>{isExporting ? "Exporting..." : "Export"}</span>
                <ChevronDown className="size-3 opacity-60 ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => handleExport("xlsx")}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  <span>Excel Spreadsheet (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <FileText className="size-4 text-sky-600" />
                  <span>CSV Document (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground"
                >
                  <Download className="size-3.5" />
                  <span>Download Blank Template (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownloadTemplate("csv")}
                  className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground"
                >
                  <Download className="size-3.5" />
                  <span>Download Blank Template (.csv)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              iconStart={<Plus className="size-4" />}
            >
              New Credential
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <KeyRound className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {search ? "No credentials found" : "No credentials stored yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? "No credentials match your search filter."
                : "Securely store your first website login, database secret, or server credential."}
            </p>
            {!search && (
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead>Account / Title</TableHead>
                <TableHead>Username / Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
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
        )}
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
