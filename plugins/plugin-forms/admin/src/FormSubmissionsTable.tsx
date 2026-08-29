"use client";

import {
  Badge,
  Button,
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
import { ChevronLeft, ChevronRight, Download, Inbox, RefreshCw } from "lucide-react";
import * as React from "react";

export interface FormSubmissionItem {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  ip?: string | undefined;
  userAgent?: string | undefined;
  createdAt: string;
}

export interface FormSubmissionsTableProps {
  formId: string;
  formTitle?: string | undefined;
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str: string;
  if (typeof val === "object") {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function FormSubmissionsTable({ formId, formTitle }: FormSubmissionsTableProps) {
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<
    | {
        data: FormSubmissionItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | FormSubmissionItem[]
  >(`/api/forms/${formId}/submissions?page=${page}&limit=${limit}`);

  const submissions: FormSubmissionItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const totalCount = React.useMemo(() => {
    if (rawData && !Array.isArray(rawData) && typeof rawData.total === "number") {
      return rawData.total;
    }
    return submissions.length;
  }, [rawData, submissions]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Dynamically extract all unique keys from submission payload data
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

  // CSV Export logic
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      toast.error("No submissions available to export");
      return;
    }

    const headers = ["Submission ID", "Submitted At", "IP Address", ...dataColumns];
    const rows = submissions.map((sub) => {
      const rowCells = [
        escapeCsvCell(sub.id),
        escapeCsvCell(new Date(sub.createdAt).toISOString()),
        escapeCsvCell(sub.ip || ""),
        ...dataColumns.map((col) => escapeCsvCell(sub.data?.[col] ?? "")),
      ];
      return rowCells.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeTitle = (formTitle || "form-submissions").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.setAttribute("download", `${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Submissions CSV downloaded");
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalCount} Total Submission{totalCount === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            iconStart={<Download />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : submissions.length === 0 ? (
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
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="w-44 whitespace-nowrap">Submitted At</TableHead>
                  {dataColumns.map((col) => (
                    <TableHead key={col} className="capitalize whitespace-nowrap">
                      {col.replace(/[_-]/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead className="w-28 text-right whitespace-nowrap">IP / Origin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id} className="text-xs hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleString()}
                    </TableCell>
                    {dataColumns.map((col) => {
                      const val = sub.data?.[col];
                      return (
                        <TableCell key={col} className="max-w-xs truncate text-foreground">
                          {val === null || val === undefined
                            ? "—"
                            : typeof val === "boolean"
                              ? val
                                ? "✓ Yes"
                                : "✗ No"
                              : typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {sub.ip || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
