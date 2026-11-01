"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  InputSearchField,
  Tooltip,
} from "@cms/admin-shell";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, RefreshCw } from "lucide-react";

export interface SubmissionsFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  isExporting: "xlsx" | "csv" | null;
  onExport: (format: "xlsx" | "csv") => void;
  onRefresh: () => void;
}

export function SubmissionsFilterToolbar({
  search,
  onSearchChange,
  totalCount,
  filteredCount,
  isExporting,
  onExport,
  onRefresh,
}: SubmissionsFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
        <InputSearchField
          value={search}
          onSearchChange={onSearchChange}
          placeholder="Search submissions by text or email..."
          containerClassName="w-full sm:max-w-sm"
          className="bg-card w-full"
        />
        <Badge variant="outline" className="text-xs shrink-0 py-1 px-2.5 self-start sm:self-auto">
          {search ? (
            <span>
              {filteredCount} of {totalCount}
            </span>
          ) : (
            <span>
              {totalCount} Total Submission{totalCount === 1 ? "" : "s"}
            </span>
          )}
        </Badge>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Tooltip content="Refresh submissions">
          <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={totalCount === 0 || isExporting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-all outline-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 shadow-2xs"
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
