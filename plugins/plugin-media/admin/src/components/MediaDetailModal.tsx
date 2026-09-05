"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDeleteConfirm,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatBytes,
  formatDateTime,
  Input,
} from "@cms/admin-shell";
import { Check, Copy, ExternalLink, FileText, Trash2 } from "lucide-react";

import type { MediaItem } from "./useMediaLibrary";

interface MediaDetailModalProps {
  previewItem: MediaItem | null;
  onClosePreview: () => void;
  deleteModal: { target: MediaItem | null; isDeleting: boolean };
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: (item: MediaItem) => void;
  copiedUrl: boolean;
  onCopyUrl: (url: string) => void;
  selectable?: boolean | undefined;
  onSelect?: ((item: MediaItem) => void) | undefined;
}

export function MediaDetailModal({
  previewItem,
  onClosePreview,
  deleteModal,
  onCloseDeleteModal,
  onConfirmDelete,
  onRequestDelete,
  copiedUrl,
  onCopyUrl,
  selectable,
  onSelect,
}: MediaDetailModalProps) {
  return (
    <>
      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && onClosePreview()}>
        <DialogContent className="sm:max-w-md">
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{previewItem.filename}</DialogTitle>
                <DialogDescription className="text-xs">
                  Uploaded on {formatDateTime(previewItem.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted/60 flex items-center justify-center">
                  {previewItem.mimeType.startsWith("image/") ? (
                    <img
                      src={previewItem.url}
                      alt={previewItem.filename}
                      className="size-full object-contain"
                    />
                  ) : (
                    <FileText className="size-16 text-muted-foreground" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <span className="text-muted-foreground block text-[10px]">Size</span>
                    <span className="font-semibold">{formatBytes(previewItem.size)}</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <span className="text-muted-foreground block text-[10px]">MIME Type</span>
                    <span className="font-semibold truncate block">{previewItem.mimeType}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Direct URL</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={previewItem.url}
                      className="text-xs font-mono bg-muted/40"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onCopyUrl(previewItem.url)}
                      iconStart={copiedUrl ? <Check /> : <Copy />}
                    />
                    <a
                      href={previewItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={() => onRequestDelete(previewItem)}
                  iconStart={<Trash2 />}
                >
                  Delete
                </Button>

                {selectable && onSelect && (
                  <Button
                    onClick={() => {
                      onSelect(previewItem);
                      onClosePreview();
                    }}
                  >
                    Select Asset
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <DialogDeleteConfirm
        open={Boolean(deleteModal.target)}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDelete}
        title="Delete Media Asset?"
        itemTitle={deleteModal.target?.filename}
        description={`This will permanently remove "${deleteModal.target?.filename}" from storage and the database. Any pages or blog posts referencing this file will show broken links.`}
        confirmLabel="Delete Permanently"
        isDeleting={deleteModal.isDeleting}
      />
    </>
  );
}
