"use client";

import { Badge, Button } from "@cms/admin-shell";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Sliders, Trash2 } from "lucide-react";
import type { FormField } from "./useFormBuilder";

interface FormFieldListProps {
  fields: FormField[];
  onOpenAddField: () => void;
  onOpenEditField: (index: number) => void;
  onMoveField: (index: number, direction: "up" | "down") => void;
  onRemoveField: (index: number) => void;
}

export function FormFieldList({
  fields,
  onOpenAddField,
  onOpenEditField,
  onMoveField,
  onRemoveField,
}: FormFieldListProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Form Fields ({fields.length})</h2>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onOpenAddField}
          iconStart={<Plus />}
          className="border-dashed"
        >
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
          <p className="text-xs text-muted-foreground">No fields configured yet.</p>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenAddField}
            iconStart={<Plus />}
            className="mt-3"
          >
            Add First Field
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {fields.map((field, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-border transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-muted-foreground cursor-grab">
                  <GripVertical className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {field.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                      {field.type}
                    </Badge>
                    {field.required && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-1.5">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    name: <code className="text-foreground">{field.name}</code>
                    {field.placeholder && (
                      <span className="text-muted-foreground ml-2">
                        • placeholder: &quot;{field.placeholder}&quot;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onMoveField(idx, "up")}
                  disabled={idx === 0}
                  title="Move Up"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onMoveField(idx, "down")}
                  disabled={idx === fields.length - 1}
                  title="Move Down"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenEditField(idx)}
                  title="Edit Field"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemoveField(idx)}
                  title="Delete Field"
                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
