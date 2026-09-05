"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  formatDateTime,
  Skeleton,
} from "@cms/admin-shell";
import { Clock, History, RotateCcw } from "lucide-react";
import type { PageVersion } from "./usePageEditor";

interface PageVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  versions: PageVersion[];
  onRestoreVersion: (ver: PageVersion) => void;
}

export function PageVersionsDialog({
  open,
  onOpenChange,
  isLoading,
  versions,
  onRestoreVersion,
}: PageVersionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-xl max-h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <span>Version History & Rollback</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review past saved snapshots of this page and restore any draft version.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 overflow-y-auto flex-1 pr-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No historical versions recorded yet.
            </div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-card transition-colors gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      v{ver.version}
                    </Badge>
                    <span className="font-semibold text-xs text-foreground">{ver.data?.title}</span>
                    <Badge
                      variant={ver.data?.status === "published" ? "default" : "secondary"}
                      className="text-[9px] uppercase py-0"
                    >
                      {ver.data?.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDateTime(ver.createdAt)}
                    </span>
                    <span>• {ver.data?.blocks?.length || 0} blocks</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreVersion(ver)}
                  iconStart={<RotateCcw />}
                  className="shrink-0 text-xs"
                >
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
