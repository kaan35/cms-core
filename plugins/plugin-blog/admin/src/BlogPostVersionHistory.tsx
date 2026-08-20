"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  toast,
  useApi,
} from "@cms/admin-shell";
import { Clock, FileText, RotateCcw } from "lucide-react";
import * as React from "react";

export interface BlogPostDoc {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverMediaId?: string | undefined;
  status: "draft" | "published";
  version: number;
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostVersionDoc {
  id: string;
  postId: string;
  version: number;
  snapshot: BlogPostDoc;
  createdAt: string;
  actorId?: string | undefined;
}

export interface BlogPostVersionHistoryProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (snapshot: BlogPostDoc) => void;
}

export function BlogPostVersionHistory({
  postId,
  open,
  onOpenChange,
  onRestore,
}: BlogPostVersionHistoryProps) {
  const shouldFetch = open && Boolean(postId) && postId !== "new";
  const { data: rawVersions, isLoading } = useApi<BlogPostVersionDoc[]>(
    shouldFetch ? `/api/blog/${postId}/versions` : null,
  );

  const versions: BlogPostVersionDoc[] = React.useMemo(() => {
    return Array.isArray(rawVersions) ? rawVersions : [];
  }, [rawVersions]);

  const [selectedVersion, setSelectedVersion] = React.useState<BlogPostVersionDoc | null>(null);

  React.useEffect(() => {
    if (versions.length > 0) {
      setSelectedVersion((prev) => prev || versions[0] || null);
    }
  }, [versions]);

  const handleRestore = (ver: BlogPostVersionDoc) => {
    onRestore(ver.snapshot);
    onOpenChange(false);
    toast.success(`Restored version #${ver.version} snapshot. Click "Save Changes" to commit.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            Article Version History
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review previous revisions, inspect differences, and restore past content snapshots.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 pt-3">
          {/* Version List Sidebar */}
          <div className="md:col-span-5 overflow-y-auto space-y-2 pr-1 border-r border-border/60">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recorded version revisions yet.
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-border/80 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Version #{ver.version}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                      {ver.snapshot?.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/80">
                      <span className="capitalize">{ver.snapshot?.status}</span>
                      <span>•</span>
                      <span>{ver.snapshot?.content?.length || 0} chars</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Version Preview Pane */}
          <div className="md:col-span-7 overflow-y-auto pl-1 flex flex-col justify-between">
            {selectedVersion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Snapshot: v{selectedVersion.version}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Saved {new Date(selectedVersion.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRestore(selectedVersion)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Restore This Version
                  </Button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                      Title
                    </span>
                    <p className="text-foreground font-medium">{selectedVersion.snapshot.title}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                      Slug
                    </span>
                    <p className="font-mono text-muted-foreground text-[11px]">
                      /blog/{selectedVersion.snapshot.slug}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                      Summary
                    </span>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {selectedVersion.snapshot.summary || "No summary"}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] block mb-1">
                      Content Preview
                    </span>
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                      {selectedVersion.snapshot.content}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground p-8">
                <FileText className="size-8 opacity-40 mb-2" />
                <span>Select a version on the left to preview details.</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
