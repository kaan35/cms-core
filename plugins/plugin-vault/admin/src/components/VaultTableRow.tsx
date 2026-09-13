"use client";

import { Badge, Button, TableCell, TableRow } from "@cms/admin-shell";
import { Copy, ExternalLink, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { VaultItem } from "./VaultItemModal";

interface VaultTableRowProps {
  item: VaultItem;
  revealedPassword?: string | undefined;
  onReveal: (id: string) => void;
  onCopy: (id: string) => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (item: VaultItem) => void;
}

export function VaultTableRow({
  item,
  revealedPassword,
  onReveal,
  onCopy,
  onEdit,
  onDelete,
}: VaultTableRowProps) {
  return (
    <TableRow className="text-xs">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">{item.title}</span>
          {item.category && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {item.category}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{item.username || "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs">{revealedPassword || "••••••••••••"}</span>
          {item.id && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onReveal(item.id!)}
                title={revealedPassword ? "Hide password" : "Reveal password"}
              >
                {revealedPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCopy(item.id!)}
                title="Copy to clipboard"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        {item.url ? (
          <a
            href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {item.url.replace(/^https?:\/\//, "").slice(0, 24)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            iconStart={<Pencil className="size-3.5" />}
            className="h-7 text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item)}
            title="Delete credential"
            iconStart={<Trash2 className="size-3.5 text-destructive" />}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
