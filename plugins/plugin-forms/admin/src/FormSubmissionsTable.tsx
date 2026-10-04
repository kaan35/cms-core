"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  formatDateTime,
  InputSearchField,
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
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
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

function cleanIp(ip?: string): string {
  if (!ip) return "—";
  const cleaned = ip.replace(/^::ffff:/, "");
  if (cleaned === "127.0.0.1" || cleaned === "::1") return "Localhost (127.0.0.1)";
  return cleaned;
}

export function FormSubmissionsTable({ formId, formTitle }: FormSubmissionsTableProps) {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [selectedSubmission, setSelectedSubmission] = React.useState<FormSubmissionItem | null>(
    null,
  );
  const [copiedJson, setCopiedJson] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<"xlsx" | "csv" | null>(null);
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

  // Real-time search filter across all fields, IP, and submission ID
  const filteredSubmissions = React.useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter((sub) => {
      if (sub.id.toLowerCase().includes(q)) return true;
      if (sub.ip && sub.ip.toLowerCase().includes(q)) return true;
      if (sub.data && typeof sub.data === "object") {
        return Object.values(sub.data).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      }
      return false;
    });
  }, [submissions, search]);

  // Server-side Full Submissions Export
  const handleExport = async (format: "xlsx" | "csv") => {
    if (totalCount === 0) {
      toast.error("No submissions available to export");
      return;
    }

    try {
      setIsExporting(format);
      const res = await fetch(`/api/forms/${formId}/submissions/export?format=${format}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`);
      }

      const disposition = res.headers.get("Content-Disposition");
      let filename = "";
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }
      if (!filename) {
        const safeTitle = (formTitle || "form-submissions")
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, "-");
        filename = `${safeTitle}-submissions-${new Date().toISOString().slice(0, 10)}.${format}`;
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
          ? "Excel spreadsheet downloaded successfully"
          : "CSV document downloaded successfully",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export submissions");
    } finally {
      setIsExporting(null);
    }
  };

  const handleCopyJson = () => {
    if (!selectedSubmission) return;
    navigator.clipboard.writeText(JSON.stringify(selectedSubmission.data, null, 2));
    setCopiedJson(true);
    toast.success("Submission data copied to clipboard");
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Helper to extract email for direct mailto action
  const selectedEmail = React.useMemo(() => {
    if (!selectedSubmission?.data) return null;
    const entries = Object.entries(selectedSubmission.data);
    const emailEntry = entries.find(
      ([k, v]) => k.toLowerCase().includes("email") || (typeof v === "string" && v.includes("@")),
    );
    return emailEntry ? String(emailEntry[1]) : null;
  }, [selectedSubmission]);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1">
          <InputSearchField
            value={search}
            onSearchChange={setSearch}
            placeholder="Search submissions (name, email, text)..."
            className="w-full sm:w-72"
          />
          <Badge variant="outline" className="text-xs shrink-0 py-1 px-2.5">
            {search ? (
              <span>
                {filteredSubmissions.length} of {totalCount}
              </span>
            ) : (
              <span>
                {totalCount} Total Submission{totalCount === 1 ? "" : "s"}
              </span>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={totalCount === 0 || isExporting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-all outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 shadow-2xs"
            >
              {isExporting !== null ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span>Export</span>
              <ChevronDown className="size-3 opacity-60 ml-0.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-1.5 rounded-xl border border-border/80 shadow-xl space-y-1"
            >
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
            </DropdownMenuContent>
          </DropdownMenu>
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
        ) : filteredSubmissions.length === 0 ? (
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
              onClick={() => setSearch("")}
              className="mt-3 text-xs"
            >
              Clear Search
            </Button>
          </div>
        ) : (
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
                {filteredSubmissions.map((sub) => (
                  <TableRow
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className="text-xs hover:bg-muted/40 cursor-pointer transition-colors group"
                  >
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(sub.createdAt)}
                    </TableCell>
                    {dataColumns.map((col) => {
                      const val = sub.data?.[col];
                      const isEmail = typeof val === "string" && val.includes("@");
                      return (
                        <TableCell key={col} className="max-w-xs truncate text-foreground">
                          {val === null || val === undefined ? (
                            "—"
                          ) : typeof val === "boolean" ? (
                            <Badge
                              variant={val ? "secondary" : "outline"}
                              className="text-[10px] py-0"
                            >
                              {val ? "Yes" : "No"}
                            </Badge>
                          ) : isEmail ? (
                            <span className="text-primary hover:underline font-medium">
                              {String(val)}
                            </span>
                          ) : typeof val === "object" ? (
                            JSON.stringify(val)
                          ) : (
                            String(val)
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {cleanIp(sub.ip)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubmission(sub);
                        }}
                        title="View Full Submission"
                      >
                        <Eye className="size-3.5" />
                      </Button>
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

      {/* Submission Detail Modal */}
      <Dialog
        open={selectedSubmission !== null}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <div className="space-y-5">
              <DialogHeader className="pr-10">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 font-semibold text-sm">
                    <User className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-foreground">
                      Submission Details
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Received on {formatDateTime(selectedSubmission.createdAt)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Submitted Fields */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Form Response Data
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedSubmission.data || {}).map(([key, val]) => {
                    const label = key.replace(/[_-]/g, " ");
                    const isLongText =
                      typeof val === "string" && (val.length > 50 || val.includes("\n"));
                    const isEmail = typeof val === "string" && val.includes("@");

                    if (isLongText) {
                      return (
                        <div
                          key={key}
                          className="sm:col-span-2 rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            {label}
                          </span>
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed select-text">
                            {String(val)}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          {label}
                        </span>
                        <div>
                          {val === null || val === undefined ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : typeof val === "boolean" ? (
                            <Badge variant={val ? "secondary" : "outline"} className="text-[11px]">
                              {val ? "Yes" : "No"}
                            </Badge>
                          ) : isEmail ? (
                            <a
                              href={`mailto:${String(val)}`}
                              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                            >
                              <Mail className="size-3.5 shrink-0" />
                              <span>{String(val)}</span>
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-foreground select-text break-words">
                              {String(val)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technical Audit Metadata */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit & Origin
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      IP Address
                    </span>
                    <span className="font-mono text-xs text-foreground font-medium block">
                      {cleanIp(selectedSubmission.ip)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Submission ID
                    </span>
                    <span
                      className="font-mono text-[11px] text-muted-foreground block truncate select-all"
                      title={selectedSubmission.id}
                    >
                      {selectedSubmission.id}
                    </span>
                  </div>
                  {selectedSubmission.userAgent && (
                    <div className="sm:col-span-2 rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                        <Globe className="size-3 text-muted-foreground" />
                        <span>User Agent</span>
                      </span>
                      <p className="font-mono text-[11px] text-muted-foreground leading-relaxed break-all select-text">
                        {selectedSubmission.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="pt-3 border-t border-border/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  {selectedEmail && (
                    <a
                      href={`mailto:${selectedEmail}?subject=Regarding your submission to ${formTitle || "Form"}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs"
                    >
                      <Mail className="size-3.5" />
                      <span>Reply via Email</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJson}
                    iconStart={copiedJson ? <Check className="text-emerald-500" /> : <Copy />}
                  >
                    {copiedJson ? "Copied JSON!" : "Copy JSON"}
                  </Button>
                  <DialogClose render={<Button variant="default" size="sm" />}>Close</DialogClose>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
