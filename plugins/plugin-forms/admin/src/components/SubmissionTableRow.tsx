"use client";

import { Badge, Button, formatDateTime, formatIp, TableCell, TableRow } from "@cms/admin-shell";
import { Eye } from "lucide-react";
import type { FormSubmissionItem } from "../types.js";

export interface SubmissionTableRowProps {
  submission: FormSubmissionItem;
  dataColumns: string[];
  onSelect: (sub: FormSubmissionItem) => void;
}

export function SubmissionTableRow({ submission, dataColumns, onSelect }: SubmissionTableRowProps) {
  return (
    <TableRow
      onClick={() => onSelect(submission)}
      className="text-xs hover:bg-muted/40 cursor-pointer transition-colors group"
    >
      <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
        {formatDateTime(submission.createdAt)}
      </TableCell>
      {dataColumns.map((col) => {
        const val = submission.data?.[col];
        const isEmail = typeof val === "string" && val.includes("@");
        return (
          <TableCell key={col} className="max-w-xs truncate text-foreground">
            {val === null || val === undefined ? (
              "—"
            ) : typeof val === "boolean" ? (
              <Badge variant={val ? "secondary" : "outline"} className="text-[10px] py-0">
                {val ? "Yes" : "No"}
              </Badge>
            ) : isEmail ? (
              <span className="text-primary hover:underline font-medium">{String(val)}</span>
            ) : typeof val === "object" ? (
              JSON.stringify(val)
            ) : (
              String(val)
            )}
          </TableCell>
        );
      })}
      <TableCell className="text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
        {formatIp(submission.ip)}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-60 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(submission);
          }}
          title="View Full Submission"
        >
          <Eye className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
