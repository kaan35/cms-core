"use client";

import { Badge, Button, TableCell, TableRow, Tooltip, formatDate } from "@cms/admin-shell";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { isPasswordStale, type VaultItem } from "./VaultItemModal";

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
  const pwdDate = item.passwordChangedAt || item.createdAt;
  const isStale = isPasswordStale(pwdDate);

  return (
    <TableRow className="text-xs hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <KeyRound className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{item.title}</span>
              {item.category && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {item.category}
                </Badge>
              )}
            </div>
            {item.notes && (
              <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                {item.notes}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{item.username || "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs">{revealedPassword || "••••••••••••"}</span>
          {item.id && (
            <>
              <Tooltip content={revealedPassword ? "Hide password" : "Reveal password"}>
                <Button variant="ghost" size="icon-xs" onClick={() => onReveal(item.id!)}>
                  {revealedPassword ? (
                    <EyeOff className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip content="Copy to clipboard">
                <Button variant="ghost" size="icon-xs" onClick={() => onCopy(item.id!)}>
                  <Copy className="size-3.5 text-muted-foreground" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
        {isStale && pwdDate && (
          <div className="mt-1 flex items-center">
            <Tooltip content={`Password last changed on ${formatDate(pwdDate)}`}>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-default">
                <ShieldAlert className="size-3 shrink-0" />
                Changed &gt; 1 year ago
              </span>
            </Tooltip>
          </div>
        )}
      </TableCell>
      <TableCell>
        {item.url ? (
          <a
            href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
          >
            {item.url.replace(/^https?:\/\//, "").slice(0, 24)}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip content="Edit Credential">
            <Button variant="ghost" size="icon-xs" onClick={() => onEdit(item)}>
              <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete Credential">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(item)}
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
