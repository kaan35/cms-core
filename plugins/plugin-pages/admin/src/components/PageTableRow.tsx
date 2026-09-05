"use client";

import { Badge, Button, TableCell, TableRow } from "@cms/admin-shell";
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
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileEdit className="size-3.5" />
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
        <Badge
          variant={page.status === "published" ? "default" : "secondary"}
          className="text-[10px]"
        >
          {page.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {page.blocks?.length || 0} blocks
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/dashboard/pages/${page.id}`}>
            <Button variant="ghost" iconStart={<Pencil />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteRequest(page)}
            iconStart={<Trash2 className="text-destructive" />}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
