"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  apiClient,
  Badge,
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import {
  ClipboardList,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: unknown[];
  captchaProvider: "none" | "challenge";
  challengeType: "alphanumeric" | "math";
  submitButtonText: string;
  successMessage: string;
  createdAt: string;
  updatedAt: string;
}

export function FormList() {
  const [search, setSearch] = React.useState("");
  const [deleteModal, setDeleteModal] = React.useState<{
    target: FormListItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ forms: FormListItem[] } | { data: FormListItem[] } | FormListItem[]>("/api/forms");

  const forms: FormListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && "forms" in rawData && Array.isArray(rawData.forms)) return rawData.forms;
    if (rawData && "data" in rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const filteredForms = React.useMemo(() => {
    return forms.filter((form) => {
      return (
        form.title.toLowerCase().includes(search.toLowerCase()) ||
        form.slug.toLowerCase().includes(search.toLowerCase()) ||
        (form.description && form.description.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [forms, search]);

  const handleDeleteConfirm = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await apiClient(`/api/forms/${deleteModal.target.id}`, { method: "DELETE" });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search forms by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => mutate()}
            title="Refresh forms list"
            iconStart={<RefreshCw />}
          />

          <Link href="/dashboard/forms/new" className="flex-1 sm:flex-none">
            <Button iconStart={<Plus />} className="w-full sm:w-auto">
              Create Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Forms Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : filteredForms.length === 0 ? (
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[40%]">Form Name & Slug</TableHead>
                <TableHead className="w-[15%]">Fields</TableHead>
                <TableHead className="w-[20%]">Protection</TableHead>
                <TableHead className="w-[25%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.map((form) => (
                <TableRow key={form.id} className="text-xs hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 mt-0.5">
                        <ClipboardList className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/forms/${form.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {form.title}
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          /{form.slug}
                        </span>
                        {form.description && (
                          <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {form.fields?.length || 0}
                    </span>{" "}
                    fields
                  </TableCell>

                  <TableCell>
                    {form.captchaProvider === "challenge" ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] gap-1 py-0.5"
                      >
                        <ShieldCheck className="size-3" />
                        {form.challengeType === "math" ? "Math Captcha" : "Code Captcha"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground border-border text-[10px] gap-1 py-0.5"
                      >
                        <ShieldAlert className="size-3" />
                        No Captcha
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/dashboard/forms/${form.id}/submissions`}>
                        <Button variant="outline" iconStart={<Inbox />}>
                          Submissions
                        </Button>
                      </Link>
                      <Link href={`/dashboard/forms/${form.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Form"
                          iconStart={<Pencil />}
                        />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteModal({ target: form, isDeleting: false })}
                        title="Delete Form"
                        iconStart={<Trash2 className="text-destructive" />}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={Boolean(deleteModal.target)}
        onOpenChange={(open) => !open && setDeleteModal({ target: null, isDeleting: false })}
      >
        <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Delete Form Definition
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to delete form{" "}
              <strong className="text-foreground font-semibold">
                "{deleteModal.target?.title}"
              </strong>
              ? All associated fields and captured submissions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
            <AlertDialogCancel disabled={deleteModal.isDeleting} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              loading={deleteModal.isDeleting}
              iconStart={<Trash2 />}
            >
              {deleteModal.isDeleting ? "Deleting..." : "Delete Form"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
