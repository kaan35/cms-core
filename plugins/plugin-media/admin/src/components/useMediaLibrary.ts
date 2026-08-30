import { apiClient, toast, useApi } from "@cms/admin-shell";
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

export function useMediaLibrary() {
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

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    isUploading,
    previewItem,
    setPreviewItem,
    deleteModal,
    setDeleteModal,
    copiedUrl,
    fileInputRef,
    isLoading,
    mutate,
    filteredItems,
    handleFileUpload,
    handleDelete,
    handleCopyUrl,
  };
}
