"use client";

import { Badge, Button, TableCell, TableRow } from "@cms/admin-shell";
import { ClipboardList, Inbox, Pencil, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import type { FormListItem } from "./formTypes";

interface FormTableRowProps {
  form: FormListItem;
  onDeleteClick: (form: FormListItem) => void;
}

export function FormTableRow({ form, onDeleteClick }: FormTableRowProps) {
  return (
    <TableRow className="text-xs hover:bg-muted/30 transition-colors">
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 mt-0.5">
            <ClipboardList className="size-4" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/forms/${form.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
            >
              {form.title}
            </Link>
            <span className="text-[10px] font-mono text-muted-foreground">/{form.slug}</span>
            {form.description && (
              <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                {form.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="text-muted-foreground">
        <span className="font-semibold text-foreground">{form.fields?.length || 0}</span> fields
      </TableCell>

      <TableCell>
        {form.captchaProvider === "challenge" ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] gap-1 py-0.5"
          >
            <ShieldCheck className="size-3" />
            {form.challengeType === "math" ? "Math Captcha" : "Code Captcha"}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground border-border text-[10px] gap-1 py-0.5"
          >
            <ShieldAlert className="size-3" />
            No Captcha
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/dashboard/forms/${form.id}/submissions`}>
            <Button variant="outline" iconStart={<Inbox />}>
              Submissions
            </Button>
          </Link>
          <Link href={`/dashboard/forms/${form.id}`}>
            <Button variant="ghost" size="icon" title="Edit Form" iconStart={<Pencil />} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteClick(form)}
            title="Delete Form"
            iconStart={<Trash2 className="text-destructive" />}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
