"use client";

import {
  Button,
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
import { Inbox, Search } from "lucide-react";
import * as React from "react";
import { SubmissionDetailDialog } from "./components/SubmissionDetailDialog";
import { SubmissionsFilterToolbar } from "./components/SubmissionsFilterToolbar";
import { SubmissionTableRow } from "./components/SubmissionTableRow";
import { downloadSubmissionsExport } from "./components/submissionsExport";
import type { FormSubmissionItem } from "./types.js";

export type { FormSubmissionItem } from "./types.js";

export interface FormSubmissionsTableProps {
  formId: string;
  formTitle?: string | undefined;
}

export function FormSubmissionsTable({ formId, formTitle }: FormSubmissionsTableProps) {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [selectedSubmission, setSelectedSubmission] = React.useState<FormSubmissionItem | null>(
    null,
  );
  const [isExporting, setIsExporting] = React.useState<"xlsx" | "csv" | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  const endpoint = `/api/forms/${formId}/submissions?${queryParams.toString()}`;

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<
    | {
        data?: FormSubmissionItem[];
        items?: FormSubmissionItem[];
        meta?: PaginatedMeta;
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      }
    | FormSubmissionItem[]
  >(endpoint);

  const rawObj = rawData && !Array.isArray(rawData) ? rawData : null;

  const submissions: FormSubmissionItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawObj && Array.isArray(rawObj.data)) return rawObj.data;
    if (rawObj && Array.isArray(rawObj.items)) return rawObj.items;
    return [];
  }, [rawData, rawObj]);

  const meta = rawObj?.meta;

  const totalCount = React.useMemo(() => {
    if (meta && typeof meta.total === "number") return meta.total;
    if (rawObj && typeof rawObj.total === "number") return rawObj.total;
    return submissions.length;
  }, [meta, rawObj, submissions.length]);

  const totalPages =
    meta?.totalPages ?? (rawObj?.totalPages || Math.max(1, Math.ceil(totalCount / limit)));

  const dataColumns = React.useMemo(() => {
    const keySet = new Set<string>();
    for (const sub of submissions) {
      if (sub.data && typeof sub.data === "object") {
        for (const key of Object.keys(sub.data)) {
          keySet.add(key);
        }
      }
    }
    return Array.from(keySet);
  }, [submissions]);

  const handleExport = async (format: "xlsx" | "csv") => {
    if (totalCount === 0) {
      toast.error("No submissions available to export");
      return;
    }
    try {
      setIsExporting(format);
      await downloadSubmissionsExport(formId, formTitle, format);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export submissions");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <SubmissionsFilterToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        totalCount={totalCount}
        filteredCount={submissions.length}
        isExporting={isExporting}
        onExport={handleExport}
        onRefresh={() => mutate()}
      />

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : submissions.length === 0 ? (
          search ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mb-2.5">
                <Search className="size-5 opacity-70" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">No matching submissions</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                No entries found matching &ldquo;{search}&rdquo;. Try another search term.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="mt-3 text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
                <Inbox className="size-6 opacity-80" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No submissions yet</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                When users complete and submit this form on your website, responses will appear here
                in real-time.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="w-40 whitespace-nowrap">Submitted At</TableHead>
                    {dataColumns.map((col) => (
                      <TableHead key={col} className="capitalize whitespace-nowrap">
                        {col.replace(/[_-]/g, " ")}
                      </TableHead>
                    ))}
                    <TableHead className="w-28 text-right whitespace-nowrap">IP / Origin</TableHead>
                    <TableHead className="w-16 text-right whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <SubmissionTableRow
                      key={sub.id}
                      submission={sub}
                      dataColumns={dataColumns}
                      onSelect={setSelectedSubmission}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <TablePagination
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
          </>
        )}
      </div>

      <SubmissionDetailDialog
        submission={selectedSubmission}
        formTitle={formTitle}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
