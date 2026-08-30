"use client";

import { cn } from "@cms/admin-shell";
import { MediaDetailModal } from "./components/MediaDetailModal";
import { MediaGrid } from "./components/MediaGrid";
import { MediaToolbar } from "./components/MediaToolbar";
import { MediaUploadZone } from "./components/MediaUploadZone";
import type { MediaItem } from "./components/useMediaLibrary";
import { useMediaLibrary } from "./components/useMediaLibrary";

export type { MediaItem } from "./components/useMediaLibrary";

export interface MediaLibraryProps {
  onSelect?: ((item: MediaItem) => void) | undefined;
  selectable?: boolean | undefined;
  selectedId?: string | undefined;
  className?: string | undefined;
}

export function MediaLibrary({
  onSelect,
  selectable = false,
  selectedId,
  className,
}: MediaLibraryProps) {
  const {
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
  } = useMediaLibrary();

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
      <MediaToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => mutate()}
        onUploadClick={() => fileInputRef.current?.click()}
        isUploading={isUploading}
      />

      {/* Drag and Drop Zone */}
      <MediaUploadZone
        onFilesSelected={handleFileUpload}
        onClick={() => fileInputRef.current?.click()}
      />

      {/* Assets Grid / Table */}
      <MediaGrid
        items={filteredItems}
        isLoading={isLoading}
        search={search}
        viewMode={viewMode}
        selectable={selectable}
        selectedId={selectedId}
        onItemClick={(item) => {
          if (selectable && onSelect) {
            onSelect(item);
          } else {
            setPreviewItem(item);
          }
        }}
        onDeleteItem={(item) => setDeleteModal({ target: item, isDeleting: false })}
      />

      {/* Preview Dialog & Delete Confirmation */}
      <MediaDetailModal
        previewItem={previewItem}
        onClosePreview={() => setPreviewItem(null)}
        deleteModal={deleteModal}
        onCloseDeleteModal={() => setDeleteModal({ target: null, isDeleting: false })}
        onConfirmDelete={handleDelete}
        onRequestDelete={(item) => setDeleteModal({ target: item, isDeleting: false })}
        copiedUrl={copiedUrl}
        onCopyUrl={handleCopyUrl}
        selectable={selectable}
        onSelect={onSelect}
      />
    </div>
  );
}
