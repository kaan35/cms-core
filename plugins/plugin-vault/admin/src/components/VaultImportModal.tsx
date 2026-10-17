"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  api,
  toast,
} from "@cms/admin-shell";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import * as React from "react";

interface VaultImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: Array<{
    title: string;
    username: string;
    category: string;
    url: string;
    notes?: string;
    isValid: boolean;
    errorReason?: string;
  }>;
  items: unknown[];
}

export function VaultImportModal({ open, onOpenChange, onSuccess }: VaultImportModalProps) {
  const [activeTab, setActiveTab] = React.useState<"upload" | "paste">("upload");
  const [pasteContent, setPasteContent] = React.useState<string>("");
  const [fileName, setFileName] = React.useState<string>("");
  const [previewData, setPreviewData] = React.useState<PreviewResponse | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPasteContent("");
      setFileName("");
      setPreviewData(null);
      setParseError(null);
      setIsLoadingPreview(false);
      setIsImporting(false);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setPreviewData(null);
    setIsLoadingPreview(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setParseError("Could not read file from disk");
      setIsLoadingPreview(false);
    };
    reader.onload = async (evt) => {
      try {
        const dataUrl = evt.target?.result as string;
        const res = await api.post<PreviewResponse>("/vault/preview", {
          fileBase64: dataUrl,
          filename: file.name,
        });
        setPreviewData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to parse file";
        setParseError(msg);
        toast.error(msg);
        setPreviewData(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (activeTab !== "paste" || !pasteContent.trim()) {
      if (activeTab === "paste") setPreviewData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      try {
        const res = await api.post<PreviewResponse>("/vault/preview", { csv: pasteContent });
        setPreviewData(res);
      } catch {
        // quiet error or keep previous preview
      } finally {
        setIsLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pasteContent, activeTab]);

  const previewRows = previewData?.rows || [];
  const validCount = previewData?.validCount || 0;
  const invalidCount = previewData?.invalidCount || 0;

  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    window.location.href = `/api/vault/template?format=${format}`;
  };

  const handleImportSubmit = async () => {
    if (!previewData || previewData.validCount === 0) {
      toast.error("No valid credential rows found to import");
      return;
    }

    try {
      setIsImporting(true);
      const res = await api.post<{
        success: boolean;
        count: number;
        errors: Array<{ row: number; error: string }>;
      }>("/vault/import", { items: previewData.items });

      if (res?.success) {
        if (res.errors && res.errors.length > 0) {
          toast.success(
            `Imported ${res.count} credential(s). ${res.errors.length} row(s) had errors.`,
          );
        } else {
          toast.success(`Successfully imported ${res.count} credential(s)!`);
        }
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed to import credentials");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="gap-1 pb-3 border-b border-border/60 pr-8">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Upload className="size-5 text-primary" />
            Import Vault Credentials
          </DialogTitle>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              Import accounts and passwords in bulk via CSV or Excel template.
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate("xlsx")}
                className="h-7 text-xs font-normal"
                iconStart={<FileSpreadsheet className="size-3.5 text-emerald-600" />}
              >
                Template .xlsx
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate("csv")}
                className="h-7 text-xs font-normal"
                iconStart={<FileText className="size-3.5 text-sky-600" />}
              >
                Template .csv
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              const tab = val as "upload" | "paste";
              setActiveTab(tab);
              setPreviewData(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload" className="text-xs">
                Upload File
              </TabsTrigger>
              <TabsTrigger value="paste" className="text-xs">
                Paste CSV / Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer bg-muted/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"
                  className="hidden"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = "";
                  }}
                  onChange={handleFileUpload}
                />
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mx-auto mb-3 shadow-2xs">
                  <Upload className="size-6 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  {fileName ? fileName : "Click to browse or drop file here"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports Microsoft Excel (.xlsx), UTF-8 CSV, or TXT format.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-4 mt-0">
              <Textarea
                placeholder={`Title,Username,Password,URL,Category,Notes\n"GitHub","dev@example.com","P@ss123!","https://github.com","Development","Personal token"`}
                rows={6}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="font-mono text-xs"
              />
            </TabsContent>
          </Tabs>

          {isLoadingPreview && (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Reading and validating records...</span>
            </div>
          )}

          {parseError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3 text-xs">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">Failed to parse file</p>
                <p className="text-muted-foreground mt-0.5">{parseError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 h-7 text-xs"
                >
                  Select another file
                </Button>
              </div>
            </div>
          )}

          {!isLoadingPreview && !parseError && previewData && previewRows.length === 0 && (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-center">
              <AlertCircle className="size-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-foreground">
                No credential rows found in this file
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md mx-auto">
                The file was read successfully, but no credential accounts were found below the
                header row. Add rows to your spreadsheet and upload again.
              </p>
            </div>
          )}

          {!isLoadingPreview && previewRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Preview ({previewRows.length} total rows)
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[11px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                  >
                    <CheckCircle2 className="size-3 mr-1 inline" />
                    {validCount} Ready
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[11px] text-amber-600 bg-amber-500/10 border-amber-500/20"
                    >
                      <AlertCircle className="size-3 mr-1 inline" />
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 overflow-hidden max-h-56 overflow-y-auto text-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={
                          row.isValid ? "text-xs" : "bg-destructive/5 text-xs text-destructive"
                        }
                      >
                        <TableCell className="w-20">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Valid
                            </span>
                          ) : (
                            <span
                              className="text-destructive font-medium text-[11px] flex items-center gap-1"
                              title={row.errorReason}
                            >
                              <AlertCircle className="size-3" /> Error
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.title || "—"}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {row.username || "—"}
                        </TableCell>
                        <TableCell>{row.category || "General"}</TableCell>
                        <TableCell className="max-w-30 truncate">{row.url || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>

          <Button
            onClick={handleImportSubmit}
            disabled={isImporting || validCount === 0}
            loading={isImporting}
            iconStart={<Upload className="size-4" />}
          >
            {isImporting
              ? "Importing..."
              : `Import ${validCount > 0 ? `${validCount} Credentials` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
