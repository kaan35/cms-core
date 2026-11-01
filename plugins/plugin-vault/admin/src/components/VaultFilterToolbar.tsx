"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InputSearchField,
  SelectFilter,
  Tooltip,
} from "@cms/admin-shell";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

export interface VaultFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  isLoading: boolean;
  hasItems: boolean;
  isExporting: "xlsx" | "csv" | null;
  onRefresh: () => void;
  onImportClick: () => void;
  onExport: (format: "xlsx" | "csv") => void;
  onDownloadTemplate: (format: "xlsx" | "csv") => void;
  onNewCredential: () => void;
}

export function VaultFilterToolbar({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  isLoading,
  hasItems,
  isExporting,
  onRefresh,
  onImportClick,
  onExport,
  onDownloadTemplate,
  onNewCredential,
}: VaultFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
        <InputSearchField
          placeholder="Filter credentials by title, username, or URL..."
          value={search}
          onSearchChange={onSearchChange}
          containerClassName="w-full sm:max-w-sm"
          className="bg-card w-full"
        />

        {categories.length > 0 && (
          <div className="w-36">
            <SelectFilter
              value={selectedCategory}
              onValueChange={onCategoryChange}
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((cat) => ({
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
            onClick={onRefresh}
            iconStart={<RefreshCw />}
            disabled={isLoading}
          />
        </Tooltip>

        <Button variant="outline" onClick={onImportClick} iconStart={<Upload className="size-4" />}>
          Import
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!hasItems || isExporting !== null}
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
              onClick={() => onExport("xlsx")}
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
              onClick={() => onExport("csv")}
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
              onClick={() => onDownloadTemplate("xlsx")}
              className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                <Download className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-xs text-foreground">Blank Template (.xlsx)</span>
                <span className="text-[11px] text-muted-foreground">
                  Formatted Excel template for import
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onDownloadTemplate("csv")}
              className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                <Download className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-xs text-foreground">Blank Template (.csv)</span>
                <span className="text-[11px] text-muted-foreground">
                  RFC 4180 CSV with sample headers
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={onNewCredential}
          iconStart={<Plus className="size-4" />}
          className="w-full sm:w-auto"
        >
          New Credential
        </Button>
      </div>
    </div>
  );
}
