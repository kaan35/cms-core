"use client";

import {
  DialogDeleteConfirm,
  PageHeader,
  type PaginatedMeta,
  api,
  toast,
  useApi,
  isPastThreshold,
} from "@cms/admin-shell";
import { KeyRound } from "lucide-react";
import * as React from "react";
import { VaultFilterToolbar } from "./components/VaultFilterToolbar";
import { VaultImportModal } from "./components/VaultImportModal";
import { VaultItemModal } from "./components/VaultItemModal";
import { VaultStatsCards } from "./components/VaultStatsCards";
import { VaultTable } from "./components/VaultTable";
import { downloadVaultExport, downloadVaultTemplate } from "./components/vaultExportActions";
import type { VaultItem, VaultStats } from "./types.js";

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
    stats?: VaultStats;
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
    return items.filter((it) => isPastThreshold(it.passwordChangedAt || it.createdAt, 365, "days"))
      .length;
  }, [items]);

  const recentCount = React.useMemo(() => {
    return items.filter((it) => !isPastThreshold(it.passwordChangedAt || it.createdAt, 365, "days"))
      .length;
  }, [items]);

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
      await downloadVaultExport(format);
    } catch {
      toast.error("Failed to export vault credentials");
    } finally {
      setIsExporting(null);
    }
  };

  const totalCount = data?.stats?.total ?? meta?.total ?? items.length;
  const categoriesCount = data?.stats?.categoriesCount ?? availableCategories.length;
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <PageHeader
        title="Password Vault"
        description="Secure encrypted credentials, secret keys and website accounts"
        icon={KeyRound}
      />

      <VaultStatsCards
        total={totalCount}
        categoriesCount={categoriesCount}
        recentCount={data?.stats?.recentCount ?? recentCount}
        staleCount={data?.stats?.staleCount ?? staleCount}
      />

      <div className="space-y-4">
        <VaultFilterToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={(val) => {
            setSelectedCategory(val);
            setPage(1);
          }}
          categories={availableCategories}
          isLoading={isLoading}
          hasItems={items.length > 0}
          isExporting={isExporting}
          onRefresh={() => mutate()}
          onImportClick={() => setIsImportModalOpen(true)}
          onExport={handleExport}
          onDownloadTemplate={downloadVaultTemplate}
          onNewCredential={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
        />

        <VaultTable
          isLoading={isLoading}
          items={items}
          search={search}
          selectedCategory={selectedCategory}
          revealedPasswords={revealedPasswords}
          onReveal={handleReveal}
          onCopy={handleCopy}
          onEdit={(it) => {
            setEditingItem(it);
            setIsModalOpen(true);
          }}
          onDelete={setDeleteCandidate}
          onNewCredential={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
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
