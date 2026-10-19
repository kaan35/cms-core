"use client";

import {
  Badge,
  Button,
  formatDate,
  StatusBadge,
  TableCell,
  TableRow,
  Tooltip,
} from "@cms/admin-shell";
import { FileEdit, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { PageListItem } from "../PageList";

interface PageTableRowProps {
  page: PageListItem;
  onDeleteRequest: (page: PageListItem) => void;
}

export function PageTableRow({ page, onDeleteRequest }: PageTableRowProps) {
  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <FileEdit className="size-4" />
          </div>
          <Link
            href={`/dashboard/pages/${page.id}`}
            className="text-foreground hover:text-primary transition-colors font-semibold flex items-center gap-1.5"
          >
            <span>{page.title}</span>
            {page.pageType === "home" && (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[9px] px-1.5 py-0"
              >
                Home
              </Badge>
            )}
          </Link>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">/{page.slug}</TableCell>
      <TableCell>
        <StatusBadge status={page.status} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {page.blocks?.length || 0} blocks
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(page.updatedAt)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip content="Edit Page">
            <Link href={`/dashboard/pages/${page.id}`}>
              <Button variant="ghost" size="icon-xs">
                <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </Link>
          </Tooltip>
          <Tooltip content="Delete Page">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDeleteRequest(page)}
              className="hover:text-destructive"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
