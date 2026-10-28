"use client";

import {
  api,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  toast,
  useApi,
  type PaginatedMeta,
} from "@cms/admin-shell";
import { ClipboardList } from "lucide-react";
import * as React from "react";
import { FormDeleteDialog } from "./components/FormDeleteDialog";
import { FormListToolbar } from "./components/FormListToolbar";
import { FormTableRow } from "./components/FormTableRow";
import type { FormListItem } from "./components/formTypes";

export type { FormListItem };

export function FormList() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [deleteModal, setDeleteModal] = React.useState<{
    target: FormListItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  const endpoint = `/forms?${queryParams.toString()}`;

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<
    { forms?: FormListItem[]; data?: FormListItem[]; meta?: PaginatedMeta } | FormListItem[]
  >(endpoint);
  const rawObj = rawData as {
    forms?: FormListItem[];
    data?: FormListItem[];
    meta?: PaginatedMeta;
  } | null;
  const forms: FormListItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawObj?.data)
      ? rawObj.data
      : Array.isArray(rawObj?.forms)
        ? rawObj.forms
        : [];
  const meta = rawObj?.meta;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/forms/${deleteModal.target.id}`);
      toast.success(`Form "${deleteModal.target.title}" deleted`);
      setDeleteModal({ target: null, isDeleting: false });
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete form");
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <FormListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        onRefresh={() => mutate()}
      />

      {/* Forms Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <ClipboardList className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No forms found</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? "No matching form definitions found for your search query."
                : "Create your first interactive contact form, survey, or submission capture definition."}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="w-[45%]">Form Name & Slug</TableHead>
                  <TableHead className="w-[15%]">Fields</TableHead>
                  <TableHead className="w-[18%]">Protection</TableHead>
                  <TableHead className="w-[22%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <FormTableRow
                    key={form.id}
                    form={form}
                    onDeleteClick={(target) => setDeleteModal({ target, isDeleting: false })}
                  />
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={
                meta?.totalPages ?? Math.max(1, Math.ceil((meta?.total ?? forms.length) / limit))
              }
              totalCount={meta?.total ?? forms.length}
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

      {/* Delete Confirmation Modal */}
      <FormDeleteDialog
        target={deleteModal.target}
        isDeleting={deleteModal.isDeleting}
        onClose={() => setDeleteModal({ target: null, isDeleting: false })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
