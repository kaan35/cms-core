"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  apiClient,
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatBytes,
  Input,
  Skeleton,
  toast,
  useApi,
} from "@cms/admin-shell";
import {
  Check,
  Copy,
  ExternalLink,
  File,
  FileCode,
  FileText,
  Film,
  Grid,
  Image as ImageIcon,
  List as ListIcon,
  Music,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import * as React from "react";

export interface MediaItem {
  id: string;
  filename: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  uploaderId?: string | undefined;
  createdAt: string;
  updatedAt?: string | undefined;
}

export interface MediaLibraryProps {
  onSelect?: ((item: MediaItem) => void) | undefined;
  selectable?: boolean | undefined;
  selectedId?: string | undefined;
  className?: string | undefined;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return FileText;
  if (mimeType.includes("json") || mimeType.includes("javascript")) return FileCode;
  return File;
}

export function MediaLibrary({
  onSelect,
  selectable = false,
  selectedId,
  className,
}: MediaLibraryProps) {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "image" | "document" | "other">("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewItem, setPreviewItem] = React.useState<MediaItem | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{
    target: MediaItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<
    | {
        data: MediaItem[];
        total: number;
        page: number;
        limit: number;
      }
    | MediaItem[]
  >("/api/media?limit=100");

  const mediaList: MediaItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const filteredItems = React.useMemo(() => {
    return mediaList.filter((item) => {
      const matchSearch =
        item.filename.toLowerCase().includes(search.toLowerCase()) ||
        item.mimeType.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (typeFilter === "image") return item.mimeType.startsWith("image/");
      if (typeFilter === "document")
        return (
          item.mimeType.includes("pdf") ||
          item.mimeType.includes("text") ||
          item.mimeType.includes("document")
        );
      if (typeFilter === "other")
        return (
          !item.mimeType.startsWith("image/") &&
          !item.mimeType.includes("pdf") &&
          !item.mimeType.includes("text") &&
          !item.mimeType.includes("document")
        );

      return true;
    });
  }, [mediaList, search, typeFilter]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const formData = new FormData();
      formData.append("file", file);

      try {
        await apiClient<MediaItem>("/api/media", {
          method: "POST",
          body: formData,
        });
        successCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(`Failed to upload ${file.name}: ${message}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully.`);
      await mutate();
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await apiClient(`/api/media/${deleteModal.target.id}`, { method: "DELETE" });
      toast.success("Media deleted successfully");
      if (previewItem?.id === deleteModal.target.id) setPreviewItem(null);
      setDeleteModal({ target: null, isDeleting: false });
      await mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card w-full"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border/80 bg-card p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                typeFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("image")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                typeFilter === "image"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("document")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                typeFilter === "document"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Docs
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center rounded-lg border border-border/80 bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Grid View"
            >
              <Grid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "table"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Table View"
            >
              <ListIcon className="size-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="border-border/80 shrink-0"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2 flex-1 sm:flex-none"
          >
            <UploadCloud className="size-4" />
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-card/40 hover:bg-card/70 p-6 text-center transition-all cursor-pointer"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
          <UploadCloud className="size-5" />
        </div>
        <p className="mt-2 text-sm font-medium text-foreground">
          Click to upload or drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WebP, SVG, PDF up to 10MB</p>
      </div>

      {/* Assets Grid / Table */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/80 bg-card p-2 space-y-2">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-12 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
            <ImageIcon className="size-6 opacity-80" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No media assets found</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            {search
              ? "No files match your search query."
              : "Upload images, documents, and media to build your asset library."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => {
            const isImage = item.mimeType.startsWith("image/");
            const Icon = getFileIcon(item.mimeType);
            const isSelected = selectedId === item.id || selectedId === item.url;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (selectable && onSelect) {
                    onSelect(item);
                  } else {
                    setPreviewItem(item);
                  }
                }}
                className={cn(
                  "group relative flex flex-col rounded-xl border border-border/80 bg-card p-2.5 transition-all hover:shadow-md cursor-pointer",
                  isSelected && "ring-2 ring-primary border-primary",
                )}
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40 flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}

                  {isSelected && (
                    <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                      <Check className="size-3.5" />
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-2 space-y-0.5">
                  <p className="truncate text-xs font-medium text-foreground" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatBytes(item.size)}</span>
                    <span className="uppercase text-[10px]">
                      {item.mimeType.split("/")[1] || "file"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.map((item) => {
                const isImage = item.mimeType.startsWith("image/");
                const Icon = getFileIcon(item.mimeType);
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (selectable && onSelect) onSelect(item);
                      else setPreviewItem(item);
                    }}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                          {isImage ? (
                            <img
                              src={item.url}
                              alt={item.filename}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Icon className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium text-foreground max-w-xs truncate">
                          {item.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {item.mimeType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(item.size)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ target: item, isDeleting: false });
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-md">
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{previewItem.filename}</DialogTitle>
                <DialogDescription className="text-xs">
                  Uploaded on {new Date(previewItem.createdAt).toLocaleString()}
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
                      size="sm"
                      onClick={() => handleCopyUrl(previewItem.url)}
                      className="shrink-0"
                    >
                      {copiedUrl ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
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
                  size="sm"
                  onClick={() => {
                    setDeleteModal({ target: previewItem, isDeleting: false });
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>

                {selectable && onSelect && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelect(previewItem);
                      setPreviewItem(null);
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
      <AlertDialog
        open={Boolean(deleteModal.target)}
        onOpenChange={(open) => !open && setDeleteModal({ target: null, isDeleting: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{deleteModal.target?.filename}&quot; from storage
              and the database. Any pages or blog posts referencing this file will show broken
              links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs gap-1.5" disabled={deleteModal.isDeleting}>
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              loading={deleteModal.isDeleting}
              iconStart={<Trash2 className="size-3.5" />}
              onClick={handleDelete}
            >
              {deleteModal.isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
