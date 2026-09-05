"use client";

import { Badge, Button, TableCell, TableRow } from "@cms/admin-shell";
import { FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { BlogPostListItem } from "./blogTypes";

interface BlogPostTableRowProps {
  post: BlogPostListItem;
  onDeleteClick: (post: BlogPostListItem) => void;
}

export function BlogPostTableRow({ post, onDeleteClick }: BlogPostTableRowProps) {
  return (
    <TableRow className="text-xs hover:bg-muted/30 transition-colors">
      <TableCell>
        <div className="flex items-start gap-3">
          {post.coverMediaId ? (
            <div className="size-10 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-muted">
              <img src={post.coverMediaId} alt="" className="size-full object-cover" />
            </div>
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
              <FileText className="size-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/blog/${post.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
            >
              {post.title}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground">/blog/{post.slug}</span>
              {post.version && (
                <span className="text-[10px] text-muted-foreground/80">• v{post.version}</span>
              )}
            </div>
            {post.summary && (
              <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                {post.summary}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        {post.status === "published" ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] gap-1 py-0.5"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Published
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground border-border text-[11px] gap-1 py-0.5"
          >
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Draft
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-[11px] text-muted-foreground">
        {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : "—"}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/dashboard/blog/${post.id}`}>
            <Button variant="ghost" size="icon-xs" title="Edit Article">
              <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDeleteClick(post)}
            title="Delete Article"
            className="hover:text-destructive"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
