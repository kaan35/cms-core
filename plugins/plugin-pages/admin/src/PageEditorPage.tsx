"use client";

import { Badge, Button, Skeleton } from "@cms/admin-shell";
import { ArrowLeft, History, Save } from "lucide-react";
import Link from "next/link";
import { PageBlockEditor } from "./PageBlockEditor";
import { PageMetadataCard } from "./components/PageMetadataCard";
import { PageVersionsDialog } from "./components/PageVersionsDialog";
import { usePageEditor } from "./components/usePageEditor";

export function PageEditorPage({ id }: { id: string }) {
  const {
    isNew,
    isLoading,
    isSubmitting,
    inputData,
    setInputData,
    handleTitleChange,
    handleSlugChange,
    handleSave,
    isVersionsOpen,
    setIsVersionsOpen,
    isLoadingVersions,
    versions,
    handleRestoreVersion,
  } = usePageEditor(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pages">
            <Button variant="outline" iconStart={<ArrowLeft />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{isNew ? "Create Page" : "Edit Page"}</span>
              {!isNew && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  v{inputData.version}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assemble modern visual blocks and configure SEO routing metadata.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isNew && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVersionsOpen(true)}
              iconStart={<History />}
            >
              History
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSave}
            loading={isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {isNew ? "Create Page" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Page Routing & Metadata Card */}
      <PageMetadataCard
        inputData={inputData}
        onTitleChange={handleTitleChange}
        onSlugChange={handleSlugChange}
        onDataChange={setInputData}
      />

      {/* Page Content Blocks Canvas */}
      <PageBlockEditor
        blocks={inputData.blocks}
        onChange={(newBlocks) => setInputData((prev) => ({ ...prev, blocks: newBlocks }))}
      />

      {/* Version History Modal */}
      <PageVersionsDialog
        open={isVersionsOpen}
        onOpenChange={setIsVersionsOpen}
        isLoading={isLoadingVersions}
        versions={versions}
        onRestoreVersion={handleRestoreVersion}
      />
    </div>
  );
}
